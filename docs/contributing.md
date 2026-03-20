# Contributing to Synthesis

Synthesis is a composition-first on-chain CLI system for agents. This guide explains how the stack is structured and how to extend it.

## How the stack works

```
                        ┌─────────────────────┐
                        │    synth (router)    │
                        │  workflows + skills  │
                        └──────────┬──────────┘
                                   │
              ┌────────────┬───────┼───────┬────────────┐
              ▼            ▼       ▼       ▼            ▼
          uniswap-cli  lido-cli  8004-cli  filecoin-cli  ...
              │            │       │       │
              └────────────┴───────┴───────┘
                    unsigned tx JSON
                    { to, data, value, chainId }
                           │
                           ▼
                   ┌───────────────┐
                   │  signer CLI   │
                   │  (ows / etc)  │
                   └───────────────┘
```

Three layers, each with a clear role:

1. **Child CLIs** — standalone protocol tools. Each one talks to one protocol and emits structured JSON output. They know nothing about each other.
2. **Skills** — markdown files that teach agents how to compose the tools. A skill describes when to use a tool, what inputs it needs, and how to chain outputs into the next step.
3. **Workflows** — executable multi-step compositions built into `synth run`. A workflow calls child CLIs via `spawnSync`, captures their JSON output, and returns a typed state envelope.

`synth` is the thin router that ties it all together. It does not contain protocol logic.

## Adding a new child CLI

A child CLI is a standalone npm package with its own repo. It should:

1. **Stand alone.** Installable and usable without synthesis-cli.
2. **Output JSON by default.** Every command prints structured JSON to stdout. Add `--pretty` for human-readable output.
3. **Emit unsigned transactions** in the shared contract shape:

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0",
  "chainId": 1
}
```

4. **Expose MCP.** Add a `mcp` subcommand that starts an MCP server so agents can call the CLI as a tool.
5. **Stay signer-agnostic.** Child CLIs emit the generic unsigned tx contract. They should never import or depend on a specific signer (OWS, MoonPay, etc.). Signer-specific conversion (like serializing to OWS `unsignedTxHex`) belongs in the synthesis workflow layer or in agent skills — not in child CLIs.

### Registering in synthesis-cli

Once the child CLI is published:

1. Add it to `ROUTES` in `src/cli.ts`:

```typescript
export const ROUTES = {
  // ...existing routes
  myprotocol: { packageName: 'myprotocol-cli', bin: 'myprotocol' },
} as const;
```

2. Add it as a dependency in `package.json`.
3. Update the help text and README.

### Checklist

- [ ] Standalone npm package with its own repo
- [ ] JSON output by default on all commands
- [ ] Unsigned tx contract: `{ to, data, value, chainId }`
- [ ] `mcp` subcommand
- [ ] No signer-specific code — stays agnostic
- [ ] Tests with 100% coverage
- [ ] README with examples
- [ ] CI: build + test on PR/push

## Adding a skill

Skills are markdown files in `skills/<name>/SKILL.md`. They teach agents how to use a child CLI or compose multiple CLIs together.

A good skill file includes:
- **When to use** — what problem this skill solves
- **Prerequisites** — what needs to be installed or configured
- **Commands** — the actual CLI commands with real flag names
- **Examples** — concrete invocations with example output
- **Composition** — how this tool's output feeds into other tools (e.g., signing)

Skills live in the synthesis-cli repo under `skills/`. They are discoverable via `synth skills`.

### Skill vs workflow

Use a **skill** when:
- The composition is flexible and context-dependent
- The agent needs to make decisions between steps
- The flow varies significantly based on inputs

Use a **workflow** when:
- The steps are predictable and repeatable
- The agent should not need to interpret intermediate output
- You want `--plan` mode and structured state envelopes

Many tools have both: a skill for teaching agents the concepts, and a workflow for the most common happy path.

## Adding a workflow

Workflows live in `src/cli.ts` in the `WORKFLOWS` record. Each workflow implements:

```typescript
type WorkflowDefinition = {
  name: string;
  description: string;
  plan: (context: WorkflowContext) => WorkflowState;
  run: (context: WorkflowContext) => WorkflowState;
};
```

### Implementation pattern

```typescript
'my-workflow': {
  name: 'my-workflow',
  description: 'One-line description of what this does.',
  plan: ({ input }) => {
    const requiredKeys = ['amount', 'chain-id'];
    const missing = missingWorkflowKeys(input, requiredKeys);
    return {
      workflow: 'my-workflow',
      status: missing.length > 0 ? 'failed' : 'planned',
      mode: 'plan',
      steps: ['Validate inputs', 'Run child CLI command', 'Return unsigned tx'],
      artifacts: { input, requirements: requiredKeys, missing, command: [...] },
      nextAction: missing.length > 0
        ? `Provide: ${missing.map(k => '--' + k).join(', ')}`
        : 'Run without --plan to execute.',
    };
  },
  run: ({ input }) => {
    // 1. Validate inputs
    // 2. Call child CLI via runChildJson('cli-name', ['command', '--flag', value])
    // 3. Return structured state with artifacts
    // 4. Status is typically 'needs_signature' for tx-building workflows
  },
}
```

### Rules

- **Never duplicate protocol logic.** Workflows call child CLIs — they don't reimplement them.
- **Always support `--plan` mode.** Plan shows what will happen without side effects.
- **Return typed state.** Use `WorkflowState` with appropriate status: `planned`, `needs_signature`, `completed`, `failed`.
- **Handle failures.** If a child CLI returns non-zero, return `failed` status with the error in artifacts.
- **Keep signer logic out.** Workflows stop at the unsigned tx boundary. Signing and sending are the agent's (or signer CLI's) responsibility.

### Workflow checklist

- [ ] Added to `WORKFLOWS` in `src/cli.ts`
- [ ] `plan` and `run` functions implemented
- [ ] Required input validation with clear error messages
- [ ] Child CLI calls via `runChildJson()`
- [ ] Tests for: plan mode, run mode, missing inputs, child CLI failure
- [ ] 100% test coverage maintained
- [ ] `synth run list` shows the new workflow

## The unsigned tx contract

This is the universal handoff between protocol CLIs and signer CLIs:

```json
{
  "to": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
  "data": "0x3593564c000000...",
  "value": "0",
  "chainId": 137
}
```

Protocol CLIs produce this. Signer CLIs consume it. This separation is what makes the stack composable.

Child CLIs never include signer-specific payloads. Converting the generic tx into a signer-ready format (like OWS `unsignedTxHex`) is the responsibility of the synthesis workflow layer or agent skills. This keeps child CLIs composable with any signer backend.

## Development

```bash
npm install
npm run build
npm run test:coverage   # must be 100% statements/branches/functions/lines
```

All PRs should maintain 100% test coverage. Use conventional commits (`feat:`, `fix:`, `chore:`).

## Project structure

```
synthesis-cli/
├── src/cli.ts          # Router, workflows, utility commands (single file)
├── test/               # Tests (100% coverage required)
├── skills/             # Bundled agent skill files
│   ├── uniswap/
│   ├── lido/
│   ├── 8004/
│   ├── filecoin/
│   ├── moonpay/
│   ├── ows/
│   └── synthesis/
├── docs/               # Architecture, narrative, guides
└── package.json
```
