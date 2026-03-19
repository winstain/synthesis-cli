# Adding a Child CLI

How to add a new protocol CLI to the Synthesis stack.

## The contract

A child CLI in the Synthesis ecosystem must:

1. **Be a standalone npm package** with a `bin` field
2. **Output JSON to stdout** for structured data
3. **Follow the unsigned tx contract** for any transaction-producing commands

That's it. The child CLI is independently installable and usable — `synth` just makes it discoverable.

## 1. Package structure

Your CLI package needs a `bin` field in `package.json`:

```json
{
  "name": "my-protocol-cli",
  "version": "1.0.0",
  "bin": {
    "my-protocol": "dist/cli.js"
  },
  "type": "module",
  "files": ["dist", "README.md", "LICENSE"]
}
```

**Examples from the stack:**
- [`uniswap-cli`](https://github.com/winstain/uniswap-cli) — Uniswap quoting, approval checking, and swap tx building
- [`lido-cli`](https://github.com/winstain/lido-cli) — Lido staking operations
- [`8004-cli`](https://github.com/winstain/8004-cli) — 8004 protocol interactions

## 2. The unsigned transaction contract

Any command that produces a transaction should output this shape:

```json
{
  "to": "0xContractAddress",
  "data": "0xEncodedCalldata",
  "value": "0",
  "chainId": 137
}
```

| Field | Type | Description |
|-------|------|-------------|
| `to` | `string` | Target contract address (checksummed hex) |
| `data` | `string` | ABI-encoded calldata (hex with `0x` prefix) |
| `value` | `string` | Wei value to send (use `"0"` for non-payable) |
| `chainId` | `number` | EIP-155 chain ID |

This is what signer CLIs (like `@moonpay/cli`) consume. By outputting this shape, your CLI composes with any signer in the stack.

### If your protocol needs off-chain signatures

Follow the Permit2 pattern — output EIP-712 typed data alongside your quote:

```json
{
  "quote": { ... },
  "permitData": {
    "domain": { ... },
    "types": { ... },
    "values": { ... }
  }
}
```

The signer CLI handles the `eth_signTypedData` call, and your CLI accepts the resulting signature in a follow-up command.

## 3. Register in synthesis-cli

### Add the dependency

```bash
cd synthesis-cli
npm install my-protocol-cli
```

### Add the route

In `src/cli.ts`, add your CLI to the `ROUTES` map:

```typescript
export const ROUTES = {
  moonpay: { packageName: '@moonpay/cli', bin: 'moonpay' },
  uniswap: { packageName: 'uniswap-cli', bin: 'uniswap' },
  lido: { packageName: 'lido-cli', bin: 'lido' },
  '8004': { packageName: '8004-cli', bin: '8004' },
  filecoin: { packageName: 'filecoin-cli', bin: 'filecoin' },
  // Add yours:
  'my-protocol': { packageName: 'my-protocol-cli', bin: 'my-protocol' }
} as const;
```

- **Key** (`'my-protocol'`): the command name users type after `synth`
- **`packageName`**: the npm package name
- **`bin`**: the bin name from your package.json's `bin` field

### Update the help text

Add your CLI to the help text and usage examples in `src/cli.ts`.

### Test it

```bash
npm run build
npm test

# Smoke test
node dist/cli.js my-protocol --help
node dist/cli.js doctor  # should show ✓ pass for your CLI
```

## 4. CI / publish setup

Each child CLI should have its own CI and publishing pipeline.

### Recommended setup (matches existing child CLIs):

**CI (`ci.yml`):**
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
```

**Release (`release.yml`) with Release Please + trusted publishing:**
```yaml
name: Release
on:
  push:
    branches: [main]
permissions:
  contents: write
  pull-requests: write
jobs:
  release-please:
    runs-on: ubuntu-latest
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json

  publish:
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install -g npm@latest
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public
```

**Key:** The `id-token: write` permission enables npm trusted publishing (no `NPM_TOKEN` secret needed).

### Release Please config

```json
{
  "packages": {
    ".": {
      "release-type": "node",
      "changelog-sections": [
        { "type": "feat", "section": "Features" },
        { "type": "fix", "section": "Bug Fixes" }
      ]
    }
  }
}
```

## Checklist

- [ ] Standalone npm package with `bin` field
- [ ] JSON output on stdout for structured data
- [ ] Commands that produce transactions follow `{ to, data, value, chainId }`
- [ ] `--help` on every command
- [ ] Added as dependency in `synthesis-cli/package.json`
- [ ] Added to `ROUTES` map in `src/cli.ts`
- [ ] `synth doctor` shows `✓ pass`
- [ ] CI workflow running on PRs and main
- [ ] Release Please + trusted publishing configured
- [ ] Conventional commits for changelog generation
