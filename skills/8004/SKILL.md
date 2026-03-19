---
name: 8004
description: Manage on-chain agent identity and reputation via ERC-8004. Use when an agent needs to register, look up, rate, or validate on-chain identities.
---

# ERC-8004 CLI

On-chain agent identity, reputation, and validation via ERC-8004.

## Commands

### `8004 lookup`

Look up an agent's on-chain identity.

```bash
8004 lookup --agent 0xAgentAddress --chain ethereum
```

### `8004 register`

Register a new on-chain agent identity.

```bash
8004 register --name "my-agent" --metadata '{"type":"trading"}' --wallet 0xYourAddress --chain ethereum
```

Output:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 1 }
```

### `8004 rate`

Submit a reputation rating for an agent.

```bash
8004 rate --agent 0xAgentAddress --score 5 --comment "reliable" --wallet 0xYourAddress --chain ethereum
```

Output:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 1 }
```

### `8004 reputation`

Query an agent's reputation score.

```bash
8004 reputation --agent 0xAgentAddress --chain ethereum
```

### `8004 validation`

Validate an agent's identity claims.

```bash
8004 validation --agent 0xAgentAddress --chain ethereum
```

### `8004 stats`

Show ERC-8004 registry statistics.

```bash
8004 stats --chain ethereum
```

### `8004 chains`

List chains with ERC-8004 deployments.

```bash
8004 chains
```

## Key Concepts

- **Agent identity**: On-chain record linking an address to metadata, enabling trust and discovery.
- **Reputation**: Aggregated ratings from other agents and users.
- **Validation**: Cryptographic proof that an agent controls the registered address.
- **Output contract**: `register`, `rate` output `{ to, data, value, chainId }` — unsigned transaction JSON.
