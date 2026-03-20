# synthesis-cli

[![npm version](https://img.shields.io/npm/v/synthesis-cli)](https://www.npmjs.com/package/synthesis-cli)
[![CI](https://github.com/winstain/synthesis-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/winstain/synthesis-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A thin umbrella CLI that composes standalone protocol CLIs and wallet/signing CLIs into full on-chain workflows for agents.

Standalone protocol CLIs are useful, but they are not the end state. The real goal is to give agents practical powers in the terminal: inspect state, build transactions, sign messages, sign transactions, broadcast transactions, and coordinate multi-step on-chain actions through one install and one set of skills.

## The idea

Each protocol gets its own CLI. Each CLI can stand on its own, but the point is not to collect isolated command-line toys. `synth` routes to them and the bundled skills teach agents how to compose them into real workflows.

That is the product thesis:
- **tools** give agents powers
- **skills** teach agents how to combine those powers
- **synth** puts the whole stack behind one install

The longer-term vision is a kind of **superapp for agents**, but not in the human-UI sense. Agents do not need a WeChat-style interface. They need reliable tools, structured outputs, and a terminal-native workflow substrate.

The CLIs compose through shared structured contracts: **unsigned transaction JSON** for EVM flows, and protocol-native structured envelopes where needed.

```
synth uniswap quote → permitData → synth moonpay message sign → signature
                                                                     ↓
                    synth uniswap swap ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
                         ↓
                    { to, data, value, chainId }
                         ↓
                    synth moonpay tx sign → synth moonpay tx send → ✓ confirmed
```

**This is real.** A 0.1 USDC.e → USDT swap was executed on Polygon entirely through CLI composition — no UI, no SDK glue, just pipes and JSON.

## Install

```bash
npm i -g synthesis-cli
```

## Usage

```bash
synth <moonpay|ows|uniswap|lido|8004|filecoin> [...args]
synth run <workflow> [--plan] [--key value ...]
```

```bash
synth uniswap swap --help
synth lido stake 1
synth 8004 status
synth moonpay transaction sign --help
```

### Utility commands

```bash
synth list         # List registered child CLIs
synth versions     # Show all versions
synth doctor       # Health check — verify all child CLIs resolve
synth skills       # List bundled agent skills
synth skills path  # Print the skills directory
synth run list     # List built-in workflows
```

## Workflow runner

`synth run` is the orchestration substrate. Workflows call child CLIs, capture structured JSON output, and return a typed workflow state envelope that agents can consume programmatically.

Every workflow supports `--plan` mode (show what will happen, no side effects) and `run` mode (actually execute child CLI commands).

### Built-in workflows

| Workflow | What it does |
|----------|-------------|
| `doctor-summary` | Structured health snapshot of all child CLIs |
| `uniswap-swap` | Check approval → quote → return unsigned tx + permit data |
| `lido-stake` | Build unsigned Lido staking transaction |
| `lido-wrap` | Build unsigned stETH → wstETH wrap transaction |
| `agent-register` | Build unsigned ERC-8004 agent registration transaction |

### Examples

```bash
# List available workflows
synth run list

# Plan mode — see what commands will run without executing anything
synth run uniswap-swap --plan \
  --token-in 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --token-out 0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  --amount 1000000 --chain-id 1 --wallet 0xYOUR_ADDRESS

# Run mode — actually call child CLIs and return structured output
synth run uniswap-swap \
  --token-in 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --token-out 0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  --amount 1000000 --chain-id 1 --wallet 0xYOUR_ADDRESS

# Lido staking
synth run lido-stake --amount 1.0 --chain-id 1 --wallet 0xYOUR_ADDRESS

# Agent registration (ERC-8004)
synth run agent-register --uri https://example.com/agent.json --chain-id 1 --wallet 0xYOUR_ADDRESS
```

### Workflow state envelope

All workflows return a JSON state object:

```json
{
  "workflow": "uniswap-swap",
  "status": "needs_signature",
  "mode": "run",
  "steps": ["Validate inputs", "Run check-approval", "Run quote", "Return unsigned tx"],
  "artifacts": { "approval": {}, "quote": {}, "tx": {}, "permitData": {} },
  "nextAction": "Sign and send the transaction using your signer backend."
}
```

Statuses: `planned`, `needs_approval`, `needs_signature`, `ready_to_send`, `completed`, `failed`.

## How it works

`synth` is a **router, not a runtime**. It:

1. Looks up the command in a `ROUTES` map
2. Resolves the child CLI's binary from its installed `node_modules`
3. Forwards all arguments directly via `spawnSync`

No protocol logic lives in this package. Child CLIs are the primitives.

### The unsigned tx contract

Protocol CLIs (like `uniswap`, `lido`) produce unsigned transactions:

```json
{
  "to": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
  "data": "0x3593564c000000...",
  "value": "0",
  "chainId": 137
}
```

Signer CLIs (like `moonpay`) consume them. This is the universal handoff that makes composition work.

### Example: token swap in 6 commands

```bash
# 1. Check if approval is needed
synth uniswap check-approval --token $TOKEN_IN --amount $AMOUNT --chain 137 --wallet 0xADDR

# 2. Approve (if needed) — sign + send the approval tx
synth moonpay transaction sign --wallet-id <wid> --to $APPROVAL_TO --data $APPROVAL_DATA --value 0 --chain-id 137
synth moonpay transaction send --wallet-id <wid> --signed-tx $SIGNED

# 3. Get quote + Permit2 data
synth uniswap swap --from $TOKEN_IN --to $TOKEN_OUT --amount $AMOUNT --chain 137 --wallet 0xADDR

# 4. Sign the Permit2 EIP-712 message
synth moonpay message sign --wallet-id <wid> --typedData "$PERMIT_DATA"

# 5. Build the swap tx (with permit signature)
synth uniswap swap --from $TOKEN_IN --to $TOKEN_OUT --amount $AMOUNT --chain 137 --wallet 0xADDR --permit-signature $SIG

# 6. Sign + send the swap tx
synth moonpay transaction sign --wallet-id <wid> --to $SWAP_TO --data $SWAP_DATA --value 0 --chain-id 137
synth moonpay transaction send --wallet-id <wid> --signed-tx $SIGNED
```

See [docs/guides/first-swap.md](./docs/guides/first-swap.md) for the full walkthrough with example output.

## Child CLIs

| CLI | Package | What it does |
|-----|---------|-------------|
| `uniswap` | `uniswap-cli` | Token swaps, quotes, approval checks, Permit2 signing |
| `lido` | `lido-cli` | Liquid staking: stake ETH, wrap/unwrap stETH, withdrawals |
| `8004` | `8004-cli` | ERC-8004 agent identity: register, lookup, rate, reputation |
| `filecoin` | `filecoin-cli` | Filecoin storage deals and network operations |
| `moonpay` | `@moonpay/cli` | Wallet operations, transaction signing, message signing |
| `ows` | `@open-wallet-standard/core` | Chain-agnostic wallet, signing, and transaction send |

## Docs

- **[Architecture](./docs/architecture.md)** — Philosophy, routing, output contracts, Permit2 composition, and MCP expectations
- **[Narrative](./docs/narrative.md)** — Why this started as a simple Uniswap CLI and became a terminal-native tool/skill stack for agents
- **[Prize Strategy](./docs/prize-strategy.md)** — Which tracks matter, what they require, and how roadmap work maps to deliverables
- **[Collaboration Notes](./docs/collaboration.md)** — Anonymized human ↔ agent collaboration source material for submission and demo copy
- **[First Swap Guide](./docs/guides/first-swap.md)** — Step-by-step Uniswap swap walkthrough
- **[Adding a CLI](./docs/guides/adding-a-cli.md)** — How to add a new child CLI to the stack
- **[Submission Readiness](./docs/submission-readiness.md)** — Demo checklist and how to present the stack cleanly
- **[Roadmap](./docs/roadmap.md)** — Current state and what's next

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
