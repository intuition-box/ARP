/**
 * Whether a URL is a tool, before `POST /list-tool` pays to list it (task 94, ADR `0163`). Runs only
 * when the listing would create something: an atom already on the graph is never re-checked.
 *
 * - A GitHub skill (`?skill=`) was checked by `resolveOnGitHub` already: its SKILL.md is the form.
 * - A GitHub repository is read through GitHub's tree API, then at most `MAX_MANIFEST_READS`
 *   manifests from `raw.githubusercontent.com` (`repositoryForms`, `manifestForm`). Both hosts are
 *   fixed, so nothing a caller supplies chooses where this process connects.
 * - Any other URL is asked, at most three times, whether it answers as an MCP server, an A2A agent
 *   card or an x402 payment request. **This is the one place the process holding the treasury key
 *   connects to a host a caller names**, so every request goes through {@link pinnedAsk}: the name is
 *   resolved once, refused if any address is private, loopback or link-local, and the connection is
 *   made to the addresses that were checked (the `lookup` hook of `node:http`). DNS rebinding between
 *   the check and the connection is closed that way, which `fetch` cannot do. No redirect is
 *   followed, each request has a deadline, the body is capped, and only a verdict leaves this file —
 *   never what the host answered.
 */
import {
  githubRepoOf,
  isA2aCard,
  isMcpAnswer,
  isMcpSseAnswer,
  isX402Answer,
  manifestForm,
  MCP_PROTOCOL_VERSION,
  repositoryForms,
  skillRefFromUrl,
  type ToolForm,
  type ToolRefusalRule,
} from '@arp-protocol/core';
import {
  pinnedAsk as pinnedRequest,
  Refused,
  type Answer,
  type Ask,
  type ResolveAll,
} from '@arp-protocol/core/node';

export type ToolAdmission =
  | { ok: true; form: ToolForm }
  | { ok: false; rule: ToolRefusalRule; reason: string };

export type { Answer, Ask, AskInit, ResolveAll } from '@arp-protocol/core/node';
export { Refused } from '@arp-protocol/core/node';

/** Per request. Three requests at most per URL, so a check takes fifteen seconds at worst. */
export const ENDPOINT_TIMEOUT_MS = 5_000;
/** Enough for an `initialize` result, an agent card or a payment request; a stranger gets no more. */
export const ENDPOINT_MAX_BYTES = 64 * 1024;
const USER_AGENT = 'ARP-sponsor/0.1 (+https://github.com/intuition-box/ARP)';

/**
 * Requests that connect only to the addresses they checked (`@arp-protocol/core/node`, moved there
 * by task 140 so the probe shares it). `allowPrivate` (`ARP_ALLOW_PRIVATE_PROBE=1`) lets a private
 * address through, for the task 91 demo whose seller listens on loopback.
 */
export function pinnedAsk(options: {
  allowPrivate: boolean;
  resolve?: ResolveAll;
  timeoutMs?: number;
  maxBytes?: number;
}): Ask {
  return pinnedRequest({
    allowPrivate: options.allowPrivate,
    resolve: options.resolve,
    timeoutMs: options.timeoutMs ?? ENDPOINT_TIMEOUT_MS,
    maxBytes: options.maxBytes ?? ENDPOINT_MAX_BYTES,
    userAgent: USER_AGENT,
  });
}

const INITIALIZE = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'arp-sponsor', version: '0.1' },
  },
});

const reached = (url: string, error: unknown): ToolAdmission =>
  error instanceof Refused
    ? { ok: false, rule: error.rule, reason: error.message }
    : {
        ok: false,
        rule: 'unreachable',
        reason: `${url} could not be reached: ${error instanceof Error ? error.message : String(error)}`,
      };

/**
 * Whether an endpoint answers as a tool: a `GET` (an x402 `402`, an agent card, MCP's SSE stream),
 * then MCP `initialize`, then the agent card at `.well-known/agent-card.json` under it. Stops at the
 * first that answers; a failure to reach the URL at all stops at once.
 */
