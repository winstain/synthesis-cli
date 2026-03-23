# synthesis-cli

[![npm version](https://img.shields.io/npm/v/synthesis-cli)](https://www.npmjs.com/package/synthesis-cli)
[![CI](https://github.com/winstain/synthesis-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/winstain/synthesis-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Synthesis is the superapp for agents.**

Not another model company. Not “like OpenAI/Anthropic.”
Synthesis is the missing execution layer those model companies would acquire.

> **LLMs think. Synthesis acts.**  
> **The execution layer is inevitable.**

## Core thesis

Foundation models build the brains. Synthesis builds the hands.

Anthropic made `SKILL.md` mainstream: a way for agents to learn tool usage. That was a major step, but skills are still probabilistic: markdown interpretation, judgment calls, and hand-wavy composition.

Synthesis pushes that composition toward deterministic execution:

- **Tools** = raw powers
- **Skills** = learned composition patterns
- **Workflows** = hardened, reusable, executable compositions

**Probabilistic → Deterministic** is the product direction.

## What this package is

`synth` is the umbrella CLI that routes to protocol and wallet/signing CLIs, ships bundled skills, and provides a workflow runner for repeatable multi-step flows.

It is intentionally thin: child CLIs own protocol logic.

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
synth moonpay transaction send --help
```

### Utility commands

```bash
synth list         # List registered child CLIs
synth versions     # Show all versions
synth doctor       # Health check — verify child CLIs resolve
synth skills       # List bundled agent skills
synth skills path  # Print the skills directory
synth run list     # List built-in workflows
```

## Architecture in one minute

### Tools → Skills → Workflows

- **Tools**: standalone protocol and wallet CLIs (`uniswap`, `lido`, `8004`, `filecoin`, `moonpay`, `ows`)
- **Skills**: markdown playbooks that teach agents how to compose tools
- **Workflows**: deterministic `synth run <workflow>` execution with typed JSON state

### Transaction contract and execution split

Protocol CLIs are signer-agnostic. They emit structured output, typically unsigned tx contracts (EVM) or protocol-native unsigned envelopes (e.g., Filecoin).

Execution split:
- child CLIs build tx/message artifacts
- workflows orchestrate full **create tx → sign → broadcast**
- OWS signs, MoonPay broadcasts

## Workflow runner

`synth run` executes reusable multi-step compositions by calling child CLIs and returning typed JSON state that agents can consume directly.

All workflows support:
- `--plan` mode (no side effects, show exact command plan)
- `run` mode (execute child commands)

### Built-in workflows

| Workflow | What it does |
|----------|-------------|
| `doctor-summary` | Structured health snapshot of child CLIs |
| `uniswap-swap` | Check approval → quote → unsigned tx + permit data |
| `lido-stake` | Build unsigned Lido staking tx |
| `lido-wrap` | Build unsigned stETH → wstETH wrap tx |
| `agent-register` | Build unsigned ERC-8004 registration tx |

### Example

```bash
# Plan mode: deterministic preview, no side effects
synth run uniswap-swap --plan \
  --token-in 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --token-out 0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  --amount 1000000 --chain-id 1 --wallet 0xYOUR_ADDRESS

# Run mode: execute child CLI steps and return structured state
synth run uniswap-swap \
  --token-in 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --token-out 0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  --amount 1000000 --chain-id 1 --wallet 0xYOUR_ADDRESS
```

## Evolution story

1. Started as a Uniswap CLI for agent harnesses
2. Agents needed wallets/signing → OWS sign + MoonPay broadcast path
3. Multi-step coordination was missing → workflow runner + plan mode
4. More protocols, same composition pattern → architecture scaled
5. The product emerged: **tools + skills + workflows + one install**

## Contribution model (today)

The platform grows through composition:

1. build a child CLI
2. add/update its skill
3. add a workflow for common deterministic paths
4. open a PR

Future direction (not shipped yet): installable workflows, registry, app-store-for-agent-actions.

## Child CLIs

| CLI | Package | Role |
|-----|---------|------|
| `uniswap` | `uniswap-cli` | Swaps, quotes, approval checks, Permit2 data |
| `lido` | `lido-cli` | Liquid staking tx builders |
| `8004` | `8004-cli` | ERC-8004 identity/reputation tx builders |
| `filecoin` | `filecoin-cli` | Filecoin unsigned message flows |
| `moonpay` | `@moonpay/cli` | Broadcast backend |
| `ows` | `@open-wallet-standard/core` | Wallet/signing backend (default signer) |

## Docs

- **[Architecture](./docs/architecture.md)** — Tools→Skills→Workflows, contracts, execution split, flow direction
- **[Narrative](./docs/narrative.md)** — Product story and positioning
- **[Submission Readiness](./docs/submission-readiness.md)** — Demo checklist and honest messaging
- **[Roadmap](./docs/roadmap.md)** — Current state vs intended direction
- **[Prize Strategy](./docs/prize-strategy.md)** — Track mapping and deliverable priorities
- **[Contributing](./docs/contributing.md)** — How to add CLIs, skills, workflows
- **[First Swap Guide](./docs/guides/first-swap.md)** — End-to-end Uniswap example

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
