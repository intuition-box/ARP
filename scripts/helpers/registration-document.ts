/** An ERC-8004 agent's registration document, read the way anyone could: `tokenURI`, then one GET.
 *
 *  Shared by `scripts/verify/verify-cohort.ts` and `scripts/measure/agent-sieve.ts` (task 87), which
 *  both walk the cohort. It was inside the first; the second would have been a copy.
 *
 *  Read-only. Signs nothing.
 */
import {
  DEFAULT_PROBE_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  type DocumentOutcome,
  type HostLimiter,
} from '../../packages/protocol/src/index.js';

/** The call signature callers use. Not `typeof fetch`: Bun types that with a `preconnect` a wrapper need not carry. */
export type Fetch = (
  input: Parameters<typeof globalThis.fetch>[0],
  init?: Parameters<typeof globalThis.fetch>[1],
) => Promise<Response>;

/**
 * Gateways tried in order for an `ipfs://` URI, Pinata first as in `packages/protocol`'s own list.
 * ipfs.io rate-limits hard under a walk: on 2026-11-09 it and dweb.link both answered 429 to agent
 * 8453:1380's document while Pinata answered 200.
 */
export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/',
];

const TOKEN_URI = '0xc87b56dd';
const OWNER_OF = '0x6352211e';

async function ethCall(rpc: string, to: string, data: string, fetch: Fetch): Promise<string | null> {
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    signal: AbortSignal.timeout(20_000),
  });
  // A JSON-RPC reply; `result` is checked before it is read.
  const json = (await response.json()) as { result?: string; error?: { message?: unknown } };
  // A revert is the registry's answer (no such token). Any other error is the RPC's, a rate limit
  // among them, and says nothing about the agent: it throws, so a caller does not read it as "none".
  if (json.error !== undefined && !/revert/i.test(String(json.error.message ?? ''))) {
    throw new Error(`RPC error: ${String(json.error.message ?? 'unknown').slice(0, 120)}`);
  }
  if (json.error || !json.result || json.result === '0x') return null;
  return json.result;
}

/** The registry's `tokenURI(id)`, or `null` when there is none or the id does not exist. */
export async function tokenUri(options: {
  rpc: string;
  registry: string;
  id: number | bigint;
  fetch: Fetch;
}): Promise<string | null> {
  const result = await ethCall(
    options.rpc,
    options.registry,
    TOKEN_URI + BigInt(options.id).toString(16).padStart(64, '0'),
    options.fetch,
  );
  if (result === null) return null;
  const hex = result.slice(2);
  const length = parseInt(hex.slice(64, 128), 16);
  if (!Number.isFinite(length) || length === 0) return null;
  const bytes = hex.slice(128, 128 + length * 2).match(/../g) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes.map((b) => parseInt(b, 16))));
}

/** The registry's `ownerOf(id)`, lowercased, or `null`. */
export async function ownerOf(options: {
  rpc: string;
  registry: string;
  id: number | bigint;
  fetch: Fetch;
}): Promise<string | null> {
  const result = await ethCall(
    options.rpc,
    options.registry,
    OWNER_OF + BigInt(options.id).toString(16).padStart(64, '0'),
    options.fetch,
  ).catch(() => null);
  return result === null || result.length < 66 ? null : `0x${result.slice(-40)}`.toLowerCase();
}

export function decodeDataUri(uri: string): string {
  const payload = uri.slice(uri.indexOf(',') + 1);
  return uri.includes(';base64,')
    ? Buffer.from(payload, 'base64').toString('utf8')
    : decodeURIComponent(payload);
}

/**
 * The document a `tokenURI` points at: `data:`, `ipfs://` through {@link IPFS_GATEWAYS}, or http(s).
 * A body comes back only when it parses as JSON. A 429 or 503 backs the host off and is not a verdict.
 */
