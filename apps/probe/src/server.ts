/** The probe as a service: one SQLite file, one listener, one schedule (task 140, ADR `0200`).
 *  `main.ts` runs it.
 *
 *  ```
 *  PROBE_PORT          8788 by default
 *  PROBE_LISTEN        127.0.0.1 by default; 0.0.0.0 in the container
 *  PROBE_PUBLIC_HOST   the name the proxy forwards, e.g. probe.arp.intuition.box; needs 0.0.0.0
 *  ARP_DATA_DIR        where `probe.sqlite` lives; /data in the container, apps/probe/.data here
 *  ARP_PROBE_X402      `on` keeps 402 offers and serves GET /x402; off by default
 *  ```
 *
 *  The schedule is what the Worker's cron was: a cycle every five minutes, one at a time, and one
 *  cycle on start, so a restart reads every target at once rather than five minutes later.
 *
 *  **Private addresses are refused, always.** {@link guardedIo} asks every endpoint through
 *  `pinnedAsk` with `allowPrivate: false`, and nothing here reads `ARP_ALLOW_PRIVATE_PROBE`: the
 *  probe runs on ARP's host, where a private address is that host's own network, and no rig of
 *  ours needs it probed.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { every, hostedListener, pinnedAsk, refuseOtherHost } from '@arp-protocol/core/node';

import { ENDPOINT_MAX_BYTES, TIMEOUT_MS, type Io } from './probe.ts';
import { handle, runCycle, type ProbeOptions } from './service.ts';
import { sqliteReadings } from './store.ts';
import { TARGETS, type Target } from './targets.ts';

/** The Worker's cron fired every five minutes. */
const CYCLE_EVERY_MS = 5 * 60 * 1000;

/** The way out a hosted probe uses: endpoints through the pinned lookup, registries through `fetch`. */
export const guardedIo: Io = {
  ask: pinnedAsk({
    allowPrivate: false,
    timeoutMs: TIMEOUT_MS,
    maxBytes: ENDPOINT_MAX_BYTES,
    userAgent: 'arp-probe (+https://github.com/intuition-box/ARP)',
  }),
  fetch,
};

export type Started = {
  port: number;
  hosts: string[];
  store: string;
  /** Lines for the log: what is on and what is off. */
  banner: string[];
  stop(): Promise<void>;
};

/** Everything `main` does but exit: listen, open the history, start the schedule. */
export function start(
  vars: Record<string, string | undefined>,
  io: Io,
  log: (line: string) => void,
  targets: readonly Target[] = TARGETS,
): Started | { error: string } {
  const port = Number(vars.PROBE_PORT ?? '8788');
  if (!Number.isInteger(port) || port < 0 || port > 65_535)
    return { error: `PROBE_PORT ${vars.PROBE_PORT} is not a port` };
  const checked = hostedListener('PROBE', port, vars.PROBE_LISTEN, vars.PROBE_PUBLIC_HOST);
  if ('error' in checked) return checked;

  const dataDir = (vars.ARP_DATA_DIR ?? '').trim() || join(import.meta.dir, '..', '.data');
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const path = join(dataDir, 'probe.sqlite');
  const store = sqliteReadings(path);
  const options: ProbeOptions = { x402: vars.ARP_PROBE_X402?.trim() === 'on' };

  let hosts = checked.hosts;
  const server = Bun.serve({
    port,
    hostname: checked.hostname,
    fetch: (request) => refuseOtherHost(request, hosts) ?? handle(request, store, Date.now, options),
  });
  // Port 0 is a test's: the names answered are the ones of the port actually bound.
  const bound = server.port ?? port;
  const listener = hostedListener('PROBE', bound, vars.PROBE_LISTEN, vars.PROBE_PUBLIC_HOST);
  if (!('error' in listener)) hosts = listener.hosts;

  const schedule = every(
    CYCLE_EVERY_MS,
    async () => {
      const readings = await runCycle(targets, store, io, Date.now, options);
      const counts = new Map<string, number>();
      for (const reading of readings)
        counts.set(reading.outcome, (counts.get(reading.outcome) ?? 0) + 1);
      log(
        `arp-probe: cycle read ${readings.length}: ${[...counts].map(([outcome, n]) => `${n} ${outcome}`).join(', ')}`,
      );
    },
    { runOnStart: true, onError: (error) => log(`arp-probe: cycle failed: ${String(error)}`) },
  );

  return {
    port: bound,
    hosts,
    store: path,
    banner: [
      `arp-probe on http://${checked.hostname}:${bound}`,
      `  answers   ${hosts.join(', ')}`,
      `  store     ${path}`,
      `  targets   ${targets.length}, private addresses refused`,
      `  x402      ${options.x402 ? 'offers kept, GET /x402 on' : 'offers not kept, GET /x402 off'}`,
    ],
    async stop() {
      schedule.stop();
      await server.stop(true);
      store.close();
    },
  };
}
