/** The history, append only. D1 in the Worker; anything with the same two methods in a test. */
import type { Reading } from './probe.ts';

export type Readings = {
  append(rows: readonly Reading[]): Promise<void>;
  /** Every reading of every target since `sinceIso`, oldest first. */
  since(sinceIso: string): Promise<Reading[]>;
  /** The most recent `x402` reading of `target` strictly before `beforeIso`, or `null` (ADR `0189`). */
  latestX402(target: string, beforeIso: string): Promise<Reading | null>;
};

/** The part of D1 this uses. Workers' `D1Database` satisfies it. */
export type D1Like = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
  batch(statements: unknown[]): Promise<unknown>;
};

export function d1Readings(db: D1Like): Readings {
  return {
    async append(rows) {
      if (rows.length === 0) return;
      const insert =
        'INSERT INTO readings (target, kind, at, outcome, http, ms, detail) VALUES (?, ?, ?, ?, ?, ?, ?)';
      await db.batch(
        rows.map((row) =>
          db
            .prepare(insert)
            .bind(row.target, row.kind, row.at, row.outcome, row.http, row.ms, row.detail),
        ),
      );
    },
    async since(sinceIso) {
      const { results } = await db
        .prepare(
          'SELECT target, kind, at, outcome, http, ms, detail FROM readings WHERE at >= ? ORDER BY at',
        )
        .bind(sinceIso)
        .all<Reading>();
      return results;
    },
    async latestX402(target, beforeIso) {
      // `readings_target_at` serves this: one target, its rows ordered by time.
      const { results } = await db
        .prepare(
          "SELECT target, kind, at, outcome, http, ms, detail FROM readings WHERE target = ? AND outcome = 'x402' AND at < ? ORDER BY at DESC LIMIT 1",
        )
        .bind(target, beforeIso)
        .all<Reading>();
      return results[0] ?? null;
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
      const found = rows.filter((row) => row.target === target && row.outcome === 'x402' && row.at < beforeIso);
      return found.sort((a, b) => (a.at < b.at ? 1 : -1))[0] ?? null;
    },
  };
}
