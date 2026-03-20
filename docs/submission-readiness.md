# Submission / Demo Readiness

This stack is being built for **The Synthesis** hackathon workflow.

## What the demo should prove

1. **Composable protocol CLIs exist as real products**
   - `uniswap-cli`
   - `lido-cli`
   - `8004-cli`
   - `filecoin-cli`
2. **`synthesis-cli` is a real umbrella router**, not a fake wrapper
3. **The stack works both ways**
   - CLI composition through `synth`
   - agent-native tool exposure through `mcp`
4. **Structured contracts are the interface**
   - EVM CLIs emit unsigned tx JSON
   - Filecoin emits unsigned message envelopes
   - wallet/signing CLIs like OWS (and optionally MoonPay) sign and broadcast where appropriate

## Minimum live-demo checklist

### Router layer
- `synth --help`
- `synth list`
- `synth versions`
- `synth doctor`
- `synth skills`

### Child CLI proof
- `synth uniswap --help`
- `synth lido --help`
- `synth 8004 --help`
- `synth filecoin --help`
- `synth ows --help`

### MCP proof
- `uniswap mcp`
- `lido mcp`
- `8004 mcp`
- `filecoin mcp`
- `ows sign message --help` (wallet/signing backend proof)

You do not need to keep these running for a full stage demo, but each should exist and start cleanly.

### Workflow proof
Pick one or two flows and show them end to end:

#### Best primary demo
**Uniswap ERC-20 swap flow**
- approval check
- quote / permit data
- Permit2 signing with OWS
- final unsigned tx
- sign + send

Why this is best:
- it shows multi-step composition
- it shows off-chain + on-chain signing
- it proves the child CLI split is real

#### Best secondary demo
**Lido stake / wrap flow**
- build unsigned tx
- sign + send

#### Identity / credibility demo
**8004 register / lookup / reputation**
- shows the agent-native identity layer
- aligns directly with Synthesis' ERC-8004 framing

## Messaging for judges / submission

### The core claim

> Synthesis is a composition-first on-chain CLI system for agents.
> Each protocol gets its own standalone CLI.
> `synth` is the thin router.
> Skills teach agents how to combine those tools into real workflows.
> Shared structured outputs let humans and agents collaborate without forcing everything into one monolith or one UI.

### The narrative arc

Use this arc when explaining the project:

1. it started as a simple Uniswap CLI for agent harnesses like OpenClaw / Claude Code
2. that immediately exposed missing capabilities: wallets, signing, and multi-step coordination
3. wallet/signing CLIs like OWS became the default execution layer, with MoonPay as an optional alternate backend
4. more protocol CLIs became useful as reusable primitives
5. the real product became the combination of **tools + skills + one install**
6. the long-term vision is a terminal-native superapp for agents, not a human-style UI shell

### What not to claim
- do not claim `synth` contains protocol logic
- do not imply Filecoin uses the same EVM tx contract
- do not present the system as only shell-based if MCP is part of the story
- do not overstate the standalone CLIs as the final product; they are the primitives that make the larger agent workflow system possible

## Readiness standard

For submission, the stack should satisfy all of the following:

- child CLIs have working READMEs
- child CLIs expose `mcp`
- examples in bundled skills match the real command surfaces
- `synth doctor` passes
- `synthesis-cli` docs describe the actual architecture being demoed

## Nice-to-have before submission

- capture one polished transcript of a real Uniswap or Lido flow
- capture one proof artifact for ERC-8004 / registration
- ensure repo READMEs point clearly to the umbrella story
