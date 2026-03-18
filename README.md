# synthesis-cli

`synthesis-cli` is a deliberately thin umbrella CLI for standalone protocol CLIs.

## Vision

One entrypoint (`synth`) that installs and routes directly to child CLIs like `uniswap`, `lido`, `8004`, and `moonpay`, without re-implementing protocol logic in the parent.

## Philosophy: thin and direct

- Child CLIs are the primitives.
- `synth` is just the umbrella.
- No business logic duplication.
- No protocol-specific wrappers inside this package.
- Forward args as-is to child CLIs.
- Keep maintenance surface tiny.

## Usage

```bash
synth <moonpay|uniswap|lido|8004|filecoin> [...args]
```

Examples:

```bash
synth uniswap swap --help
synth lido stake 1
synth 8004 status
synth moonpay transaction sign --help
```

## Install

```bash
npm i -g synthesis-cli
```

This package installs its child CLI dependencies and routes to their installed bins directly.

## Development

```bash
npm install
npm run build
npm test
```
