import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const spawnSyncMock = vi.fn();
const getTransactionCountMock = vi.fn();
const estimateGasMock = vi.fn();
const estimateFeesPerGasMock = vi.fn();
const httpMock = vi.fn((url: string) => ({ url }));
const createPublicClientMock = vi.fn(() => ({
  getTransactionCount: getTransactionCountMock,
  estimateGas: estimateGasMock,
  estimateFeesPerGas: estimateFeesPerGasMock,
}));
const serializeTransactionMock = vi.fn();
vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawnSync: spawnSyncMock,
  };
});

vi.mock('viem', () => ({
  createPublicClient: createPublicClientMock,
  http: httpMock,
  serializeTransaction: serializeTransactionMock,
}));

const cli = await import('../src/cli.js');
const require = createRequire(import.meta.url);

describe('workflow runner', () => {
  let stdoutWrite: any;
  let stderrWrite: any;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true as any);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true as any);
    spawnSyncMock.mockReset();
    getTransactionCountMock.mockReset().mockResolvedValue(7);
    estimateGasMock.mockReset().mockResolvedValue(21_000n);
    estimateFeesPerGasMock.mockReset().mockResolvedValue({ maxFeePerGas: 2n, maxPriorityFeePerGas: 1n });
    serializeTransactionMock.mockReset().mockReturnValue('0xserialized');
    httpMock.mockClear();
    createPublicClientMock.mockClear();
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });

  it('lists workflows when called with no workflow name', async () => {
    const code = await cli.runWorkflow([], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(output).toContain('Available workflows');
    expect(output).toContain('doctor-summary');
    expect(output).toContain('lido-stake');
  });

  it('supports --plan mode and returns planned status', async () => {
    const code = await cli.runWorkflow(['doctor-summary', '--plan'], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.workflow).toBe('doctor-summary');
    expect(json.status).toBe('planned');
    expect(json.mode).toBe('plan');
  });

  it('runs workflow and returns structured completed state', async () => {
    const code = await cli.runWorkflow(['doctor-summary'], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.workflow).toBe('doctor-summary');
    expect(json.status).toBe('completed');
    expect(json.mode).toBe('run');
    expect(json.artifacts.summary.total).toBeGreaterThan(0);
  });

  it('doctor-summary sets nextAction when unhealthy children exist', async () => {
    const original = cli.ROUTES.uniswap;
    (cli.ROUTES as any).uniswap = { packageName: 'definitely-missing-uniswap', bin: 'uniswap' };
    try {
      const code = await cli.runWorkflow(['doctor-summary'], require);
      expect(code).toBe(0);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      const json = JSON.parse(output);
      expect(String(json.nextAction)).toContain('synth doctor');
    } finally {
      (cli.ROUTES as any).uniswap = original;
    }
  });

  it('returns 1 for unknown workflows', async () => {
    const code = await cli.runWorkflow(['missing-workflow'], require);
    expect(code).toBe(1);
    const errOutput = stderrWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(errOutput).toContain('Unknown workflow');
  });

  it('supports uniswap-swap plan mode with required inputs', async () => {
    const code = await cli.runWorkflow(
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

  it('returns failed state when uniswap-swap required inputs are missing', async () => {
    const code = await cli.runWorkflow(['uniswap-swap', '--plan', '--token-in', 'WETH'], require);
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

  it('uniswap-swap run returns failed when required inputs are missing', async () => {
    const code = await cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).status).toBe('failed');
  });

  it('uniswap-swap run executes approval+quote and broadcasts via ows + moonpay', async () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":{"to":"0x1","data":"0x","value":"0","chainId":1},"permitData":{"x":1}}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"signedTxHex":"0xsigned"}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"hash":"0xhash"}'), stderr: Buffer.from('') });

    const code = await cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'],
      require,
    );

    expect(code).toBe(0);
    expect(spawnSyncMock).toHaveBeenCalledTimes(4);
    expect(spawnSyncMock.mock.calls[0][2]).toEqual({ stdio: ['pipe', 'pipe', 'pipe'] });

    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.status).toBe('broadcast');
    expect(json.artifacts.approval.approved).toBe(true);
    expect(json.artifacts.tx.to).toBe('0x1');
    expect(json.artifacts.ows.unsignedTxHex).toBe('0xserialized');
    expect(json.artifacts.ows.signCommand).toContain('ows sign tx --wallet <wallet-name> --chain eip155:1 --tx 0xserialized --json');
    expect(json.artifacts.ows.sendCommand).toContain('--rpc-url https://eth.llamarpc.com');
  });

  it('uniswap-swap run handles child command failure', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: Buffer.from('{"foo":1}'), stderr: Buffer.from('bad') });

    const code = await cli.runWorkflow(
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
    const quoteFail = await cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'],
      require,
    );
    expect(quoteFail).toBe(1);
    output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    json = JSON.parse(output);
    expect(json.artifacts.approval.approved).toBe(true);
    expect(json.artifacts.error).toContain('quote bad');
  });

  it('lido-stake plan + missing + run with required wallet', async () => {
    const planCode = await cli.runWorkflow(['lido-stake', '--plan', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(planCode).toBe(0);
    let output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).status).toBe('planned');

    stdoutWrite.mockClear();
    const missing = await cli.runWorkflow(['lido-stake', '--amount', '10'], require);
    expect(missing).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x2","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"signedTxHex":"0xsigned"}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"hash":"0xhash"}'), stderr: Buffer.from('') });
    const runCode = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(runCode).toBe(0);
    output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.status).toBe('confirmed');
    expect(json.artifacts.tx.to).toBe('0x2');
  });

  it('lido-wrap plan, missing input, failure and success handling', async () => {
    const plan = await cli.runWorkflow(['lido-wrap', '--plan', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(plan).toBe(0);

    const missing = await cli.runWorkflow(['lido-wrap', '--amount', '10'], require);
    expect(missing).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: Buffer.from('not-json'), stderr: Buffer.from('wrap fail') });
    const failed = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(failed).toBe(1);
    let output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    let json = JSON.parse(output);
    expect(json.workflow).toBe('lido-wrap');
    expect(json.artifacts.output).toBe('not-json');

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x3","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"signedTxHex":"0xsigned"}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"hash":"0xhash"}'), stderr: Buffer.from('') });
    const ok = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(ok).toBe(0);
    output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    json = JSON.parse(output);
    expect(json.status).toBe('confirmed');
  });

  it('agent-register plan/missing/success, and resolve failure path', async () => {
    const plan = await cli.runWorkflow(['agent-register', '--plan', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(plan).toBe(0);

    stdoutWrite.mockClear();
    const missing = await cli.runWorkflow(['agent-register', '--chain-id', '1'], require);
    expect(missing).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x4","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"signedTxHex":"0xsigned"}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"hash":"0xhash"}'), stderr: Buffer.from('') });
    const success = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(success).toBe(0);

    stdoutWrite.mockClear();
    const original = cli.ROUTES['8004'];
    (cli.ROUTES as any)['8004'] = { packageName: 'definitely-missing-8004', bin: '8004' };
    try {
      const code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', 'wallet-1'], require);
      expect(code).toBe(1);
      const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
      const json = JSON.parse(output);
      expect(json.status).toBe('failed');
      expect(String(json.artifacts.error)).toContain("Failed to resolve '8004'");
    } finally {
      (cli.ROUTES as any)['8004'] = original;
    }
  });

  it('handles child execution error object fallback string path', async () => {
    spawnSyncMock.mockReturnValueOnce({
      status: 0,
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
      error: { message: '', toString: () => 'spawn fallback' },
    });
    const code = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(String(json.artifacts.error)).toContain('spawn fallback');
  });

  it('covers remaining branch paths', async () => {
    let code = await cli.runWorkflow(['lido-stake', '--plan', '--amount', '10'], require);
    expect(code).toBe(1);
    code = await cli.runWorkflow(['lido-wrap', '--plan', '--amount', '10'], require);
    expect(code).toBe(1);
    code = await cli.runWorkflow(['agent-register', '--plan', '--chain-id', '1'], require);
    expect(code).toBe(1);

    // wallet is required in plan mode too
    code = await cli.runWorkflow(['lido-stake', '--plan', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(1);
    code = await cli.runWorkflow(['lido-wrap', '--plan', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(1);
    code = await cli.runWorkflow(['agent-register', '--plan', '--uri', 'ipfs://abc', '--chain-id', '1'], require);
    expect(code).toBe(1);

    // uniswap quote without valid tx now fails immediately
    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('ok-text'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from(''), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);

    // non-zero with undefined stderr branch
    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: Buffer.from('{"x":1}') });
    code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);

    // spawn error message branch with undefined stdout
    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stderr: Buffer.from(''), error: new Error('boom') });
    code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).artifacts.error).toContain('boom');
  });

  it('omits ows artifact when serialization throws and serializeForOws handles unknown chains', async () => {
    serializeTransactionMock.mockImplementationOnce(() => {
      throw new Error('serialize failed');
    });
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x2","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') });
    const code = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).artifacts.ows).toBeUndefined();

    const unknown = await cli.serializeForOws({ to: '0x1', data: '0x', value: '0', chainId: 999999 });
    expect(unknown).toBeNull();
  });

  it('covers serializeForOws parsing branches and wrap/agent ows branches', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x2","data":123,"value":"0","chainId":1}'), stderr: Buffer.from('') });
    let code = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);

    let ows = await cli.serializeForOws({ to: '0x1', chainId: '1' });
    expect(ows?.unsignedTxHex).toBe('0xserialized');

    ows = await cli.serializeForOws({ to: '0x1', data: '0x', value: 2.7, chainId: '0x1', from: '0xabc' });
    expect(ows?.rpcUrl).toBe('https://eth.llamarpc.com');

    ows = await cli.serializeForOws({ to: '0x1', data: '0x', value: 1n, chainId: Number.NaN });
    expect(ows).toBeNull();

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x5","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x6","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);
  });

  it('covers parse and wallet branches for ows serialization', async () => {
    let ows = await cli.serializeForOws({ to: '0x1', data: '0x', value: 1n, chainId: '1' });
    expect(ows?.unsignedTxHex).toBe('0xserialized');
    ows = await cli.serializeForOws({ to: '0x1', data: '0x', value: ' ', chainId: 'not-a-number' as any });
    expect(ows).toBeNull();

    let code = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(1);

    code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(1);

    code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":"not-object"}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);
  });

  it('covers tx-candidate null branches across workflows', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x2","data":123}'), stderr: Buffer.from('') });
    let code = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x3"}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x4"}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":{"to":"0x1"}}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', '0xabc'], require);
    expect(code).toBe(1);
  });

  it('covers remaining rpc mapping and parse branches', async () => {
    expect((await cli.serializeForOws({ to: '0x1', chainId: 137 }))?.rpcUrl).toBe('https://polygon-rpc.com');
    expect((await cli.serializeForOws({ to: '0x1', chainId: 8453 }))?.rpcUrl).toBe('https://mainnet.base.org');
    expect((await cli.serializeForOws({ to: '0x1', chainId: 42161 }))?.rpcUrl).toBe('https://arb1.arbitrum.io/rpc');
    expect((await cli.serializeForOws({ to: '0x1', chainId: 10 }))?.rpcUrl).toBe('https://mainnet.optimism.io');
    expect(await cli.serializeForOws({ to: '0x1', chainId: {} as any })).toBeNull();
    expect(await cli.serializeForOws({ to: '0x1', chainId: '0xzz' as any })).toBeNull();

    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":"x","to":"0x9","chainId":1}'), stderr: Buffer.from('') });
    const code = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);
  });

  it('uniswap-swap runs full moonpay sign+send flow and returns broadcast', async () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":{"to":"0x1","data":"0x","value":"0","chainId":1}}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"signedTxHex":"0xsigned"}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"hash":"0xhash"}'), stderr: Buffer.from('') });

    const code = await cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', 'wallet-1'],
      require,
    );

    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.status).toBe('broadcast');
    expect(json.artifacts.moonpay.chain).toBe('ethereum');
    expect(json.artifacts.moonpay.signedTxHex).toBe('0xsigned');
  });

  it('uniswap-swap fails when moonpay sign returns invalid payload', async () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":{"to":"0x1","data":"0x","value":"0","chainId":1}}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"foo":"bar"}'), stderr: Buffer.from('') });

    const code = await cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', 'wallet-1'],
      require,
    );

    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(json.status).toBe('failed');
    expect(String(json.artifacts.error)).toContain('did not return a signed tx hex');
  });

  it('lido-stake fails when tx chainId cannot be parsed for moonpay', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x1","data":"0x","value":"0","chainId":{}}'), stderr: Buffer.from('') });
    const code = await cli.runWorkflow(['lido-stake', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(String(json.artifacts.error)).toContain('Invalid chainId');
  });

  it('lido-wrap fails when tx chainId is unsupported by moonpay map', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x1","data":"0x","value":"0","chainId":10}'), stderr: Buffer.from('') });
    const code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '10', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(String(json.artifacts.error)).toContain('Unsupported chainId');
  });

  it('uniswap-swap fails when moonpay send fails', async () => {
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"approved":true}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"tx":{"to":"0x1","data":"0x","value":"0","chainId":1}}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('0xsigned'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 1, stdout: Buffer.from('{"x":1}'), stderr: Buffer.from('send failed') });

    const code = await cli.runWorkflow(
      ['uniswap-swap', '--token-in', 'WETH', '--token-out', 'USDC', '--amount', '1', '--chain-id', '1', '--wallet', 'wallet-1'],
      require,
    );

    expect(code).toBe(1);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    const json = JSON.parse(output);
    expect(String(json.artifacts.error)).toContain('send failed');
  });

  it('covers lido-wrap moonpay branches (wallet missing, unavailable, success)', async () => {
    let code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x3","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x3","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"signedTx":"0xsigned"}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"hash":"0xhash"}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['lido-wrap', '--amount', '10', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).status).toBe('confirmed');
  });

  it('covers agent-register branches (invalid tx, wallet missing, unavailable, success)', async () => {
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x4"}'), stderr: Buffer.from('') });
    let code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);

    code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock.mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x4","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(1);

    stdoutWrite.mockClear();
    spawnSyncMock
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"to":"0x4","data":"0x","value":"0","chainId":1}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"signedTransaction":"0xsigned"}'), stderr: Buffer.from('') })
      .mockReturnValueOnce({ status: 0, stdout: Buffer.from('{"hash":"0xhash"}'), stderr: Buffer.from('') });
    code = await cli.runWorkflow(['agent-register', '--uri', 'ipfs://abc', '--chain-id', '1', '--wallet', 'wallet-1'], require);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).status).toBe('confirmed');
  });

  it('run() routes to workflow command', async () => {
    const code = await cli.run(['run', 'doctor-summary', '--plan']);
    expect(code).toBe(0);
    const output = stdoutWrite.mock.calls.map((c: any) => c[0]).join('');
    expect(JSON.parse(output).workflow).toBe('doctor-summary');
  });
});
