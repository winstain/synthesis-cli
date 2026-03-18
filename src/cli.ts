#!/usr/bin/env node
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

export const ROUTES: Record<string, string> = {
  moonpay: 'moonpay',
  uniswap: 'uniswap',
  lido: 'lido',
  '8004': '8004',
  filecoin: 'filecoin'
};

const HELP_TEXT = `synthesis-cli

A thin command router for child CLIs.

Usage:
  synthesis <moonpay|uniswap|lido|8004|filecoin> [...args]

Examples:
  synthesis uniswap swap --help
  synthesis lido stake 1
  synthesis 8004 status

Philosophy:
  synthesis does not reimplement child CLI logic.
  It forwards argv directly to installed child CLIs.
`;

export function helpText(): string {
  return HELP_TEXT;
}

export function routeArgs(argv: string[]): { command?: string; forwardedArgs: string[] } {
  const [command, ...forwardedArgs] = argv;
  return { command, forwardedArgs };
}

type SpawnFn = (
  command: string,
  args: string[],
  options: Parameters<typeof spawnSync>[2]
) => SpawnSyncReturns<Buffer>;

export function run(argv: string[], spawnFn: SpawnFn = spawnSync): number {
  const { command, forwardedArgs } = routeArgs(argv);

  if (!command || command === '-h' || command === '--help' || command === 'help') {
    process.stdout.write(`${helpText()}\n`);
    return 0;
  }

  const target = ROUTES[command];
  if (!target) {
    process.stderr.write(`Unknown command: ${command}\n\n${helpText()}\n`);
    return 1;
  }

  const result = spawnFn(target, forwardedArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.error) {
    const msg = result.error.message || String(result.error);
    process.stderr.write(`Failed to execute '${target}': ${msg}\n`);
    return 1;
  }

  return result.status ?? 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = run(process.argv.slice(2));
  process.exit(code);
}
