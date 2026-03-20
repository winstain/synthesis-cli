---
name: uniswap
description: "Swap tokens on Uniswap via the Trading API. Supports Ethereum, Base, Polygon, Arbitrum, Optimism. Use OWS for Permit2 signatures, and convert returned base transaction objects into signer-specific input in skills/workflows."
---

# Uniswap CLI

Agent-first CLI for the Uniswap Trading API.

## Setup

```bash
npm install -g uniswap-cli
uniswap setup --api-key YOUR_UNISWAP_API_KEY
```

Get an API key at https://hub.uniswap.org

The CLI reads the API key from either:
- `UNISWAP_API_KEY`
- `~/.uniswap-cli/config.json`

## Commands

All commands write JSON to stdout by default. Errors are structured JSON on stderr.

### `uniswap quote`

```bash
uniswap quote --from USDC --to WETH --amount 1000000 --chain 8453 --wallet 0xYOUR_ADDRESS
```

Options:
- `--from` input token symbol or address
- `--to` output token symbol or address
- `--amount` raw token amount in base units
- `--chain` chain name or ID understood by the CLI
- `--wallet` optional swapper wallet address
- `--type` `EXACT_INPUT` or `EXACT_OUTPUT`

Returns quote data and may include `permitData` for ERC-20 swaps.

### `uniswap check-approval`

```bash
uniswap check-approval --token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --amount 1000000 --chain 8453 --wallet 0xYOUR_ADDRESS
```

Returns:
- `{"approval": null}` when no approval tx is needed
- an unsigned tx payload in `approval` when Permit2 approval is needed

### `uniswap swap`

```bash
uniswap swap --from USDC --to WETH --amount 1000000 --chain 8453 --wallet 0xYOUR_ADDRESS
```

This is the full orchestration command:
1. check approval
2. get quote
3. if needed, return `permitData` for EIP-712 signing
4. once `--permit-signature` is provided, return the unsigned swap tx

## Swap flows

### Native token input (ETH / POL)

Native-token swaps do **not** require Permit2 signing.

```bash
uniswap swap --from ETH --to USDC --amount 1000000000000000000 --chain 8453 --wallet 0xWALLET
```

Returns:

```json
{
  "step": "sign_transaction",
  "transaction": {
    "to": "0x...",
    "data": "0x...",
    "value": "1000000000000000000",
    "chainId": 8453
  }
}
```

### ERC-20 input (USDC / WETH / DAI / etc.)

ERC-20 swaps are usually a two-step flow.

#### Step 1 — get permit data

```bash
uniswap swap --from USDC --to ETH --amount 1000000 --chain 8453 --wallet 0xWALLET
```

Returns a payload like:

```json
{
  "step": "sign_permit",
  "approval": {
    "to": "0x...",
    "data": "0x...",
    "value": "0",
    "chainId": 8453
  },
  "permitData": {
    "domain": {},
    "types": {},
    "values": {}
  },
  "quote": { "quoteId": "..." }
}
```

If `approval` is not null, sign and send that tx before proceeding.

Then sign `permitData` with OWS:

```bash
ows sign message --chain ethereum --wallet agent-treasury --typed-data '{"domain":{},"types":{},"values":{}}' --message ignored --json
```

OWS is the preferred default assumption for typed-data signing. The child CLI only returns the base transaction object; signer-specific conversion should happen in a skill or workflow layer.

#### Step 2 — get the final unsigned swap tx

```bash
uniswap swap --from USDC --to ETH --amount 1000000 --chain 8453 --wallet 0xWALLET --permit-signature 0xSIGNED_PERMIT
```

Returns:

```json
{
  "step": "sign_transaction",
  "transaction": {
    "to": "0x...",
    "data": "0x...",
    "value": "0",
    "chainId": 8453
  }
}
```

Then convert the returned base transaction object into the signer backend's expected input shape and sign/send it.

For OWS, the manual path is:
1. start from the returned `{ to, data, value, chainId, from? }` object
2. fetch or determine `nonce`, `gas`, `maxFeePerGas`, and `maxPriorityFeePerGas`
3. serialize an unsigned EIP-1559 transaction
4. pass the serialized hex to `ows sign tx` or `ows sign send-tx`

Reference:
- https://github.com/open-wallet-standard/core/blob/main/docs/02-signing-interface.md

## MCP server

```bash
uniswap mcp
```

Exposed tools:
- `uniswap_quote`
- `uniswap_check_approval`
- `uniswap_swap`

## Rules of thumb

1. Always quote fresh before swapping.
2. Always check approval before assuming a Permit2 flow is ready.
3. Treat `permitData` and `transaction` as two distinct signing steps.
4. Amounts are raw units, not humanized decimals.
