import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as cli from '../src/cli.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

describe('utility commands', () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });

  describe('getChildInfo', () => {
    it('returns info for all routes', () => {
      const children = cli.getChildInfo(require);
      const names = children.map(c => c.name);
      expect(names).toContain('uniswap');
      expect(names).toContain('lido');
      expect(names).toContain('8004');
      expect(names).toContain('filecoin');
      expect(names).toContain('moonpay');
    });

    it('includes version and binPath for installed packages', () => {
      const children = cli.getChildInfo(require);
      const uniswap = children.find(c => c.name === 'uniswap');
      expect(uniswap).toBeDefined();
      expect(uniswap!.version).toBeTruthy();
      expect(uniswap!.binPath).toBeTruthy();
      expect(uniswap!.binExists).toBe(true);
    });
  });

  describe('runList', () => {
    it('returns 0 and lists all children', () => {
      const code = cli.runList(require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map(c => c[0]).join('');
      expect(output).toContain('uniswap');
      expect(output).toContain('uniswap-cli');
      expect(output).toContain('Registered child CLIs');
    });
  });

  describe('runVersions', () => {
    it('returns 0 and shows synthesis-cli version', () => {
      const code = cli.runVersions(require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map(c => c[0]).join('');
      expect(output).toContain('synthesis-cli v');
      expect(output).toContain('uniswap');
    });
  });

  describe('runDoctor', () => {
    it('returns 0 when all children are healthy', () => {
      const code = cli.runDoctor(require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map(c => c[0]).join('');
      expect(output).toContain('✓ pass');
      expect(output).toContain('Doctor check');
    });
  });

  describe('run integration', () => {
    it('handles list command', () => {
      const code = cli.run(['list'], vi.fn() as any);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map(c => c[0]).join('');
      expect(output).toContain('Registered child CLIs');
    });

    it('handles versions command', () => {
      const code = cli.run(['versions'], vi.fn() as any);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map(c => c[0]).join('');
      expect(output).toContain('synthesis-cli v');
    });

    it('handles doctor command', () => {
      const code = cli.run(['doctor'], vi.fn() as any);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map(c => c[0]).join('');
      expect(output).toContain('Doctor check');
    });
  });
});
