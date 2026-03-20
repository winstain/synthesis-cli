---
theme: default
title: Synthesis
info: |
  Composition-first on-chain CLI system for agents.
  One install. Real workflows. No UI required.
class: text-center
drawings:
  persist: false
transition: slide-left
---

# Synthesis

A composition-first on-chain CLI system for agents

<div class="pt-8 text-lg opacity-60">
Tools give agents powers. Skills teach composition. Workflows make it repeatable.
</div>

<div class="abs-br m-6 flex gap-2">
  <a href="https://github.com/winstain/synthesis-cli" target="_blank" class="text-xl icon-btn opacity-50 !border-none !hover:text-white">
    GitHub
  </a>
</div>

---

# The Problem

Agents need to do real things on-chain, but the tooling doesn't exist.

<v-clicks>

- 🔧 **Protocol SDKs are built for apps, not agents** — they assume a UI, a browser, a human clicking buttons
- 🔑 **Signing is tangled with execution** — every SDK wants your keys
- 🧩 **Multi-step flows are manual** — swap = approve + quote + sign permit + build tx + sign tx + send
- 📦 **No composability** — each protocol is its own island

</v-clicks>

---

# The Architecture

Three layers, each with a clear role.

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

<v-click>

**Child CLIs** are signer-agnostic. **Workflows** handle conversion. **OWS** signs.

</v-click>

---

# One Install

```bash
npm i -g synthesis-cli
```

<div class="mt-4" />

```bash {all|1-2|4-11|13-14}
$ synth versions
synthesis-cli v0.3.0

  8004         v1.0.2
  moonpay      v1.6.4
  ows          v0.3.9
  uniswap      v1.2.0
  lido         v1.2.0
  filecoin     v1.0.0

$ synth doctor
  ✓ pass  8004         8004-cli
  ✓ pass  moonpay      @moonpay/cli
  ✓ pass  ows          @open-wallet-standard/core
  ✓ pass  uniswap      uniswap-cli
  ✓ pass  lido         lido-cli
  ✓ pass  filecoin     filecoin-cli
```

<v-click>

6 protocol + wallet CLIs. All healthy. All composable.

</v-click>

---

# Skills: Teaching Agents

Skills are markdown files that teach agents how to use the tools.

```bash
$ synth skills
Available skills:

  8004           Agent identity and reputation via ERC-8004
  filecoin       Filecoin network and IPFS operations
  lido           Stake ETH and manage stETH/wstETH positions
  moonpay        Sign transactions and manage wallets
  ows            Local wallet storage and multi-chain signing
  synthesis      Compose protocol CLIs into workflows
  uniswap        Swap tokens via Uniswap Trading API
```

<v-click>

An agent reads the skill, understands the commands, and knows how to compose them.

No SDK integration. No API wrapper. Just structured instructions.

</v-click>

---

# Workflows: Repeatable Execution

Built-in multi-step compositions that call child CLIs and return structured state.

```bash
$ synth run list
Available workflows:

  doctor-summary     Structured child-CLI health snapshot
  uniswap-swap       Check approval + quote → unsigned tx
  lido-stake         Build unsigned Lido stake transaction
  lido-wrap          Build unsigned Lido wrap transaction
  agent-register     Build unsigned 8004 registration transaction
```

<v-click>

Every workflow supports `--plan` mode: see what will happen before anything executes.

</v-click>

---

# Plan Mode: Inspect Before Execute

```bash
$ synth run uniswap-swap --plan \
    --token-in 0xA0b8...USDC --token-out 0xdAC1...USDT \
    --amount 1000000 --chain-id 1 --wallet 0xd8dA...
```

```json {all|3-8|15-23}
{
  "workflow": "uniswap-swap",
  "status": "planned",
  "steps": [
    "Validate required swap inputs",
    "Run `uniswap check-approval` for token allowance status",
    "Run `uniswap quote` to get route, permit data, and unsigned tx",
    "Pause for signer to sign and send transaction"
  ],
  "artifacts": {
    "commands": [
      ["uniswap", "check-approval", "--token", "0xA0b8...", ...],
      ["uniswap", "quote", "--from", "0xA0b8...", "--to", "0xdAC1...", ...]
    ]
  },
  "nextAction": "Run `synth run uniswap-swap` to execute."
}
```

---

# Run Mode: Real Execution → Signer-Ready Output

When you drop `--plan`, the workflow actually calls child CLIs:

```json {all|2-3|5-8|9-14}
{
  "workflow": "uniswap-swap",
  "status": "needs_signature",
  "artifacts": {
    "approval": { "isApproved": true },
    "quote": { "input": "1.0 USDC", "output": "0.999 USDT", "route": "..." },
    "tx": { "to": "0x3fC91...", "data": "0x3593...", "value": "0", "chainId": 1 },
    "permitData": { "domain": { ... }, "types": { ... }, "values": { ... } },
    "ows": {
      "unsignedTxHex": "02f8...",
      "signCommand": "ows sign tx --wallet agent --chain evm --tx-hex 02f8...",
      "sendCommand": "ows sign send-tx --wallet agent --chain evm --tx-hex 02f8..."
    }
  }
}
```

