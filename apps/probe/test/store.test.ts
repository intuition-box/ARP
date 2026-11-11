import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';

import type { Reading } from '../src/probe.ts';
import { d1Readings, memoryReadings, type D1Like, type Readings } from '../src/store.ts';

const MIGRATIONS = new URL('../migrations/', import.meta.url);

/** D1 is SQLite: an in-memory SQLite with the committed migrations applied, behind D1's surface. */
function sqliteD1(): { d1: D1Like; db: Database } {
  const db = new Database(':memory:');
  for (const file of readdirSync(MIGRATIONS).sort()) {
    db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
  }
  const d1: D1Like = {
    prepare(query) {
      return {
        bind(...values) {
          // The store binds only strings, numbers and nulls, which is what SQLite accepts.
          const params = values as SQLQueryBindings[];
          return {
            run: async () => db.query(query).run(...params),
            // Rows come back with the columns the store selected, which is the `T` it asks for.
            all: async <T>() => ({ results: db.query(query).all(...params) as T[] }),
          };
        },
      };
    },
    async batch(statements) {
      // Each statement is the `{ run }` object `bind` returned; D1 runs a batch as one transaction.
      const runs = statements as { run(): Promise<unknown> }[];
      db.exec('BEGIN');
      for (const statement of runs) await statement.run();
      db.exec('COMMIT');
    },
  };
  return { d1, db };
}

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

/** The two stores answer the same questions the same way; the worker relies on either. */
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

behavesAsTheHistory('d1Readings over SQLite with the committed migrations', () => d1Readings(sqliteD1().d1));
behavesAsTheHistory('memoryReadings', () => memoryReadings());

describe('d1Readings', () => {
  test('writes a batch in one call, every column in place', async () => {
    const { d1, db } = sqliteD1();
    let batches = 0;
    const counting: D1Like = { prepare: d1.prepare, batch: (statements) => ((batches += 1), d1.batch(statements)) };
    await d1Readings(counting).append(ROWS.slice(0, 2));
    expect(batches).toBe(1);
    expect(db.query('SELECT target, kind, at, outcome, http, ms, detail FROM readings ORDER BY at').all()).toEqual([
      ROWS[1],
      ROWS[0],
    ]);
  });

  test('sends no batch for an empty append', async () => {
    let batches = 0;
    const { d1 } = sqliteD1();
    await d1Readings({ prepare: d1.prepare, batch: async () => (batches += 1) }).append([]);
    expect(batches).toBe(0);
  });
});
