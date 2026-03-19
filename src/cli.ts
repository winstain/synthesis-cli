#!/usr/bin/env node
import { createRequire } from 'node:module';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

export const ROUTES = {
  moonpay: { packageName: '@moonpay/cli', bin: 'moonpay' },
  uniswap: { packageName: 'uniswap-cli', bin: 'uniswap' },
  lido: { packageName: 'lido-cli', bin: 'lido' },
  '8004': { packageName: '8004-cli', bin: '8004' },
  filecoin: { packageName: 'filecoin-cli', bin: 'filecoin' }
} as const;

export type RouteName = keyof typeof ROUTES;

const HELP_TEXT = `synthesis-cli

A thin command router for child CLIs.

Usage:
  synth <moonpay|uniswap|lido|8004|filecoin> [...args]
  synth list          List all registered child CLIs
  synth versions      Show synthesis-cli and child CLI versions
  synth doctor        Check child CLI health (resolvable + bin exists)

Examples:
  synth uniswap swap --help
  synth lido stake 1
  synth 8004 status
  synth doctor

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

export type ChildInfo = {
  name: RouteName;
  packageName: string;
  version: string | null;
  binPath: string | null;
  binExists: boolean;
};

export function getChildInfo(require: NodeRequire): ChildInfo[] {
  return (Object.entries(ROUTES) as [RouteName, typeof ROUTES[RouteName]][]).map(([name, route]) => {
    try {
      const pkgJsonPath = require.resolve(`${route.packageName}/package.json`);
      const pkgJson = require(pkgJsonPath) as { version?: string; bin?: string | Record<string, string> };
      const packageDir = path.dirname(pkgJsonPath);
      const binField = pkgJson.bin;
      const relativeBinPath = typeof binField === 'string' ? binField : binField?.[route.bin];
      const binPath = relativeBinPath ? path.resolve(packageDir, relativeBinPath) : null;
      return {
        name,
        packageName: route.packageName,
        version: pkgJson.version ?? null,
        binPath,
        binExists: binPath ? existsSync(binPath) : false,
      };
    } catch {
      return { name, packageName: route.packageName, version: null, binPath: null, binExists: false };
    }
  });
}

export function getSynthVersion(require: NodeRequire): string {
  try {
    const selfPkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const selfPkg = JSON.parse(require('node:fs').readFileSync(selfPkgPath, 'utf8')) as { version: string };
    return selfPkg.version;
  } catch {
    return 'unknown';
  }
}

export function runList(require: NodeRequire): number {
  const children = getChildInfo(require);
  process.stdout.write('Registered child CLIs:\n\n');
  for (const child of children) {
    const ver = child.version ? `v${child.version}` : 'not installed';
    process.stdout.write(`  ${child.name.padEnd(12)} ${child.packageName.padEnd(20)} ${ver}\n`);
  }
  return 0;
}

export function runVersions(require: NodeRequire): number {
  const synthVersion = getSynthVersion(require);
  const children = getChildInfo(require);
  process.stdout.write(`synthesis-cli v${synthVersion}\n\n`);
  for (const child of children) {
    const ver = child.version ? `v${child.version}` : 'not installed';
    process.stdout.write(`  ${child.name.padEnd(12)} ${ver}\n`);
  }
  return 0;
}

export function runDoctor(require: NodeRequire): number {
  const children = getChildInfo(require);
  let allOk = true;
  process.stdout.write('Doctor check:\n\n');
  for (const child of children) {
    const resolved = child.version !== null;
    const binOk = child.binExists;
    const status = resolved && binOk ? '✓ pass' : '✗ fail';
    if (!resolved || !binOk) allOk = false;
    const details: string[] = [];
    if (!resolved) details.push('package not found');
    if (resolved && !binOk) details.push('bin not found');
    const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';
    process.stdout.write(`  ${status}  ${child.name.padEnd(12)} ${child.packageName}${suffix}\n`);
  }
  return allOk ? 0 : 1;
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

  const require = createRequire(import.meta.url);
  if (command === 'list') return runList(require);
  if (command === 'versions') return runVersions(require);
  if (command === 'doctor') return runDoctor(require);

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

const isMain = (() => {
  const argv1 = process.argv[1];
  if (!argv1) return false;

  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(argv1);
  } catch {
    return fileURLToPath(import.meta.url) === argv1;
  }
})();

if (isMain) {
  const code = run(process.argv.slice(2));
  process.exit(code);
}
