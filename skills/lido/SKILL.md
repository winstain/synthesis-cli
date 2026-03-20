---
name: lido
description: Stake ETH and manage stETH/wstETH positions via Lido. Use when an agent needs to stake, wrap, unwrap, withdraw, or inspect Lido balances, rewards, and queue state.
---

# Lido CLI

ETH staking and liquid staking token management via Lido.

## Commands

### `lido balance`

```bash
lido balance --wallet 0xYourAddress
```

Returns ETH, stETH, wstETH, and exchange-rate-aware totals.

### `lido stats`

```bash
lido stats
```

Returns protocol-level staking and withdrawal queue stats.

### `lido rewards`

```bash
lido rewards --wallet 0xYourAddress
```

Returns protocol reward context and, optionally, a wallet-level position summary.

### `lido stake`

```bash
lido stake --amount 1.0 --wallet 0xYourAddress
```

Builds an unsigned staking transaction:

```json
{ "to": "0x...", "data": "0x...", "value": "1000000000000000000", "chainId": 1 }
```

Optional:
- `--referral <address>`

### `lido wrap`

```bash
lido wrap --amount 1.0 --wallet 0xYourAddress
```

Builds the wrap tx. If stETH approval may be needed, use:

```bash
lido wrap --amount 1.0 --wallet 0xYourAddress --with-approval
```

That returns an approval tx followed by the wrap tx.

### `lido unwrap`

```bash
lido unwrap --amount 1.0 --wallet 0xYourAddress
```

Builds the unwrap tx.

### `lido withdraw`

#### Check withdrawal status

```bash
lido withdraw status --wallet 0xYourAddress
```

#### Build a withdrawal request tx

```bash
lido withdraw request --amount 1.0 --wallet 0xYourAddress
```

Builds an unsigned tx for entering the withdrawal queue.

## Output contract

Write-oriented commands return unsigned EVM tx JSON:

```json
{ "to": "0x...", "data": "0x...", "value": "0", "chainId": 1 }
```

These should be signed and broadcast by a signer backend.

If you want to use OWS, do the conversion in a skill/workflow layer rather than expecting the child CLI to emit OWS-specific payloads:
1. take the returned `{ to, data, value, chainId, from? }`
2. fetch `nonce`, `gas`, `maxFeePerGas`, and `maxPriorityFeePerGas`
3. serialize an unsigned EIP-1559 transaction
4. pass the resulting hex to `ows sign tx` or `ows sign send-tx`

Reference:
- https://github.com/open-wallet-standard/core/blob/main/docs/02-signing-interface.md

## MCP server

```bash
lido mcp
```

Representative tools include:
- `lido_balance`
- `lido_stats`
- `lido_rewards`
- `lido_stake`
- `lido_wrap`
- `lido_unwrap`
- `lido_withdrawal_status`
- `lido_withdraw_request`

## Key concepts

- `stETH` rebases
- `wstETH` is non-rebasing and better for DeFi composition
- withdrawals are queued, not instant
