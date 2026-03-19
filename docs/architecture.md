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

The key interoperability primitive is the **unsigned transaction JSON**:

```json
{
  "to": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
  "data": "0x3593564c000000...",
  "value": "0",
  "chainId": 137
}
```

**Producers** (protocol CLIs like `uniswap`, `lido`, `8004`) output this shape.
**Consumers** (signer CLIs like `moonpay`) accept it as input.

This is the seam that makes composition work. A protocol CLI doesn't need to know about wallets. A signer CLI doesn't need to know about protocols. They agree on `{ to, data, value, chainId }`.

## Permit2 / EIP-712 composition

Some flows require off-chain signatures before the on-chain transaction. Uniswap's Permit2 flow is the canonical example:

```
┌─────────────┐     permitData (EIP-712)      ┌─────────────┐
│ uniswap CLI │ ──────────────────────────────▶│ moonpay CLI │
│   (quote)   │                                │ (msg sign)  │
└─────────────┘                                └──────┬──────┘
                                                      │
                                               signature (hex)
                                                      │
                                                      ▼
┌─────────────┐     unsigned tx                ┌─────────────┐
│ uniswap CLI │ ──────────────────────────────▶│ moonpay CLI │
│   (swap)    │                                │ (tx sign +  │
└─────────────┘                                │  tx send)   │
                                               └─────────────┘
```

The flow:

1. `uniswap quote` returns `permitData` — an EIP-712 typed data object for Permit2
2. `moonpay message sign --typedData` signs it, returning a hex signature
3. `uniswap swap` accepts the signature and returns a swap transaction (`{ to, data, value, chainId }`)
4. `moonpay tx sign` + `moonpay tx send` signs and broadcasts it

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
 │     moonpay tx sign ──▶ moonpay tx send ──▶ tx confirmed    │
 │                                                              │
 │  3. Get quote + permit data                                  │
 │     uniswap quote ──▶ { quote, permitData }                 │
 │                              │                               │
 │  4. Sign permit              ▼                               │
 │     moonpay message sign --typedData ──▶ signature (hex)    │
 │                                              │               │
 │  5. Build swap tx                            ▼               │
 │     uniswap swap --signature <sig> ──▶ { to, data, ... }   │
 │                                              │               │
 │  6. Sign + send                              ▼               │
 │     moonpay tx sign ──▶ moonpay tx send ──▶ tx confirmed   │
 └──────────────────────────────────────────────────────────────┘
```

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
```
