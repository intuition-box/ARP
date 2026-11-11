/** The `Store` in one SQLite file, which is what replaced Workers KV (task 140, ADR `0200`).
 *
 *  KV's semantics, the part this service uses: a `put` replaces the value and its expiry, a `put`
 *  without `expirationTtl` keeps the value until it is replaced, and an expired value reads as
 *  absent. Expired rows are deleted on the next `put`, so the file does not grow with them.
 *
 *  One process on one file: the container's volume is mounted on one container at a time
 *  (`apps/web/DEPLOY.md`). WAL so a read during a slice's write does not wait.
 */
import { Database } from 'bun:sqlite';

import type { Store } from './refresh.ts';

export type SqliteStore = Store & { close(): void };

export function sqliteStore(path: string, now: () => number = Date.now): SqliteStore {
  const db = new Database(path, { create: true, strict: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec(
    'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER)',
  );
  const read = db.query<{ value: string }, [string, number]>(
    'SELECT value FROM kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)',
  );
  const write = db.query<unknown, [string, string, number | null]>(
    'INSERT INTO kv (key, value, expires_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at',
  );
  const purge = db.query<unknown, [number]>(
    'DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= ?',
  );
  return {
    async get(key, _type) {
      const row = read.get(key, now());
      // Only `put` writes `value`, and every caller here puts a JSON string.
      return row === null ? null : (JSON.parse(row.value) as unknown);
    },
    async put(key, value, options) {
      const at = now();
      purge.run(at);
      const ttl = options?.expirationTtl;
      write.run(key, value, ttl === undefined ? null : at + ttl * 1000);
    },
    close() {
      db.close();
    },
  };
}
