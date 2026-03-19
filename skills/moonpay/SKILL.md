---
name: moonpay
description: Sign transactions, sign messages, and manage wallets via MoonPay. Use when an agent needs to sign unsigned tx JSON from other CLIs, sign EIP-712 typed data (e.g. Permit2), or broadcast signed transactions.
---

# MoonPay CLI

The **signer and wallet layer**. Other CLIs build unsigned transactions — MoonPay signs and broadcasts them.

## Commands

### Wallet Management

```bash
moonpay wallet create --network polygon
moonpay wallet list
moonpay wallet retrieve --wallet-id <id>
moonpay wallet delete --wallet-id <id>
```

### Transaction Signing & Sending

Sign an unsigned transaction (from any protocol CLI):

```bash
moonpay transaction sign \
  --wallet-id <id> \
  --to 0xContractAddress \
  --data 0xCalldata \
  --value 0 \
  --chain-id 137
```

Broadcast a signed transaction:

```bash
moonpay transaction send --wallet-id <id> --signed-tx 0xSignedTx
```

List and retrieve past transactions:

```bash
moonpay transaction list --wallet-id <id>
moonpay transaction retrieve --transaction-id <id>
```

### Message Signing

Sign a plain message:

```bash
moonpay message sign --wallet-id <id> --message "hello"
```

Sign EIP-712 typed data (e.g. Permit2 from Uniswap):

```bash
moonpay message sign --wallet-id <id> --typedData '{"domain":{},"types":{},"values":{}}'
```

Returns `{ "signature": "0x..." }`.

## Key Concepts

- **This is the signer**: MoonPay does not build protocol-specific transactions. It receives unsigned tx JSON (`{ to, data, value, chainId }`) from other CLIs and signs + broadcasts it.
- **EIP-712 typed data**: Used for off-chain signatures like Uniswap's Permit2. Pass the `permitData` object from `uniswap quote` directly to `moonpay message sign --typedData`.
- **Wallet lifecycle**: Create wallets per-network. Each wallet has a `wallet-id` used in all signing operations.
- **Two-step send**: `transaction sign` returns a signed tx hex → `transaction send` broadcasts it. Some flows combine these.
