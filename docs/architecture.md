# Architecture

## Positioning

Synthesis is the execution layer for agents.

- Model companies build reasoning engines.
- Synthesis builds deterministic execution primitives.

> **LLMs think. Synthesis acts.**

## System model: Tools → Skills → Workflows

### 1) Tools (raw powers)
Standalone protocol and wallet/signing CLIs.

Examples:
- Protocol tools: `uniswap`, `lido`, `8004`, `filecoin`
- Execution tools: `ows`, `moonpay`

### 2) Skills (probabilistic composition)
`SKILL.md` docs teach an agent how to use tools and chain outputs.

Skills are powerful, but probabilistic by nature:
- language interpretation
- model judgment
- variable reliability across prompts/models

### 3) Workflows (deterministic composition)
`synth run <workflow>` hardens a composition into exact commands, exact order, typed outputs, and repeatable behavior.

This is the key architectural move:

**Probabilistic (skills) → Deterministic (workflows)**

## What `synth` does

`synth` is intentionally thin:

1. Routes top-level commands to child CLIs
2. Ships bundled skills
3. Runs built-in workflows that orchestrate child CLI calls

Child CLIs remain canonical for protocol logic.

## Routing model

`synth <command> [...args]` resolves and forwards to the child package binary.

- route lookup via `ROUTES` in `src/cli.ts`
- resolve `<package>/package.json`
- read `bin` entry
- run `node <bin> ...args`

No protocol-specific business logic in the router path.

## Output contracts and execution split

### Shared contract principle
Composition works through structured machine-readable output contracts.

For EVM-oriented protocol CLIs, the common handoff is unsigned tx JSON:

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0",
  "chainId": 1
}
```

For Filecoin, the contract is a Filecoin-native unsigned message envelope.

### Signer-agnostic protocol CLIs
Protocol CLIs should:
- build tx/message artifacts
- emit structured JSON
- avoid binding to one signer backend

### Execution flow
Workflows cover end-to-end paths:

**create tx → sign → broadcast**

Standard happy path:
- build tx with protocol CLI
- sign via OWS
- broadcast via MoonPay

## Permit2 composition example

Typical Uniswap-style flow:

1. protocol CLI returns `permitData` (typed data)
2. signer CLI signs typed data
3. protocol CLI builds swap tx using permit signature
4. signer CLI signs tx
5. execution backend broadcasts tx

This is exactly where skills help first, then workflows harden.

## Design rules

1. **Child CLIs are canonical** — protocol logic belongs in child repos
2. **Structured JSON is the interface** — no hidden shared runtime coupling
3. **Protocol CLIs stay signer-agnostic** — unsigned artifacts out, no wallet lock-in
4. **Workflows harden repetition** — move common paths from docs to executable primitives
5. **Be explicit about state vs direction** — shipped behavior vs target architecture must be clearly separated
