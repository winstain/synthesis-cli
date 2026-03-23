# Prize / Track Strategy

Use this to keep work aligned with both submission quality and product truth.

## Core thesis to optimize for

Synthesis is the execution layer for agents:

- tools provide raw powers
- skills provide probabilistic composition
- workflows provide deterministic execution

> **LLMs think. Synthesis acts.**

## Primary track focus

### 1) Synthesis Open Track
Best home for the full product narrative.

Show:
- coherent architecture (Tools → Skills → Workflows)
- honest current-vs-future execution story
- strong live workflow proof

### 2) Uniswap integration track
Best concrete sponsor fit today.

Show:
- real quote/approval/permit/tx flow
- deterministic workflow layer (`--plan` + `run`)
- clear execution handoff to signer/broadcast backends

### 3) ERC-8004 / agent identity track
Strengthens “agents with receipts/identity” positioning.

Show:
- registration/reputation flows as product primitives
- workflow artifacts/traceability where possible

## Build priorities by impact

1. Harden cross-repo output contracts
2. Expand high-signal workflows
3. Improve execution-layer orchestration (create → sign → broadcast)
4. Improve receipts/artifact capture for demos/submissions

## What to avoid

- Prize-chasing work that does not strengthen the core thesis
- Track-specific integrations that add complexity but no reusable composition value
- Claims that future registry/app-store mechanics are already shipped

## Decision filter for new work

Before building, ask:
1. Does this sharpen the execution-layer story?
2. Does it improve a real demo path?
3. Does it make skills-to-workflows hardening clearer?
4. Would we still build it without the prize?

If mostly no, defer.
