# Roadmap

`synthesis-cli` is the umbrella router for a small stack of protocol-native CLIs.

The current direction is to evolve it carefully from:
- **router** → dispatches to child CLIs
- **skills bundle** → teaches agents how to compose the tools
- **workflow layer** → turns repeated multi-step compositions into executable primitives

The parent should become more useful **without** turning into a monolith.

---

## What is already true

- `synth` / `synthesis` route cleanly to installed child CLIs
- installed-bin entrypoint behavior is fixed
- utility commands are shipped: `synth list`, `synth versions`, `synth doctor`, `synth skills`
- bundled skills are shipped and discoverable via `synth skills`
- architecture, narrative, and submission docs are in place
- child repos are independently installable and publishable
- all current first-party protocol child CLIs expose `mcp`
- wallet/signing backends now include both MoonPay and OWS in the synthesis docs + routing model
- local repo docs/skills are aligned to the real command surfaces
- workflow/orchestration tickets now exist in both GitHub issues and `docs/tickets.md`
- a minimal `synth run` scaffold is shipped with workflow discovery, `--plan`, and initial built-ins (`doctor-summary`, plus plan-only `uniswap-swap`)

---

## Next themes

Every major roadmap item should tie back to at least one of:
- a target hackathon track
- a stronger demo / submission deliverable
- a clearer long-term product thesis

See also:
- `docs/prize-strategy.md`
- `docs/collaboration.md`


### 1. Formalize the cross-repo contracts
The stack needs stable machine-readable output contracts:
- unsigned EVM tx JSON
- Filecoin unsigned message envelopes
- typed-data / signer handoff conventions

Primary issue:
- #11 — Define a canonical cross-repo unsigned transaction contract for the synthesis stack

### 2. Add the workflow substrate
The next big step is a first-class workflow layer in the parent:
- `synth run <workflow>`
- `--plan` / dry-run mode
- resumable workflow state

Primary issues:
- #27 — Add `synth run <workflow>` orchestration layer
- #24 — Add `--plan` / dry-run mode for workflow execution
- #25 — Define a workflow state envelope for resumable multi-step execution

### 3. Ship flagship built-in workflows
Start with the strongest demo path:
- `uniswap-swap`

Then prove the pattern across more protocols:
- Lido workflows
- ERC-8004 workflows

Primary issue:
- #26 — Add a built-in `uniswap-swap` workflow

### 4. Make workflows durable and extensible
After the first workflow lands, the next layer is:
- receipts / artifacts
- skills → workflows mapping
- contribution path for new CLIs + workflows

See:
- `docs/tickets.md`

---

## Child CLI follow-on work

- `uniswap-cli` #6 — harden Permit2 / EIP-712 docs and examples
- `lido-cli` #9 — harden tx-builder output docs and approval-flow examples
- `8004-cli` #6 — harden tx-builder output docs and sender-context consistency
- `filecoin-cli` #4 — repair release-please state and validate trusted publishing end to end

---

## Rule of thumb

The parent stays healthy when it is mostly:
- dependency installation
- command dispatch
- workflow orchestration
- docs / guides / skills
- light diagnostics

If the parent starts duplicating protocol logic from the child CLIs, it is drifting in the wrong direction.
