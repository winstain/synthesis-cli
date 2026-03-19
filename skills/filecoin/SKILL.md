---
name: filecoin
description: Interact with the Filecoin network and IPFS. Use when an agent needs chain data, balances, storage provider info, or IPFS content operations.
---

# Filecoin CLI

Filecoin chain queries, IPFS content operations, and storage provider info.

## Commands

### `filecoin chain`

Query chain state (head, block, tipset).

```bash
filecoin chain head
filecoin chain block <cid>
```

### `filecoin balance`

Check FIL balance for an address.

```bash
filecoin balance --address f1xxx
```

### `filecoin miner`

Query storage provider (miner) info.

```bash
filecoin miner --id f0123456
```

### `filecoin actor`

Look up actor state on-chain.

```bash
filecoin actor --address f1xxx
```

### `filecoin ipfs`

IPFS content operations — add, cat, pin.

```bash
filecoin ipfs add --file ./data.json
filecoin ipfs cat <cid>
filecoin ipfs pin <cid>
```

### `filecoin address`

Generate or derive Filecoin addresses.

```bash
filecoin address new
filecoin address from-eth --address 0xYourAddress
```

## Key Concepts

- **Addresses**: Filecoin uses `f`-prefixed addresses (f0, f1, f2, f3, f4). `f4` addresses map to EVM-style 0x addresses on Filecoin's FEVM.
- **Storage providers**: Formerly called "miners" — they store data and earn FIL.
- **IPFS integration**: Filecoin backs IPFS with verifiable storage deals. Content is addressed by CID.
- **Read-only**: These commands query chain state and IPFS — they don't build unsigned transactions. No signing needed.
