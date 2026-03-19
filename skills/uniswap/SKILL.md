---
name: uniswap
description: Swap tokens on EVM chains via Uniswap. Use when an agent needs to get quotes, check approvals, or execute token swaps through Uniswap's routing.
---

# Uniswap CLI

Token swapping on EVM chains via Uniswap routing.

## Commands

### `uniswap quote`

Get a swap quote with routing and permit data.

```bash
uniswap quote \
  --chain polygon \
  --tokenIn 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --tokenOut 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --amount 10000000 \
  --wallet 0xYourAddress
```

Output includes `quoteData` (routing) and `permitData` (EIP-712 typed data for Permit2):

```json
{
  "quoteId": "...",
  "amountOut": "9985000",
  "permitData": { "domain": {}, "types": {}, "values": {} },
  "quoteData": "..."
}
```

### `uniswap swap`

Build the swap transaction. Requires a signed permit.

```bash
uniswap swap \
  --chain polygon \
  --quoteId <id-from-quote> \
  --permit-sig 0xSignedPermit
```

Output:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 137 }
```

### `uniswap check-approval`

Check if Permit2 has sufficient token approval.

```bash
uniswap check-approval \
  --chain polygon \
  --token 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --wallet 0xYourAddress
```

If approval is needed, outputs the approval transaction:

```json
{ "approvalNeeded": true, "tx": { "to": "0x...", "data": "0x...", "value": "0", "chainId": 137 } }
```

### `uniswap setup`

Configure API key and default settings.

```bash
uniswap setup --api-key <key>
```

### `uniswap chains`

List supported chains.

```bash
uniswap chains
```

### `uniswap tokens`

Search for tokens on a chain.

```bash
uniswap tokens --chain polygon --search USDC
```

## Key Concepts

- **Permit2**: Uniswap uses EIP-712 typed data signing instead of on-chain approvals for each swap. The token must approve the Permit2 contract once, then subsequent swaps use off-chain signatures.
- **Quote → Permit → Swap flow**: Always get a quote first, sign the permitData, then pass the signature to swap.
- **Output contract**: `uniswap swap` and `uniswap check-approval` (when approval needed) output `{ to, data, value, chainId }` — unsigned transaction JSON ready for signing.
