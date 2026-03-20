import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const spawnSyncMock = vi.fn();
vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawnSync: spawnSyncMock,
  };
});

const cli = await import('../src/cli.js');
const require = createRequire(import.meta.url);

describe('workflow runner', () => {
  let stdoutWrite: any;
  let stderrWrite: any;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    spawnSyncMock.mockReset();
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });

  it('lists workflows when called with no workflow name', () => {
    const code = cli.runWorkflow([], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output).toContain('Available workflows');
    expect(output).toContain('doctor-summary');
    expect(output).toContain('lido-stake');
  });

  it('supports --plan mode and returns planned status', () => {
    const code = cli.runWorkflow(['doctor-summary', '--plan'], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.workflow).toBe('doctor-summary');
    expect(json.status).toBe('planned');
    expect(json.mode).toBe('plan');
  });

  it('runs workflow and returns structured completed state', () => {
    const code = cli.runWorkflow(['doctor-summary'], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.workflow).toBe('doctor-summary');
    expect(json.status).toBe('completed');
    expect(json.mode).toBe('run');
    expect(json.artifacts.summary.total).toBeGreaterThan(0);
  });

  it('doctor-summary sets nextAction when unhealthy children exist', () => {
    const original = cli.ROUTES.uniswap;
    (cli.ROUTES as any).uniswap = { packageName: 'definitely-missing-uniswap', bin: 'uniswap' };
    try {
      const code = cli.runWorkflow(['doctor-summary'], require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      const json = JSON.parse(output);
      expect(String(json.nextAction)).toContain('synth doctor');
    } finally {
      (cli.ROUTES as any).uniswap = original;
    }
  });

  it('returns 1 for unknown workflows', () => {
    const code = cli.runWorkflow(['missing-workflow'], require);
    expect(code).toBe(1);
    const errOutput = stderrWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(errOutput).toContain('Unknown workflow');
  });

  it('supports uniswap-swap plan mode with required inputs', () => {
    const code = cli.runWorkflow(
      ['uniswap-swap', 'ignored-positional', '--plan', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'],
      require,
    );
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.workflow).toBe('uniswap-swap');
    expect(json.status).toBe('planned');
    expect(json.mode).toBe('plan');
    expect(json.artifacts.commands).toHaveLength(2);
  });

  it('returns failed state when uniswap-swap required inputs are missing', () => {
    const code = cli.runWorkflow(['uniswap-swap', '--plan', '--token-in', 'WETH'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.workflow).toBe('uniswap-swap');
    expect(json.status).toBe('failed');
    expect(json.artifacts.missing).toContain('token-out');
    expect(json.artifacts.missing).toContain('amount');
    expect(json.artifacts.missing).toContain('chain-id');
    expect(json.artifacts.missing).toContain('wallet');
  });

  it('uniswap-swap run returns failed when required inputs are missing', () => {
    const code = cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).status).toBe('failed');
  });

  it('uniswap-swap run executes approval+quote and returns needs_signature', () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":{"to":"0x1"},"permitData":{"x":1}}'), stderr: Buffer.from('') });

    const code = cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'],
      require,
    );

    expect(code).toBe(0);
    expect(spawnSyncMock).toHaveBeenCalledTimes(2);
    expect(spawnSyncMock.mock.calls[0][2]).toEqual({ stdio: ['pipe', 'pipe', 'pipe'] });

    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.status).toBe('needs_signature');
    expect(json.artifacts.approval.approved).toBe(true);
    expect(json.artifacts.tx.to).toBe('0x1');
  });

  it('uniswap-swap run handles child command failure', () => {
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: Buffer.from('{"foo":1}'), stderr: Buffer.from('bad') });

    const code = cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'],
      require,
    );

    expect(code).toBe(1);
    let output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    let json = JSON.parse(output);
    expect(json.status).toBe('failed');
    expect(json.artifacts.error).toContain('bad');

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 1, stdout: Buffer.from('{"foo":2}'), stderr: Buffer.from('quote bad') });
    const quoteFail = cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'],
      require,
    );
    expect(quoteFail).toBe(1);
    output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    json = JSON.parse(output);
    expect(json.artifacts.approval.approved).toBe(true);
    expect(json.artifacts.error).toContain('quote bad');
  });

  it('lido-stake plan + missing + run and optional wallet', () => {
    const planCode = cli.runWorkflow(['lido-stake', '--plan', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(planCode).toBe(0);
    let output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).status).toBe('planned');

    stdoutWrite.mockClear();
    const missing = cli.runWorkflow(['lido-stake', '--amount', '10'], require);
    expect(missing).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x2"}'), stderr: Buffer.from('') });
    const runCode = cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(runCode).toBe(0);
    output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.status).toBe('needs_signature');
    expect(json.artifacts.tx.to).toBe('0x2');
  });

  it('lido-wrap plan, missing input, failure and success handling', () => {
    const plan = cli.runWorkflow(['lido-wrap', '--plan', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(plan).toBe(0);

    const missing = cli.runWorkflow(['lido-wrap', '--amount', '10'], require);
    expect(missing).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: Buffer.from('not-json'), stderr: Buffer.from('wrap fail') });
    const failed = cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1'], require);
    expect(failed).toBe(1);
    let output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    let json = JSON.parse(output);
    expect(json.workflow).toBe('lido-wrap');
    expect(json.artifacts.output).toBe('not-json');

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x3"}'), stderr: Buffer.from('') });
    const ok = cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1'], require);
    expect(ok).toBe(0);
    output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    json = JSON.parse(output);
    expect(json.status).toBe('needs_signature');
  });

  it('agent-register plan/missing/success, and resolve failure path', () => {
    const plan = cli.runWorkflow(['agent-register', '--plan', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(plan).toBe(0);

    stdoutWrite.mockClear();
    const missing = cli.runWorkflow(['agent-register', '--chain-id', '1'], require);
    expect(missing).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x4"}'), stderr: Buffer.from('') });
    const success = cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(success).toBe(0);

    stdoutWrite.mockClear();
    const original = cli.ROUTES['8004'];
    (cli.ROUTES as any)['8004'] = { packageName: 'definitely-missing-8004', bin: '8004' };
    try {
      const code = cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1'], require);
      expect(code).toBe(1);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      const json = JSON.parse(output);
      expect(json.status).toBe('failed');
      expect(String(json.artifacts.error)).toContain("Failed to resolve '8004'");
    } finally {
      (cli.ROUTES as any)['8004'] = original;
    }
  });

  it('handles child execution error object fallback string path', () => {
    spawnSyncMock.mockReturnValueOnce({
      status: 0,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      error: { message: '', toString: () => 'spawn fallback' },
    });
    const code = cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(String(json.artifacts.error)).toContain('spawn fallback');
  });

  it('covers remaining branch paths', () => {
    let code = cli.runWorkflow(['lido-stake', '--plan', '--amount', '10'], require);
    expect(code).toBe(1);
    code = cli.runWorkflow(['lido-wrap', '--plan', '--amount', '10'], require);
    expect(code).toBe(1);
    code = cli.runWorkflow(['agent-register', '--plan', '--chain-id', '1'], require);
    expect(code).toBe(1);

    // non-missing plan branches without wallet
    code = cli.runWorkflow(['lido-stake', '--plan', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(0);
    code = cli.runWorkflow(['lido-wrap', '--plan', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(0);
    code = cli.runWorkflow(['agent-register', '--plan', '--uri', 'ipfs://abc', '--chain-id', '1'], require);
    expect(code).toBe(0);

    // uniswap success with non-object/empty quote output -> tx/permitData null branches
    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('ok-text'), stderr: Buffer.from('') });
    code = cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(0);
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') });
    code = cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(0);

    // lido-wrap wallet branch in run args
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x5"}'), stderr: Buffer.from('') });
    code = cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(0);

    // non-zero with undefined stderr branch
    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: Buffer.from('{"x":1}') });
    code = cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(1);

    // spawn error message branch with undefined stdout
    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stderr: Buffer.from(''), error: new Error('boom') });
    code = cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).artifacts.error).toContain('boom');
  });

  it('run() routes to workflow command', () => {
    const code = cli.run(['run', 'doctor-summary', '--plan']);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).workflow).toBe('doctor-summary');
  });
});
