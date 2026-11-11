/** The history, append only. One SQLite file in the container (task 140, ADR `0200`), which was
 *  D1 while the probe was a Worker; anything with the same three methods in a test.
 *
 *  The schema is `migrations/`, the files D1 applied, applied here in name order on open.
 *  `PRAGMA user_version` counts how many have run, so each runs once per file.
 */
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Reading } from './probe.ts';

export type Readings = {
  append(rows: readonly Reading[]): Promise<void>;
  /** Every reading of every target since `sinceIso`, oldest first. */
  since(sinceIso: string): Promise<Reading[]>;
  /**
   * The most recent `x402` reading of `target` strictly before `beforeIso` that kept its offers, or
   * `null` (ADR `0189`). One taken while `ARP_PROBE_X402` was off kept none, so it is not one.
   */
  latestX402(target: string, beforeIso: string): Promise<Reading | null>;
};

const MIGRATIONS = join(import.meta.dir, '..', 'migrations');

/** Applies every migration not yet applied, in name order. Returns how many ran. */
export function migrate(db: Database, dir: string = MIGRATIONS): number {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const row = db.query<{ user_version: number }, []>('PRAGMA user_version').get();
  const done = row?.user_version ?? 0;
  const pending = files.slice(done);
  for (const [index, name] of pending.entries()) {
    db.transaction(() => {
      db.exec(readFileSync(join(dir, name), 'utf8'));
      // A pragma takes no bound parameter; the value is an integer this function computed.
      db.exec(`PRAGMA user_version = ${done + index + 1}`);
    })();
  }
  return pending.length;
}

export function sqliteReadings(path: string): Readings & { close(): void } {
  const db = new Database(path, { create: true, strict: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  migrate(db);
  const insert = db.query<unknown, [string, string, string, string, number | null, number, string | null]>(
    'INSERT INTO readings (target, kind, at, outcome, http, ms, detail) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const since = db.query<Reading, [string]>(
    'SELECT target, kind, at, outcome, http, ms, detail FROM readings WHERE at >= ? ORDER BY at',
  );
  // `readings_target_at` serves this: one target, its rows ordered by time.
  const latestX402 = db.query<Reading, [string, string]>(
    "SELECT target, kind, at, outcome, http, ms, detail FROM readings WHERE target = ? AND outcome = 'x402' AND detail IS NOT NULL AND at < ? ORDER BY at DESC LIMIT 1",
  );
  const appendAll = db.transaction((rows: readonly Reading[]) => {
    for (const row of rows)
      insert.run(row.target, row.kind, row.at, row.outcome, row.http, row.ms, row.detail);
  });
  return {
    async append(rows) {
      if (rows.length > 0) appendAll(rows);
    },
    async since(sinceIso) {
      return since.all(sinceIso);
    },
    async latestX402(target, beforeIso) {
      return latestX402.get(target, beforeIso);
    },
    close() {
      db.close();
    },
  };
}

export function memoryReadings(): Readings & { rows: Reading[] } {
  const rows: Reading[] = [];
  return {
    rows,
    async append(more) {
      rows.push(...more);
    },
    async since(sinceIso) {
      return rows.filter((row) => row.at >= sinceIso).sort((a, b) => (a.at < b.at ? -1 : 1));
    },
    async latestX402(target, beforeIso) {
      const found = rows.filter(
        (row) =>
          row.target === target && row.outcome === 'x402' && row.detail !== null && row.at < beforeIso,
      );
      return found.sort((a, b) => (a.at < b.at ? 1 : -1))[0] ?? null;
    },
  };
}
