# Roadmap

`synthesis-cli` is the umbrella router for a small stack of protocol-native CLIs.

## What is already done

- `synth` / `synthesis` route cleanly to installed child CLIs
- installed-bin entrypoint behavior is fixed
- umbrella utility commands are shipped: `synth list`, `synth versions`, `synth doctor`
- bundled skills are shipped and discoverable via `synth skills`
- architecture docs and practical guides are in place
- smoke tests cover installed bins and child routing
- CI, coverage, license, and release hardening are in place
- child repos are independently installable and publishable

## What remains open

1. Define and document the canonical unsigned transaction contract across the stack
2. Keep child repos aligned to that contract as follow-up work lands
3. Repair `filecoin-cli` release state

## Open issue index

### synthesis-cli
- #11 — Define a canonical cross-repo unsigned transaction contract for the synthesis stack

### child repos
- `uniswap-cli` #6 — Document and harden Permit2 / EIP-712 flow for MoonPay interoperability
- `lido-cli` #9 — Harden ABI-encoded tx contracts and approval flow documentation
- `8004-cli` #6 — Harden tx-builder output contract and sender-context consistency
- `filecoin-cli` #4 — Repair release-please state and validate trusted publishing end to end

## Rule of thumb

The parent stays healthy when it is mostly:
- dependency installation
- command dispatch
- docs / guides / skills
- light diagnostics

If the parent starts duplicating protocol logic, it is drifting in the wrong direction.
