import { describe, expect, it, vi } from 'vitest';
import { helpText, routeArgs, run } from '../src/cli.js';

describe('routeArgs', () => {
  it('parses command and remaining args', () => {
    expect(routeArgs(['uniswap', 'swap', '--amount', '1'])).toEqual({
      command: 'uniswap',
      forwardedArgs: ['swap', '--amount', '1']
    });
  });
});

describe('run', () => {
  it('prints help and exits 0 with no args', () => {
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    const code = run([], vi.fn() as any);
    expect(code).toBe(0);
    expect(stdoutWrite).toHaveBeenCalledWith(`${helpText()}\n`);
    stdoutWrite.mockRestore();
  });

  it('returns 1 for unknown command', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    const code = run(['unknown'], vi.fn() as any);
    expect(code).toBe(1);
    expect(stderrWrite).toHaveBeenCalled();
    stderrWrite.mockRestore();
  });

  it('forwards args to mapped child command', () => {
    const spawnFn = vi.fn().mockReturnValue({ status: 0 });
    const code = run(['uniswap', 'swap', '--help'], spawnFn as any);

    expect(code).toBe(0);
    expect(spawnFn).toHaveBeenCalledWith(
      'uniswap',
      ['swap', '--help'],
      expect.objectContaining({ stdio: 'inherit' })
    );
  });
});