export async function admitEndpoint(url: string, ask: Ask): Promise<ToolAdmission> {
  const seen: string[] = [];
  let got: Answer;
  try {
    got = await ask(url, { method: 'GET', headers: { accept: 'application/json, */*' } });
  } catch (error) {
    return reached(url, error);
  }
  if (isX402Answer(got.status, got.header, got.body)) return { ok: true, form: 'x402' };
  if (isA2aCard(got.status, got.body)) return { ok: true, form: 'a2a-card' };
  if (isMcpSseAnswer(got.status, got.header, got.body)) return { ok: true, form: 'mcp-endpoint' };
  const location = got.status >= 300 && got.status < 400 ? got.header('location') : null;
  seen.push(location === null ? `GET ${got.status}` : `GET ${got.status} to ${location}`);

  try {
    const init = await ask(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: INITIALIZE,
    });
    if (isMcpAnswer(init.status, init.header, init.body)) return { ok: true, form: 'mcp-endpoint' };
    if (isX402Answer(init.status, init.header, init.body)) return { ok: true, form: 'x402' };
    seen.push(`initialize ${init.status}`);

    if (!/\.json$/i.test(new URL(url).pathname)) {
      // Under the URL's path, without its query: `?a=1/.well-known/…` is no path at all.
      const cardTarget = new URL(url);
      cardTarget.search = '';
      cardTarget.pathname = `${cardTarget.pathname.replace(/\/+$/, '')}/.well-known/agent-card.json`;
      const cardUrl = cardTarget.toString();
      const card = await ask(cardUrl, { method: 'GET', headers: { accept: 'application/json' } });
      if (isA2aCard(card.status, card.body)) return { ok: true, form: 'a2a-card' };
      seen.push(`agent card ${card.status}`);
    }
  } catch (error) {
    if (error instanceof Refused) return reached(url, error);
    seen.push(`then ${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    ok: false,
    rule: 'not-a-tool',
    reason:
      `${url} does not answer as an MCP server, an A2A agent card or an x402 payment request` +
      ` (${seen.join(', ')})` +
      (location === null ? '' : '; a redirect is not followed, so list the URL it points to'),
  };
}

const MANIFEST_TIMEOUT_MS = 10_000;
const MANIFEST_MAX_BYTES = 256 * 1024;

/**
 * Whether a public GitHub repository holds something a runtime loads. `fullName` is GitHub's own
 * `owner/repo`, from `resolveOnGitHub`. A rate limit or an outage throws: it says nothing about the
 * repository.
 */
export async function admitRepository(
  fullName: string,
  token = process.env.GITHUB_TOKEN?.trim(),
  fetchImpl: typeof fetch = fetch,
): Promise<ToolAdmission> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'arp-sponsor',
  };
  if (token !== undefined && token.length > 0) headers.authorization = `Bearer ${token}`;
  const treeResponse = await fetchImpl(
    `https://api.github.com/repos/${fullName}/git/trees/HEAD?recursive=1`,
    { headers, signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS) },
  );
  if (treeResponse.status === 404 || treeResponse.status === 409) {
    return { ok: false, rule: 'not-a-tool', reason: `github.com/${fullName} is empty` };
  }
  if (!treeResponse.ok)
    throw new Error(`GitHub answered HTTP ${treeResponse.status} for ${fullName}`);
  // GitHub's tree API shape; every field is read as optional and each entry's `type` is checked below.
  const tree = (await treeResponse.json()) as {
    tree?: { path: string; type: string }[];
    truncated?: boolean;
  };
  const paths = (tree.tree ?? []).filter((entry) => entry.type === 'blob').map((entry) => entry.path);
  const { forms, toRead } = repositoryForms(paths);
  const named = forms[0];
  if (named !== undefined) return { ok: true, form: named };

  for (const path of toRead) {
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    const response = await fetchImpl(
      `https://raw.githubusercontent.com/${fullName}/HEAD/${encoded}`,
      { headers: { 'user-agent': 'arp-sponsor' }, signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS) },
    );
    if (response.status === 404) continue;
    if (!response.ok)
      throw new Error(`raw.githubusercontent.com answered HTTP ${response.status} for ${path}`);
    const text = (await response.text()).slice(0, MANIFEST_MAX_BYTES);
    const form = manifestForm(path, text);
    if (form !== null) return { ok: true, form };
  }
  return {
    ok: false,
    rule: 'not-a-tool',
    reason:
      `github.com/${fullName} holds nothing a runtime loads: no SKILL.md, no .claude-plugin, ` +
      'no gemini-extension.json, no MCP registry server.json, and no root package.json, ' +
      'pyproject.toml or go.mod that depends on an MCP SDK' +
      (tree.truncated === true ? ' (GitHub truncated the file list)' : ''),
  };
}

/** Ten minutes, as `resolveOnGitHubCached`: one URL repeated costs one check. */
const CACHE_MS = 10 * 60_000;
const CACHE_ENTRIES = 1_000;
/** Endpoint checks per hour, all callers together, so the service is not a way to send requests. */
export const DEFAULT_ENDPOINT_CHECKS_PER_HOUR = 60;

/**
 * `admitTool(url, fullName)` for `POST /list-tool`: the URL as it would be listed, and for a GitHub
 * URL GitHub's own `owner/repo`. Remembers each verdict for ten minutes, and bounds endpoint checks
 * per hour; past that bound it throws, which the route answers 503 with `retry`.
 */
export function toolAdmitter(options: {
  ask: Ask;
  token?: string;
  fetch?: typeof fetch;
  endpointChecksPerHour?: number;
  now?: () => number;
}): (url: string, fullName?: string) => Promise<ToolAdmission> {
  const now = options.now ?? Date.now;
  const perHour = options.endpointChecksPerHour ?? DEFAULT_ENDPOINT_CHECKS_PER_HOUR;
  const cache = new Map<string, { at: number; answer: ToolAdmission }>();
  const checks: number[] = [];
  return async (url, fullName) => {
    const hit = cache.get(url);
    if (hit !== undefined && now() - hit.at < CACHE_MS) return hit.answer;
    let answer: ToolAdmission;
    const repo = githubRepoOf(url);
    if (repo !== null) {
      // The SKILL.md was found by `resolveOnGitHub`, by the content server's rule.
      if (skillRefFromUrl(url) !== null) return { ok: true, form: 'skill' };
      answer = await admitRepository(fullName ?? repo, options.token, options.fetch);
    } else {
      const since = now() - 60 * 60_000;
      while (checks.length > 0 && (checks[0] ?? 0) <= since) checks.shift();
      if (checks.length >= perHour) {
        throw new Error(`${perHour} endpoint checks in the last hour, the most this service makes`);
      }
      checks.push(now());
      answer = await admitEndpoint(url, options.ask);
    }
    cache.delete(url);
    cache.set(url, { at: now(), answer });
    if (cache.size > CACHE_ENTRIES) cache.delete(cache.keys().next().value ?? url);
    return answer;
  };
}
