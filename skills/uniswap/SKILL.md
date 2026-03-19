---
name: uniswap
description: "Swap tokens on Uniswap via the Trading API. Supports Ethereum, Base, Polygon, Arbitrum, Optimism. Pair with MoonPay CLI for wallet signing and broadcasting."
---

# Uniswap CLI

Agent-first CLI for the Uniswap Trading API.

## Setup

```
npm install -g uniswap-cli
uniswap setup --api-key YOUR_UNISWAP_API_KEY
```

Get an API key at https://hub.uniswap.org

The API key is stored in `~/.uniswap-cli/config.json`. The CLI also accepts the `UNISWAP_API_KEY` env var (takes precedence over config file).

## Commands

All commands output JSON to stdout. Errors output JSON to stderr.

### Get a quote

```
uniswap quote --from ETH --to USDC --amount 1000000000000000000 --chain 8453
```

- --from — input token address or symbol
- --to — output token address or symbol
- --amount — amount in wei (raw units)
- --chain — chain ID (1=Ethereum, 8453=Base, 137=Polygon, 42161=Arbitrum, 10=Optimism)
- --wallet — optional swapper address for accurate gas estimates

Shortcuts: ETH, WETH, USDC, USDT, DAI, WBTC resolve to the correct address per chain.

### Check token approval

```
uniswap check-approval --token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --amount 1000000 --chain 1 --wallet 0xYOUR_ADDRESS
```

Returns approval transaction data if needed, or `{"approval": null}` if already approved.
Not needed for native ETH swaps.

### Swap

```
uniswap swap --from ETH --to USDC --amount 1000000000000000000 --chain 8453 --wallet 0xYOUR_ADDRESS
```

The swap command handles the full flow: check approval → get quote → create order. The output depends on whether a Permit2 signature is needed.

### List chains

```
uniswap chains
```

### List known tokens

```
uniswap tokens --chain 8453
```

## Swap Flows

### Which tokens need permits?

- **Native tokens** (ETH, POL) → **no permit needed**. Single command gets the unsigned tx.
- **ERC20 tokens** (USDC, WETH, DAI, etc.) → **permit required**. Two-step flow.

### Native token swap (ETH, POL → any token)

Single command. No `--permit-signature` needed.

```
uniswap swap --from ETH --to USDC --amount 1000000000000000000 --chain 8453 --wallet 0xWALLET
```

Output:
```json
{
  "step": "sign_transaction",
  "transaction": {
    "to": "0xUniversalRouter",
    "data": "0x...",
    "value": "1000000000000000000",
    "chainId": 8453
  },
  "quote": {
    "quoteId": "...",
    "input": { "amount": "1000000000000000000", "token": "0x000...000" },
    "output": { "amount": "2197172293", "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    "priceImpact": 0.001,
    "gasFeeUSD": "0.03"
  },
  "next": "Sign transaction with moonpay: mp transaction sign --wallet NAME --chain base --transaction '{...}'"
}
```

Sign and broadcast:
```
mp transaction sign --wallet WALLET_NAME --chain base --transaction '{"to":"...","data":"...","value":"...","chainId":8453}'
mp transaction send --chain base --transaction SIGNED_TX_HEX
```

### ERC20 swap (USDC, WETH, DAI, etc.)

Two-step flow. First call returns permit data for signing.

**Step 1 — Get permit data:**
```
uniswap swap --from USDC --to ETH --amount 1000000 --chain 8453 --wallet 0xWALLET
```

Output:
```json
{
  "step": "sign_permit",
  "approval": {
    "to": "0xPermit2",
    "data": "0x...",
    "value": "0",
    "chainId": 8453
  },
  "permitData": {
    "domain": { "name": "Permit2", "chainId": 8453, "verifyingContract": "0x..." },
    "types": { ... },
    "values": { ... }
  },
  "quote": {
    "quoteId": "...",
    "input": { "amount": "1000000", "token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    "output": { "amount": "450000000000000", "token": "0x000...000" },
    "priceImpact": 0.001,
    "gasFeeUSD": "0.03"
  },
  "next": "Sign permitData with an EIP-712 signer, then rerun with --permit-signature <hex>"
}
```

- `approval` is the Permit2 approval tx. If already approved, this is `null`.
- `permitData` is EIP-712 typed data — sign it with an EIP-712 signer.

If `approval` is not null, sign and send the approval tx first:
```
mp transaction sign --wallet WALLET_NAME --chain base --transaction '{"to":"...","data":"...","value":"0","chainId":8453}'
mp transaction send --chain base --transaction SIGNED_TX_HEX
```

Sign the permitData with an EIP-712 signer to get the permit signature hex.

**Step 2 — Get unsigned swap tx:**
```
uniswap swap --from USDC --to ETH --amount 1000000 --chain 8453 --wallet 0xWALLET --permit-signature 0xSIGNED_PERMIT_HEX
```

Output:
```json
{
  "step": "sign_transaction",
  "transaction": {
    "to": "0xUniversalRouter",
    "data": "0x...",
    "value": "0",
    "chainId": 8453
  },
  "quote": {
    "quoteId": "...",
    "input": { ... },
    "output": { ... }
  },
  "next": "Sign transaction with moonpay: mp transaction sign --wallet NAME --chain base --transaction '{...}'"
}
```

Sign and broadcast:
```
mp transaction sign --wallet WALLET_NAME --chain base --transaction '{"to":"...","data":"...","value":"0","chainId":8453}'
mp transaction send --chain base --transaction SIGNED_TX_HEX
```

## Common Token Addresses

### Ethereum (chain 1)
- ETH: 0x0000000000000000000000000000000000000000
- WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
- USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7

### Base (chain 8453)
- ETH: 0x0000000000000000000000000000000000000000
- WETH: 0x4200000000000000000000000000000000000006
- USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

### Polygon (chain 137)
- POL: 0x0000000000000000000000000000000000000000
- WETH: 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619
- USDC: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359

### Arbitrum (chain 42161)
- ETH: 0x0000000000000000000000000000000000000000
- WETH: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
- USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831

## Notes

- Amounts are always in wei (raw token units). For ETH: 1 ETH = 1000000000000000000. For USDC (6 decimals): 1 USDC = 1000000.
- The Uniswap API routes through v3 and v4 pools automatically for best pricing.
- For tokens not in the shortcut list, pass the full contract address.
- Use `mp token search --query TOKEN_NAME --chain CHAIN --json` to find token addresses.
