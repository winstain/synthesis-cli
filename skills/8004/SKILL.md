---
name: 8004
description: Manage on-chain agent identity and reputation via ERC-8004. Use when an agent needs to register, look up, rate, inspect reputation, or inspect validation state.
---

# ERC-8004 CLI

On-chain agent identity, reputation, and validation via ERC-8004.

## Commands

### `8004 lookup`

```bash
8004 lookup --agent 1 --chain base
```

Looks up an agent ID and returns owner, wallet, URI, and any parsed registration data.

### `8004 register`

```bash
8004 register --uri ipfs://bafy... --from 0xYourAddress --chain base
```

Builds an unsigned tx to register a new agent.

### `8004 rate`

```bash
8004 rate --agent 1 --value 95 --decimals 0 --tag1 quality --tag2 reliability --from 0xYourAddress --chain base
```

Builds an unsigned tx to submit feedback for an agent.

Optional metadata fields:
- `--endpoint <url>`
- `--feedback-uri <uri>`

### `8004 reputation`

#### Aggregated summary

```bash
8004 reputation summary --agent 1
```

#### Clients who rated the agent

```bash
8004 reputation clients --agent 1
```

#### Read a specific feedback entry

```bash
8004 reputation feedback --agent 1 --client 0xClientAddress --index 0
```

### `8004 validation`

#### Check a validation request

```bash
8004 validation status --hash 0x...
```

#### List validations for an agent

```bash
8004 validation list --agent 1
```

#### Aggregated validation summary

```bash
8004 validation summary --agent 1
```

### `8004 stats`

```bash
8004 stats
```

### `8004 chains`

```bash
8004 chains
```

## Output contract

Write-oriented commands like `register` and `rate` return unsigned EVM tx JSON:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 8453 }
```

If you want to use OWS, convert that base tx object in a skill/workflow layer:
1. take the returned `{ to, data, value, chainId, from? }`
2. fetch `nonce`, `gas`, `maxFeePerGas`, and `maxPriorityFeePerGas`
3. serialize an unsigned EIP-1559 transaction
4. pass the resulting hex to `ows sign tx` or `ows sign send-tx`

Reference:
- https://github.com/open-wallet-standard/core/blob/main/docs/02-signing-interface.md

## MCP server

```bash
8004 mcp
```

Representative tools include:
- `erc8004_lookup`
- `erc8004_stats`
- `erc8004_reputation_summary`
- `erc8004_register`
- `erc8004_rate`
- `erc8004_validation_status`

## Notes

- Base is the default network.
- Agent IDs are numeric IDs, not just wallet addresses.
- Registration metadata is usually referenced by URI (`ipfs://`, `https://`, or `data:`).
