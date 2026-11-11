import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'bun:test';

import { classifyCall } from '../src/classify.ts';
import { readMcpServers, serverUrlOf } from '../src/mcp-config.ts';
import { eventOf, type ToolCall, toolCallOf } from '../src/payload.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'arp-hook-unit-'));
  dirs.push(dir);
  return dir;
}

/** A Claude-format call, overridable field by field. */
function call(over: Partial<ToolCall> = {}): ToolCall {
  return {
    format: 'claude',
    event: 'PostToolUse',
    session: 's1',
    id: 't1',
    tool: 'mcp__x__y',
    input: {},
    hasResponse: true,
    response: 'done',
    error: null,
    interrupted: false,
    ms: null,
    cwd: null,
    transcript: null,
    ...over,
  };
}

describe('eventOf', () => {
  test('names the event in either format, and nothing for a payload that names none', () => {
    expect(eventOf({ hook_event_name: 'Stop' })).toBe('Stop');
    expect(eventOf({ hookEventName: 'SessionEnd' })).toBe('SessionEnd');
    expect(eventOf({ hook_event_name: '' })).toBeNull();
    expect(eventOf({ tool_name: 'Bash' })).toBeNull();
    expect(eventOf(['Stop'])).toBeNull();
    expect(eventOf(null)).toBeNull();
  });
});

describe('toolCallOf', () => {
  test('reads the Claude Code failure payload as documented', () => {
    // code.claude.com/docs/en/hooks, PostToolUseFailure example input.
    const parsed = toolCallOf({
      session_id: 's1',
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'mcp__github__list',
      tool_input: { q: 1 },
      tool_use_id: 'toolu_01',
      error: 'Exit code 1',
      is_interrupt: false,
      duration_ms: 4187,
    });
    expect(parsed).toMatchObject({
      format: 'claude',
      event: 'PostToolUseFailure',
      id: 'toolu_01',
      error: 'Exit code 1',
      hasResponse: false,
      ms: 4187,
    });
  });

  test('reads the Grok Build camelCase envelope', () => {
    // xai-org/grok-build docs/user-guide/10-hooks.md, field names of the PreToolUse example.
    const parsed = toolCallOf({
      hookEventName: 'PostToolUse',
      sessionId: 'g1',
      toolName: 'mcp__github__list',
      toolInput: { q: 1 },
      toolUseId: 'call_9',
      toolResult: { content: [] },
      cwd: '/w',
    });
    expect(parsed).toMatchObject({
      format: 'grok',
      event: 'PostToolUse',
      session: 'g1',
      id: 'call_9',
      tool: 'mcp__github__list',
      hasResponse: true,
      cwd: '/w',
    });
  });

  test('a payload with no tool name is nothing', () => {
    expect(toolCallOf({ session_id: 's' })).toBeNull();
    expect(toolCallOf('text')).toBeNull();
    expect(toolCallOf(null)).toBeNull();
  });
});

