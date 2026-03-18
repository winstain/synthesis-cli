import { describe, expect, it, vi } from 'vitest';
import * as cli from '../src/cli.js';

describe('routeArgs', () => {
  it('parses command and remaining args', () => {
    expect(cli.routeArgs(['uniswap', 'swap', '--amount', '1'])).toEqual({
      command: 'uniswap',
      forwardedArgs: ['swap', '--amount', '1']
    });
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
});
