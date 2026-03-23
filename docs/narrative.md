# Narrative

## Core positioning

Synthesis is **the superapp for agents**.

Not a competitor to Anthropic/OpenAI. Closer to the missing execution layer those companies would acquire.

> **LLMs think. Synthesis acts.**  
> **The execution layer is inevitable.**

## Core thesis

Foundation models are the brains.
Synthesis is the hands.

Anthropic’s `SKILL.md` pattern showed how agents can learn tool composition. That unlocked a lot, but it remains probabilistic: markdown instructions, interpretation, and hand-wavy glue.

Synthesis pushes that into deterministic execution:

- **Tools**: raw capabilities
- **Skills**: probabilistic composition guidance
- **Workflows**: deterministic, reusable execution primitives

Key framing: **Probabilistic → Deterministic**.

## Evolution story

1. Started with a Uniswap CLI for agent harnesses.
2. Agents needed wallets and signing → OWS/MoonPay path.
3. Multi-step coordination was missing → workflows + plan mode.
4. More protocols adopted the same pattern.
5. The product emerged: **tools + skills + workflows + one install**.

## Architecture story in plain language

Synthesis is a composition system, not a monolith.

- Child protocol CLIs produce structured outputs and unsigned tx/message artifacts.
- Execution CLIs handle signing and broadcast.
- `synth` routes and orchestrates.

Current state: workflows execute the full create → sign → broadcast path.
Default happy path: OWS signs and MoonPay broadcasts.

## Platform story

The platform grows through composition.

Today’s contribution path:
1. build a child CLI
2. add/update a skill
3. add a workflow for a common deterministic flow
4. open a PR

Future direction (not shipped): installable workflows, registry, and an app-store-like model for agent actions.

## Honesty rules for docs/demos

- Don’t claim protocol logic lives in `synth`.
- Don’t describe future registry/app-store ideas as shipped.
- Do clearly separate what exists now vs what is being built next.
