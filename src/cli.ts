#!/usr/bin/env node
import { createRequire } from 'node:module';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync, existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { createPublicClient, http, serializeTransaction } from 'viem';

export const ROUTES = {
  moonpay: { packageName: '@moonpay/cli', bin: 'moonpay' },
  ows: { packageName: '@open-wallet-standard/core', bin: 'ows' },
  uniswap: { packageName: 'uniswap-cli', bin: 'uniswap' },
  lido: { packageName: 'lido-cli', bin: 'lido' },
  '8004': { packageName: '8004-cli', bin: '8004' },
  filecoin: { packageName: 'filecoin-cli', bin: 'filecoin' }
} as const;

export type RouteName = keyof typeof ROUTES;

const HELP_TEXT = `synthesis-cli

A thin command router for child CLIs.

Usage:
  synth <moonpay|ows|uniswap|lido|8004|filecoin> [...args]
  synth list          List all registered child CLIs
  synth versions      Show synthesis-cli and child CLI versions
  synth doctor        Check child CLI health (resolvable + bin exists)
  synth skills        List available agent skills
  synth skills path   Print path to skills directory
  synth skills show <name>  Print a skill's content
  synth run <workflow> [--plan] [--key value ...]

Examples:
  synth uniswap swap --help
  synth ows sign message --help
  synth lido stake 1
  synth 8004 status
  synth doctor
  synth run doctor-summary --plan

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

export function getSkillsDir(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills');
}

export type SkillInfo = {
  name: string;
  description: string;
  dir: string;
};

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

export async function listSkills(): Promise<SkillInfo[]> {
  const skillsDir = getSkillsDir();
  let entries: string[];
  try {
    entries = await readdir(skillsDir);
  } catch {
    return [];
  }
  const skills: SkillInfo[] = [];
  for (const entry of entries.sort()) {
    const skillFile = path.join(skillsDir, entry, 'SKILL.md');
    try {
      const content = await readFile(skillFile, 'utf8');
      const fm = parseFrontmatter(content);
      if (fm.name && fm.description) {
        skills.push({ name: fm.name, description: fm.description, dir: entry });
      }
    } catch {
      // skip dirs without valid SKILL.md
    }
  }
  return skills;
}

export async function runSkills(subArgs: string[]): Promise<number> {
  const sub = subArgs[0];

  if (sub === 'path') {
    process.stdout.write(`${getSkillsDir()}\n`);
    return 0;
  }

  if (sub === 'show') {
    const name = subArgs[1];
    if (!name) {
      process.stderr.write('Usage: synth skills show <name>\n');
      return 1;
    }
    const skillFile = path.join(getSkillsDir(), name, 'SKILL.md');
    try {
      const content = await readFile(skillFile, 'utf8');
      process.stdout.write(content);
      return 0;
    } catch {
      process.stderr.write(`Skill not found: ${name}\n`);
      return 1;
    }
  }

  // Default: list skills
  const skills = await listSkills();
  if (skills.length === 0) {
    process.stdout.write('No skills found.\n');
    return 0;
  }
  process.stdout.write('Available skills:\n\n');
  for (const skill of skills) {
    process.stdout.write(`  ${skill.name.padEnd(14)} ${skill.description}\n`);
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

export type WorkflowStatus =
  | 'planned'
  | 'needs_approval'
  | 'needs_signature'
  | 'ready_to_send'
  | 'broadcast'
  | 'confirmed'
  | 'completed'
  | 'failed';

export type WorkflowState = {
  workflow: string;
  status: WorkflowStatus;
  mode: 'plan' | 'run';
  steps: string[];
  artifacts: Record<string, unknown>;
  nextAction: string | null;
};

type GenericUnsignedTx = {
  to: string;
  data?: string;
  value?: string | number | bigint;
  chainId: string | number;
  from?: string;
};

type OwsSerialization = {
  unsignedTxHex: string;
  signCommand: string;
  sendCommand: string;
  rpcUrl: string;
};

type MoonpayChainName = 'ethereum' | 'polygon' | 'base' | 'arbitrum';

type MoonpayExecution = {
  chain: MoonpayChainName;
  unsignedTxHex: string;
  signCommand: string[];
  signOutput: unknown;
  signedTxHex: string;
  sendCommand: string[];
  sendOutput: unknown;
};

type WorkflowContext = {
  require: NodeRequire;
  input: Record<string, string | boolean>;
};

type WorkflowDefinition = {
  name: string;
  description: string;
  plan: (context: WorkflowContext) => WorkflowState;
  run: (context: WorkflowContext) => WorkflowState | Promise<WorkflowState>;
};

function parseWorkflowInput(args: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function readInputString(input: Record<string, string | boolean>, key: string): string | null {
  const value = input[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function missingWorkflowKeys(input: Record<string, string | boolean>, keys: string[]): string[] {
  return keys.filter((key) => readInputString(input, key) === null);
}

function parseJsonOutput(buffer?: Buffer): unknown {
  if (!buffer) return null;
  const text = buffer.toString().trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

type ChildRunResult =
  | { ok: true; command: string[]; output: unknown }
  | { ok: false; command: string[]; error: string; output: unknown };

function runChildJson(command: RouteName, args: string[]): ChildRunResult {
  let binPath: string;
  try {
    binPath = resolveBinPath(command);
  } catch (error) {
    const msg = String(error);
    return { ok: false, command: [command, ...args], error: `Failed to resolve '${command}': ${msg}`, output: null };
  }

  const fullCommand = [binPath, ...args];
  const result = spawnSync(process.execPath, fullCommand, { stdio: ['pipe', 'pipe', 'pipe'] });
  if (!result) {
    return { ok: false, command: [command, ...args], error: 'Child command returned no result.', output: null };
  }
  const output = parseJsonOutput(result.stdout);

  if (result.error) {
    const msg = result.error.message || String(result.error);
    return { ok: false, command: [command, ...args], error: msg, output };
  }

  if (result.status !== 0) {
    const stderr = String(result.stderr ?? '').trim();
    return { ok: false, command: [command, ...args], error: stderr, output };
  }

  return { ok: true, command: [command, ...args], output };
}

function getRpcUrlForChain(chainId: number): string | null {
  if (chainId === 1) return 'https://eth.llamarpc.com';
  if (chainId === 137) return 'https://polygon-rpc.com';
  if (chainId === 8453) return 'https://mainnet.base.org';
  if (chainId === 42161) return 'https://arb1.arbitrum.io/rpc';
  if (chainId === 10) return 'https://mainnet.optimism.io';
  return null;
}

function parseChainId(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  if (value.startsWith('0x')) {
    const parsed = Number.parseInt(value, 16);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBigIntValue(value: string | number | bigint | undefined): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.max(0, Math.trunc(value)));
  if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
  return 0n;
}

function chainIdToMoonpayChain(chainId: number): MoonpayChainName | null {
  if (chainId === 1) return 'ethereum';
  if (chainId === 137) return 'polygon';
  if (chainId === 8453) return 'base';
  if (chainId === 42161) return 'arbitrum';
  return null;
}

function extractSignedTxHex(output: unknown): string | null {
  if (typeof output === 'string') {
    const trimmed = output.trim();
    return trimmed.startsWith('0x') ? trimmed : null;
  }
  if (!output || typeof output !== 'object') return null;
  const candidate = output as Record<string, unknown>;
  const fields = ['signedTxHex', 'signedTx', 'signedTransaction', 'transaction', 'tx'];
  for (const field of fields) {
    const value = candidate[field];
    if (typeof value === 'string' && value.startsWith('0x')) return value;
  }
  return null;
}

async function signWithOwsAndSendWithMoonpay(tx: GenericUnsignedTx, wallet: string): Promise<{ ok: true; moonpay: MoonpayExecution } | { ok: false; error: string; failedCommand: string[]; output: unknown }> {
  const chainId = parseChainId(tx.chainId);
  if (chainId === null) {
    return { ok: false, error: 'Invalid chainId in tx payload.', failedCommand: ['ows', 'sign', 'tx'], output: tx.chainId };
  }
  const chain = chainIdToMoonpayChain(chainId);
  if (!chain) {
    return { ok: false, error: `Unsupported chainId for moonpay: ${chainId}`, failedCommand: ['moonpay', 'transaction', 'send'], output: tx.chainId };
  }

  const ows = await serializeForOws(tx);
  if (!ows) {
    return { ok: false, error: 'Failed to serialize tx for OWS signing.', failedCommand: ['ows', 'sign', 'tx'], output: tx };
  }

  const owsChain = `eip155:${chainId}`;
  const unsignedTxHex = ows.unsignedTxHex;
  const signCommand = ['sign', 'tx', '--wallet', wallet, '--chain', owsChain, '--tx', unsignedTxHex, '--json'];
  const signed = runChildJson('ows', signCommand);
  if (!signed.ok) {
    return { ok: false, error: signed.error, failedCommand: signed.command, output: signed.output };
  }

  const signedTxHex = extractSignedTxHex(signed.output);
  if (!signedTxHex) {
    return {
      ok: false,
      error: 'ows sign tx did not return a signed tx hex string.',
      failedCommand: signed.command,
      output: signed.output,
    };
  }

  const sendCommand = ['transaction', 'send', '--chain', chain, '--transaction', signedTxHex];
  const sent = runChildJson('moonpay', sendCommand);
  if (!sent.ok) {
    return { ok: false, error: sent.error, failedCommand: sent.command, output: sent.output };
  }

  return {
    ok: true,
    moonpay: {
      chain,
      unsignedTxHex,
      signCommand: ['ows', ...signCommand],
      signOutput: signed.output,
      signedTxHex,
      sendCommand: ['moonpay', ...sendCommand],
      sendOutput: sent.output,
    },
  };
}

function extractTxObject(output: unknown): GenericUnsignedTx | null {
  if (!output || typeof output !== 'object') return null;
  const candidate = output as Record<string, unknown>;
  if (typeof candidate.to !== 'string' || (!candidate.chainId && candidate.chainId !== 0)) return null;
  return {
    to: candidate.to,
    data: typeof candidate.data === 'string' ? candidate.data : undefined,
    value: candidate.value as string | number | bigint | undefined,
    chainId: candidate.chainId as string | number,
  };
}

export async function serializeForOws(tx: GenericUnsignedTx): Promise<OwsSerialization | null> {
  try {
    const chainId = parseChainId(tx.chainId);
    if (chainId === null) return null;
    const rpcUrl = getRpcUrlForChain(chainId);
    if (!rpcUrl) return null;

    const client = createPublicClient({ transport: http(rpcUrl) });
    const requestBase = {
      to: tx.to as `0x${string}`,
      data: (tx.data ?? '0x') as `0x${string}`,
      value: parseBigIntValue(tx.value),
    };

    const nonce = tx.from
      ? await client.getTransactionCount({ address: tx.from as `0x${string}` })
      : 0;

    const gas = await client.estimateGas({
      ...requestBase,
      ...(tx.from ? { account: tx.from as `0x${string}` } : {}),
    });
    const feeData = await client.estimateFeesPerGas();

    const unsignedTxHex = serializeTransaction({
      type: 'eip1559',
      chainId,
      to: requestBase.to,
      data: requestBase.data,
      value: requestBase.value,
      nonce,
      gas,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    });

    return {
      unsignedTxHex,
      signCommand: `ows sign tx --wallet <wallet-name> --chain eip155:${chainId} --tx ${unsignedTxHex} --json`,
      sendCommand: `ows sign send-tx --wallet <wallet-name> --chain eip155:${chainId} --tx ${unsignedTxHex} --json --rpc-url ${rpcUrl}`,
      rpcUrl,
    };
  } catch {
    return null;
  }
}

export const WORKFLOWS: Record<string, WorkflowDefinition> = {
  'doctor-summary': {
    name: 'doctor-summary',
    description: 'Collect a structured child-CLI health snapshot with no side effects.',
    plan: ({ input }) => ({
      workflow: 'doctor-summary',
      status: 'planned',
      mode: 'plan',
      steps: ['Inspect registered child CLIs', 'Return a machine-readable health summary'],
      artifacts: {
        input,
        expected: ['children[]', 'summary'],
      },
      nextAction: 'Run without --plan to execute.',
    }),
    run: ({ require, input }) => {
      const children = getChildInfo(require);
      const healthyChildren = children.filter((child) => child.version !== null && child.binExists).length;
      return {
        workflow: 'doctor-summary',
        status: 'completed',
        mode: 'run',
        steps: ['Inspect registered child CLIs', 'Return a machine-readable health summary'],
        artifacts: {
          input,
          children,
          summary: {
            total: children.length,
            healthy: healthyChildren,
            unhealthy: children.length - healthyChildren,
          },
        },
        nextAction: healthyChildren === children.length ? null : 'Run `synth doctor` for formatted diagnostics.',
      };
    },
  },
  'uniswap-swap': {
    name: 'uniswap-swap',
    description: 'Check approval, build, sign with OWS, and broadcast a Uniswap swap.',
    plan: ({ input }) => {
      const requiredKeys = ['token-in', 'token-out', 'amount', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      const steps = [
        'Validate required swap inputs',
        'Run `uniswap check-approval` for token allowance status',
        'Run `uniswap quote` to get route, permit data, and unsigned tx',
        'Serialize unsigned tx for OWS signing',
        'Run `ows sign tx`',
        'Run `moonpay transaction send`',
      ];

      return {
        workflow: 'uniswap-swap',
        status: missing.length > 0 ? 'failed' : 'planned',
        mode: 'plan',
        steps,
        artifacts: {
          input,
          requirements: requiredKeys,
          missing,
          commands: [
            ['uniswap', 'check-approval', '--token', String(input['token-in']), '--amount', String(input.amount), '--chain', String(input['chain-id']), '--wallet', String(input.wallet)],
            ['uniswap', 'quote', '--from', String(input['token-in']), '--to', String(input['token-out']), '--amount', String(input.amount), '--chain', String(input['chain-id']), '--wallet', String(input.wallet)],
          ],
        },
        nextAction: missing.length > 0
          ? `Provide missing required inputs: ${missing.map((k) => `--${k}`).join(', ')}`
          : 'Run `synth run uniswap-swap` to execute the full create → sign → send flow.',
      };
    },
    run: async ({ input }) => {
      const requiredKeys = ['token-in', 'token-out', 'amount', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      const steps = [
        'Validate required swap inputs',
        'Run `uniswap check-approval`',
        'Run `uniswap quote`',
        'Serialize unsigned tx for OWS signing',
        'Run `ows sign tx`',
        'Run `moonpay transaction send`',
      ];

      if (missing.length > 0) {
        return {
          workflow: 'uniswap-swap',
          status: 'failed',
          mode: 'run',
          steps,
          artifacts: { input, missing },
          nextAction: `Provide: ${missing.map((k) => `--${k}`).join(', ')}`,
        };
      }

      const approval = runChildJson('uniswap', ['check-approval', '--token', input['token-in'] as string, '--amount', input.amount as string, '--chain', input['chain-id'] as string, '--wallet', input.wallet as string]);
      if (!approval.ok) {
        return {
          workflow: 'uniswap-swap',
          status: 'failed',
          mode: 'run',
          steps,
          artifacts: { input, failedCommand: approval.command, error: approval.error, output: approval.output },
          nextAction: 'Fix the error and retry.',
        };
      }

      const quote = runChildJson('uniswap', ['quote', '--from', input['token-in'] as string, '--to', input['token-out'] as string, '--amount', input.amount as string, '--chain', input['chain-id'] as string, '--wallet', input.wallet as string]);
      if (!quote.ok) {
        return {
          workflow: 'uniswap-swap',
          status: 'failed',
          mode: 'run',
          steps,
          artifacts: { input, failedCommand: quote.command, approval: approval.output, error: quote.error, output: quote.output },
          nextAction: 'Fix the error and retry.',
        };
      }

      const quoteObj = (quote.output ?? {}) as Record<string, unknown>;
      const txCandidate = extractTxObject(quoteObj.tx);
      const ows = txCandidate ? await serializeForOws(txCandidate) : null;

      if (!txCandidate) {
        return {
          workflow: 'uniswap-swap',
          status: 'failed',
          mode: 'run',
          steps,
          artifacts: {
            input,
            approval: approval.output,
            quote: quote.output,
            tx: quoteObj.tx ?? null,
            permitData: quoteObj.permitData ?? null,
            ...(ows ? { ows } : {}),
            commands: [approval.command, quote.command],
          },
          nextAction: 'Quote output did not include a valid tx envelope.',
        };
      }

      const moonpay = await signWithOwsAndSendWithMoonpay(txCandidate, input.wallet as string);
      if (!moonpay.ok) {
        return {
          workflow: 'uniswap-swap',
          status: 'failed',
          mode: 'run',
          steps,
          artifacts: {
            input,
            approval: approval.output,
            quote: quote.output,
            tx: quoteObj.tx ?? null,
            permitData: quoteObj.permitData ?? null,
            ...(ows ? { ows } : {}),
            failedCommand: moonpay.failedCommand,
            error: moonpay.error,
            output: moonpay.output,
            commands: [approval.command, quote.command],
          },
          nextAction: 'Fix the error and retry.',
        };
      }

      return {
        workflow: 'uniswap-swap',
        status: 'broadcast',
        mode: 'run',
        steps,
        artifacts: {
          input,
          approval: approval.output,
          quote: quote.output,
          tx: quoteObj.tx ?? null,
          permitData: quoteObj.permitData ?? null,
          ...(ows ? { ows } : {}),
          moonpay: moonpay.moonpay,
          commands: [approval.command, quote.command, moonpay.moonpay.signCommand, moonpay.moonpay.sendCommand],
        },
        nextAction: null,
      };
    },
  },
  'lido-stake': {
    name: 'lido-stake',
    description: 'Build, sign with OWS, and broadcast a Lido stake transaction.',
    plan: ({ input }) => {
      const requiredKeys = ['amount', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      return {
        workflow: 'lido-stake',
        status: missing.length > 0 ? 'failed' : 'planned',
        mode: 'plan',
        steps: [
          'Validate required inputs',
          'Run `lido stake` to build tx payload',
          'Serialize unsigned tx for OWS signing',
          'Run `ows sign tx`',
          'Run `moonpay transaction send`',
        ],
        artifacts: {
          input,
          requirements: requiredKeys,
          missing,
          command: ['lido', 'stake', String(input.amount), '--chain', String(input['chain-id']), '--wallet', String(input.wallet)],
        },
        nextAction: missing.length > 0 ? `Provide missing required inputs: ${missing.map((k) => `--${k}`).join(', ')}` : 'Run without --plan to execute sign + broadcast.',
      };
    },
    run: async ({ input }) => {
      const requiredKeys = ['amount', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      const steps = [
        'Validate required inputs',
        'Run `lido stake` to build tx payload',
        'Serialize unsigned tx for OWS signing',
        'Run `ows sign tx`',
        'Run `moonpay transaction send`',
      ];
      if (missing.length > 0) {
        return { workflow: 'lido-stake', status: 'failed', mode: 'run', steps, artifacts: { input, missing }, nextAction: `Provide: ${missing.map((k) => `--${k}`).join(', ')}` };
      }
      const wallet = readInputString(input, 'wallet');
      const args = ['stake', input.amount as string, '--chain', input['chain-id'] as string];
      if (wallet) args.push('--wallet', wallet);
      const result = runChildJson('lido', args);
      if (!result.ok) {
        return { workflow: 'lido-stake', status: 'failed', mode: 'run', steps, artifacts: { input, failedCommand: result.command, error: result.error, output: result.output }, nextAction: 'Fix the error and retry.' };
      }
      const txCandidate = extractTxObject(result.output);
      const ows = txCandidate ? await serializeForOws(txCandidate) : null;
      if (!txCandidate) {
        return { workflow: 'lido-stake', status: 'failed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), command: result.command }, nextAction: 'Lido output did not include a valid tx envelope.' };
      }
      const moonpay = await signWithOwsAndSendWithMoonpay(txCandidate, wallet as string);
      if (!moonpay.ok) {
        return { workflow: 'lido-stake', status: 'failed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), command: result.command, failedCommand: moonpay.failedCommand, error: moonpay.error, output: moonpay.output }, nextAction: 'Fix the error and retry.' };
      }
      return { workflow: 'lido-stake', status: 'confirmed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), moonpay: moonpay.moonpay, command: result.command, commands: [result.command, moonpay.moonpay.signCommand, moonpay.moonpay.sendCommand] }, nextAction: null };
    },
  },
  'lido-wrap': {
    name: 'lido-wrap',
    description: 'Build, sign with OWS, and broadcast a Lido wrap transaction.',
    plan: ({ input }) => {
      const requiredKeys = ['amount', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      return {
        workflow: 'lido-wrap',
        status: missing.length > 0 ? 'failed' : 'planned',
        mode: 'plan',
        steps: [
          'Validate required inputs',
          'Run `lido wrap` to build tx payload',
          'Serialize unsigned tx for OWS signing',
          'Run `ows sign tx`',
          'Run `moonpay transaction send`',
        ],
        artifacts: {
          input,
          requirements: requiredKeys,
          missing,
          command: ['lido', 'wrap', String(input.amount), '--chain', String(input['chain-id']), '--wallet', String(input.wallet)],
        },
        nextAction: missing.length > 0 ? `Provide missing required inputs: ${missing.map((k) => `--${k}`).join(', ')}` : 'Run without --plan to execute sign + broadcast.',
      };
    },
    run: async ({ input }) => {
      const requiredKeys = ['amount', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      const steps = [
        'Validate required inputs',
        'Run `lido wrap` to build tx payload',
        'Serialize unsigned tx for OWS signing',
        'Run `ows sign tx`',
        'Run `moonpay transaction send`',
      ];
      if (missing.length > 0) {
        return { workflow: 'lido-wrap', status: 'failed', mode: 'run', steps, artifacts: { input, missing }, nextAction: `Provide: ${missing.map((k) => `--${k}`).join(', ')}` };
      }
      const wallet = readInputString(input, 'wallet');
      const args = ['wrap', input.amount as string, '--chain', input['chain-id'] as string];
      if (wallet) args.push('--wallet', wallet);
      const result = runChildJson('lido', args);
      if (!result.ok) {
        return { workflow: 'lido-wrap', status: 'failed', mode: 'run', steps, artifacts: { input, failedCommand: result.command, error: result.error, output: result.output }, nextAction: 'Fix the error and retry.' };
      }
      const txCandidate = extractTxObject(result.output);
      const ows = txCandidate ? await serializeForOws(txCandidate) : null;
      if (!txCandidate) {
        return { workflow: 'lido-wrap', status: 'failed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), command: result.command }, nextAction: 'Lido output did not include a valid tx envelope.' };
      }
      const moonpay = await signWithOwsAndSendWithMoonpay(txCandidate, wallet as string);
      if (!moonpay.ok) {
        return { workflow: 'lido-wrap', status: 'failed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), command: result.command, failedCommand: moonpay.failedCommand, error: moonpay.error, output: moonpay.output }, nextAction: 'Fix the error and retry.' };
      }
      return { workflow: 'lido-wrap', status: 'confirmed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), moonpay: moonpay.moonpay, command: result.command, commands: [result.command, moonpay.moonpay.signCommand, moonpay.moonpay.sendCommand] }, nextAction: null };
    },
  },
  'agent-register': {
    name: 'agent-register',
    description: 'Build, sign with OWS, and broadcast an 8004 agent registration transaction.',
    plan: ({ input }) => {
      const requiredKeys = ['uri', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      return {
        workflow: 'agent-register',
        status: missing.length > 0 ? 'failed' : 'planned',
        mode: 'plan',
        steps: [
          'Validate required inputs',
          'Run `8004 register` to build tx payload',
          'Serialize unsigned tx for OWS signing',
          'Run `ows sign tx`',
          'Run `moonpay transaction send`',
        ],
        artifacts: {
          input,
          requirements: requiredKeys,
          missing,
          command: ['8004', 'register', '--uri', String(input.uri), '--chain', String(input['chain-id']), '--wallet', String(input.wallet)],
        },
        nextAction: missing.length > 0 ? `Provide missing required inputs: ${missing.map((k) => `--${k}`).join(', ')}` : 'Run without --plan to execute sign + broadcast.',
      };
    },
    run: async ({ input }) => {
      const requiredKeys = ['uri', 'chain-id', 'wallet'];
      const missing = missingWorkflowKeys(input, requiredKeys);
      const steps = [
        'Validate required inputs',
        'Run `8004 register` to build tx payload',
        'Serialize unsigned tx for OWS signing',
        'Run `ows sign tx`',
        'Run `moonpay transaction send`',
      ];
      if (missing.length > 0) {
        return { workflow: 'agent-register', status: 'failed', mode: 'run', steps, artifacts: { input, missing }, nextAction: `Provide: ${missing.map((k) => `--${k}`).join(', ')}` };
      }
      const wallet = readInputString(input, 'wallet');
      const args = ['register', '--uri', input.uri as string, '--chain', input['chain-id'] as string];
      if (wallet) args.push('--wallet', wallet);
      const result = runChildJson('8004', args);
      if (!result.ok) {
        return { workflow: 'agent-register', status: 'failed', mode: 'run', steps, artifacts: { input, failedCommand: result.command, error: result.error, output: result.output }, nextAction: 'Fix the error and retry.' };
      }
      const txCandidate = extractTxObject(result.output);
      const ows = txCandidate ? await serializeForOws(txCandidate) : null;
      if (!txCandidate) {
        return { workflow: 'agent-register', status: 'failed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), command: result.command }, nextAction: '8004 output did not include a valid tx envelope.' };
      }
      const moonpay = await signWithOwsAndSendWithMoonpay(txCandidate, wallet as string);
      if (!moonpay.ok) {
        return { workflow: 'agent-register', status: 'failed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), command: result.command, failedCommand: moonpay.failedCommand, error: moonpay.error, output: moonpay.output }, nextAction: 'Fix the error and retry.' };
      }
      return { workflow: 'agent-register', status: 'confirmed', mode: 'run', steps, artifacts: { input, tx: result.output, ...(ows ? { ows } : {}), moonpay: moonpay.moonpay, command: result.command, commands: [result.command, moonpay.moonpay.signCommand, moonpay.moonpay.sendCommand] }, nextAction: null };
    },
  },
};

export function listWorkflows(): Array<{ name: string; description: string }> {
  return Object.values(WORKFLOWS).map((workflow) => ({
    name: workflow.name,
    description: workflow.description,
  }));
}

export async function runWorkflow(subArgs: string[], require: NodeRequire): Promise<number> {
  const [workflowName, ...workflowArgs] = subArgs;

  if (!workflowName || workflowName === 'list') {
    const workflows = listWorkflows();
    process.stdout.write('Available workflows:\n\n');
    for (const workflow of workflows) {
      process.stdout.write(`  ${workflow.name.padEnd(18)} ${workflow.description}\n`);
    }
    return 0;
  }

  const workflow = WORKFLOWS[workflowName];
  if (!workflow) {
    process.stderr.write(`Unknown workflow: ${workflowName}\n`);
    return 1;
  }

  const input = parseWorkflowInput(workflowArgs);
  const planMode = workflowArgs.includes('--plan');
  const state = planMode
    ? workflow.plan({ require, input })
    : await workflow.run({ require, input });

  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
  return state.status === 'failed' ? 1 : 0;
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
): number | Promise<number> {
  const { command, forwardedArgs } = routeArgs(argv);

  if (!command || command === '-h' || command === '--help' || command === 'help') {
    process.stdout.write(`${helpText()}\n`);
    return 0;
  }

  const require = createRequire(import.meta.url);
  if (command === 'list') return runList(require);
  if (command === 'versions') return runVersions(require);
  if (command === 'doctor') return runDoctor(require);
  if (command === 'skills') return runSkills(forwardedArgs);
  if (command === 'run') return runWorkflow(forwardedArgs, require);

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

/* c8 ignore start */
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
  const result = run(process.argv.slice(2));
  if (result instanceof Promise) {
    result.then((code) => process.exit(code));
  } else {
    process.exit(result);
  }
}
/* c8 ignore stop */
