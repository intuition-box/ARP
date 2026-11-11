import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { pinnedAsk } from '@arp-protocol/core/node';

import { read, type Reading } from '../src/probe.ts';
import { memoryReadings, migrate, sqliteReadings, type Readings } from '../src/store.ts';
import type { Target } from '../src/targets.ts';

const dirs: string[] = [];
function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'arp-probe-store-'));
  dirs.push(dir);
  return join(dir, 'probe.sqlite');
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const row = (at: string, outcome: Reading['outcome'], detail: string | null = null): Reading => ({
  target: 'mcp.example.com/mcp',
  kind: 'endpoint',
  at,
  outcome,
  http: outcome === 'x402' ? 402 : 200,
  ms: 12,
  detail,
});

describe('the SQLite history', () => {
  test('the migrations D1 applied run once each, whatever the number of opens', () => {
    const path = tempFile();
    sqliteReadings(path).close();
    sqliteReadings(path).close();
    const db = new Database(path);
    expect(db.query('PRAGMA user_version').get()).toEqual({ user_version: 2 });
    expect(migrate(db)).toBe(0);
    const indexes = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
      .all()
      .map((index) => index.name);
    expect(indexes).toEqual(['readings_at', 'readings_target_at']);
    db.close();
  });

  test('append and since, oldest first, kept across a reopen', async () => {
    const path = tempFile();
    const first = sqliteReadings(path);
    await first.append([row('2026-11-11T10:05:00.000Z', 'answers'), row('2026-11-11T10:00:00.000Z', 'no-answer')]);
    first.close();
    const second = sqliteReadings(path);
    expect((await second.since('2026-11-11T10:00:00.000Z')).map((r) => r.outcome)).toEqual([
      'no-answer',
      'answers',
    ]);
    expect(await second.since('2026-11-12T00:00:00.000Z')).toEqual([]);
    second.close();
  });

  test('latestX402 is the newest reading before the date that kept its offers', async () => {
    const store = sqliteReadings(tempFile());
    await store.append([
      row('2026-11-10T10:00:00.000Z', 'x402', '{"offers":["old"]}'),
      row('2026-11-11T09:00:00.000Z', 'x402', '{"offers":["kept"]}'),
      row('2026-11-11T09:30:00.000Z', 'x402', null),
      row('2026-11-11T11:00:00.000Z', 'x402', '{"offers":["later"]}'),
    ]);
    expect((await store.latestX402('mcp.example.com/mcp', '2026-11-11T10:00:00.000Z'))?.detail).toBe(
      '{"offers":["kept"]}',
    );
    expect(await store.latestX402('mcp.example.com/mcp', '2026-11-01T00:00:00.000Z')).toBeNull();
    expect(await store.latestX402('other', '2100-01-01T00:00:00.000Z')).toBeNull();
    store.close();
  });
});

describe('a private address, through pinnedAsk with private addresses refused', () => {
  const ask = (resolve?: (host: string) => Promise<{ address: string; family: number }[]>) =>
    pinnedAsk({ allowPrivate: false, timeoutMs: 2_000, maxBytes: 1024, userAgent: 'test', resolve });
  const target = (url: string): Target => ({ label: url.replace(/^https?:\/\//, ''), kind: 'endpoint', repo: 'o/r', url });

  test('a literal private address is never connected to', async () => {
    let served = 0;
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => (served += 1, new Response('{}')) });
    try {
      for (const url of [`http://127.0.0.1:${server.port}/mcp`, 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.1/mcp', 'http://localhost/mcp']) {
        const reading = await read(target(url), { ask: ask(), fetch }, Date.now);
        expect(reading).toMatchObject({ outcome: 'no-answer', http: null, detail: 'private-address' });
      }
      expect(served).toBe(0);
    } finally {
      void server.stop(true);
    }
  });

  test('a public name that resolves to a private address is refused at the lookup', async () => {
    const toLoopback = async () => [{ address: '127.0.0.1', family: 4 }];
    const reading = await read(target('https://mcp.example.com/mcp'), { ask: ask(toLoopback), fetch }, Date.now);
    expect(reading).toMatchObject({ outcome: 'no-answer', detail: 'private-address' });
  });
});

function reading(over: Partial<Reading>): Reading {
  return {
    target: 'mcp.example.com/mcp',
    kind: 'endpoint',
    at: '2026-11-11T10:00:00.000Z',
    outcome: 'answers',
    http: 200,
    ms: 40,
    detail: null,
    ...over,
  };
}

const ROWS: Reading[] = [
  reading({ at: '2026-11-11T09:00:00.000Z', outcome: 'x402', http: 402, detail: '{"offers":[1]}' }),
  reading({ at: '2026-11-11T07:00:00.000Z', outcome: 'x402', http: 402, detail: '{"offers":[0]}' }),
  reading({ at: '2026-11-11T09:30:00.000Z', outcome: 'no-answer', http: null, detail: 'TimeoutError' }),
  reading({ target: 'npmjs.com/package/x', kind: 'npm', at: '2026-11-11T08:00:00.000Z', outcome: 'published', detail: '{"version":"1.0.0"}' }),
  reading({ at: '2026-11-11T11:00:00.000Z', outcome: 'x402', http: 402, detail: '{"offers":[2]}' }),
];

/** The two stores answer the same questions the same way; the service relies on either (task 136, kept by task 140). */
function behavesAsTheHistory(name: string, make: () => Readings) {
  describe(name, () => {
    test('since returns every target from the date on, oldest first', async () => {
      const store = make();
      await store.append(ROWS);
      const rows = await store.since('2026-11-11T08:00:00.000Z');
      expect(rows.map((row) => row.at)).toEqual([
        '2026-11-11T08:00:00.000Z',
        '2026-11-11T09:00:00.000Z',
        '2026-11-11T09:30:00.000Z',
        '2026-11-11T11:00:00.000Z',
      ]);
      expect(rows[0]).toEqual(ROWS[3]);
    });

    test('latestX402 is the newest x402 reading of that target strictly before the date', async () => {
      const store = make();
      await store.append(ROWS);
      const found = await store.latestX402('mcp.example.com/mcp', '2026-11-11T10:00:00.000Z');
      expect(found?.detail).toBe('{"offers":[1]}');
      expect(await store.latestX402('mcp.example.com/mcp', '2026-11-11T09:00:00.000Z')).toEqual(ROWS[1]);
    });

    test('latestX402 is null with nothing before the date, or for another target', async () => {
      const store = make();
      await store.append(ROWS);
      expect(await store.latestX402('mcp.example.com/mcp', '2026-11-11T07:00:00.000Z')).toBeNull();
      expect(await store.latestX402('npmjs.com/package/x', '2026-12-01T00:00:00.000Z')).toBeNull();
    });

    test('appending nothing leaves the history as it was', async () => {
      const store = make();
      await store.append([]);
      expect(await store.since('1970-01-01T00:00:00.000Z')).toEqual([]);
    });
  });
}

behavesAsTheHistory('sqliteReadings over a file with the committed migrations', () => sqliteReadings(tempFile()));
behavesAsTheHistory('memoryReadings', () => memoryReadings());