export async function fetchDocument(
  uri: string,
  limiter: HostLimiter,
  fetch: Fetch,
): Promise<{ outcome: DocumentOutcome; body: string | null }> {
  // Some registries hold the JSON itself in `tokenURI`, not an address of it: it is a document.
  // Agent 8453:16666 is one (2026-11-09); the walk read it as a shell until then.
  if (uri.trimStart().startsWith('{')) {
    try {
      JSON.parse(uri);
      return { outcome: { status: 'read', url: 'inline', httpStatus: 200 }, body: uri };
    } catch {
      // Not JSON after all: falls through to the scheme check below, which names it.
    }
  }
  if (uri.startsWith('data:')) {
    // Decode AND parse: a `data:` URI holding non-JSON once returned `read` and killed a 100-agent
    // walk downstream. The HTTP branch below has always validated the parse.
    try {
      const body = decodeDataUri(uri);
      JSON.parse(body);
      return { outcome: { status: 'read', url: uri, httpStatus: 200 }, body };
    } catch (error) {
      return {
        outcome: {
          status: 'unreachable',
          code: 'not-json',
          url: uri,
          httpStatus: null,
          detail: `data: URI did not decode to JSON (${String(error).slice(0, 80)})`,
        },
        body: null,
      };
    }
  }

  // A gateway URL (`https://ipfs.io/ipfs/<cid>`) is content-addressed too: when its own gateway
  // refuses, the same path on another gateway is the same document. Agent 8453:1380's is one.
  const gatewayPath = /^https?:\/\/[^/]+\/ipfs\/(.+)$/.exec(uri)?.[1];
  const candidates = uri.startsWith('ipfs://')
    ? IPFS_GATEWAYS.map((gateway) => gateway + uri.slice(7))
    : gatewayPath !== undefined
      ? [uri, ...IPFS_GATEWAYS.map((gateway) => gateway + gatewayPath).filter((url) => url !== uri)]
      : /^https?:\/\//.test(uri)
        ? [uri]
        : [];

  if (candidates.length === 0) {
    return {
      outcome: {
        status: 'unreachable',
        code: 'unresolvable-scheme',
        url: uri,
        httpStatus: null,
        detail: 'the tokenURI is neither http(s), ipfs:// nor data:',
      },
      body: null,
    };
  }

  let last: DocumentOutcome | null = null;
  for (const [index, url] of candidates.entries()) {
    // A gateway that asked us to back off is skipped while another holds the same content, rather
    // than waited for: its Retry-After can be ten minutes, and every agent behind it in a walk
    // waited too (2026-11-09, ipfs.io). The last candidate is still waited for, never skipped.
    if (index < candidates.length - 1 && limiter.nextFreeFor(url) > Date.now() + 1_000) {
      last = {
        status: 'unreachable',
        code: 'http-error',
        url,
        httpStatus: 429,
        detail: 'skipped: this gateway asked us to back off earlier in the walk',
      };
      continue;
    }
    const result = await limiter.run(url, async () => {
      try {
        const response = await fetch(url, {
          headers: { 'user-agent': DEFAULT_USER_AGENT },
          signal: AbortSignal.timeout(DEFAULT_PROBE_TIMEOUT_MS * 2),
        });
        return { response, body: await response.text() };
      } catch (error) {
        return { error };
      }
    });
    if ('error' in result) {
      last = {
        status: 'unreachable',
        code: 'transport-error',
        url,
        httpStatus: null,
        detail: String(result.error).slice(0, 120),
      };
      continue;
    }
    const { response, body } = result;
    if (response.status === 429 || response.status === 503) {
      limiter.backOff(url, response.headers.get('retry-after'));
      last = {
        status: 'unreachable',
        code: 'http-error',
        url,
        httpStatus: response.status,
        detail: `gateway asked us to back off (HTTP ${response.status})`,
      };
      continue;
    }
    if (!response.ok) {
      last = { status: 'unreachable', code: 'http-error', url, httpStatus: response.status, detail: `HTTP ${response.status}` };
      continue;
    }
    try {
      JSON.parse(body);
    } catch {
      last = {
        status: 'unreachable',
        code: 'not-json',
        url,
        httpStatus: response.status,
        detail: 'answered, but the body is not JSON',
      };
      continue;
    }
    return { outcome: { status: 'read', url, httpStatus: response.status }, body };
  }
  // `candidates` is non-empty here, so the loop set `last` at least once.
  return { outcome: last as DocumentOutcome, body: null };
}
