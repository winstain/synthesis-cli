---
name: synthesis
description: Compose protocol CLIs into multi-step on-chain workflows. Use when an agent needs to orchestrate across multiple child CLIs (e.g. quote + sign + swap, or stake + sign + send).
---

# Synthesis CLI — Orchestration

Synthesis is a thin router that forwards commands to child CLIs. The real value is **composing** them into multi-step workflows.

## Discovery

```bash
synth list              # List registered child CLIs
synth versions          # Show all versions
synth doctor            # Health check — are all CLIs installed and resolvable?
synth skills            # List available agent skills
synth skills show <n>   # Print a skill's full content
```

## Composition Patterns

### Pattern 1: Simple Transaction

Any protocol CLI that outputs `{ to, data, value, chainId }` → sign → send.

```bash
# 1. Build the unsigned tx
lido stake --amount 1.0 --wallet 0xAddr

# 2. Sign it
moonpay transaction sign --wallet-id <wid> --to <to> --data <data> --value <value> --chain-id <chainId>

# 3. Broadcast
moonpay transaction send --wallet-id <wid> --signed-tx <signedTx>
```

### Pattern 2: Approval Flow

Some tokens need a one-time approval before Permit2 can use them.

```bash
# 1. Check if approval is needed
uniswap check-approval --chain polygon --token 0xUSDC --wallet 0xAddr

# 2. If approvalNeeded: sign and send the approval tx
moonpay transaction sign --wallet-id <wid> --to <to> --data <data> --value 0 --chain-id 137
moonpay transaction send --wallet-id <wid> --signed-tx <signedTx>

# 3. Then proceed with the swap (Pattern 3)
```

### Pattern 3: Permit2 Swap (Uniswap)

The full quote → permit-sign → swap → tx-sign → broadcast flow.

```bash
# 1. Get quote (includes permitData for EIP-712 signing)
uniswap quote \
  --chain polygon \
  --tokenIn 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --tokenOut 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --amount 10000000 \
  --wallet 0xAddr

# 2. Sign the Permit2 typed data
moonpay message sign --wallet-id <wid> --typedData '<permitData from step 1>'
# → { "signature": "0x..." }

# 3. Build swap tx with the permit signature
uniswap swap --chain polygon --quoteId <id> --permit-sig <signature>
# → { to, data, value, chainId }

# 4. Sign the swap transaction
moonpay transaction sign --wallet-id <wid> --to <to> --data <data> --value <value> --chain-id 137

# 5. Broadcast
moonpay transaction send --wallet-id <wid> --signed-tx <signedTx>
```

### Reference: USDC.e → USDT on Polygon

A concrete end-to-end example:

```bash
# Check approval for USDC.e on Polygon
uniswap check-approval \
  --chain polygon \
  --token 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --wallet 0xAddr
# → { "approvalNeeded": false }  (already approved)

# Get quote: 10 USDC.e → USDT
uniswap quote \
  --chain polygon \
  --tokenIn 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --tokenOut 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --amount 10000000 \
  --wallet 0xAddr
# → { quoteId: "abc", amountOut: "9985000", permitData: {...}, quoteData: "..." }

# Sign Permit2
moonpay message sign --wallet-id <wid> --typedData '<permitData>'
# → { signature: "0xabc..." }

# Build swap tx
uniswap swap --chain polygon --quoteId abc --permit-sig 0xabc...
# → { to: "0x...", data: "0x...", value: "0", chainId: 137 }

# Sign + send
moonpay transaction sign --wallet-id <wid> --to 0x... --data 0x... --value 0 --chain-id 137
moonpay transaction send --wallet-id <wid> --signed-tx 0xSigned...
```

## Rules for Composition

1. **Never skip the quote step** for Uniswap swaps — routing changes constantly.
2. **Always check approval** before a Permit2 flow — saves gas and avoids reverts.
3. **Pipe JSON between steps** — each CLI outputs structured JSON that feeds the next.
4. **MoonPay is always the signer** — protocol CLIs build txs, MoonPay signs and sends them.
5. **Chain IDs must match** across all steps in a flow.
