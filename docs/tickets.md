# Tickets / Backlog

This file is the planning layer for `synthesis-cli` and the broader synthesis stack.

## How to use this file

- **GitHub issues** = execution system of record
- **`docs/tickets.md`** = planning backlog, grouping, priorities, and cross-repo synthesis
- **`docs/roadmap.md`** = short narrative of what the product is and what comes next
- **`docs/prize-strategy.md`** = track / deliverable mapping
- **`docs/collaboration.md`** = anonymized human ↔ agent collaboration source material
- signer backends like MoonPay and OWS should be treated as first-class composition surfaces, not incidental dependencies

Use this file to:
- shape ideas before they are fully baked
- group related issues into milestones
- track cross-repo work that does not belong to a single child CLI
- preserve the product thesis alongside the implementation backlog

---

## Status legend

- `backlog` — good idea, not opened as an issue yet
- `issue-open` — issue exists; not actively being worked
- `in-progress` — actively being worked
- `done` — shipped / documented / no longer open
- `blocked` — waiting on another issue / dependency / decision

## Priority legend

- `P0` — core to the product thesis or immediate demo/submission value
- `P1` — important next layer after the core works
- `P2` — useful extension, but not required for the next milestone

---

## Milestones

### Milestone A — Contracts + workflow foundation
Goal: define the core workflow substrate so synthesis can move from router to orchestrator.

### Milestone B — First built-in workflows
Goal: ship a flagship reusable Uniswap workflow, then prove the pattern with Lido and ERC-8004.

### Milestone C — Receipts + contribution model
Goal: make workflows durable, extensible, and contributor-friendly.

---

## Live issue index

### synthesis-cli
- #11 — Define a canonical cross-repo unsigned transaction contract for the synthesis stack
- #24 — Add `--plan` / dry-run mode for workflow execution
- #25 — Define a workflow state envelope for resumable multi-step execution
- #26 — Add a built-in `uniswap-swap` workflow
- #27 — Add `synth run <workflow>` orchestration layer

### child CLIs
- `uniswap-cli` #6 — Document and harden Permit2 / EIP-712 flow for signer interoperability
- `lido-cli` #9 — Harden ABI-encoded tx contracts and approval flow documentation
- `8004-cli` #6 — Harden tx-builder output contract and sender-context consistency
- `filecoin-cli` #4 — Repair release-please state and validate trusted publishing end to end

### wallet / signing CLIs
- `ows` — newly supported as a wallet/signing backend; typed-data signing verified, policy layer not yet available in shipped CLI

---

# Milestone A — Contracts + workflow foundation

## A1. Canonical cross-repo output contracts
- **Status:** `issue-open`
- **Priority:** `P0`
- **Issue:** #11
- **Why it matters:** workflows need stable machine-readable handoff contracts across child CLIs.
- **Scope:**
  - unsigned EVM tx JSON contract
  - Filecoin unsigned message envelope contract
  - guidance for typed-data / offchain signer outputs
- **Notes:** foundational for all workflow work.

## A2. First-class workflow runner in `synthesis-cli`
- **Status:** `issue-open`
- **Priority:** `P0`
- **Issue:** #27
- **Title:** Add `synth run <workflow>` orchestration layer
- **Why it matters:** turns synthesis from thin router into reusable orchestration layer without pulling protocol logic into the parent.
- **Scope:**
  - add `synth run <workflow>`
  - add workflow discovery
  - register built-in workflows in a central registry
  - return structured workflow state for agents and shells
- **Acceptance criteria:**
  - `synth run <name>` exists
  - workflow discovery exists
  - execution returns structured JSON state
  - child protocol logic remains delegated to child CLIs

## A3. Workflow plan / dry-run mode
- **Status:** `issue-open`
- **Priority:** `P0`
- **Issue:** #24
- **Title:** Add `--plan` / dry-run mode for workflow execution
- **Why it matters:** agents and humans need to inspect the exact path before signatures or broadcasts happen.
- **Scope:**
  - support `synth run <workflow> --plan`
  - render ordered steps, expected artifacts, and approval boundaries
  - make no side effects in plan mode
- **Acceptance criteria:**
  - plan mode shows each step in order
  - plan mode identifies where signatures / send actions occur
  - plan mode makes no external state changes

## A4. Structured workflow state + resumability
- **Status:** `issue-open`
- **Priority:** `P0`
- **Issue:** #25
- **Title:** Define a workflow state envelope for multi-step execution
- **Why it matters:** flagship flows like Uniswap swaps pause for approvals and signatures. The runner needs a stable resumable state model.
- **Scope:**
  - define a canonical workflow result / checkpoint shape
  - support statuses like `planned`, `needs_approval`, `needs_signature`, `ready_to_send`, `completed`, `failed`
  - include produced artifacts like `quote`, `permitData`, `transaction`, `txHash`
- **Acceptance criteria:**
  - one documented JSON envelope for workflow state
  - workflow steps can return resumable state
  - docs/examples show resume semantics clearly

---

# Milestone B — First built-in workflows

## B1. Built-in workflow: Uniswap full swap
- **Status:** `issue-open`
- **Priority:** `P0`
- **Issue:** #26
- **Title:** Add a built-in `uniswap-swap` workflow
- **Why it matters:** this is the flagship demo of the stack: approval check → quote → Permit2 sign → tx sign → tx send.
- **Scope:**
  - support native-token and ERC-20 input flows
  - capture approval tx, permitData, unsigned tx, and tx hash
  - integrate MoonPay signing/send steps in the workflow layer
