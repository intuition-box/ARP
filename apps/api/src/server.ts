/** The API as a service: one SQLite file, one listener, one schedule (task 140, ADR `0200`).
 *  `main.ts` runs it.
 *
 *  ```
 *  API_PORT                 8787 by default
 *  API_LISTEN               127.0.0.1 by default; 0.0.0.0 in the container
 *  API_PUBLIC_HOST          the name the proxy forwards, e.g. api.arp.intuition.box; needs 0.0.0.0
 *  ARP_DATA_DIR             where `api.sqlite` lives; /data in the container, apps/api/.data here
 *  GITHUB_TOKEN             optional, a classic token with no scopes: 5,000 reads an hour, not 60
 *  REFRESH_SECRET           optional, enables POST /refresh
 *  REFRESH_EVERY_HOURS      24 by default: the pause between two cycles
 *  ARP_X402_LAST_PURCHASE   `on` serves /x402/last-purchase; off by default
 *  ```
 *
 *  The schedule is what the Worker's cron was: a slice every ten minutes, one at a time, and one
 *  slice on start, which resumes a cycle a restart interrupted and does nothing when none is due.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { every, hostedListener, refuseOtherHost } from '@arp-protocol/core/node';

import { runSlice } from './refresh.ts';
import { everyHours, handle, type Env } from './service.ts';
import type { Fetch } from './sources.ts';
import { sqliteStore } from './sqlite-store.ts';

/** The Worker's cron fired every ten minutes. */
const SLICE_EVERY_MS = 10 * 60 * 1000;

export type Started = {
  port: number;
  hosts: string[];
  store: string;
  /** Lines for the log: what is on and what is off, never a secret. */
  banner: string[];
  stop(): Promise<void>;
};

/** Everything `main` does but exit: listen, open the store, start the schedule. */
export function start(
  vars: Record<string, string | undefined>,
  fetcher: Fetch = fetch,
  log: (line: string) => void,
): Started | { error: string } {
  const port = Number(vars.API_PORT ?? '8787');
  if (!Number.isInteger(port) || port < 0 || port > 65_535)
    return { error: `API_PORT ${vars.API_PORT} is not a port` };
  const checked = hostedListener('API', port, vars.API_LISTEN, vars.API_PUBLIC_HOST);
  if ('error' in checked) return checked;

  const dataDir = (vars.ARP_DATA_DIR ?? '').trim() || join(import.meta.dir, '..', '.data');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const path = join(dataDir, 'api.sqlite');
  const store = sqliteStore(path);
  const env: Env = {
    FACTS: store,
    GITHUB_TOKEN: vars.GITHUB_TOKEN,
    REFRESH_SECRET: vars.REFRESH_SECRET,
    REFRESH_EVERY_HOURS: vars.REFRESH_EVERY_HOURS,
    ARP_X402_LAST_PURCHASE: vars.ARP_X402_LAST_PURCHASE,
  };

  let hosts = checked.hosts;
  const server = Bun.serve({
    port,
    hostname: checked.hostname,
    fetch: (request) => refuseOtherHost(request, hosts) ?? handle(request, env, fetcher),
  });
  // Port 0 is a test's: the names answered are the ones of the port actually bound.
  const bound = server.port ?? port;
  const listener = hostedListener('API', bound, vars.API_LISTEN, vars.API_PUBLIC_HOST);
  if (!('error' in listener)) hosts = listener.hosts;

  const schedule = every(
    SLICE_EVERY_MS,
    async () => {
      const result = await runSlice({
        store,
        fetch: fetcher,
        now: Date.now,
        githubToken: env.GITHUB_TOKEN,
        everyHours: everyHours(env),
      });
      if (!result.idle)
        log(
          `arp-api: slice ran ${result.ran}, cursor ${result.state.cursor}, ${result.state.lastErrors.length} errors`,
        );
    },
    { runOnStart: true, onError: (error) => log(`arp-api: slice failed: ${String(error)}`) },
  );

  return {
    port: bound,
    hosts,
    store: path,
    banner: [
      `arp-api on http://${checked.hostname}:${bound}`,
      `  answers   ${hosts.join(', ')}`,
      `  store     ${path}`,
      `  github    ${env.GITHUB_TOKEN?.trim() ? 'with a token' : 'no token, 60 reads an hour'}`,
      `  refresh   POST /refresh ${env.REFRESH_SECRET?.trim() ? 'on' : 'off'}`,
      `  x402      /x402/last-purchase ${env.ARP_X402_LAST_PURCHASE?.trim() === 'on' ? 'on' : 'off'}`,
    ],
    async stop() {
      schedule.stop();
      await server.stop(true);
      store.close();
    },
  };
}
