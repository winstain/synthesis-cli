# Architecture

## Philosophy

The Synthesis is a **composition-first** CLI ecosystem for on-chain workflows.

The core insight: each protocol CLI is a standalone primitive. `synth` is just the router. By keeping child CLIs independently useful and composing them through a shared contract, you get full on-chain workflows without a monolith.

```
synth ≠ the brain
synth = the switchboard
```

Child CLIs own all protocol logic. The parent never duplicates it.

## How routing works

`synth <command> [...args]` resolves and forwards to a child CLI binary.

```
┌──────────────────────────────────────────────────┐
│  synth uniswap swap --tokenIn 0x... --amount 100 │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │   ROUTES map    │
         │                 │
         │  moonpay → @moonpay/cli
         │  ows     → @open-wallet-standard/core
         │  uniswap → uniswap-cli
         │  lido    → lido-cli
         │  8004    → 8004-cli
         │  filecoin→ filecoin-cli
         └────────┬────────┘
                  │
                  ▼
       resolve package.json → bin field
                  │
                  ▼
       spawnSync(node, [binPath, ...forwardedArgs])
```

The `ROUTES` map in `src/cli.ts` maps command names to `{ packageName, bin }` pairs. For each route:

1. `require.resolve('<packageName>/package.json')` finds the installed package
2. Read the `bin` field to get the relative path to the executable
3. Resolve to an absolute path
4. Spawn `node <binPath> <forwardedArgs>` with `stdio: 'inherit'`

That's it. No arg parsing, no middleware, no protocol awareness.

## The unsigned transaction contract

The key interoperability primitive for the EVM-oriented child CLIs is the **unsigned transaction JSON**:

```json
{
  "to": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
  "data": "0x3593564c000000...",
  "value": "0",
  "chainId": 137
}
```

**Producers** (protocol CLIs like `uniswap`, `lido`, `8004`) output this shape.
**Consumers** (signer CLIs like `moonpay`) can consume it more directly, while backends like `ows` may require an adapter or serialized transaction encoding.

This is the seam that makes composition work. A protocol CLI doesn't need to know about wallets. A signer CLI doesn't need to know about protocols. They agree on `{ to, data, value, chainId }` as the synthesis-side contract, with backend-specific adaptation happening above the child CLI layer.

`filecoin-cli` is intentionally separate: it emits a Filecoin-native unsigned message envelope rather than the EVM tx shape. That is still composition-friendly, but it is a different contract and should be described as such in docs and demos.

## Permit2 / EIP-712 composition

Some flows require off-chain signatures before the on-chain transaction. Uniswap's Permit2 flow is the canonical example:

```
┌─────────────┐     permitData (EIP-712)      ┌──────────────────────┐
│ uniswap CLI │ ──────────────────────────────▶│ signer CLI backend    │
│   (quote)   │                                │ (moonpay or ows)      │
└─────────────┘                                └──────────┬───────────┘
                                                          │
                                                   signature (hex)
                                                          │
                                                          ▼
┌─────────────┐     unsigned tx                ┌──────────────────────┐
│ uniswap CLI │ ──────────────────────────────▶│ signer CLI backend    │
│   (swap)    │                                │ (moonpay or ows)      │
└─────────────┘                                └──────────────────────┘
```

The flow:

1. `uniswap quote` returns `permitData` — an EIP-712 typed data object for Permit2
2. a signer backend like `moonpay message sign --typedData` or `ows sign message --typed-data` signs it, returning a hex signature
3. `uniswap swap` accepts the signature and returns a swap transaction (`{ to, data, value, chainId }`)
4. a signer backend signs and optionally broadcasts it (`moonpay transaction sign` + `moonpay transaction send`, or an OWS-oriented adapter + `ows sign tx` / `ows sign send-tx`)

### OWS-specific note

OWS's signing interface is documented here:
- https://github.com/open-wallet-standard/core/blob/main/docs/02-signing-interface.md

Important distinction:
- the synthesis-side contract is currently an unsigned tx object like `{ to, data, value, chainId }`
- the shipped `ows` CLI expects a serialized transaction payload for `ows sign tx --tx <hex>` / `ows sign send-tx --tx <hex>`

So when targeting OWS for transaction signing, synthesis should reference the OWS signing-interface spec and treat OWS as requiring a backend-specific serialization step in skills/workflows rather than assuming direct consumption of the generic tx JSON envelope by the child CLIs.

Each step is a standalone CLI call. Data flows between them as JSON — piped, stored in variables, or passed as flags.

## Full data flow: token swap

```
 ┌──────────────────────────────────────────────────────────────┐
 │                     Token Swap Flow                          │
 │                                                              │
 │  1. Check approval                                           │
 │     uniswap check-approval ──▶ { to, data, value, chainId } │
 │                                        │                     │
 │  2. Approve (if needed)                ▼                     │
 │     signer backend sign/send ─────────────────▶ tx confirmed │
 │                                                              │
 │  3. Get quote + permit data                                  │
 │     uniswap quote ──▶ { quote, permitData }                 │
 │                              │                               │
 │  4. Sign permit              ▼                               │
 │     signer backend typed-data sign ──▶ signature (hex)      │
 │                                              │               │
 │  5. Build swap tx                            ▼               │
 │     uniswap swap --signature <sig> ──▶ { to, data, ... }   │
 │                                              │               │
 │  6. Sign + send                              ▼               │
 │     signer backend sign/send ─────────────▶ tx confirmed   │
 └──────────────────────────────────────────────────────────────┘
```

## MCP alongside CLI

Every protocol child CLI is expected to expose both:
- a CLI surface for shell composition
- an `mcp` subcommand for agent-native tool exposure over stdio

Current expectation:
- `uniswap mcp`
- `lido mcp`
- `8004 mcp`
- `filecoin mcp`

This matters for demos and submission because the stack should work in both modes:
1. shell-first composition through `synth`
2. tool-first composition through MCP

## Design principles

| Principle | Rule |
|-----------|------|
| **Child CLIs are canonical** | All protocol logic lives in child repos. The parent never reimplements it. |
| **JSON is the interface** | CLIs communicate through JSON on stdout. No shared libraries, no IPC. |
| **Unsigned tx is the contract** | `{ to, data, value, chainId }` is the universal handoff format. |
| **Signers are separate** | Protocol CLIs produce unsigned transactions. Signer CLIs consume them. |
| **synth stays thin** | Routing, diagnostics (`list`, `versions`, `doctor`), and docs. That's it. |

## Project structure

```
synthesis-cli/          ← the router (this repo)
├── src/cli.ts          ← ROUTES map + routing logic
├── docs/               ← architecture + guides
├── test/               ← unit + smoke tests
└── package.json        ← child CLIs as dependencies

uniswap-cli/            ← standalone Uniswap CLI
lido-cli/               ← standalone Lido CLI
8004-cli/               ← standalone 8004 CLI
filecoin-cli/           ← standalone Filecoin CLI
@moonpay/cli            ← MoonPay signer CLI (external)
@open-wallet-standard/core ← OWS wallet/signing CLI (external)
```