- **Acceptance criteria:**
  - `synth run uniswap-swap ...` works
  - workflow supports plan mode
  - workflow can pause/resume across signature boundaries
  - docs show the end-to-end flow

## B2. Built-in workflows: Lido stake / wrap
- **Status:** `backlog`
- **Priority:** `P1`
- **Issue:** none yet
- **Title:** Add built-in `lido-stake` and `lido-wrap` workflows
- **Why it matters:** proves synthesis is a multi-protocol orchestration system, not just a Uniswap shell.
- **Scope:**
  - implement `lido-stake`
  - implement `lido-wrap`
  - model approval requirements for wrapping when relevant
  - integrate MoonPay signing/send flow
- **Acceptance criteria:**
  - both workflows support plan mode
  - both workflows emit structured results
  - docs explain when approval is needed
- **Dependencies:** A1–A4

## B3. Built-in workflows: ERC-8004 identity / receipts
- **Status:** `backlog`
- **Priority:** `P1`
- **Issue:** none yet
- **Title:** Add `agent-register` / `agent-rate` workflows around `8004-cli`
- **Why it matters:** makes ERC-8004 central to the synthesis story rather than just an adjacent protocol CLI.
- **Scope:**
  - add workflow for registration from URI
  - add workflow for rating / receipts
  - preserve identity-related artifacts for submission/demo evidence
- **Acceptance criteria:**
  - workflows produce structured outputs and clear next steps
  - docs position these workflows as part of agent identity / receipts
- **Dependencies:** A1–A4

## B4. Child-CLI hardening to support workflows
- **Status:** `issue-open`
- **Priority:** `P1`
- **Issues:**
  - `uniswap-cli` #6
  - `lido-cli` #9
  - `8004-cli` #6
  - `filecoin-cli` #4
- **Why it matters:** workflows are only reliable if child CLIs emit stable, well-documented outputs.
- **Scope:**
  - finish tx-builder contract hardening
  - keep docs aligned to real outputs
  - ensure release/install health stays clean

---

# Milestone C — Receipts + contribution model

## C1. Workflow receipts / artifacts
- **Status:** `backlog`
- **Priority:** `P1`
- **Issue:** none yet
- **Title:** Persist workflow receipts and intermediate artifacts
- **Why it matters:** receipts strengthen demos, debugging, ERC-8004 framing, and future Filecoin storage integration.
- **Scope:**
  - save workflow runs to local JSON artifacts
  - include timestamps, workflow name, produced artifacts, tx hashes, statuses
  - define a predictable on-disk location
- **Acceptance criteria:**
  - workflow runs can optionally persist artifacts
  - saved output is documented and stable
  - receipts are useful for demos and submission evidence

## C2. Skills → workflows contribution path
- **Status:** `backlog`
- **Priority:** `P1`
- **Issue:** none yet
- **Title:** Define how skills map onto workflows and how contributors add both
- **Why it matters:** the long-term leverage is not only internal workflows, but a contribution model where people can add new CLIs plus workflows plus skill guidance coherently.
- **Scope:**
  - document relationship between child CLI, skill, and workflow
  - define contribution checklist for adding a new child CLI
  - define contribution checklist for adding a new built-in workflow
  - explain when something should stay a skill vs become executable workflow code
- **Acceptance criteria:**
  - docs explain `tool -> skill -> workflow` layering clearly
  - new contributors can add a CLI/workflow pair without guessing architecture
  - examples exist for at least one built-in workflow

## C3. Workflow registry and plugin model
- **Status:** `backlog`
- **Priority:** `P2`
- **Issue:** none yet
- **Title:** Design a lightweight workflow registry / plugin model for synthesis
- **Why it matters:** if synthesis becomes the superapp for agent tools, workflows should be extensible without turning the router into a monolith.
- **Scope:**
  - define internal workflow registration shape
  - decide whether workflows are code-only, file-based, or hybrid
  - explore future third-party workflow contributions
- **Acceptance criteria:**
  - lightweight registry exists or is specified
  - no protocol logic duplication in the parent
  - contribution path remains simple

## C4. Canonical docs for orchestration
- **Status:** `backlog`
- **Priority:** `P1`
- **Issue:** none yet
- **Title:** Add workflow architecture and contribution docs
- **Why it matters:** once workflows exist, the architecture needs to be explained as clearly as the current router story.
- **Scope:**
  - add docs for workflow architecture
  - add docs for built-in workflows
  - add docs for contribution and extension
- **Acceptance criteria:**
  - docs explain how routing, skills, and workflows relate
  - examples stay aligned with the shipped command surface

---

## Current recommendation

### Do now
- A1 — contracts
- A2 — workflow runner
- A3 — plan mode
- A4 — resumable state
- B1 — uniswap-swap workflow

### Do next
- B2 — lido workflows
- B3 — 8004 workflows
- C1 — receipts/artifacts

### Do after that
- C2 — skills → workflows contribution path
- C4 — orchestration docs
- C3 — plugin model

---

## Product framing notes

These tickets should reinforce the core thesis:
- child CLIs are the primitives
- skills teach composition
- workflows make repeated compositions executable
- `synth` becomes the terminal-native superapp substrate for agents
