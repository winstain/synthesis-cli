# Your First Swap

A practical end-to-end Uniswap swap flow in Synthesis.

## Product-truth defaults

- executable flows require `--wallet`
- protocol CLIs build unsigned tx artifacts
- **OWS signs**
- **MoonPay broadcasts**
- happy path is full **create → sign → broadcast**

## Prerequisites

```bash
npm i -g synthesis-cli
synth doctor
```

You need:
- wallet address for `--wallet`
- funded wallet on target chain
- OWS signer wallet configured
- MoonPay configured for broadcast

---

## Step 1) Check approval

```bash
synth uniswap check-approval \
  --token 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --amount 100000 \
  --chain 137 \
  --wallet 0xYourWalletAddress
```

If approval is required, sign with OWS and send with MoonPay.

---

## Step 2) Quote + Permit2 data

```bash
synth uniswap quote \
  --from 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --to 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --amount 100000 \
  --chain 137 \
  --wallet 0xYourWalletAddress
```

Capture `permitData` from output.

---

## Step 3) Sign Permit2 message (OWS)

```bash
synth ows sign message \
  --wallet agent \
  --chain eip155:137 \
  --typed-data '{"domain":{},"types":{},"values":{}}' \
  --message ignored \
  --json
```

Use resulting `.signature` as `--permit-signature` in the next step.

---

## Step 4) Build unsigned swap tx

```bash
synth uniswap swap \
  --from 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --to 0xc2132D05D31c914a87C6611C10748AEb04B58e8F \
  --amount 100000 \
  --chain 137 \
  --wallet 0xYourWalletAddress \
  --permit-signature 0x...
```

This returns unsigned tx JSON / tx payload.

---

## Step 5) Sign tx (OWS)

```bash
synth ows sign tx \
  --wallet agent \
  --chain eip155:137 \
  --tx 0xUNSIGNED_TX \
  --json
```

---

## Step 6) Broadcast (MoonPay)

```bash
synth moonpay transaction send \
  --wallet-id agent \
  --signed-tx 0xSIGNED_TX
```

You should receive a tx hash and confirmation state.

---

## Full scripted skeleton

```bash
#!/usr/bin/env bash
set -euo pipefail

CHAIN_ID=137
ADDR=0xYourWalletAddress

# 1) approval check
APPROVAL=$(synth uniswap check-approval --token 0xUSDC --amount 100000 --chain $CHAIN_ID --wallet $ADDR)

# (if needed) sign approval tx with OWS + broadcast with MoonPay

# 2) quote
QUOTE=$(synth uniswap quote --from 0xUSDC --to 0xUSDT --amount 100000 --chain $CHAIN_ID --wallet $ADDR)
PERMIT_DATA=$(echo "$QUOTE" | jq -c '.permitData')

# 3) permit signature (OWS)
SIG=$(synth ows sign message --wallet agent --chain eip155:$CHAIN_ID --typed-data "$PERMIT_DATA" --message ignored --json | jq -r '.signature')

# 4) build tx
SWAP_TX=$(synth uniswap swap --from 0xUSDC --to 0xUSDT --amount 100000 --chain $CHAIN_ID --wallet $ADDR --permit-signature "$SIG")
UNSIGNED=$(echo "$SWAP_TX" | jq -r '.tx // .unsignedTx // .rawTx')

# 5) OWS sign
SIGNED=$(synth ows sign tx --wallet agent --chain eip155:$CHAIN_ID --tx "$UNSIGNED" --json | jq -r '.signedTx')

# 6) MoonPay broadcast
synth moonpay transaction send --wallet-id agent --signed-tx "$SIGNED"
```
