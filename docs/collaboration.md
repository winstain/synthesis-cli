# Human ↔ Agent Collaboration Notes

This document captures the collaboration pattern behind Synthesis in anonymized form.

Use it as source material for:
- `conversationLog`
- submission writeups
- demo framing
- project narrative

Do not add personal names here unless there is a specific reason to do so.

---

## Core collaboration pattern

This project was built through real human ↔ agent collaboration.

The human did not just prompt for outputs.
The collaboration included:
- product direction
- naming and framing
- architecture decisions
- prioritization of protocols and flows
- review of docs and positioning
- judgment about what should remain a tool, what should become a skill, and what should become a workflow

The agent did not just act as a copy assistant.
The collaboration included:
- implementing protocol CLIs
- standardizing command surfaces and output shapes
- improving docs
- hardening tests and CI
- refining the cross-tool architecture
- identifying where orchestration should live
- translating repeated compositions into explicit workflows and backlog items

---

## Build arc

The work started from a narrow problem:
- make a practical CLI for using the Uniswap API from agent harnesses like OpenClaw and Claude Code

That immediately exposed broader needs:
- quoting was not enough
- the agent needed wallets
- wallets meant signing
- signing meant multi-step coordination
- multi-step coordination meant the system needed both tools and reusable instructions for combining them

That is how the project evolved from a single CLI into a stack.

---

## What was built collaboratively

### Protocol tools
The collaboration produced a family of protocol-native CLIs:
- Uniswap
- Lido
- ERC-8004
- Filecoin

These were treated as reusable primitives, not one-off hacks.

### Signing layer
The collaboration surfaced wallet/signing CLIs as a separate layer in the stack.

MoonPay became an early wallet / signing backend used to:
- sign typed data
- sign transactions
- send transactions
- manage wallets

Later, OWS emerged as another compelling wallet/signing CLI backend with:
- local wallet storage
- multi-chain address derivation
- typed-data signing
- transaction signing and broadcast

This turned the stack from read-only access into executable on-chain action, while reinforcing the idea that synthesis should compose multiple wallet/signing backends rather than depend on only one.

### Umbrella distribution layer
The CLIs were then synthesized behind one umbrella install:
- `synth`

This made it easier for agents to access a growing set of tools through one surface.

### Skills layer
The collaboration also surfaced the need for skills:
- not just tools
- but instructions for when to call which tool, in what order, and with what outputs from prior steps

This is a core part of the product thesis.

### Workflow direction
A later insight in the collaboration was that repeated skill-based compositions should eventually become executable workflows.

That led to the current roadmap direction:
- child CLIs as primitives
- skills as composition guidance
- workflows as executable orchestration

---

## Why this collaboration matters

The project is not just a collection of protocol integrations.
It is also a case study in how humans and agents can co-build agent infrastructure itself.

The collaboration was recursive:
- the human and agent did not just use tools
- they built the tools together
- standardized them together
- tested them together
- and synthesized them into a broader system

That is part of the project's value.

---

## Submission-safe framing

Good framing:

> This project was built through iterative human ↔ agent collaboration.
> The human contributed direction, taste, and product judgment.
> The agent contributed implementation, standardization, testing, documentation, and system synthesis.
> Together, the collaboration evolved from a single protocol CLI into a broader terminal-native stack of tools, skills, and emerging workflows for on-chain agent action.

Also good:

> The collaboration was recursive: we did not just use agent tools — we built the agent tools together.

---

## Important boundaries

Do not overclaim autonomy.
The strongest and most honest framing is:
- the human provided intent, constraints, and judgment
- the agent accelerated implementation and synthesis
- the value came from the interaction, not from pretending one side did everything alone
