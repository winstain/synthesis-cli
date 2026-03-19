---
name: lido
description: Stake ETH and manage stETH/wstETH positions via Lido. Use when an agent needs to stake, wrap, unwrap, withdraw, or check Lido balances and rewards.
---

# Lido CLI

ETH staking and liquid staking token management via Lido.

## Commands

### `lido stake`

Stake ETH to receive stETH.

```bash
lido stake --amount 1.0 --wallet 0xYourAddress
```

Output:

```json
{ "to": "0x...", "data": "0x...", "value": "1000000000000000000", "chainId": 1 }
```

### `lido wrap`

Wrap stETH into wstETH.

```bash
lido wrap --amount 1.0 --wallet 0xYourAddress
```

Output:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 1 }
```

### `lido unwrap`

Unwrap wstETH back to stETH.

```bash
lido unwrap --amount 1.0 --wallet 0xYourAddress
```

Output:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 1 }
```

### `lido withdraw`

Request withdrawal from stETH back to ETH. Enters the withdrawal queue.

```bash
lido withdraw --amount 1.0 --wallet 0xYourAddress
```

Output:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 1 }
```

### `lido balance`

Check stETH and wstETH balances.

```bash
lido balance --wallet 0xYourAddress
```

### `lido stats`

Show Lido protocol statistics (APR, total staked, etc.).

```bash
lido stats
```

### `lido rewards`

Show staking rewards for a wallet.

```bash
lido rewards --wallet 0xYourAddress
```

## Key Concepts

- **stETH**: Rebasing token — balance updates daily to reflect staking rewards.
- **wstETH**: Non-rebasing wrapper — value appreciates relative to stETH. Better for DeFi composability.
- **Withdrawal queue**: Withdrawals are not instant. `lido withdraw` submits a request; completion depends on the queue.
- **Output contract**: `stake`, `wrap`, `unwrap`, `withdraw` output `{ to, data, value, chainId }` — unsigned transaction JSON.
