# Submission / Demo Readiness

This project should be presented as an execution-layer product for agents.

## What the demo must prove

1. **Synthesis is the superapp for agents** (tools + skills + workflows)
2. **Composition is real** (not a fake wrapper)
3. **Probabilistic → Deterministic** is visible in product behavior
4. **Execution flow is explicit and honest**
   - protocol CLIs build unsigned artifacts
   - OWS signs
   - MoonPay broadcasts

## Core message (use this)

> LLMs think. Synthesis acts.  
> The execution layer is inevitable.

And:

> Foundation models build the brains; Synthesis builds the hands.

## Minimum live checklist

### Router + platform proof
- `synth --help`
- `synth list`
- `synth versions`
- `synth doctor`
- `synth skills`
- `synth run list`

### Child CLI proof
- `synth uniswap --help`
- `synth lido --help`
- `synth 8004 --help`
- `synth filecoin --help`
- `synth ows --help`

### Workflow proof (deterministic layer)
Show at least one `--plan` and one `run` flow:
- `synth run uniswap-swap --plan ...`
- `synth run uniswap-swap ...`

Optional supporting flows:
- `synth run lido-stake ...`
- `synth run lido-wrap ...`
- `synth run agent-register ...`

### Execution layer proof
Show signer/broadcast capabilities explicitly:
- `ows sign message --help`
- `ows sign tx --help`
- `moonpay transaction send --help`

(For executable workflow demos, show OWS signing + MoonPay broadcast.)

## Narrative arc for judges

1. Started as a Uniswap CLI for agent harnesses
2. Wallet/signing needs appeared immediately
3. Skills helped composition but remained probabilistic
4. Workflows were added to harden repeatable execution
5. Product became tools + skills + workflows + one install

## What not to claim

- `synth` contains protocol logic (it should not)
- Filecoin uses the EVM tx contract
- future workflow registry/app-store is already shipped

## Readiness standard

Ready means:
- docs align with actual implementation
- commands in docs actually run
- workflow plan mode is clear and useful
- architecture language matches shipped workflow behavior
