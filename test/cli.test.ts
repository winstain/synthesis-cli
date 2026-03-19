import { describe, expect, it, vi } from 'vitest';
import * as cli from '../src/cli.js';
import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';

describe('routeArgs', () => {
  it('parses command and remaining args', () => {
    expect(cli.routeArgs(['uniswap', 'swap', '--amount', '1'])).toEqual({
      command: 'uniswap',
      forwardedArgs: ['swap', '--amount', '1']
    });
  });
});

describe('resolveBinPath', () => {
  it('resolves the bin path for an installed child package', () => {
    const resolved = cli.resolveBinPath('uniswap');
    expect(resolved).toContain('uniswap-cli');
    expect(resolved.endsWith('.js')).toBe(true);
  });

  it('resolves packages that use a string bin field', async () => {
    const pkgDir = path.resolve('node_modules', 'tmp-string-bin-cli');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(path.join(pkgDir, 'package.json'), JSON.stringify({ name: 'tmp-string-bin-cli', version: '1.0.0', bin: 'bin.js' }));
    await writeFile(path.join(pkgDir, 'bin.js'), 'console.log("ok")');

    const original = cli.ROUTES.uniswap;
    (cli.ROUTES as any).uniswap = { packageName: 'tmp-string-bin-cli', bin: 'uniswap' };

    try {
      expect(cli.resolveBinPath('uniswap')).toBe(path.join(pkgDir, 'bin.js'));
    } finally {
      (cli.ROUTES as any).uniswap = original;
      await rm(pkgDir, { recursive: true, force: true });
    }
  });

  it('throws when the expected bin is not exposed', async () => {
    const pkgDir = path.resolve('node_modules', 'tmp-no-bin-cli');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(path.join(pkgDir, 'package.json'), JSON.stringify({ name: 'tmp-no-bin-cli', version: '1.0.0', bin: {} }));

    const original = cli.ROUTES.uniswap;
    (cli.ROUTES as any).uniswap = { packageName: 'tmp-no-bin-cli', bin: 'uniswap' };

    try {
      expect(() => cli.resolveBinPath('uniswap')).toThrow("does not expose expected bin 'uniswap'");
    } finally {
      (cli.ROUTES as any).uniswap = original;
      await rm(pkgDir, { recursive: true, force: true });
    }
  });
});

describe('run', () => {
  it('prints help and exits 0 with no args', () => {
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    const code = cli.run([], vi.fn() as any);
    expect(code).toBe(0);
    expect(stdoutWrite).toHaveBeenCalledWith(`${cli.helpText()}\n`);
    stdoutWrite.mockRestore();
  });

  it('returns 1 for unknown command', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    const code = cli.run(['unknown'], vi.fn() as any);
    expect(code).toBe(1);
    expect(stderrWrite).toHaveBeenCalled();
    stderrWrite.mockRestore();
  });

  it('resolves and forwards args to child bin via node', () => {
    const spawnFn = vi.fn().mockReturnValue({ status: 0 });
    const resolveBinPathFn = vi.fn().mockReturnValue('/fake/uniswap-cli/dist/index.js');
    const code = cli.run(['uniswap', 'swap', '--help'], spawnFn as any, resolveBinPathFn);

    expect(code).toBe(0);
    expect(resolveBinPathFn).toHaveBeenCalledWith('uniswap');
    expect(spawnFn).toHaveBeenCalledWith(
      process.execPath,
      ['/fake/uniswap-cli/dist/index.js', 'swap', '--help'],
      expect.objectContaining({ stdio: 'inherit' })
    );
  });

  it('returns 1 when spawn reports an execution error', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    const spawnFn = vi.fn().mockReturnValue({ status: 0, error: new Error('boom') });
    const resolveBinPathFn = vi.fn().mockReturnValue('/fake/uniswap-cli/dist/index.js');
    const code = cli.run(['uniswap'], spawnFn as any, resolveBinPathFn);
    expect(code).toBe(1);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("Failed to execute 'uniswap': boom"));
    stderrWrite.mockRestore();
  });

  it('falls back to String(error) when spawn error has no message', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    const error = { message: '', toString: () => 'fallback error' };
    const spawnFn = vi.fn().mockReturnValue({ status: 0, error });
    const resolveBinPathFn = vi.fn().mockReturnValue('/fake/uniswap-cli/dist/index.js');
    const code = cli.run(['uniswap'], spawnFn as any, resolveBinPathFn);
    expect(code).toBe(1);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("Failed to execute 'uniswap': fallback error"));
    stderrWrite.mockRestore();
  });

  it('returns 0 when spawn status is null', () => {
    const spawnFn = vi.fn().mockReturnValue({ status: null });
    const resolveBinPathFn = vi.fn().mockReturnValue('/fake/uniswap-cli/dist/index.js');
    const code = cli.run(['uniswap'], spawnFn as any, resolveBinPathFn);
    expect(code).toBe(0);
  });

  it('returns 1 when resolving a child bin throws an Error', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    const resolveBinPathFn = vi.fn().mockImplementation(() => {
      throw new Error('missing bin');
    });
    const code = cli.run(['uniswap'], vi.fn() as any, resolveBinPathFn);
    expect(code).toBe(1);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("Failed to resolve 'uniswap': missing bin"));
    stderrWrite.mockRestore();
  });

  it('returns 1 when resolving a child bin throws a non-Error', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    const resolveBinPathFn = vi.fn().mockImplementation(() => {
      throw 'bad';
    });
    const code = cli.run(['uniswap'], vi.fn() as any, resolveBinPathFn);
    expect(code).toBe(1);
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("Failed to resolve 'uniswap': bad"));
    stderrWrite.mockRestore();
  });
});
