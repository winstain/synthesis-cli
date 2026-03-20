# Narrative

## Short version

Synthesis started from a simple need: make a practical CLI for using on-chain systems from agent harnesses like OpenClaw and Claude Code.

The first impulse was narrow: use the Uniswap API from the terminal.

That immediately exposed the real problem:
- quoting is not enough
- agents need wallets
- wallets mean signing
- signing means multi-step coordination
- multi-step coordination means the agent needs both **tools** and **instructions for combining them**

That is how this turned into a stack instead of a single CLI.

## The real thesis

Standalone protocol CLIs are not the end product.

A `uniswap-cli`, `lido-cli`, or `8004-cli` is useful mostly because it gives an agent one concrete capability. But real work happens when an agent can move across tools:

- inspect protocol state
- build transactions
- sign typed data
- sign transactions
- broadcast transactions
- record identity and reputation on-chain

The standalone CLIs are the primitives.
The **skills** are the orchestration layer.
The umbrella `synth` install is the distribution layer.

## Why MoonPay mattered

Once the original Uniswap CLI existed, the missing piece became obvious: the agent still needed wallets and signing.

MoonPay CLI became the signer layer:
- sign EIP-712 payloads
- sign transactions
- send transactions
- manage wallets

That turned the stack from "read-only API access" into "agents can actually do things on-chain."

## Why skills matter

A tool alone is not enough for an agent.

Agents need to know:
- when to call which tool
- in what order
- what output from one step feeds the next
- which steps are optional vs required
- where human approval or wallet control enters the loop

That is why the skills exist.

The product is not just a pile of CLIs.
It is:

1. standalone protocol tools
2. a thin router that ships them together
3. skills that teach agents how to compose them

## Human ↔ agent communication

The story is not "the human clicks a UI and the agent watches."

The story is:
- the human gives intent, constraints, and judgment
- the agent uses terminal-native tools to execute and coordinate
- the skills encode the learned workflows between them

This matters for Synthesis because the project is really about **human-agent collaboration through tools**, not just protocol integrations.

## Long-term vision

Synthesis aims to become the **synthesis of on-chain tools** for agents:
- one install
- many protocol powers
- composable skills
- terminal-native workflows
- no dependency on a traditional app UI

If a human superapp is something like WeChat, the agent version should look very different.

Agents do not need a chat-heavy superapp with buttons and tabs.
They need:
- a CLI
- structured outputs
- skills
- signing infrastructure
- a reliable way to chain actions together

That is what Synthesis is trying to become.

## Submission framing

The best framing is:

> I started by trying to build a simple Uniswap CLI for agent harnesses like OpenClaw and Claude Code.
> That uncovered the real need: agents need not just protocol access, but wallets, signing, transaction building, and reusable workflow knowledge.
> So the project evolved into Synthesis: a terminal-native stack of protocol CLIs, a thin umbrella router, and skills that teach agents how to combine the tools into real on-chain action.

## Important honesty

Do not oversell the standalone CLIs as the final product.

They matter, but mainly because they are the primitives that make the larger agent workflow system possible.
