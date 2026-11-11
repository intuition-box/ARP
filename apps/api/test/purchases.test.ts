import { describe, expect, test } from 'bun:test';

import {
  endpointOf,
  FRESH_FOR_MS,
  lastPurchase,
  purchaseOf,
  readLastPurchase,
} from '../src/purchases.ts';
import type { Store } from '../src/refresh.ts';
import { handle, type Env } from '../src/worker.ts';

/*
 * Bodies recorded from `https://api.nohumans.directory/v1/resolve?url=…` on 2026-11-11, cut to the
 * fields read here (the full record carries some hundred more). nohumans.directory, CC BY 4.0.
 */
const FAILED = {
  match: 'active',
  detail: {
    id: '80082624-3d7',
    endpoint_url: 'https://api.tickersfeed.net/econ/snapshot',
    status: 'verified',
    latest_purchase_delivered: false,
    paid_verification_latest: {
      at: 1793351081,
      delivered: false,
      tx_hash: '0x7d12d72b606823236946b30f6d7c51f11143df93ee405a93701a0659a0f71997',
      amount_usdc: 0.005,
      failure_reason: 'stale_data',
      at_iso: '2026-10-30T09:04:41Z',
      age_days: 12,
    },
  },
};
const DELIVERED = {
  match: 'active',
  detail: {
    id: '1359c41a-9f7',
    endpoint_url: 'https://finance.toon.haus/api/stock/quote',
    paid_verification_latest: {
      at: 1789457017,
      delivered: true,
      tx_hash: '0x2bc3ef144247e59bd04b492698003a8813921f5c653245f1ad073d8f6a1a999b',
      failure_reason: null,
      at_iso: '2026-09-15T07:23:37Z',
    },
  },
};
/** `GET /v1/listings/35716578-d19`: listed, never bought. */
const NEVER_BOUGHT = {
  match: 'active',
  detail: { id: '35716578-d19', paid_verification_latest: null },
};
const UNKNOWN = {
  match: 'unknown',
  note: 'This URL is not listed in nohumans.directory. Absence is not a verdict.',
};

const answer =
  (body: unknown, status = 200) =>
  async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** KV refuses a key over 512 bytes; this store does too, so a test catches a key built from a URL. */
function checkKey(key: string): void {
  if (new TextEncoder().encode(key).length > 512) throw new Error('KV key over 512 bytes');
}

function memoryStore(): Store & { writes: number; keys: () => string[] } {
  const data = new Map<string, string>();
  const store = {
    writes: 0,
    keys: () => [...data.keys()],
    async get(key: string) {
      checkKey(key);
      const value = data.get(key);
      return value === undefined ? null : (JSON.parse(value) as unknown);
    },
    async put(key: string, value: string) {
      checkKey(key);
      store.writes += 1;
      data.set(key, value);
    },
  };
  return store;
}

