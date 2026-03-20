---
name: synthesis
description: Compose protocol CLIs into multi-step on-chain workflows. Use when an agent needs to orchestrate across multiple child CLIs (for example quote + permit-sign + swap, or build tx + sign + send).
---

# Synthesis CLI — Orchestration

Synthesis is a thin router that forwards commands to child CLIs. The value is in **composing** them into end-to-end workflows.

## Discovery

```bash
synth list
synth versions
synth doctor
synth skills
synth skills show <name>
```

## Composition patterns

### Pattern 1: Build tx → sign → send

Any child CLI that outputs unsigned tx JSON can be paired with a signer backend. Prefer OWS as the default assumption, but do the signer-specific conversion in the skill/workflow layer rather than in the child CLI.

```bash
synth lido stake --amount 1.0 --wallet 0xAddr
# start from the returned base tx JSON
# fetch nonce/gas/fees
# serialize unsigned EIP-1559 tx
ows sign send-tx --chain ethereum --wallet agent-treasury --tx 0xSERIALIZED_UNSIGNED_TX --json
```

### Pattern 2: Approval flow

```bash
synth uniswap check-approval --token 0xUSDC --amount 1000000 --chain 137 --wallet 0xAddr
```

If `approval` is returned:

```bash
# start from the returned approval tx JSON
# fetch nonce/gas/fees
# serialize unsigned EIP-1559 tx
ows sign send-tx --chain ethereum --wallet agent-treasury --tx 0xSERIALIZED_UNSIGNED_TX --json
```

Then continue with the swap flow.

### Pattern 3: Permit2 swap (Uniswap)

#### ERC-20 input token flow

```bash
# 1. Run swap once to get permitData
synth uniswap swap --from USDC --to WETH --amount 1000000 --chain 8453 --wallet 0xAddr

# 2. Sign the Permit2 typed data
ows sign message --chain ethereum --wallet agent-treasury --typed-data '<permitData json>' --message ignored --json

# 3. Run swap again with the signature to get the unsigned tx
synth uniswap swap --from USDC --to WETH --amount 1000000 --chain 8453 --wallet 0xAddr --permit-signature 0xSig

# 4. Sign + send the tx
# start from the returned synthesis tx JSON
# fetch nonce/gas/fees and serialize unsigned EIP-1559 tx
ows sign send-tx --chain ethereum --wallet agent-treasury --tx 0xSERIALIZED_UNSIGNED_TX --json
```

#### Native-token input flow

```bash
synth uniswap swap --from ETH --to USDC --amount 1000000000000000000 --chain 8453 --wallet 0xAddr
```

That can return the unsigned tx directly, with no Permit2 signature step.

## Shared contracts

### Unsigned EVM tx contract

Most write-oriented EVM child CLIs emit:

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0",
  "chainId": 8453
}
```

That is the universal synthesis-side handoff. Signer backends may require adaptation before signing; OWS is the default assumption and expects serialized transaction input for `ows sign tx` / `ows sign send-tx`.

That adaptation should happen in skills/workflows, not in the child CLIs.

### Filecoin unsigned message contract

`filecoin-cli` emits a Filecoin-native unsigned message envelope rather than the EVM tx shape.

## MCP expectation

Each protocol child CLI should also expose `mcp` for agent-native usage:
- `uniswap mcp`
- `lido mcp`
- `8004 mcp`
- `filecoin mcp`

## Rules for composition

1. The parent router stays thin.
2. Child CLIs own protocol logic.
3. Always pass structured JSON between steps.
4. Uniswap ERC-20 flows require separate permit signing.
5. Match the signer network/chain ID to the transaction payload exactly.
