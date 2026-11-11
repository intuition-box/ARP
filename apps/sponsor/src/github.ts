/** Whether a tool URL exists where it says, for `POST /list-tool` (ADR `0123`).
 *
 *  A GitHub URL is checked against GitHub's API: the repository's tree, and for a skill
 *  (`?skill=<s>`) a SKILL.md in a directory of that name (`resolveContentPath`, the same rule the
 *  content server serves by). Two requests at most: the repository, which gives GitHub's own
 *  spelling of its name, then its tree for a skill. Unauthenticated unless `GITHUB_TOKEN` is set, so
 *  GitHub's 60 an hour per IP is the bound without one.
 *
 *  It answers whether a URL exists and how GitHub spells it, nothing more. Whether it is a tool is
 *  `admit-tool.ts`'s question, asked only when a listing would create something (task 94, ADR
 *  `0163`); any other URL passes here and is asked there.
 */
import { rawContentUrl, resolveContentPath, serveSkillBundle, skillRefFromUrl, type RepositoryFile } from '@arp-protocol/core';
import type { Hex } from 'viem';

const FETCH_TIMEOUT_MS = 10_000;

/** `fullName` is GitHub's own `owner/repo`, case included, for a GitHub URL. */
export type ToolResolution = { ok: true; fullName?: string } | { ok: false; reason: string };

const CACHE_MS = 10 * 60_000;
/** Bounded: the route runs this before any limit, so an unbounded map is a way to fill memory. */
const CACHE_ENTRIES = 1_000;
const cache = new Map<string, { at: number; answer: ToolResolution }>();

/**
 * {@link resolveOnGitHub}, remembered for ten minutes per URL. A refusal records nothing in the
 * ledger, so without this one URL repeated would spend GitHub's hourly allowance for everyone.
 */
export async function resolveOnGitHubCached(
  url: string,
  now = Date.now(),
): Promise<ToolResolution> {
  // Only GitHub URLs cost a request, so only they are remembered.
  if (new URL(url).hostname.replace(/^www\./, '') !== 'github.com') return resolveOnGitHub(url);
  const hit = cache.get(url);
  if (hit !== undefined && now - hit.at < CACHE_MS) return hit.answer;
  const answer = await resolveOnGitHub(url);
  cache.delete(url);
  cache.set(url, { at: now, answer });
  // A `Map` iterates in insertion order, so the first key is the oldest.
  if (cache.size > CACHE_ENTRIES) cache.delete(cache.keys().next().value ?? url);
  return answer;
}

export async function resolveOnGitHub(
  url: string,
  token = process.env.GITHUB_TOKEN?.trim(),
): Promise<ToolResolution> {
  const parsed = new URL(url);
  if (parsed.hostname.replace(/^www\./, '') !== 'github.com') return { ok: true };
  const ref = skillRefFromUrl(url);
  const [owner, name] = parsed.pathname.replace(/^\/+/, '').split('/');
  const asked = ref?.repo ?? (owner && name ? `${owner}/${name.replace(/\.git$/, '')}` : null);
  if (asked === null || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(asked)) {
    return { ok: false, reason: `${url} names no repository` };
  }

  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'arp-sponsor',
  };
  if (token !== undefined && token.length > 0) headers.authorization = `Bearer ${token}`;
  const get = (path: string) =>
    fetch(`https://api.github.com/repos/${path}`, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

  // The repository first: it answers whether it exists, and its own spelling of its name.
  const repoResponse = await get(asked);
  if (repoResponse.status === 404)
    return { ok: false, reason: `github.com/${asked} does not exist` };
  // A rate limit or an outage says nothing about the repository: thrown, not refused.
  if (!repoResponse.ok) throw new Error(`GitHub answered HTTP ${repoResponse.status} for ${asked}`);
  const { full_name: fullName, private: isPrivate } = (await repoResponse.json()) as {
    full_name?: string;
    private?: boolean;
  };
  if (typeof fullName !== 'string') throw new Error(`GitHub gave no full_name for ${asked}`);
  // A line is public and permanent, and a token can read what the world cannot. Only a repository
  // GitHub says is public goes on chain.
  if (isPrivate !== false) return { ok: false, reason: `github.com/${fullName} is not public` };
  if (ref === null) return { ok: true, fullName };

  const treeResponse = await get(`${fullName}/git/trees/HEAD?recursive=1`);
  if (treeResponse.status === 404 || treeResponse.status === 409) {
    return { ok: false, reason: `github.com/${fullName} is empty` };
  }
  if (!treeResponse.ok)
    throw new Error(`GitHub answered HTTP ${treeResponse.status} for ${fullName}`);
  const tree = (await treeResponse.json()) as {
    tree?: { path: string; type: string; sha: string }[];
  };
  const files: RepositoryFile[] = (tree.tree ?? [])
    .filter((entry) => entry.type === 'blob')
    .map((entry) => ({ path: entry.path, sha: entry.sha }));
  if (resolveContentPath(ref, files).status === 'absent') {
    return { ok: false, reason: `github.com/${fullName} has no SKILL.md for ${ref.skill}` };
  }
  return { ok: true, fullName };
}

/** A SKILL.md larger than this is cut: a name is looked for in it, and nothing else is read. */
const SKILL_MARKDOWN_MAX_BYTES = 512 * 1024;
const markdownCache = new Map<string, { at: number; text: string | null }>();

/**
 * The SKILL.md a skill's URL refers to, at the repository's `HEAD`, by the content server's rule
 * (`resolveContentPath`): what `POST /line` checks a `needs` or `with` name against (task 97, ADR `0166`).
 * `null` when the URL names no skill, or the repository holds no single SKILL.md for it. Throws when GitHub
 * does not answer, which says nothing about the skill. Remembered for ten minutes per URL, like
 * {@link resolveOnGitHubCached}, because the tree read spends GitHub's hourly allowance.
 */
