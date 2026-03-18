# Roadmap

This project is the umbrella for a small ecosystem of protocol-native CLIs.

## Vision

Build a stack where:

- each child CLI is a **real standalone primitive**
- `synthesis-cli` is a **thin umbrella/router**
- child repos remain independently installable and publishable
- MoonPay-compatible, signer-friendly transaction output is treated as a first-class contract
- docs/spec/skills make the pattern reusable for future protocol CLIs

## Architecture

### Child CLIs are canonical
Current child repos in the stack:
- `uniswap-cli`
- `lido-cli`
- `8004-cli`
- `filecoin-cli`
- `@moonpay/cli` (external dependency / integration point)

### `synthesis-cli` stays thin
The parent should:
- install child CLIs as dependencies
- dispatch to child bins
- expose light umbrella UX (`list`, `versions`, `doctor`)
- document the system

The parent should not:
- reimplement protocol logic
- rewrite child behavior by default
- become the real business-logic layer

## Current state

### Working now
- `synth` and `synthesis` route to installed child CLIs
- child bins are resolved from installed package dependencies
- trusted publishing is configured with `release.yml`
- installed-bin symlink entrypoint behavior has been fixed
- `uniswap-cli`, `lido-cli`, and `8004-cli` have already had important protocol / tx-shape fixes landed

### Still in progress
- `filecoin-cli` release state needs cleanup
- umbrella utility commands still need to be added
- docs/spec/skill layer still needs to be written
- cross-repo transaction contract still needs to be formalized
- end-to-end smoke coverage should be expanded

## Priority next steps

1. Release the installed-bin fix cleanly in `synthesis-cli`
2. Repair `filecoin-cli` release state and validate trusted publishing end to end
3. Add `synth list`, `synth versions`, `synth doctor`
4. Write architecture / interoperability / adding-a-CLI docs
5. Define and enforce a canonical unsigned transaction contract across repos
6. Harden protocol-specific follow-up work in child repos

## Issue index

### Umbrella (`synthesis-cli`)
- #6 — Roadmap: synthesis stack umbrella backlog and architecture plan
- #7 — Fix installed bin entrypoint behavior and release the working synth/synthesis aliases
- #8 — Add umbrella utility commands: `synth list`, `synth versions`, `synth doctor`
- #9 — Write architecture/docs/spec for the synthesis CLI ecosystem
- #10 — Add end-to-end smoke tests for installed bins and child routing
- #11 — Define a canonical cross-repo unsigned transaction contract for the synthesis stack

### Child repos
- `uniswap-cli` #6 — Document and harden Permit2 / EIP-712 flow for MoonPay interoperability
- `lido-cli` #9 — Harden ABI-encoded tx contracts and approval flow documentation
- `8004-cli` #6 — Harden tx-builder output contract and sender-context consistency
- `filecoin-cli` #4 — Repair release-please state and validate trusted publishing end to end

## Project rule of thumb

If the parent can be implemented as:
- dependency installation
- command dispatch
- docs/spec/skill layer
- light diagnostics

then the architecture is healthy.

If the parent starts duplicating protocol logic, hiding protocol identity, or rewriting child contracts, it is drifting in the wrong direction.
