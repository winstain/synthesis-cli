# Roadmap

Synthesis is moving from a useful CLI bundle to a true execution layer for agents.

## North star

- **Superapp for agents**
- **LLMs think. Synthesis acts.**
- **Probabilistic → Deterministic**

Concretely: move common skill-based compositions into robust workflows with typed state and repeatable execution.

## Current state (shipped)

- Thin router (`synth`) over standalone child CLIs
- Bundled skills discoverable via `synth skills`
- Workflow runner (`synth run`) with `--plan` mode
- Built-in workflows:
  - `doctor-summary`
  - `uniswap-swap`
  - `lido-stake`
  - `lido-wrap`
  - `agent-register`
- Structured workflow state envelopes
- Signer-agnostic protocol CLI posture in docs/architecture

## Next priorities

### 1) Harden contracts across repos
- Lock canonical output contracts
- Keep EVM and Filecoin contracts clearly separated
- Tighten typed-data and tx handoff conventions

### 2) Expand deterministic workflow coverage
- Add high-value end-to-end workflow paths
- Improve resume/error handling and artifacts
- Keep `--plan` first-class

### 3) Expand execution-layer reliability
Keep the default workflow path consistent:
**create tx → OWS sign → MoonPay broadcast**.

### 4) Grow platform by composition
Contribution path remains:
1. add CLI
2. add skill
3. add workflow
4. open PR

## Future-looking (not shipped)

- installable workflow packs
- workflow registry
- app-store-like ecosystem for agent actions

These are directional goals, not current product claims.

## Guardrail

If the parent repo starts reimplementing protocol logic from child CLIs, the architecture is drifting.
