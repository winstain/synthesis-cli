# Contributing to Synthesis

Synthesis is the superapp for agents: a composition platform where tools, skills, and workflows evolve together.

## Architecture you’re contributing to

**Tools → Skills → Workflows**

- **Tools**: standalone protocol/wallet CLIs
- **Skills**: probabilistic composition guidance (`SKILL.md`)
- **Workflows**: deterministic, executable compositions (`synth run`)

Design goal: move common high-value flows from “agent interprets markdown” to “agent executes deterministic primitive.”

## Contribution path (today)

1. Build or improve a child CLI
2. Add/update the corresponding skill
3. Add/update a workflow for repeatable paths
4. Open a PR

## Rules for child CLIs

- Standalone npm package (independent repo)
- Structured JSON output by default
- Signer-agnostic tx/message builders
- `mcp` subcommand exposed
- No protocol logic in `synthesis-cli`

### EVM unsigned tx contract

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0",
  "chainId": 1
}
```

Filecoin intentionally uses a Filecoin-native unsigned envelope instead.

## Rules for skills

Skills should explain:
- when to use the tool
- required inputs
- exact command patterns
- output handoff to next step
- where signing/broadcast happens

Skills are guidance. They are not deterministic guarantees.

## Rules for workflows

Workflows should:
- call child CLIs, not duplicate protocol logic
- support `--plan` mode
- return typed workflow state/artifacts
- make failure states explicit

Current workflow standard:
- executable paths require `--wallet`
- workflows execute end-to-end create → sign → broadcast
- OWS signs and MoonPay broadcasts on the happy path

## Development

```bash
npm install
npm run build
npm run test:coverage
```

Keep tests green and maintain full coverage expectations already enforced in this repo.
