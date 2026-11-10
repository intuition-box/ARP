import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import {
  admitEndpoint,
  admitRepository,
  pinnedAsk,
  Refused,
  toolAdmitter,
  type Answer,
  type Ask,
} from '../src/admit-tool.ts';

/** A local server standing in for a stranger's: reached through `pinnedAsk` only with `allowPrivate`. */
let server: ReturnType<typeof Bun.serve>;
const hits: string[] = [];
beforeAll(() => {
  server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      const path = new URL(request.url).pathname;
      hits.push(`${request.method} ${path} ${request.headers.get('host')}`);
      if (path === '/mcp' && request.method === 'POST') {
        return Response.json({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18' } });
      }
      if (path === '/moved') return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } });
      if (path === '/big') return new Response('x'.repeat(200_000));
      if (path === '/slow') return new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'text/event-stream' } });
      if (path === '/sse') {
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('event: endpoint\ndata: /messages\n\n'));
            },
          }),
          { headers: { 'content-type': 'text/event-stream' } },
        );
      }
      return new Response('<html>a page</html>', { headers: { 'content-type': 'text/html' } });
    },
  });
});
afterAll(() => server.stop(true));

const local = (path: string) => `http://pinned.test:${server.port}${path}`;
/** Resolves every name to the local server, so a request that reaches it went through this lookup. */
const toLoopback = async () => [{ address: '127.0.0.1', family: 4 }];

describe('pinnedAsk', () => {
  it('connects to the address it resolved, not to one the runtime looks up again', async () => {
    const ask = pinnedAsk({ allowPrivate: true, resolve: toLoopback });
    const answer = await ask(local('/mcp'), { method: 'POST', headers: {}, body: '{}' });
    expect(answer.status).toBe(200);
    expect(hits.at(-1)).toBe(`POST /mcp pinned.test:${server.port}`);
  });

  it('refuses a name that resolves to a private address, before connecting', async () => {
    const before = hits.length;
    const ask = pinnedAsk({ allowPrivate: false, resolve: toLoopback });
    const error = await ask(local('/mcp'), { method: 'GET', headers: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Refused);
    expect((error as Refused).rule).toBe('private-address');
    expect(String((error as Refused).message)).toContain('127.0.0.1');
    expect(hits.length).toBe(before);
  });

  it('refuses a name with any private address among public ones', async () => {
    const ask = pinnedAsk({
      allowPrivate: false,
      resolve: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '10.0.0.7', family: 4 },
      ],
    });
    const error = await ask('https://mixed.example/', { method: 'GET', headers: {} }).catch((e: unknown) => e);
    expect((error as Refused).rule).toBe('private-address');
  });

  it('refuses a literal private address, localhost and a link-local one without a lookup', async () => {
    let looked = 0;
    const ask = pinnedAsk({
      allowPrivate: false,
      resolve: async () => {
        looked += 1;
        return [{ address: '93.184.216.34', family: 4 }];
      },
    });
    for (const url of [
      `http://127.0.0.1:${server.port}/mcp`,
      'http://localhost/',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://metadata.google.internal/',
    ]) {
      const error = await ask(url, { method: 'GET', headers: {} }).catch((e: unknown) => e);
      expect((error as Refused).rule).toBe('private-address');
    }
    expect(looked).toBe(0);
  });

  it('refuses a scheme that is not http or https', async () => {
    const ask = pinnedAsk({ allowPrivate: true, resolve: toLoopback });
    const error = await ask('file:///etc/passwd', { method: 'GET', headers: {} }).catch((e: unknown) => e);
    expect((error as Refused).rule).toBe('not-a-tool');
  });

  it('does not follow a redirect', async () => {
    const ask = pinnedAsk({ allowPrivate: true, resolve: toLoopback });
    const answer = await ask(local('/moved'), { method: 'GET', headers: {} });
    expect(answer.status).toBe(302);
    expect(answer.header('location')).toBe('http://169.254.169.254/');
  });

  it('keeps no more of the body than the cap', async () => {
    const ask = pinnedAsk({ allowPrivate: true, resolve: toLoopback, maxBytes: 1_000 });
    const answer = await ask(local('/big'), { method: 'GET', headers: {} });
    expect(answer.body.length).toBe(1_000);
  });

  it('keeps what a stream sent by the deadline, and throws when nothing answered', async () => {
    const ask = pinnedAsk({ allowPrivate: true, resolve: toLoopback, timeoutMs: 300 });
    const sse = await ask(local('/sse'), { method: 'GET', headers: {} });
    expect(sse.body).toContain('event: endpoint');
    // A stream that sends nothing has sent no headers either, here: no answer.
    const slow = await ask(local('/slow'), { method: 'GET', headers: {} }).catch((e: unknown) => e);
    expect(String(slow)).toMatch(/no answer within 300 ms/);
    const silent = pinnedAsk({
      allowPrivate: true,
      // A resolver that never answers stands in for a host that never does.
      resolve: () => new Promise(() => {}),
      timeoutMs: 200,
    });
    const error = await silent('http://silent.test/', { method: 'GET', headers: {} }).catch((e: unknown) => e);
    expect(String(error)).toMatch(/no answer within 200 ms/);
  });
});

