/** nohumans.directory's last purchase of one x402 endpoint, read on demand and cached (task 120).
 *
 *  nohumans.directory buys listed x402 endpoints with real USDC on Base and publishes whether the
 *  answer delivered, under CC BY 4.0 (`https://nohumans.directory/llms.txt`, "## Licence", read
 *  2026-11-11: attribute "nohumans.directory" with a link to `https://api.nohumans.directory`, and
 *  "if you republish one, say when it was observed"). This reads one free route of it,
 *  `GET /v1/resolve?url=<endpoint>`, and none of the paid ones (`/verdict`, `/purchases`).
 *
 *  **On demand, not on the cron** (ADR `0187`). The other sources here are read for a catalogue
 *  known in advance; the endpoints a page asks about are any tool atom whose label is a URL, which
 *  no list holds. So the first request for a URL reads it, and the answer is kept `FRESH_FOR_MS`.
 *
 *  What is sent: the endpoint's public URL, which is the tool atom's label on chain. Nothing a
 *  person typed (ADR `0155`).
 *
 *  Somebody else's word, dated: never written on chain, never an ARP line, never in ARP's score.
 */
import type { Store } from './refresh.ts';
import type { Fetch, Failure } from './sources.ts';

export const NOHUMANS = {
  name: 'nohumans.directory',
  /** The link the licence asks for. */
  url: 'https://api.nohumans.directory',
  licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  read: 'api.nohumans.directory/v1/resolve?url={endpoint}',
} as const;

/** The scout pays on Base (`llms.txt`: "nohumans sends real USDC to listed endpoints … on Base"). */
export const PURCHASE_NETWORK = 'eip155:8453';

/** One answer is kept this long: the scout buys a listing again over days, not minutes. */
export const FRESH_FOR_MS = 6 * 60 * 60 * 1000;

/** KV drops an entry nobody asked about for a week. */
const EXPIRE_AFTER_S = 7 * 24 * 60 * 60;

const MAX_URL = 2048;
const READ_TIMEOUT_MS = 15_000;
const USER_AGENT = 'arp-api (+https://github.com/intuition-box/ARP)';

export type Purchase = {
  /** ISO 8601, the moment the purchase settled: when the verdict was observed. */
  at: string;
  delivered: boolean;
  /** nohumans' own code for a failure, e.g. `stale_data`; `null` when it delivered or none was given. */
  reason: string | null;
  /** The settlement transaction on Base, or `null` when the record carries none that parses. */
  tx: string | null;
};

export type LastPurchase =
  /** Listed there: the record's id, its address, and its latest settled purchase, if any. */
  | { match: 'active' | 'delisted'; listingId: string | null; purchase: Purchase | null }
  /** Never listed there. Its own words: "absence is not a verdict". */
  | { match: 'unknown' };

type Cached = LastPurchase & { fetchedAt: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/** `paid_verification_latest`, as the listing record carries it, or `null` when it has none. */
export function purchaseOf(detail: Record<string, unknown>): Purchase | null {
  const latest = detail.paid_verification_latest;
  if (!isRecord(latest) || typeof latest.delivered !== 'boolean') return null;
  const at =
    text(latest.at_iso) ??
    (typeof latest.at === 'number' ? new Date(latest.at * 1000).toISOString() : null);
  if (at === null || Number.isNaN(Date.parse(at))) return null;
  const tx = text(latest.tx_hash);
  return {
    at,
    delivered: latest.delivered,
    reason: latest.delivered ? null : text(latest.failure_reason),
    tx: tx !== null && /^0x[0-9a-fA-F]{64}$/.test(tx) ? tx.toLowerCase() : null,
  };
}

/** The endpoint as given, if it is one worth asking about: an absolute http(s) URL of sane length. */
export function endpointOf(raw: string | null): string | null {
  if (raw === null || raw.length === 0 || raw.length > MAX_URL) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? raw : null;
  } catch {
    return null;
  }
}

/** One read of `/v1/resolve`. A 404 with `match: "unknown"` is an answer, not a failure. */
export async function readLastPurchase(
  endpoint: string,
  fetch: Fetch,
): Promise<LastPurchase | Failure> {
  const what = `nohumans ${endpoint}`;
  let response: Response;
  try {
    response = await fetch(`${NOHUMANS.url}/v1/resolve?url=${encodeURIComponent(endpoint)}`, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      error: `${what}: ${error instanceof Error ? error.name : 'fetch failed'}`,
      limited: false,
    };
  }
  if (response.status !== 200 && response.status !== 404)
    return { error: `${what}: HTTP ${response.status}`, limited: response.status === 429 };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { error: `${what}: not JSON`, limited: false };
  }
  if (!isRecord(body)) return { error: `${what}: not an object`, limited: false };
  if (body.match === 'unknown') return { match: 'unknown' };
  if ((body.match === 'active' || body.match === 'delisted') && response.status === 200) {
    const detail = isRecord(body.detail) ? body.detail : {};
    return { match: body.match, listingId: text(detail.id), purchase: purchaseOf(detail) };
  }
  return { error: `${what}: HTTP ${response.status}, match ${String(body.match)}`, limited: false };
}

/**
 * The KV key: a SHA-256 of the endpoint, not the endpoint. KV caps a key at 512 bytes and an
 * endpoint may be up to `MAX_URL` (2048) characters, so the URL itself would throw inside `handle`.
 */
async function keyOf(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `nohumans:${hex}`;
}

/**
 * The cached answer while it is fresh, otherwise a new read. A read that fails serves the previous
 * answer with its own date, or the failure when there is none.
 */
export async function lastPurchase(
  endpoint: string,
  store: Store,
  fetch: Fetch,
  now: number,
): Promise<Cached | Failure> {
  // Only this function writes `nohumans:` keys, always a whole `Cached`.
  const key = await keyOf(endpoint);
  const cached = (await store.get(key, 'json')) as Cached | null;
  if (cached !== null && now - Date.parse(cached.fetchedAt) < FRESH_FOR_MS) return cached;
  const read = await readLastPurchase(endpoint, fetch);
  if ('error' in read) return cached ?? read;
  const fresh: Cached = { ...read, fetchedAt: new Date(now).toISOString() };
  await store.put(key, JSON.stringify(fresh), { expirationTtl: EXPIRE_AFTER_S });
  return fresh;
}

/** The answer served: the source and its licence first, then the reading, dated. */
export function lastPurchaseAnswer(endpoint: string, cached: Cached) {
  return {
    source: NOHUMANS,
    network: PURCHASE_NETWORK,
    endpoint,
    listing:
      cached.match !== 'unknown' && cached.listingId !== null
        ? `${NOHUMANS.url}/v1/listings/${encodeURIComponent(cached.listingId)}`
        : null,
    ...cached,
  };
}
