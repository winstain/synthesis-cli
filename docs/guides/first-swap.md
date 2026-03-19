# Your First Swap

A step-by-step walkthrough of a Uniswap token swap using the Synthesis CLI stack. This guide uses the real flow that swapped 0.1 USDC.e → USDT on Polygon.

**Audience:** Developers and AI agents building on-chain workflows through CLI composition.

## Prerequisites

```bash
npm i -g synthesis-cli
synth doctor   # verify all child CLIs are healthy
```

You'll need a MoonPay-configured wallet with tokens on the target chain.

## Overview

A token swap has up to 6 steps, depending on whether token approval is needed:

1. **Check approval** — does Uniswap's router have permission to spend your tokens?
2. **Approve** — if not, send an approval transaction
3. **Quote** — get a swap quote and Permit2 data
4. **Sign permit** — sign the EIP-712 Permit2 message off-chain
5. **Build swap** — generate the swap transaction with the permit signature
6. **Sign + send** — sign and broadcast the swap transaction

Each step is a standalone CLI call. Data flows between them as JSON.

---

## Step 1: Check token approval

```bash
synth uniswap check-approval \
  --token 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --amount 100000 \
  --chainId 137
```

**What it does:** Checks if the Uniswap Universal Router has approval to spend your USDC.e.

**Output (approval needed):**
```json
{
  "approvalNeeded": true,
  "transaction": {
    "to": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "data": "0x095ea7b3000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba3ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "value": "0",
    "chainId": 137
  }
}
```

**Output (already approved):**
```json
{
  "approvalNeeded": false
}
```

If `approvalNeeded` is `false`, skip to Step 3.

## Step 2: Send the approval transaction

Sign and broadcast the approval transaction from Step 1:

```bash
# Sign the unsigned transaction
synth moonpay transaction sign \
  --to 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --data "0x095ea7b3000000..." \
  --value 0 \
  --chainId 137
```

**Output:**
```json
{
  "signedTransaction": "0x02f8730089..."
}
```

```bash
# Send the signed transaction
synth moonpay transaction send \
  --signedTransaction "0x02f8730089..." \
  --chainId 137
```

**Output:**
```json
{
  "transactionHash": "0xabc123..."
}
```

Wait for confirmation before proceeding.

## Step 3: Get a swap quote

```bash
synth uniswap quote \
  --tokenIn 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --tokenOut 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --amount 100000 \
  --chainId 137 \
  --swapper 0xYourWalletAddress
```

**What it does:** Gets a Uniswap quote for 0.1 USDC.e → USDT on Polygon, including Permit2 data for off-chain approval.

**Output:**
```json
{
  "quote": {
    "amountIn": "100000",
    "amountOut": "99842",
    "tokenIn": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    "tokenOut": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    "route": "USDC.e → USDT"
  },
  "permitData": {
    "domain": {
      "name": "Permit2",
      "chainId": 137,
      "verifyingContract": "0x000000000022D473030F116dDEE9F6B43aC78BA3"
    },
    "types": { ... },
    "values": { ... }
  }
}
```

The `permitData` is an EIP-712 typed data structure. This is what you'll sign in the next step.

## Step 4: Sign the Permit2 message

```bash
synth moonpay message sign \
  --typedData '{"domain":{"name":"Permit2","chainId":137,...},"types":{...},"values":{...}}'
```

**What it does:** Signs the EIP-712 Permit2 typed data with your MoonPay wallet, producing an off-chain signature that authorizes the swap router to spend your tokens.

**Output:**
```json
{
  "signature": "0x1a2b3c4d..."
}
```

This signature is **not** a transaction — it's an off-chain authorization used in the next step.

## Step 5: Build the swap transaction

```bash
synth uniswap swap \
  --tokenIn 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --tokenOut 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --amount 100000 \
  --chainId 137 \
  --swapper 0xYourWalletAddress \
  --signature "0x1a2b3c4d..."
```

**What it does:** Generates the swap transaction calldata, embedding the Permit2 signature so the router can execute the swap.

**Output:**
```json
{
  "to": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
  "data": "0x3593564c000000...",
  "value": "0",
  "chainId": 137
}
```

This is an unsigned transaction — the universal handoff format in the Synthesis stack.

## Step 6: Sign and send the swap

```bash
# Sign
synth moonpay transaction sign \
  --to 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD \
  --data "0x3593564c000000..." \
  --value 0 \
  --chainId 137

# Send
synth moonpay transaction send \
  --signedTransaction "0x02f8..." \
  --chainId 137
```

**Output:**
```json
{
  "transactionHash": "0xdef456...",
  "status": "confirmed"
}
```

Your swap is complete. 0.1 USDC.e → ~0.099842 USDT on Polygon.

---

## Scripting the full flow

For agents or scripts, the full flow looks like:

```bash
#!/usr/bin/env bash
set -euo pipefail

TOKEN_IN="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"   # USDC.e
TOKEN_OUT="0xc2132D05D31c914a87C6611C10748AEb04B58e8F"   # USDT
AMOUNT="100000"    # 0.1 USDC.e (6 decimals)
CHAIN_ID="137"     # Polygon
SWAPPER="0xYourWalletAddress"

# 1. Check approval
APPROVAL=$(synth uniswap check-approval \
  --token $TOKEN_IN --amount $AMOUNT --chainId $CHAIN_ID)

if echo "$APPROVAL" | jq -e '.approvalNeeded' > /dev/null; then
  # 2. Approve
  SIGNED=$(synth moonpay transaction sign \
    --to "$(echo $APPROVAL | jq -r '.transaction.to')" \
    --data "$(echo $APPROVAL | jq -r '.transaction.data')" \
    --value 0 --chainId $CHAIN_ID)
  synth moonpay transaction send \
    --signedTransaction "$(echo $SIGNED | jq -r '.signedTransaction')" \
    --chainId $CHAIN_ID
fi

# 3. Quote
QUOTE=$(synth uniswap quote \
  --tokenIn $TOKEN_IN --tokenOut $TOKEN_OUT \
  --amount $AMOUNT --chainId $CHAIN_ID --swapper $SWAPPER)

# 4. Sign permit
PERMIT_DATA=$(echo "$QUOTE" | jq -c '.permitData')
SIG=$(synth moonpay message sign --typedData "$PERMIT_DATA" | jq -r '.signature')

# 5. Build swap tx
SWAP_TX=$(synth uniswap swap \
  --tokenIn $TOKEN_IN --tokenOut $TOKEN_OUT \
  --amount $AMOUNT --chainId $CHAIN_ID \
  --swapper $SWAPPER --signature "$SIG")

# 6. Sign + send
SIGNED=$(synth moonpay transaction sign \
  --to "$(echo $SWAP_TX | jq -r '.to')" \
  --data "$(echo $SWAP_TX | jq -r '.data')" \
  --value "$(echo $SWAP_TX | jq -r '.value')" \
  --chainId $CHAIN_ID)

synth moonpay transaction send \
  --signedTransaction "$(echo $SIGNED | jq -r '.signedTransaction')" \
  --chainId $CHAIN_ID
```

## Key concepts

| Concept | What it means |
|---------|---------------|
| **Unsigned tx** | `{ to, data, value, chainId }` — the universal handoff between protocol CLIs and signer CLIs |
| **Permit2** | Uniswap's off-chain approval mechanism — sign a typed data message instead of an on-chain approve |
| **EIP-712** | The standard for structured off-chain signing used by Permit2 |
| **Composition** | Each CLI call is independent; data flows between them as JSON |