describe("nohumans.directory's last purchase", () => {
  test('a purchase that did not deliver: the reason, the date, the transaction', async () => {
    expect(
      await readLastPurchase('https://api.tickersfeed.net/econ/snapshot', answer(FAILED)),
    ).toEqual({
      match: 'active',
      listingId: '80082624-3d7',
      purchase: {
        at: '2026-10-30T09:04:41Z',
        delivered: false,
        reason: 'stale_data',
        tx: '0x7d12d72b606823236946b30f6d7c51f11143df93ee405a93701a0659a0f71997',
      },
    });
  });

  test('a purchase that delivered has no reason', async () => {
    const read = await readLastPurchase(
      'https://finance.toon.haus/api/stock/quote',
      answer(DELIVERED),
    );
    expect(read).toMatchObject({ match: 'active', purchase: { delivered: true, reason: null } });
  });

  test('listed and never bought is a listing with no purchase, not a failure', async () => {
    expect(await readLastPurchase('https://x.example/a', answer(NEVER_BOUGHT))).toEqual({
      match: 'active',
      listingId: '35716578-d19',
      purchase: null,
    });
  });

  test('a 404 with match unknown is an answer: never listed there', async () => {
    expect(await readLastPurchase('https://x.example/a', answer(UNKNOWN, 404))).toEqual({
      match: 'unknown',
    });
  });

  test('anything else is a failed read', async () => {
    expect(
      await readLastPurchase('https://x.example/a', answer({ error: 'x' }, 500)),
    ).toMatchObject({
      limited: false,
    });
    expect(
      await readLastPurchase('https://x.example/a', answer({ error: 'not_found' }, 404)),
    ).toHaveProperty('error');
  });

  test('the URL is sent encoded, to the free resolve route and nowhere else', async () => {
    const calls: string[] = [];
    await readLastPurchase('https://a.example/p?b=1&a=2', async (url) => {
      calls.push(url);
      return new Response(JSON.stringify(UNKNOWN), { status: 404 });
    });
    expect(calls).toEqual([
      `https://api.nohumans.directory/v1/resolve?url=${encodeURIComponent('https://a.example/p?b=1&a=2')}`,
    ]);
  });

  test('a malformed transaction or date is dropped, never shown', () => {
    expect(
      purchaseOf({ paid_verification_latest: { delivered: true, at_iso: 'soon', tx_hash: '0x1' } }),
    ).toBeNull();
    expect(
      purchaseOf({ paid_verification_latest: { delivered: true, at: 1789457017, tx_hash: '0x1' } }),
    ).toEqual({ at: '2026-09-15T07:23:37.000Z', delivered: true, reason: null, tx: null });
  });

  test('only an absolute http(s) URL is asked about', () => {
    expect(endpointOf('https://a.example/x')).toBe('https://a.example/x');
    expect(endpointOf('ftp://a.example')).toBeNull();
    expect(endpointOf('a.example')).toBeNull();
    expect(endpointOf(null)).toBeNull();
    expect(endpointOf(`https://a.example/${'x'.repeat(2048)}`)).toBeNull();
  });

  test('one read per URL while fresh; a failed refresh serves the older answer with its date', async () => {
    const store = memoryStore();
    let calls = 0;
    let fail = false;
    const fetcher = async () => {
      calls += 1;
      return fail ? new Response('down', { status: 503 }) : new Response(JSON.stringify(FAILED));
    };
    const t0 = Date.parse('2026-11-11T09:00:00Z');
    const first = await lastPurchase('https://e.example/a', store, fetcher, t0);
    await lastPurchase('https://e.example/a', store, fetcher, t0 + 60_000);
    expect(calls).toBe(1);
    expect(store.writes).toBe(1);
    fail = true;
    const later = await lastPurchase('https://e.example/a', store, fetcher, t0 + FRESH_FOR_MS + 1);
    expect(calls).toBe(2);
    expect(later).toEqual(first);
    expect(later).toMatchObject({ fetchedAt: '2026-11-11T09:00:00.000Z' });
  });
});

describe('GET /x402/last-purchase', () => {
  const env = (store: Store): Env => ({ FACTS: store });

  test('serves the reading with its source, licence, network and date', async () => {
    const response = await handle(
      new Request(
        `http://api/x402/last-purchase?url=${encodeURIComponent('https://api.tickersfeed.net/econ/snapshot')}`,
      ),
      env(memoryStore()),
      answer(FAILED),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      source: {
        name: 'nohumans.directory',
        url: 'https://api.nohumans.directory',
        licence: 'CC BY 4.0',
      },
      network: 'eip155:8453',
      endpoint: 'https://api.tickersfeed.net/econ/snapshot',
      listing: 'https://api.nohumans.directory/v1/listings/80082624-3d7',
      match: 'active',
      purchase: { delivered: false, reason: 'stale_data' },
    });
    expect(typeof body.fetchedAt).toBe('string');
  });

  test('a URL that is not one is refused before anything is read', async () => {
    let called = false;
    const response = await handle(
      new Request('http://api/x402/last-purchase?url=nope'),
      env(memoryStore()),
      async () => {
        called = true;
        return new Response('{}');
      },
    );
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  test('a URL near the length limit is cached under a key KV accepts, never a throw', async () => {
    const store = memoryStore();
    const long = `https://e.example/${'x'.repeat(2000)}`;
    const response = await handle(
      new Request(`http://api/x402/last-purchase?url=${encodeURIComponent(long)}`),
      env(store),
      answer(UNKNOWN, 404),
    );
    expect(response.status).toBe(200);
    expect(store.keys()).toHaveLength(1);
    expect(store.keys()[0]).toMatch(/^nohumans:[0-9a-f]{64}$/);
  });

  test('a failed read with nothing cached is a 502, not an empty answer', async () => {
    const response = await handle(
      new Request(`http://api/x402/last-purchase?url=${encodeURIComponent('https://e.example/a')}`),
      env(memoryStore()),
      async () => new Response('down', { status: 503 }),
    );
    expect(response.status).toBe(502);
  });
});