describe('classifyCall', () => {
  test('a success is ok, even when its text mentions an error', () => {
    expect(classifyCall(call({ response: 'How to fix 401 Unauthorized' }))).toEqual({
      outcome: 'ok',
      code: null,
    });
  });

  test('the failure event is a failure even with no response', () => {
    expect(
      classifyCall(call({ event: 'PostToolUseFailure', hasResponse: false, error: 'boom' })),
    ).toEqual({ outcome: 'tool_error', code: null });
  });

  test('the MCP error flag is a tool error', () => {
    expect(classifyCall(call({ response: { isError: true } }))).toMatchObject({
      outcome: 'tool_error',
    });
  });

  test('categories: auth, a payment asked for, timeout, unreachable, with the status code only', () => {
    expect(classifyCall(call({ error: 'HTTP 401 Unauthorized: bad token sk-1' }))).toEqual({
      outcome: 'auth',
      code: '401',
    });
    expect(classifyCall(call({ error: '402 Payment Required' }))).toEqual({
      outcome: 'payment_required',
      code: '402',
    });
    expect(classifyCall(call({ error: 'request timed out' }))?.outcome).toBe('timeout');
    expect(classifyCall(call({ error: 'getaddrinfo ENOTFOUND api.x' }))?.outcome).toBe(
      'unreachable',
    );
    expect(classifyCall(call({ error: 'upstream 502' }))).toEqual({
      outcome: 'tool_error',
      code: '502',
    });
  });

  describe('x402 (task 125)', () => {
    const failure = (error: string) => call({ event: 'PostToolUseFailure', hasResponse: false, response: undefined, error });
    const settled = { success: true, transaction: `0x${'ab'.repeat(32)}`, network: 'eip155:8453', payer: `0x${'1'.repeat(40)}` };
    // The MCP transport's challenge: `isError: true`, the `PaymentRequired` object as the text (coinbase/x402,
    // specs/transports-v2/mcp.md, "Payment Required Signaling"). Claude Code fires PostToolUseFailure on it.
    const challenge = JSON.stringify({
      x402Version: 2,
      error: 'Payment required',
      resource: { url: 'mcp://tool/weather' },
      accepts: [{ scheme: 'exact', network: 'eip155:84532', amount: '1000' }],
    });

    test("the first 402 of an x402 call is the challenge, not a failure: it was 'payment' until task 125", () => {
      expect(classifyCall(failure(challenge))).toEqual({ outcome: 'payment_required', code: '402' });
      expect(classifyCall(call({ response: { status: 402 } }))).toEqual({ outcome: 'payment_required', code: '402' });
    });

    test('a call that paid and answered is ok, whatever its text says about the 402', () => {
      const text = `402 Payment Required, paid: ${JSON.stringify(settled)}\n{"temp":12}`;
      expect(classifyCall(call({ response: [{ type: 'text', text }] }))).toEqual({ outcome: 'ok', code: null });
    });

    test('refused before it settled: funds, a rejected payment, Settlement failed, success false', () => {
      expect(classifyCall(failure('payment rejected: insufficient funds'))?.outcome).toBe('payment_refused');
      expect(classifyCall(failure(JSON.stringify({ x402Version: 2, error: 'Settlement failed', accepts: [] })))).toEqual({
        outcome: 'payment_refused',
        code: '402',
      });
      const header = { success: false, errorReason: 'insufficient_funds', transaction: '', network: 'eip155:8453' };
      expect(classifyCall(call({ response: { status: 402, paymentResponse: header } }))?.outcome).toBe('payment_refused');
    });

    test('"success": false outside a payment is an ordinary tool error', () => {
      expect(classifyCall(failure('{"success":false,"error":"row locked"}'))?.outcome).toBe('tool_error');
    });

    test('paid, nothing delivered: a settlement in the payload and a failure after it, with the later status', () => {
      expect(classifyCall(failure(`402, then paid ${JSON.stringify(settled)}, then upstream 502`))).toEqual({
        outcome: 'paid_no_delivery',
        code: '502',
      });
      const base64 = Buffer.from(JSON.stringify(settled)).toString('base64');
      expect(classifyCall(failure(`HTTP 500 after PAYMENT-RESPONSE: ${base64}`))).toEqual({
        outcome: 'paid_no_delivery',
        code: '500',
      });
      expect(classifyCall(call({ response: { content: [], paymentResponse: settled } }))).toEqual({
        outcome: 'paid_no_delivery',
        code: null,
      });
    });

    test('a settlement with content back is ok; a shape the hook cannot read the content of stays ok', () => {
      const answered = { content: [{ type: 'text', text: 'sunny' }], paymentResponse: settled };
      expect(classifyCall(call({ response: answered }))?.outcome).toBe('ok');
      expect(classifyCall(call({ response: { body: '', paymentResponse: settled } }))?.outcome).toBe('ok');
    });

    test('no settlement in the payload, no paid class: a paid call that failed is what failed', () => {
      expect(classifyCall(failure('402 Payment Required, retried with payment, then upstream 502'))).toEqual({
        outcome: 'tool_error',
        code: '502',
      });
      expect(classifyCall(failure('402 Payment Required; request timed out'))?.outcome).toBe('timeout');
      const short = 'settled {"success":true,"transaction":"0xabc","network":"eip155:8453"} but 502';
      expect(classifyCall(failure(short))?.outcome).toBe('tool_error');
    });

    test("the word x402 alone is not a payment: an x402 tool's timeout is a timeout", () => {
      expect(classifyCall(failure('x402 fetch: request timed out'))?.outcome).toBe('timeout');
      expect(classifyCall(failure('x402-weather: getaddrinfo ENOTFOUND api.x'))?.outcome).toBe('unreachable');
    });
  });

  test('an interrupted or user-cancelled call is not classified', () => {
    expect(classifyCall(call({ interrupted: true, error: 'x' }))).toBeNull();
    expect(classifyCall(call({ error: 'The user rejected this call' }))).toBeNull();
  });
});

describe('mcp-config', () => {
  test('merges user, local and project scope, the project winning', () => {
    const home = tempDir();
    const cwd = join(home, 'proj');
    mkdirSync(cwd);
    writeFileSync(
      join(home, '.claude.json'),
      JSON.stringify({
        mcpServers: {
          github: { url: 'https://api.githubcopilot.com/mcp/' },
          shared: { url: 'https://old.example' },
        },
        projects: {
          [cwd]: { mcpServers: { time: { command: 'uvx', args: ['mcp-server-time'] } } },
        },
      }),
    );
    writeFileSync(
      join(cwd, '.mcp.json'),
      JSON.stringify({
        mcpServers: { shared: { command: 'npx', args: ['-y', '@scope/pkg@2.1.0'] } },
      }),
    );
    const servers = readMcpServers({ cwd, home });
    expect([...servers.keys()].sort()).toEqual(['github', 'shared', 'time']);
    expect(serverUrlOf(servers.get('shared'))).toBe('https://www.npmjs.com/package/@scope/pkg');
    expect(serverUrlOf(servers.get('time'))).toBe('https://pypi.org/project/mcp-server-time');
    expect(serverUrlOf(servers.get('github'))).toBe('https://api.githubcopilot.com/mcp/');
  });

  test('missing or broken files are nothing, never a throw', () => {
    const home = tempDir();
    writeFileSync(join(home, '.claude.json'), '{not json');
    expect(readMcpServers({ cwd: join(home, 'none'), home }).size).toBe(0);
  });

  test('a script, a local path or localhost names nothing', () => {
    expect(serverUrlOf({ transport: 'local', command: 'node', args: ['./server.js'] })).toBeNull();
    expect(serverUrlOf({ transport: 'local', command: 'npx', args: ['./local'] })).toBeNull();
    expect(serverUrlOf({ transport: 'remote', url: 'http://localhost:3000/mcp' })).toBeNull();
    expect(serverUrlOf({ transport: 'remote', url: 'file:///x' })).toBeNull();
    expect(serverUrlOf(undefined)).toBeNull();
  });
});
