import { describe, expect, test } from 'bun:test';

import { read } from '../src/probe.ts';
import { memoryReadings } from '../src/store.ts';
import type { Target } from '../src/targets.ts';
import { TARGETS } from '../src/targets.ts';
import { handle, runCycle } from '../src/worker.ts';

const endpoint: Target = {
  label: 'mcp.example.com/mcp',
  kind: 'endpoint',
  repo: 'o/r',
  url: 'https://mcp.example.com/mcp',
};
const npm: Target = {
  label: 'npmjs.com/package/@o/server',
  kind: 'npm',
  repo: 'o/r',
  url: 'https://npmjs.com/package/@o/server',
};
const pypi: Target = {
  label: 'pypi.org/project/server',
  kind: 'pypi',
  repo: 'o/r',
  url: 'https://pypi.org/project/server',
};

function answering(response: () => Response): typeof fetch {
  return (async () => response()) as unknown as typeof fetch;
}

/** One x402 offer: Base's USDC, 0.02, to a payee. */
const OFFER = {
  network: 'eip155:8453',
  asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  payTo: `0x${'5e'.repeat(20)}`,
  amount: '20000',
};
const OLD_PAYEE = `0x${'0d'.repeat(20)}`;

let clock = 1_800_000_000_000;
const now = () => (clock += 25);

describe('an endpoint', () => {
  test('a JSON-RPC result to initialize answers', async () => {
    const reading = await read(
      endpoint,
      answering(() => Response.json({ jsonrpc: '2.0', id: 1, result: { serverInfo: {} } })),
      now,
    );
    expect(reading.outcome).toBe('answers');
    expect(reading.http).toBe(200);
    expect(reading.ms).toBe(25);
  });

  test('a result inside an SSE stream answers too', async () => {
    const body = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n';
    const reading = await read(
      endpoint,
      answering(() => new Response(body, { headers: { 'content-type': 'text/event-stream' } })),
      now,
    );
    expect(reading.outcome).toBe('answers');
  });

  test('a 401 naming its OAuth metadata is an MCP server asking for auth, not a failure', async () => {
    const headers = {
      'www-authenticate':
        'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
    };
    const reading = await read(
      endpoint,
      answering(() => new Response('no', { status: 401, headers })),
      now,
    );
    expect(reading.outcome).toBe('asks-for-auth');
  });

  test('a 402 with x402 requirements keeps its offers, and one without them is an http error (ADR 0189)', async () => {
    const required = btoa(
      JSON.stringify({ x402Version: 2, accepts: [{ scheme: 'exact', ...OFFER, maxTimeoutSeconds: 60, extra: {} }] }),
    );
    const paid = await read(
      endpoint,
      answering(() => new Response('', { status: 402, headers: { 'payment-required': required } })),
      now,
    );
    expect(paid.outcome).toBe('x402');
    expect(JSON.parse(paid.detail ?? '')).toEqual({ offers: [OFFER] });
    const bare = await read(endpoint, answering(() => new Response('pay me', { status: 402 })), now);
    expect([bare.outcome, bare.detail]).toEqual(['http-error', null]);
  });

  test('a bare 401 refuses, and is not taken for an MCP server', async () => {
    const reading = await read(
      endpoint,
      answering(() => new Response('no', { status: 401 })),
      now,
    );
    expect(reading.outcome).toBe('refuses');
  });

  test('a 200 with no JSON-RPC result is not MCP', async () => {
    const reading = await read(
      endpoint,
      answering(() => new Response('<html>docs</html>')),
      now,
    );
    expect(reading.outcome).toBe('not-mcp');
  });

  test('a network failure is no answer, and the body is never kept', async () => {
    const failing = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const reading = await read(endpoint, failing, now);
    expect(reading).toMatchObject({ outcome: 'no-answer', http: null, detail: 'TypeError' });
  });

  test('a 500 is an http error with its status', async () => {
    const reading = await read(
      endpoint,
      answering(() => new Response('boom', { status: 500 })),
      now,
    );
    expect(reading).toMatchObject({ outcome: 'http-error', http: 500, detail: null });
  });
});