export async function skillMarkdownOnGitHub(
  url: string,
  options: { token?: string | undefined; fetch?: typeof fetch; now?: number } = {},
): Promise<string | null> {
  const now = options.now ?? Date.now();
  const hit = markdownCache.get(url);
  if (hit !== undefined && now - hit.at < CACHE_MS) return hit.text;
  const text = await readSkillMarkdown(url, options.token ?? process.env.GITHUB_TOKEN?.trim(), options.fetch ?? fetch);
  markdownCache.delete(url);
  markdownCache.set(url, { at: now, text });
  if (markdownCache.size > CACHE_ENTRIES) markdownCache.delete(markdownCache.keys().next().value ?? url);
  return text;
}

async function readSkillMarkdown(url: string, token: string | undefined, fetchImpl: typeof fetch): Promise<string | null> {
  const ref = skillRefFromUrl(url);
  if (ref === null || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(ref.repo)) return null;
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'arp-sponsor' };
  if (token !== undefined && token.length > 0) headers.authorization = `Bearer ${token}`;
  const treeResponse = await fetchImpl(`https://api.github.com/repos/${ref.repo}/git/trees/HEAD?recursive=1`, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (treeResponse.status === 404 || treeResponse.status === 409) return null;
  if (!treeResponse.ok) throw new Error(`GitHub answered HTTP ${treeResponse.status} for ${ref.repo}`);
  // GitHub's tree API shape; each entry's `type` is checked below.
  const tree = (await treeResponse.json()) as { tree?: { path: string; type: string; sha: string }[] };
  const files: RepositoryFile[] = (tree.tree ?? [])
    .filter((entry) => entry.type === 'blob')
    .map((entry) => ({ path: entry.path, sha: entry.sha }));
  const resolved = resolveContentPath(ref, files);
  if (resolved.status !== 'resolved') return null;
  const response = await fetchImpl(rawContentUrl(ref, resolved.path), {
    headers: { 'user-agent': 'arp-sponsor' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`raw.githubusercontent.com answered HTTP ${response.status} for ${resolved.path}`);
  return (await response.text()).slice(0, SKILL_MARKDOWN_MAX_BYTES);
}

const digestCache = new Map<string, { at: number; digest: string | null }>();

/**
 * The skill's directory digest at its repository's `HEAD`, as the content server computes it (`serveSkillBundle`,
 * `bundleManifest`, ADR `0185`): what `POST /line` checks a line's version against when no receipt names it
 * (task 127, ADR `0192`). `null` when the URL names no single skill directory, or it is past the bundle's caps.
 * Throws when GitHub does not answer. Two API requests (the commit, its tree) and one raw read per file,
 * remembered for ten minutes per URL.
 */
export async function skillDigestOnGitHub(
  url: string,
  options: { token?: string | undefined; fetch?: typeof fetch; now?: number } = {},
): Promise<string | null> {
  const now = options.now ?? Date.now();
  const hit = digestCache.get(url);
  if (hit !== undefined && now - hit.at < CACHE_MS) return hit.digest;
  const digest = await readSkillDigest(url, options.token ?? process.env.GITHUB_TOKEN?.trim(), options.fetch ?? fetch);
  digestCache.delete(url);
  digestCache.set(url, { at: now, digest });
  if (digestCache.size > CACHE_ENTRIES) digestCache.delete(digestCache.keys().next().value ?? url);
  return digest;
}

async function readSkillDigest(url: string, token: string | undefined, fetchImpl: typeof fetch): Promise<string | null> {
  const ref = skillRefFromUrl(url);
  if (ref === null || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(ref.repo)) return null;
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'arp-sponsor' };
  if (token !== undefined && token.length > 0) headers.authorization = `Bearer ${token}`;
  const commitResponse = await fetchImpl(`https://api.github.com/repos/${ref.repo}/commits/HEAD`, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (commitResponse.status === 404 || commitResponse.status === 409 || commitResponse.status === 422) return null;
  if (!commitResponse.ok) throw new Error(`GitHub answered HTTP ${commitResponse.status} for ${ref.repo}`);
  // GitHub's commit shape; the sha is checked on the next line.
  const { sha } = (await commitResponse.json()) as { sha?: unknown };
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) throw new Error(`GitHub gave no commit for ${ref.repo}`);
  const atom: Hex = `0x${'0'.repeat(64)}`;
  const answer = await serveSkillBundle(atom, {
    chainId: 0,
    index: new Map([[atom, url]]),
    pin: () => sha,
    listing: async (repo, commit) => {
      const response = await fetchImpl(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`, {
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`GitHub answered HTTP ${response.status} for ${repo}`);
      // GitHub's tree API shape; each entry's `type` is checked below.
      const tree = (await response.json()) as { tree?: { path: string; type: string; sha: string }[] };
      return (tree.tree ?? []).filter((entry) => entry.type === 'blob').map((entry) => ({ path: entry.path, sha: entry.sha }));
    },
    raw: async (rawUrl) => {
      const response = await fetchImpl(rawUrl, { headers: { 'user-agent': 'arp-sponsor' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (response.status !== 200 && response.status !== 404) {
        throw new Error(`raw.githubusercontent.com answered HTTP ${response.status}`);
      }
      return { code: response.status, bytes: new Uint8Array(await response.arrayBuffer()) };
    },
    // Nothing is signed: only the digest is read.
    signer: null,
    to: null,
    nonce: atom,
    now: () => 0,
  });
  return answer.status === 'served' ? answer.digest.toLowerCase() : null;
}
