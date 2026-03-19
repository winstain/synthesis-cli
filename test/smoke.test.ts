import { describe, expect, it } from 'vitest';
import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'cli.js');

function runSynth(args: string[], expectFail = false): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [CLI_PATH, ...args], {
      encoding: 'utf8',
      timeout: 15_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', status: 0 };
  } catch (error: any) {
    if (!expectFail) throw error;
    return {
      stdout: error.stdout?.toString() ?? '',
      stderr: error.stderr?.toString() ?? '',
      status: error.status ?? 1,
    };
  }
}

describe('smoke: synth --help', () => {
  it('exits 0 and contains expected text', () => {
    const result = runSynth(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('synthesis-cli');
    expect(result.stdout).toContain('synth');
    expect(result.stdout).toContain('uniswap');
  });
});

describe('smoke: child CLI routes', () => {
  const routes = ['uniswap', 'lido', '8004', 'filecoin'] as const;

  for (const route of routes) {
    it(`synth ${route} --help exits 0`, () => {
      const result = runSynth([route, '--help']);
      expect(result.status).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  }
});

describe('smoke: unknown command', () => {
  it('exits non-zero for unknown command', () => {
    const result = runSynth(['nonexistent-xyz'], true);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Unknown command');
  });
});

describe('smoke: utility commands', () => {
  it('synth list exits 0', () => {
    const result = runSynth(['list']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Registered child CLIs');
  });

  it('synth versions exits 0', () => {
    const result = runSynth(['versions']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('synthesis-cli v');
  });

  it('synth doctor exits 0', () => {
    const result = runSynth(['doctor']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Doctor check');
  });
});