describe('a package', () => {
  test('npm: the latest version and the date, and a deprecated latest says so', async () => {
    const record = {
      'dist-tags': { latest: '1.2.0' },
      modified: '2026-10-01T00:00:00Z',
      versions: { '1.2.0': {} },
    };
    expect(
      JSON.parse(
        (
          await read(
            npm,
            answering(() => Response.json(record)),
            now,
          )
        ).detail ?? '',
      ),
    ).toEqual({
      version: '1.2.0',
      modified: '2026-10-01T00:00:00Z',
    });
    const deprecated = { ...record, versions: { '1.2.0': { deprecated: 'use @o/other' } } };
    expect(
      (
        await read(
          npm,
          answering(() => Response.json(deprecated)),
          now,
        )
      ).outcome,
    ).toBe('deprecated');
  });

  test('npm: the scoped name is escaped in the registry URL', async () => {
    let asked = '';
    const recording = (async (url: string) => {
      asked = url;
      return Response.json({ 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': {} } });
    }) as unknown as typeof fetch;
    await read(npm, recording, now);
    expect(asked).toBe('https://registry.npmjs.org/@o%2fserver');
  });

  test('pypi: a missing project is not found', async () => {
    expect(
      (
        await read(
          pypi,
          answering(() => new Response('', { status: 404 })),
          now,
        )
      ).outcome,
    ).toBe('not-found');
  });

  test('pypi: an unparseable record is a failed read, not a thrown cycle', async () => {
    expect(
      (
        await read(
          pypi,
          answering(() => new Response('not json')),
          now,
        )
      ).outcome,
    ).toBe('no-answer');
  });
});

describe('the service', () => {
  test('a cycle appends one reading per target, and /probe serves them per target', async () => {
    const store = memoryReadings();
    const fetcher = answering(() => new Response('', { status: 401 }));
    await runCycle([endpoint, npm], store, fetcher, now);
    expect(store.rows).toHaveLength(2);

    const response = await handle(new Request('https://probe.test/probe'), store, () => clock);
    const body = (await response.json()) as { measuredBy: string; targets: { label: string }[] };
    expect(body.measuredBy).toBe('ARP, from Cloudflare');
    expect(body.targets.map((target) => target.label)).toEqual(
      TARGETS.map((target) => target.label),
    );
  });

  test('the window is capped at 30 days', async () => {
    const response = await handle(
      new Request('https://probe.test/probe?days=400'),
      memoryReadings(),
      () => clock,
    );
    expect(((await response.json()) as { window: { days: number } }).window.days).toBe(30);
  });

  test('/x402 serves the latest x402 reading of a target before a date, and 404 without one (ADR 0189)', async () => {
    const store = memoryReadings();
    const offers = (payTo: string) => JSON.stringify({ offers: [{ ...OFFER, payTo }] });
    await store.append([
      { target: endpoint.label, kind: 'endpoint', at: '2026-11-10T10:00:00.000Z', outcome: 'x402', http: 402, ms: 9, detail: offers(OLD_PAYEE) },
      { target: endpoint.label, kind: 'endpoint', at: '2026-11-11T09:00:00.000Z', outcome: 'x402', http: 402, ms: 9, detail: offers(OFFER.payTo) },
      { target: endpoint.label, kind: 'endpoint', at: '2026-11-11T09:30:00.000Z', outcome: 'no-answer', http: null, ms: 9, detail: null },
      { target: endpoint.label, kind: 'endpoint', at: '2026-11-11T11:00:00.000Z', outcome: 'x402', http: 402, ms: 9, detail: offers(OLD_PAYEE) },
    ]);
    const ask = async (query: string) => {
      const response = await handle(new Request(`https://probe.test/x402?${query}`), store, () => clock);
      // The worker's own answer, whose shape the assertions below check.
      return { status: response.status, body: (await response.json()) as { reading?: { at: string; offers: { payTo: string }[] } } };
    };
    const found = await ask(`target=${encodeURIComponent(endpoint.label)}&before=2026-11-11T10:00:00Z`);
    expect(found.status).toBe(200);
    expect(found.body.reading?.at).toBe('2026-11-11T09:00:00.000Z');
    expect(found.body.reading?.offers.map((offer) => offer.payTo)).toEqual([OFFER.payTo]);
    expect((await ask(`target=${encodeURIComponent(endpoint.label)}&before=2026-11-01T00:00:00Z`)).status).toBe(404);
    expect((await ask('target=&before=x')).status).toBe(400);
  });

  test('the bundled list holds the eight packages and only endpoints with a public URL', () => {
    expect(TARGETS.filter((target) => target.kind !== 'endpoint')).toHaveLength(8);
    expect(
      TARGETS.filter((target) => target.kind === 'endpoint').every((t) =>
        t.url.startsWith('https://'),
      ),
    ).toBe(true);
  });
});
