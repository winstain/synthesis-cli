# Prize / Track Strategy

This document ties the synthesis roadmap to concrete hackathon tracks and deliverables.

The goal is not to chase every sponsor prize. The goal is to keep every major build decision legible as either:
- a direct submission deliverable
- a strengthening move for a target track
- an investment in the long-term product thesis

---

## Core submission thesis

Synthesis is a composition-first on-chain CLI system for agents.

- child CLIs give agents protocol-native powers
- wallet/signing CLIs like OWS act as the default execution layer, with MoonPay as an optional alternate backend
- skills teach agents how to combine the tools
- `synth` ships the stack behind one install
- workflows are the next layer that turns repeated compositions into executable primitives

This means we should prefer work that strengthens:
1. real multi-step execution
2. human ↔ agent collaboration through tools
3. reusable orchestration patterns
4. terminal-native agent UX

---

## Target track tiers

## Tier 1 — core tracks

These are the best-fit tracks for the current product.

### 1. Synthesis Open Track
**Why it fits**
- broadest home for the full product thesis
- rewards coherence across architecture, demo, and collaboration story

**What to show**
- the full stack: child CLIs + wallet/signing CLIs + `synth` + skills
- one strong end-to-end demo
- clear human ↔ agent build process

**Deliverables that help**
- clean repo/docs story
- polished demo script
- submission copy tied to the actual architecture

---

### 2. Agentic Finance (Best Uniswap API Integration) — Uniswap
**Why it fits**
- strongest concrete sponsor fit
- real Uniswap API usage is already load-bearing
- good fit for agentic execution narrative

**What to show**
- real Developer Platform API usage
- real quote / approval / Permit2 / tx flow
- clear transaction proof or strong workflow artifact story

**Deliverables that help**
- polished `uniswap-swap` workflow
- contract/docs hardening for Permit2
- signer backend support for typed-data signing, with OWS as the default assumption
- a reproducible demo transcript

**Roadmap tie-in**
- #11 contracts
- #24 dry-run / plan mode
- #25 resumable workflow state
- #26 built-in `uniswap-swap`
- #27 workflow runner
- `uniswap-cli` #6

---

### 3. Agents With Receipts — ERC-8004
**Why it fits**
- strong alignment with on-chain agent identity / reputation
- makes the agent itself part of the product story
- good fit for the collaboration/receipts narrative

**What to show**
- meaningful ERC-8004 integration
- identity / registration / reputation as part of the system, not a side module
- receipts / artifacts / traceability of agent action

**Deliverables that help**
- `agent-register` and `agent-rate` workflows
- persisted workflow receipts
- submission copy that centers on verifiable agent identity

**Roadmap tie-in**
- built-in ERC-8004 workflows
- workflow receipts / artifacts
- `8004-cli` #6

---

### 4. Let the Agent Cook — No Humans Required
**Why it fits**
- good fit for the orchestration story if the system can show discover → plan → execute → verify
- especially strong if plan/resume/receipts are explicit

**What to show**
- multi-tool execution
- strong boundaries around planning, signatures, sends, and verification
- autonomous structure with real safety/approval boundaries

**Deliverables that help**
- `synth run <workflow>`
- `--plan`
- structured workflow state
- receipts / artifacts

**Roadmap tie-in**
- #24, #25, #27
- workflow receipts

---

## Tier 2 — strong optional extensions

### 5. Lido MCP
**Why it fits**
- closest sponsor-specific extension with good architecture overlap
- reinforces the claim that these are agent tools, not just shell wrappers

**What to show**
- polished Lido MCP server
- strong stETH / wstETH support
- clean skill/docs examples
- ideally dry-run semantics and more reference-quality posture

**Deliverables that help**
- built-in `lido-stake` / `lido-wrap` workflows
- workflow plan mode reused here
- improved Lido MCP docs

**Roadmap tie-in**
- built-in Lido workflows
- `lido-cli` #9
- docs for orchestration and contribution

---

### 6. Best Use Case with Agentic Storage — Filecoin Foundation
**Why it fits**
- only if Filecoin becomes load-bearing
- strongest if tied to receipts / artifact persistence / long-term memory of workflows

**What to show**
- Filecoin is essential to the flow, not decorative
- agent stores and retrieves meaningful workflow artifacts or proofs
- a clear reason this belongs on Filecoin

**Deliverables that help**
- workflow receipts / artifacts
- optional Filecoin-backed artifact storage flow
- story tying receipts to durable storage

**Roadmap tie-in**
- workflow receipts
- possible later Filecoin artifact workflow
- `filecoin-cli` #4

---

## Tier 3 — not worth chasing right now

These are possible in theory but likely distract from the core product:
- Base side tracks unless a clearer Base-native service story emerges
- ENS tracks unless ENS becomes a first-class identity/communication layer
- Delegations without real delegation support
- Locus / Bankr / OpenServ / Slice / Zyfai / Status unless the project materially pivots

Rule of thumb:
if a track requires a new dependency that does not sharpen the existing product thesis, skip it.

---

## Deliverable map

## Deliverable A — strong submission-ready core
**Goal:** maximize Open Track + Uniswap + ERC-8004 relevance.

Includes:
- clean docs and narrative
- `synth doctor`, `synth skills`, child CLI proof
- wallet/signing backend proof (`moonpay` and/or `ows`)
- polished Uniswap workflow demo
- explicit human ↔ agent collaboration story
- ERC-8004 identity/reputation framing in submission copy

---

## Deliverable B — workflow substrate
**Goal:** make orchestration a real product layer.

Includes:
- `synth run <workflow>`
- `--plan`
- structured workflow state
- resumability

Tracks helped:
- Open Track
- Uniswap
- Let the Agent Cook

---

## Deliverable C — multi-protocol workflows
**Goal:** show synthesis is a reusable system, not a one-off Uniswap wrapper.

Includes:
- `uniswap-swap`
- `lido-stake`
- `lido-wrap`
- `agent-register`
- `agent-rate`

Tracks helped:
- Open Track
- Uniswap
- ERC-8004
- Lido MCP

---

## Deliverable D — receipts / artifacts
**Goal:** make workflow execution durable, inspectable, and submission-friendly.

Includes:
- saved workflow artifacts
- tx hashes / receipts / typed-data references / quotes
- possible future Filecoin storage integration

Tracks helped:
- ERC-8004
- Let the Agent Cook
- Filecoin Foundation

---

## Recommended build order

### Build now
1. formal contracts
2. workflow runner
3. plan mode
4. resumable state
5. built-in `uniswap-swap`

### Build next
6. built-in Lido workflows
7. built-in ERC-8004 workflows
8. workflow receipts / artifacts

### Build after that
9. skills → workflows contribution path
10. orchestration docs
11. plugin / workflow registry model
12. optional Filecoin-backed artifact flow

---

## Decision rule for new work

Before adding any new feature, ask:

1. Does this strengthen a target track?
2. Does it make the orchestration/product thesis clearer?
3. Does it improve a real demo flow?
4. Would this still be worth building if there were no sponsor prize attached?

If the answer is mostly no, do not build it now.