<v-click>

The workflow stops at `needs_signature`. Keys never enter the picture until OWS.

</v-click>

---

# The Unsigned Tx Contract

The universal handoff between protocol CLIs and signer CLIs.

<div class="grid grid-cols-2 gap-4 mt-4">
<div>

### Protocol CLI produces:
```json
{
  "to": "0x3fC91A3afd...",
  "data": "0x3593564c...",
  "value": "0",
  "chainId": 1
}
```

Signer-agnostic. Just an instruction.

</div>
<div>

### Workflow serializes for OWS:
```json
{
  "unsignedTxHex": "02f8...",
  "signCommand": "ows sign tx ...",
  "sendCommand": "ows sign send-tx ..."
}
```

Ready to sign. Keys stay in the vault.

</div>
</div>

<v-click>

<div class="mt-4 text-center text-lg">

**Child CLIs don't know about signers. Workflows bridge the gap.**

</div>

</v-click>

---

# OWS: The Signing Layer

Open Wallet Standard — one vault, every chain, zero key exposure.

```bash
# Create a wallet (derives addresses for all supported chains)
$ ows wallet create --name "agent-treasury"

# Sign a serialized transaction
$ ows sign tx --wallet agent-treasury --chain evm --tx-hex 02f8...

# Sign and broadcast in one step
$ ows sign send-tx --wallet agent-treasury --chain evm \
    --tx-hex 02f8... --rpc-url https://eth.llamarpc.com
```

<v-clicks>

- Private keys encrypted at rest, decrypted only in isolated signing process
- EVM, Solana, Bitcoin, Cosmos, Tron, TON — all first-class
- Agents never see raw key material
- MCP server built in

</v-clicks>

---

# Real Swap: 6 Commands

A USDC → USDT swap on Polygon, executed entirely through CLI composition.

```bash {all|1-3|5-8|10-11|13-14|16-18|20-22}
# 1. Check approval
$ synth uniswap check-approval \
    --token $USDC --amount $AMT --chain 137 --wallet $ADDR

# 2. Get quote + Permit2 data
$ synth uniswap swap \
    --from $USDC --to $USDT --amount $AMT \
    --chain 137 --wallet $ADDR

# 3. Sign the Permit2 EIP-712 message
$ synth ows sign message --wallet agent --chain evm --typed-data "$PERMIT"

# 4. Build swap tx with permit signature
$ synth uniswap swap ... --permit-signature $SIG

# 5. Sign the transaction
$ synth ows sign tx --wallet agent --chain evm \
    --tx-hex $UNSIGNED_TX

# 6. Broadcast
$ synth ows sign send-tx --wallet agent --chain evm \
    --tx-hex $SIGNED_TX --rpc-url https://polygon-rpc.com
```

---

# How It Was Built

This project was built through real human ↔ agent collaboration.

<v-clicks>

- **Human**: product direction, architecture decisions, naming, prioritization
- **Agent**: implementation, test coverage, docs, CI/CD, refactoring
- **The collaboration was recursive** — human and agent co-built the tools, then used those tools to build more

</v-clicks>

<v-click>

### The arc

1. Started as a simple Uniswap CLI for agent harnesses
2. Agents needed wallets → OWS integration
3. Agents needed multi-step coordination → workflow layer
4. Repeated compositions → built-in workflows with plan mode
5. The real product: **tools + skills + workflows + one install**

</v-click>

---

# Extensibility

Adding a new protocol is a checklist, not a rewrite.

<div class="grid grid-cols-3 gap-4 mt-6">
<div>

### 1. Child CLI
```
myprotocol-cli/
├── src/commands/
├── src/mcp.ts
├── test/
└── package.json
```
JSON output, unsigned tx contract, MCP server.

</div>
<div>

### 2. Skill
```
skills/myprotocol/
└── SKILL.md
```
Teach agents when and how to use it.

</div>
<div>

### 3. Workflow
```typescript
WORKFLOWS['my-flow'] = {
  plan: () => { ... },
  run: () => { ... },
}
```
Automate the common path.

</div>
</div>

<v-click>

<div class="mt-6 text-center">

See `docs/contributing.md` for the full guide.

</div>

</v-click>

---

# What's Here

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

### Protocol CLIs
- **uniswap-cli** — swaps, quotes, Permit2
- **lido-cli** — stake, wrap, unwrap, withdraw
- **8004-cli** — agent identity, reputation
- **filecoin-cli** — storage, network ops

### Wallet CLIs
- **ows** — local signing vault
- **moonpay** — hosted signing

</div>
<div>

### Workflows
- `uniswap-swap` — full swap flow
- `lido-stake` / `lido-wrap`
- `agent-register` — ERC-8004

### Skills
- 7 bundled skill files
- Discoverable via `synth skills`

### Infrastructure
- 100% test coverage
- CI/CD with Release Please
- npm provenance publishing

</div>
</div>

---
layout: center
class: text-center
---

# Synthesis

Tools give agents powers. Skills teach composition. Workflows make it repeatable.

```bash
npm i -g synthesis-cli
```

<div class="mt-8 text-lg opacity-60">

github.com/winstain/synthesis-cli

</div>
