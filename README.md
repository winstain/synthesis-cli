# synthesis-cli

`synthesis-cli` is a deliberately thin wrapper around child CLIs.

## Vision

One entrypoint (`synthesis`) that routes directly to domain CLIs (uniswap, lido, moonpay, 8004, filecoin), without adding abstraction layers that drift from upstream tools.

## Philosophy: thin and direct

- No business logic duplication.
- No protocol-specific wrappers inside this package.
- Forward args as-is to child CLIs.
- Keep maintenance surface tiny.

## Usage

```bash
synthesis <moonpay|uniswap|lido|8004|filecoin> [...args]
```

Examples:

```bash
synthesis uniswap swap --help
synthesis lido stake 1
synthesis 8004 status
synthesis filecoin --version
```

## Install

```bash
npm i -g synthesis-cli
```

> Note: Child CLIs must also be installed and available on your PATH.

## Development

```bash
npm install
npm run build
npm test
```
