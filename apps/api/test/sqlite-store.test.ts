import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { lastPurchase, MAX_ENTRIES_PER_DAY } from '../src/purchases.ts';
import { readState, runSlice } from '../src/refresh.ts';
import { sqliteStore } from '../src/sqlite-store.ts';

const dirs: string[] = [];
function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'arp-api-store-'));
  dirs.push(dir);
  return join(dir, 'api.sqlite');
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const LISTED = {
  match: 'active',
  detail: {
    id: 'l-1',
    paid_verification_latest: { delivered: true, at_iso: '2026-11-01T00:00:00Z', tx_hash: null },
  },
};

describe('the SQLite store', () => {
  test('a value survives a reopen of the same file: the volume is the cache', async () => {
    const path = tempFile();
    const first = sqliteStore(path);
    await first.put('repos', JSON.stringify({ a: 1 }));
    first.close();
    const second = sqliteStore(path);
    expect(await second.get('repos', 'json')).toEqual({ a: 1 });
    expect(await second.get('missing', 'json')).toBeNull();
    second.close();
  });

  test('an expiry is KV’s: absent once passed, and a put without one clears it', async () => {
    let now = Date.parse('2026-11-11T00:00:00Z');
    const store = sqliteStore(tempFile(), () => now);
    await store.put('k', '"v"', { expirationTtl: 60 });
    now += 59_000;
    expect(await store.get('k', 'json')).toBe('v');
    now += 1_000;
    expect(await store.get('k', 'json')).toBeNull();

    await store.put('k', '"kept"', { expirationTtl: 60 });
    await store.put('k', '"forever"');
    now += 10 * 365 * 86_400_000;
    expect(await store.get('k', 'json')).toBe('forever');
    store.close();
  });

  test('expired rows are deleted on the next put, so the file does not keep them', async () => {
    const path = tempFile();
    let now = 0;
    const store = sqliteStore(path, () => now);
    for (let i = 0; i < 10; i += 1) await store.put(`gone-${i}`, '1', { expirationTtl: 1 });
    now = 5_000;
    await store.put('kept', '1');
    const db = new Database(path, { readonly: true });
    expect(db.query('SELECT key FROM kv').all()).toEqual([{ key: 'kept' }]);
    db.close();
    store.close();
  });

  test('the soft cap of task 120 holds: about 100 listed answers stored a UTC day, none for unknown URLs', async () => {
    const path = tempFile();
    const store = sqliteStore(path);
    const t0 = Date.parse('2026-11-11T09:00:00Z');
    const listed = async () => new Response(JSON.stringify(LISTED));
    const unknown = async () => new Response(JSON.stringify({ match: 'unknown' }), { status: 404 });
    for (let i = 0; i < 20; i += 1) await lastPurchase(`https://made.up/${i}`, store, unknown, t0);
    for (let i = 0; i < MAX_ENTRIES_PER_DAY + 7; i += 1)
      await lastPurchase(`https://e.example/${i}`, store, listed, t0);
    const db = new Database(path, { readonly: true });
    const stored = db
      .query<{ n: number }, []>("SELECT count(*) AS n FROM kv WHERE key LIKE 'nohumans:%'")
      .get();
    expect(stored?.n).toBe(MAX_ENTRIES_PER_DAY);
    db.close();
    store.close();
  });

  test('a refresh slice runs against it and its cursor is read back', async () => {
    const store = sqliteStore(tempFile());
    const result = await runSlice({
      store,
      fetch: async () => new Response(JSON.stringify({ stargazers_count: 3, pushed_at: null })),
      now: Date.now,
      pauseMs: 0,
      units: [{ kind: 'repo', repo: { slug: 'o/r', kind: 'mcp' } }],
    });
    expect(result.ran).toBe(1);
    expect(await readState(store)).toMatchObject({ cursor: 1 });
    expect(await store.get('repos', 'json')).toMatchObject({ 'github.com/o/r': { stars: 3 } });
    store.close();
  });
});
