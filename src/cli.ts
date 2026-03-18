#!/usr/bin/env node
import { createRequire } from 'node:module';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';

export const ROUTES = {
  moonpay: { packageName: '@moonpay/cli', bin: 'moonpay' },
  uniswap: { packageName: 'uniswap-cli', bin: 'uniswap' },
  lido: { packageName: 'lido-cli', bin: 'lido' },
  '8004': { packageName: '8004-cli', bin: '8004' },
  filecoin: { packageName: 'filecoin', bin: 'filecoin' }
} as const;

export type RouteName = keyof typeof ROUTES;

const HELP_TEXT = `synthesis-cli

A thin command router for child CLIs.

Usage:
  synth <moonpay|uniswap|lido|8004|filecoin> [...args]

Examples:
  synth uniswap swap --help
  synth lido stake 1
  synth 8004 status

Philosophy:
  synth does not reimplement child CLI logic.
  It forwards argv directly to installed child CLIs.
`;

export function helpText(): string {
  return HELP_TEXT;
}

export function routeArgs(argv: string[]): { command?: string; forwardedArgs: string[] } {
  const [command, ...forwardedArgs] = argv;
  return { command, forwardedArgs };
}

export function resolveBinPath(command: RouteName): string {
  const route = ROUTES[command];
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve(`${route.packageName}/package.json`);
  const packageDir = path.dirname(packageJsonPath);
  const packageJson = require(packageJsonPath) as { bin?: string | Record<string, string> };

  const binField = packageJson.bin;
  const relativeBinPath =
    typeof binField === 'string' ? binField : binField?.[route.bin];

  if (!relativeBinPath) {
    throw new Error(`Package '${route.packageName}' does not expose expected bin '${route.bin}'`);
  }

  return path.resolve(packageDir, relativeBinPath);
}

type SpawnFn = (
  command: string,
  args: string[],
  options: Parameters<typeof spawnSync>[2]
) => SpawnSyncReturns<Buffer>;

type ResolveBinPathFn = (command: RouteName) => string;

export function run(
  argv: string[],
  spawnFn: SpawnFn = spawnSync,
  resolveBinPathFn: ResolveBinPathFn = resolveBinPath
): number {
  const { command, forwardedArgs } = routeArgs(argv);

  if (!command || command === '-h' || command === '--help' || command === 'help') {
    process.stdout.write(`${helpText()}\n`);
    return 0;
  }

  if (!(command in ROUTES)) {
    process.stderr.write(`Unknown command: ${command}\n\n${helpText()}\n`);
    return 1;
  }

  try {
    const binPath = resolveBinPathFn(command as RouteName);
    const result = spawnFn(process.execPath, [binPath, ...forwardedArgs], {
      stdio: 'inherit'
    });

    if (result.error) {
      const msg = result.error.message || String(result.error);
      process.stderr.write(`Failed to execute '${command}': ${msg}\n`);
      return 1;
    }

    return result.status ?? 0;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to resolve '${command}': ${msg}\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = run(process.argv.slice(2));
  process.exit(code);
}
