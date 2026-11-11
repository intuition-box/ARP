/** The probe: whether each remote MCP endpoint answers, and what each package's registry says.
 *
 *  ```
 *  GET  /probe            every target's latest reading, and its last 24 hours
 *  GET  /probe?days=7     the same over 7 days (at most 30)
 *  GET  /x402?target=<label>&before=<ISO>   an x402 endpoint's last answered offers before then;
 *                         off unless ARP_PROBE_X402=on, then a 404 (ADR `0200`)
 *  GET  /healthz          how many targets, and when the last cycle ran
 *  schedule               one cycle every five minutes (`server.ts`)
 *  ```
 *
 *  **What it is.** A dated fact measured by ARP: "this server answered ARP's server at 14:10". It
 *  ran as a Cloudflare Worker until task 140 and runs as a container since (ADR `0200`). It is not the pulse — whether a tool works for the operators who use it comes from their
 *  signed reports and the `uses` triples (ADR `0093`). A server can answer `initialize` and fail
 *  every real call.
 *
 *  **What it is not.** Never written on chain, never a score, never a colour. It holds no key and
 *  sends nothing but one `initialize` per endpoint and one registry read per package.
 */
import { read, type Io, type Reading } from './probe.ts';
import type { Readings } from './store.ts';
import { TARGETS, type Target } from './targets.ts';

/** Who measured, as every answer says it. */
const MEASURED_BY = 'ARP, from its own server';

/** `x402`: whether 402 offers are kept and `/x402` answers (`ARP_PROBE_X402=on`, ADR `0200`). */
export type ProbeOptions = { x402: boolean };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
};

function json(value: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...CORS, ...extra },
  });
}

/** One cycle: every target, in parallel — each read has its own timeout, so one slow host holds nobody. */
export async function runCycle(
  targets: readonly Target[],
  store: Readings,
  io: Io,
  now: () => number,
  options: ProbeOptions = { x402: false },
): Promise<Reading[]> {
  const readings = await Promise.all(
    targets.map((target) => read(target, io, now, { keepOffers: options.x402 })),
  );
  await store.append(readings);
  return readings;
}

/** Per target: the latest reading, and the history over the window, oldest first. */
export function probeAnswer(targets: readonly Target[], rows: readonly Reading[], days: number) {
  return {
    measuredBy: MEASURED_BY,
    window: { days },
    targets: targets.map((target) => {
      const history = rows.filter((row) => row.target === target.label);
      return {
        label: target.label,
        kind: target.kind,
        repo: target.repo,
        latest: history[history.length - 1] ?? null,
        history: history.map(({ at, outcome, http, ms }) => ({ at, outcome, http, ms })),
      };
    }),
  };
}

export async function handle(
  request: Request,
  store: Readings,
  now: () => number = Date.now,
  options: ProbeOptions = { x402: false },
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (request.method === 'GET' && url.pathname === '/probe') {
    const asked = Number(url.searchParams.get('days') ?? '1');
    const days = Number.isFinite(asked) && asked > 0 ? Math.min(asked, 30) : 1;
    const rows = await store.since(new Date(now() - days * 86_400_000).toISOString());
    // A minute at the edge: a cycle lands every five.
    return json(probeAnswer(TARGETS, rows, days), 200, { 'cache-control': 'public, max-age=60' });
  }

  if (request.method === 'GET' && url.pathname === '/x402' && options.x402) {
    // ADR 0189: the reading an x402 line's terms are checked against, the most recent before its payment.
    const target = url.searchParams.get('target') ?? '';
    const before = Date.parse(url.searchParams.get('before') ?? '');
    if (target === '' || Number.isNaN(before)) return json({ error: 'GET /x402?target=<label>&before=<ISO 8601>' }, 400);
    const found = await store.latestX402(target, new Date(before).toISOString());
    if (found === null) return json({ error: `no x402 reading of ${target} before ${new Date(before).toISOString()}` }, 404);
    const { offers } = JSON.parse(found.detail ?? '{"offers":[]}') as { offers: unknown[] }; // written by `read` as JSON
    return json({ measuredBy: MEASURED_BY, reading: { target: found.target, at: found.at, offers } });
  }

  if (request.method === 'GET' && url.pathname === '/healthz') {
    const rows = await store.since(new Date(now() - 3_600_000).toISOString());
    return json({
      ok: true,
      targets: TARGETS.length,
      lastReading: rows[rows.length - 1]?.at ?? null,
    });
  }

  return json({ error: options.x402 ? 'GET /probe, GET /x402 or GET /healthz' : 'GET /probe or GET /healthz' }, 404);
}
