---
name: ows
description: Open Wallet Standard CLI for local wallet storage, multi-chain signing, EIP-712 typed-data signing, and transaction broadcast. Use when an agent needs an open wallet/signing backend rather than a protocol-specific CLI.
---

# Open Wallet Standard CLI

OWS is a wallet/signing CLI backend for agents.

Use it when you need:
- wallet creation and local key custody
- multi-chain addresses from one wallet
- message signing
- EIP-712 typed-data signing
- transaction signing
- sign-and-broadcast flows

## Commands

### Wallets

```bash
ows wallet create --name agent-treasury
ows wallet list
ows wallet info
ows wallet delete --wallet <name> --confirm
```

### Message signing

```bash
ows sign message --chain ethereum --wallet agent-treasury --message "hello" --json
```

### EIP-712 typed-data signing

```bash
ows sign message \
  --chain ethereum \
  --wallet agent-treasury \
  --typed-data '{"types":{},"primaryType":"X","domain":{},"message":{}}' \
  --message ignored \
  --json
```

This is especially relevant for Permit2-style flows from Uniswap.

### Transaction signing

```bash
ows sign tx --chain ethereum --wallet agent-treasury --tx 0x... --json
```

Important: the shipped `ows` CLI expects a serialized transaction payload for `--tx`, not the generic synthesis unsigned tx JSON object directly.

Reference the OWS signing-interface spec when preparing txs for OWS:
- https://github.com/open-wallet-standard/core/blob/main/docs/02-signing-interface.md

### Sign and send

```bash
ows sign send-tx --chain ethereum --wallet agent-treasury --tx 0x... --json
```

Optionally override RPC:

```bash
ows sign send-tx --chain ethereum --wallet agent-treasury --tx 0x... --rpc-url https://eth.llamarpc.com --json
```

### Config

```bash
ows config show
```

## What is verified in the current CLI

The current shipped CLI surface supports:
- wallet creation
- multi-chain address derivation
- message signing
- EIP-712 typed-data signing
- tx signing
- sign-and-broadcast

## Important caveat

OWS docs describe a future policy/API-key model, but the currently shipped CLI does **not** expose `ows policy` or `ows key` commands.

So for now:
- treat OWS as a real wallet/signing backend
- do **not** assume policy enforcement is available from the shipped CLI surface

## Role in Synthesis

OWS is a wallet/signing CLI, not a protocol CLI.

That means it complements tools like:
- `uniswap-cli`
- `lido-cli`
- `8004-cli`
- `filecoin-cli`

A typical composition is:
1. protocol CLI builds unsigned transaction or typed data
2. OWS signs it
3. OWS or another execution backend broadcasts it
