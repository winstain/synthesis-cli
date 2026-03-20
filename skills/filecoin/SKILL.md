---
name: filecoin
description: Interact with the Filecoin network and IPFS. Use when an agent needs chain data, balances, miner info, actor state, IPFS content access, or unsigned Filecoin message building.
---

# Filecoin CLI

Filecoin chain queries, IPFS content operations, and unsigned message building.

## Commands

### `filecoin chain`

```bash
filecoin chain
```

Returns head, network version, network name, and base fee.

### `filecoin balance`

```bash
filecoin balance --address f1xxx
```

### `filecoin miner`

```bash
filecoin miner --address f01234
```

### `filecoin actor`

```bash
filecoin actor --address f1xxx
```

### `filecoin address`

```bash
filecoin address --address f1xxx
```

Resolves a Filecoin address to its ID address.

### `filecoin ipfs`

#### Resolve gateway metadata

```bash
filecoin ipfs resolve --cid bafy...
```

#### Fetch content

```bash
filecoin ipfs cat --cid bafy...
```

### `filecoin message`

Build a raw unsigned Filecoin message:

```bash
filecoin message build --from f1... --to f01234 --value 0 --method 2 --params <base64>
```

### `filecoin transfer`

Build a simple FIL transfer message:

```bash
filecoin transfer --from f1... --to f1... --value 1000000000000000000
```

If nonce/gas fields are omitted, the CLI fetches or estimates them from RPC.

## Output contract

`message build` and `transfer` return a stable unsigned Filecoin message envelope for downstream signing/execution systems.

## MCP server

```bash
filecoin mcp
```

Representative tools include:
- `filecoin_chain`
- `filecoin_balance`
- `filecoin_miner`
- `filecoin_actor`
- `ipfs_resolve`
- `ipfs_cat`

## Notes

- Filecoin uses `f`-prefixed addresses.
- This CLI is both read-oriented and message-builder-oriented.
- IPFS support here is gateway-based resolution and fetch, not full pin/add lifecycle.
