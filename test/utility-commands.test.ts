import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as cli from '../src/cli.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

describe('utility commands', () => {
  let stdoutWrite: any;
  let stderrWrite: any;

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

    it('falls back to null version and false binExists when metadata is missing', () => {
      const fakeRequire = Object.assign(
        ((_: string) => ({})) as any,
        {
          resolve: () => '/tmp/fake-package/package.json',
        },
      );
      const children = cli.getChildInfo(fakeRequire);
      expect(children.every((child) => child.version === null)).toBe(true);
      expect(children.every((child) => child.binPath === null)).toBe(true);
      expect(children.every((child) => child.binExists === false)).toBe(true);
    });

    it('supports packages with a string bin field in child metadata', () => {
      const fakeRequire = Object.assign(
        ((_: string) => ({ version: '1.0.0', bin: 'bin.js' })) as any,
        {
          resolve: () => '/tmp/fake-package/package.json',
        },
      );
      const children = cli.getChildInfo(fakeRequire);
      expect(children.every((child) => child.binPath?.endsWith('bin.js'))).toBe(true);
    });
  });

  describe('runList', () => {
    it('returns 0 and lists all children', () => {
      const code = cli.runList(require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('uniswap');
      expect(output).toContain('uniswap-cli');
      expect(output).toContain('Registered child CLIs');
    });

    it('shows not installed for unresolved packages', () => {
      const fakeRequire = Object.assign((() => { throw new Error('missing'); }) as any, {
        resolve: () => {
          throw new Error('missing');
        },
      });
      const code = cli.runList(fakeRequire);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('not installed');
    });
  });

  describe('runVersions', () => {
    it('returns 0 and shows synthesis-cli version', () => {
      const code = cli.runVersions(require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('synthesis-cli v');
      expect(output).toContain('uniswap');
    });

    it('shows not installed in versions output for unresolved packages', () => {
      const fakeRequire = Object.assign((() => { throw new Error('missing'); }) as any, {
        resolve: () => {
          throw new Error('missing');
        },
      });
      const code = cli.runVersions(fakeRequire);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('not installed');
    });

    it('getSynthVersion returns unknown when package.json cannot be read', () => {
      const fakeRequire = (() => {
        throw new Error('cannot read');
      }) as any;
      expect(cli.getSynthVersion(fakeRequire)).toBe('unknown');
    });
  });

  describe('runDoctor', () => {
    it('returns 0 when all children are healthy', () => {
      const code = cli.runDoctor(require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('✓ pass');
      expect(output).toContain('Doctor check');
    });

    it('returns 1 when a package is missing', () => {
      const fakeRequire = Object.assign(
        (() => {
          throw new Error('missing package');
        }) as any,
        {
          resolve: () => {
            throw new Error('missing package');
          },
        },
      );
      const code = cli.runDoctor(fakeRequire);
      expect(code).toBe(1);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('package not found');
    });

    it('returns 1 when bin is missing for a resolved package', () => {
      const fakeRequire = Object.assign(
        ((pkgPath: string) => ({ version: '1.0.0', ...(pkgPath.includes('package.json') ? { bin: {} } : {}) })) as any,
        {
          resolve: () => '/tmp/uniswap-cli/package.json',
        },
      );
      const code = cli.runDoctor(fakeRequire);
      expect(code).toBe(1);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('bin not found');
    });
  });

  describe('run integration', () => {
    it('handles list command', () => {
      const code = cli.run(['list'], vi.fn() as any);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('Registered child CLIs');
    });

    it('handles versions command', () => {
      const code = cli.run(['versions'], vi.fn() as any);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('synthesis-cli v');
    });

    it('handles doctor command', () => {
      const code = cli.run(['doctor'], vi.fn() as any);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      expect(output).toContain('Doctor check');
    });
  });
});