/** An `Ask` that answers by method and URL, and records what was asked. */
function scripted(answers: Record<string, Partial<Answer> & { headers?: Record<string, string> }>) {
  const asked: string[] = [];
  const ask: Ask = async (url, init) => {
    const key = `${init.method} ${url}`;
    asked.push(key);
    const found = answers[key];
    if (found === undefined) return { status: 404, header: () => null, body: '' };
    const headers = found.headers ?? {};
    return {
      status: found.status ?? 200,
      header: (name) => headers[name.toLowerCase()] ?? null,
      body: found.body ?? '',
    };
  };
  return { ask, asked };
}

describe('admitEndpoint', () => {
  const URL_ = 'https://tool.example/api';

  it('accepts an x402 402 on the first GET, and asks nothing more', async () => {
    const required = btoa(
      JSON.stringify({ x402Version: 2, accepts: [{ scheme: 'exact', network: 'eip155:8453', payTo: '0xB' }] }),
    );
    const { ask, asked } = scripted({ [`GET ${URL_}`]: { status: 402, headers: { 'payment-required': required } } });
    expect(await admitEndpoint(URL_, ask)).toEqual({ ok: true, form: 'x402' });
    expect(asked).toEqual([`GET ${URL_}`]);
  });

  it('accepts an MCP server that answers initialize', async () => {
    const { ask, asked } = scripted({
      [`POST ${URL_}`]: { body: JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18' } }) },
    });
    expect(await admitEndpoint(URL_, ask)).toEqual({ ok: true, form: 'mcp-endpoint' });
    expect(asked).toEqual([`GET ${URL_}`, `POST ${URL_}`]);
  });

  it('accepts an A2A card under .well-known', async () => {
    const { ask } = scripted({
      [`GET ${URL_}/.well-known/agent-card.json`]: { body: JSON.stringify({ name: 'a', skills: [] }) },
    });
    expect(await admitEndpoint(URL_, ask)).toEqual({ ok: true, form: 'a2a-card' });
  });

  it('refuses a web page as not a tool, saying what each request answered', async () => {
    const { ask, asked } = scripted({ [`GET ${URL_}`]: { body: '<html>' }, [`POST ${URL_}`]: { status: 405 } });
    const answer = await admitEndpoint(URL_, ask);
    expect(answer.ok).toBe(false);
    if (answer.ok) return;
    expect(answer.rule).toBe('not-a-tool');
    expect(answer.reason).toContain('GET 200, initialize 405, agent card 404');
    expect(asked).toHaveLength(3);
  });

  it('names a redirect it did not follow', async () => {
    const { ask } = scripted({ [`GET ${URL_}`]: { status: 301, headers: { location: 'https://elsewhere.example/' } } });
    const answer = await admitEndpoint(URL_, ask);
    expect(answer.ok).toBe(false);
    if (!answer.ok) expect(answer.reason).toMatch(/to https:\/\/elsewhere\.example\/.*list the URL it points to/);
  });

  it('refuses an unreachable URL at once, and a private one with its own rule', async () => {
    let calls = 0;
    const down: Ask = async () => {
      calls += 1;
      throw new Error('connect ECONNREFUSED');
    };
    expect(await admitEndpoint(URL_, down)).toEqual({
      ok: false,
      rule: 'unreachable',
      reason: `${URL_} could not be reached: connect ECONNREFUSED`,
    });
    expect(calls).toBe(1);
    const inside: Ask = async () => {
      throw new Refused('private-address', 'tool.example resolves to 10.0.0.1, not a public address');
    };
    const refused = await admitEndpoint(URL_, inside);
    expect(refused.ok === false && refused.rule).toBe('private-address');
  });
});

describe('admitRepository', () => {
  /** GitHub's tree and raw hosts, from a file list and the files' contents. */
  function github(paths: string[], files: Record<string, string> = {}, treeStatus = 200) {
    const asked: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      asked.push(url);
      if (url.startsWith('https://api.github.com/')) {
        return treeStatus === 200
          ? Response.json({ tree: paths.map((path) => ({ path, type: 'blob' })) })
          : new Response('', { status: treeStatus });
      }
      const path = url.replace(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/HEAD\//, '');
      const text = files[decodeURIComponent(path)];
      return text === undefined ? new Response('', { status: 404 }) : new Response(text);
    }) as typeof fetch;
    return { fetchImpl, asked };
  }

  it('accepts a skill or a plugin by name, with one request', async () => {
    const skill = github(['skills/x/SKILL.md']);
    expect(await admitRepository('a/b', '', skill.fetchImpl)).toEqual({ ok: true, form: 'skill' });
    expect(skill.asked).toHaveLength(1);
    const plugin = github(['.claude-plugin/plugin.json']);
    expect(await admitRepository('a/b', '', plugin.fetchImpl)).toEqual({ ok: true, form: 'claude-plugin' });
  });

  it('reads a server.json and accepts it under the registry schema', async () => {
    const { fetchImpl, asked } = github(['server.json', 'src/index.ts'], {
      'server.json': JSON.stringify({
        $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
      }),
    });
    expect(await admitRepository('a/b', '', fetchImpl)).toEqual({ ok: true, form: 'mcp-registry' });
    expect(asked[1]).toBe('https://raw.githubusercontent.com/a/b/HEAD/server.json');
  });

  it('accepts a root package.json that depends on the MCP SDK', async () => {
    const { fetchImpl } = github(['package.json'], {
      'package.json': JSON.stringify({ dependencies: { '@modelcontextprotocol/sdk': '^1' } }),
    });
    expect(await admitRepository('a/b', '', fetchImpl)).toEqual({ ok: true, form: 'mcp-package' });
  });

  it('refuses a repository of plain code, and an empty one', async () => {
    const plain = github(['README.md', 'package.json', 'server.json'], {
      'package.json': JSON.stringify({ dependencies: { express: '^4' } }),
      'server.json': JSON.stringify({ port: 3000 }),
    });
    const answer = await admitRepository('a/b', '', plain.fetchImpl);
    expect(answer.ok === false && answer.rule).toBe('not-a-tool');
    expect(answer.ok === false && answer.reason).toMatch(/github\.com\/a\/b holds nothing a runtime loads/);
    const empty = github([], {}, 409);
    expect(await admitRepository('a/b', '', empty.fetchImpl)).toEqual({
      ok: false,
      rule: 'not-a-tool',
      reason: 'github.com/a/b is empty',
    });
  });

  it('throws on a rate limit: it says nothing about the repository', async () => {
    const limited = github([], {}, 403);
    await expect(admitRepository('a/b', '', limited.fetchImpl)).rejects.toThrow(/HTTP 403/);
  });
});

describe('toolAdmitter', () => {
  it('passes a GitHub skill without a request: its SKILL.md was checked already', async () => {
    const { ask, asked } = scripted({});
    const admit = toolAdmitter({ ask, fetch: (async () => { throw new Error('no request expected'); }) as unknown as typeof fetch });
    expect(await admit('https://github.com/a/b?skill=c', 'a/b')).toEqual({ ok: true, form: 'skill' });
    expect(asked).toHaveLength(0);
  });

  it('remembers a verdict, and stops checking endpoints past the hourly bound', async () => {
    let t = 0;
    const { ask, asked } = scripted({});
    const admit = toolAdmitter({ ask, endpointChecksPerHour: 2, now: () => t });
    await admit('https://one.example/');
    await admit('https://one.example/');
    expect(asked.filter((a) => a === 'GET https://one.example/')).toHaveLength(1);
    await admit('https://two.example/');
    await expect(admit('https://three.example/')).rejects.toThrow(/2 endpoint checks in the last hour/);
    t = 61 * 60_000;
    expect((await admit('https://three.example/')).ok).toBe(false);
  });
});
