import { describe, expect, test } from 'bun:test';

import {
  REPOS as CATALOGUE_REPOS,
  SKILLS as CATALOGUE_SKILLS,
  skillLabel,
} from '../src/catalogue.ts';
import { runSlice, unitsOf, type CycleState, type Store } from '../src/refresh.ts';
import { readRepo, readSkillPage, readTree, shorten, type Fetch } from '../src/sources.ts';
import { everyHours, handle, sameSecret, type Env } from '../src/service.ts';

function memoryStore(): Store & { data: Map<string, string>; writes: number } {
  const data = new Map<string, string>();
  const store = {
    data,
    writes: 0,
    async get(key: string) {
      const value = data.get(key);
      return value === undefined ? null : (JSON.parse(value) as unknown);
    },
    async put(key: string, value: string) {
      store.writes += 1;
      data.set(key, value);
    },
  };
  return store;
}

type Route = (url: string) => Response | undefined;
function fakeFetch(...routes: Route[]) {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    for (const route of routes) {
      const response = route(url);
      if (response !== undefined) return response;
    }
    return new Response('not found', { status: 404 });
  };
  return { fetcher, calls };
}

const repoJson = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const page = (description: string, installs: number) =>
  new Response(
    `<script type="application/ld+json">{"@type":"SoftwareApplication","description":${JSON.stringify(description)},` +
      `"interactionStatistic":{"userInteractionCount":${installs}}}</script>`,
  );

describe('the three reads', () => {
  test('a repository: stars, push date, archived, description', async () => {
    const { fetcher } = fakeFetch(() =>
      repoJson({
        stargazers_count: 12,
        pushed_at: '2026-10-01T00:00:00Z',
        archived: true,
        description: ' x ',
      }),
    );
    expect(await readRepo('a/b', fetcher)).toEqual({
      stars: 12,
      pushedAt: '2026-10-01T00:00:00Z',
      archived: true,
      gone: false,
      description: 'x',
    });
  });

  test('a 404 is a fact — the repository is gone — not a failed read', async () => {
    const { fetcher } = fakeFetch();
    expect(await readRepo('a/b', fetcher)).toMatchObject({ gone: true });
  });

  test('a spent quota is a limited failure', async () => {
    const { fetcher } = fakeFetch(() => repoJson({}, 403, { 'x-ratelimit-remaining': '0' }));
    expect(await readRepo('a/b', fetcher)).toEqual({ error: 'repo a/b: HTTP 403', limited: true });
  });

  test('a tree keeps blobs only, with their sha', async () => {
    const { fetcher } = fakeFetch(() =>
      repoJson({
        tree: [
          { path: 'skills/x/SKILL.md', type: 'blob', sha: 's1' },
          { path: 'skills', type: 'tree', sha: 't' },
        ],
      }),
    );
    expect(await readTree('a/b', fetcher)).toEqual([{ path: 'skills/x/SKILL.md', sha: 's1' }]);
  });

  test('a skill page: the JSON-LD description, unescaped and cut, and the install count', async () => {
    const { fetcher } = fakeFetch(() => page('says "hi"\n' + 'word '.repeat(60), 4100928));
    const fact = await readSkillPage('a/b', 'x', fetcher);
    expect(fact).toMatchObject({ installs: 4100928 });
    expect('description' in fact && fact.description.startsWith('says "hi"')).toBe(true);
    expect('description' in fact && fact.description.endsWith('…')).toBe(true);
  });

  test('a page with no figure has installs null, not zero', async () => {
    const { fetcher } = fakeFetch(() => new Response('<html></html>'));
    expect(await readSkillPage('a/b', 'x', fetcher)).toEqual({ description: '', installs: null });
  });

  test('shorten leaves a short text alone and cuts a long one on a word', () => {
    expect(shorten('short')).toBe('short');
    expect(shorten('a '.repeat(150)).length).toBeLessThanOrEqual(201);
  });
});

const REPOS = [
  { slug: 'o/r', kind: 'skill-repo' },
  { slug: 'o/s', kind: 'mcp-server' },
];
const SKILLS = [
  { repo: 'o/r', skill: 'one' },
  { repo: 'o/r', skill: 'two' },
];
const units = unitsOf(REPOS, SKILLS);

const upstream = () =>
  fakeFetch(
    (url) =>
      url.endsWith('/git/trees/HEAD?recursive=1')
        ? repoJson({
            tree: [
              { path: 'skills/one/SKILL.md', type: 'blob', sha: 'a' },
              { path: 'skills/two/SKILL.md', type: 'blob', sha: 'b' },
              { path: 'other/two/SKILL.md', type: 'blob', sha: 'c' },
            ],
          })
        : undefined,
    (url) =>
      url.startsWith('https://api.github.com/repos/')
        ? repoJson({ stargazers_count: 1, pushed_at: '2026-10-29T00:00:00Z' })
        : undefined,
    (url) => (url.startsWith('https://www.skills.sh/') ? page('d', 7) : undefined),
  );

describe('a refresh cycle, a slice at a time', () => {
  test('two repos, one tree, two pages: five units, in that order', () => {
    expect(units.map((unit) => unit.kind)).toEqual(['repo', 'repo', 'tree', 'page', 'page']);
  });

  test('a slice reads at most its budget and writes each document once', async () => {
    const store = memoryStore();
    const { fetcher, calls } = upstream();
    const first = await runSlice({
      store,
      fetch: fetcher,
      now: () => 0,
      budget: 3,
      pauseMs: 0,
      units,
    });
    expect(first.ran).toBe(3);
    expect(calls).toHaveLength(3);
    expect(store.writes).toBe(4);
    expect(first.state.completedAt).toBeNull();

    const second = await runSlice({
      store,
      fetch: fetcher,
      now: () => 1000,
      budget: 3,
      pauseMs: 0,
      units,
    });
    expect(second.ran).toBe(2);
    expect(second.state.completedAt).not.toBeNull();

    const paths = JSON.parse(store.data.get('paths') ?? '{}') as Record<string, { path: string }>;
    expect(paths['github.com/o/r?skill=one']?.path).toBe('skills/one/SKILL.md');
    // Two different files under one name: no entry, rather than somebody else's file.
    expect(paths['github.com/o/r?skill=two']).toBeUndefined();
  });

  test('a finished cycle idles until the interval has passed, then starts again', async () => {
    const store = memoryStore();
    const { fetcher } = upstream();
    await runSlice({
      store,
      fetch: fetcher,
      now: () => 0,
      budget: 10,
      pauseMs: 0,
      units,
      everyHours: 1,
    });
    expect(
      (
        await runSlice({
          store,
          fetch: fetcher,
          now: () => 1_000,
          pauseMs: 0,
          units,
          everyHours: 1,
        })
      ).idle,
    ).toBe(true);
    const again = await runSlice({
      store,
      fetch: fetcher,
      now: () => 3_600_001,
      budget: 10,
      pauseMs: 0,
      units,
      everyHours: 1,
    });
    expect(again.idle).toBe(false);
    expect(again.ran).toBe(5);
  });

  test('a rate limit stops the slice on the unit, which the next slice retries', async () => {
    const store = memoryStore();
    let limited = true;
    const fetcher = async (url: string) =>
      limited && url.endsWith('/o/s') ? repoJson({}, 429) : repoJson({ stargazers_count: 1 });
    const first = await runSlice({
      store,
      fetch: fetcher,
      now: () => 0,
      budget: 10,
      pauseMs: 0,
      units,
    });
    expect(first.state.cursor).toBe(1);
    expect(first.state.lastErrors).toEqual(['repo o/s: HTTP 429']);
    limited = false;
    const second = await runSlice({
      store,
      fetch: fetcher,
      now: () => 1,
      budget: 1,
      pauseMs: 0,
      units,
    });
    expect(second.state.cursor).toBe(2);
  });

  test('a failed read keeps the previous value', async () => {
    const store = memoryStore();
    const { fetcher } = upstream();
    await runSlice({
      store,
      fetch: fetcher,
      now: () => 0,
      budget: 10,
      pauseMs: 0,
      units,
      everyHours: 1,
    });
    const failing = async () => new Response('down', { status: 500 });
    await runSlice({
      store,
      fetch: failing,
      now: () => 3_600_001,
      budget: 10,
      pauseMs: 0,
      units,
      everyHours: 1,
    });
    const skills = JSON.parse(store.data.get('skills') ?? '{}') as Record<
      string,
      { installs: number }
    >;
    expect(skills['github.com/o/r?skill=one']?.installs).toBe(7);
  });
});

describe('the HTTP surface', () => {
  const env = (store: Store, secret?: string): Env => ({ FACTS: store, REFRESH_SECRET: secret });

  test('GET /facts serves each fact with when it was read, and computes days now', async () => {
    const store = memoryStore();
    await store.put(
      'repos',
      JSON.stringify({
        'github.com/o/r': {
          stars: 3,
          pushedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
          archived: false,
          gone: false,
          description: null,
          fetchedAt: '2026-10-30T00:00:00.000Z',
        },
      }),
    );
    const response = await handle(new Request('http://api/facts'), env(store));
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const body = (await response.json()) as {
      repos: Record<string, { days: number }>;
      read: { repos: { oldest: string } };
    };
    expect(body.repos['github.com/o/r']?.days).toBe(2);
    expect(body.read.repos.oldest).toBe('2026-10-30T00:00:00.000Z');
  });

  test('the secret is compared whole, whatever its length', async () => {
    expect(await sameSecret('Bearer yes', 'Bearer yes')).toBe(true);
    expect(await sameSecret('Bearer ye', 'Bearer yes')).toBe(false);
    expect(await sameSecret('', 'Bearer yes')).toBe(false);
  });

  test('a read that hangs or never connects is a failure of that unit, not of the slice', async () => {
    const refused = (async () => {
      throw new TypeError('fetch failed');
    }) as Fetch;
    expect(await readRepo('o/r', refused)).toEqual({
      error: 'repo o/r: TypeError',
      limited: false,
    });
    const seen: (AbortSignal | null | undefined)[] = [];
    const records = (async (_url: string, init?: RequestInit) => {
      seen.push(init?.signal);
      return new Response('{}');
    }) as Fetch;
    await readRepo('o/r', records);
    expect(seen[0]).toBeInstanceOf(AbortSignal);
  });

  test('POST /refresh is off without a secret, and refused with the wrong one', async () => {
    const store = memoryStore();
    expect(
      (await handle(new Request('http://api/refresh', { method: 'POST' }), env(store))).status,
    ).toBe(404);
    const wrong = new Request('http://api/refresh', {
      method: 'POST',
      headers: { authorization: 'Bearer no' },
    });
    expect((await handle(wrong, env(store, 'yes'))).status).toBe(401);
  });

  test('POST /refresh?all=1 runs slices back to back until one reads nothing', async () => {
    const store = memoryStore();
    let calls = 0;
    // One repository read answers, then GitHub says the quota is spent.
    const fetcher = (async () => {
      calls += 1;
      return calls === 1
        ? new Response(JSON.stringify({ stargazers_count: 1, pushed_at: null }))
        : new Response('', { status: 429 });
    }) as Fetch;
    const right = new Request('http://api/refresh?all=1', {
      method: 'POST',
      headers: { authorization: 'Bearer yes' },
    });
    const response = await handle(right, env(store, 'yes'), fetcher);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ran: number; state: { cursor: number } };
    // The second slice read nothing, which is what stopped the loop.
    expect([body.ran, body.state.cursor, calls]).toEqual([0, 1, 3]);
  });

  test('GET /healthz says where the cycle is, and OPTIONS answers CORS', async () => {
    const store = memoryStore();
    const health = await handle(new Request('http://api/healthz'), env(store));
    expect(await health.json()).toEqual({
      ok: true,
      state: { cycleStartedAt: null, completedAt: null, cursor: 0, lastErrors: [] },
    });
    const options = await handle(new Request('http://api/facts', { method: 'OPTIONS' }), env(store));
    expect([options.status, options.headers.get('access-control-allow-origin')]).toEqual([204, '*']);
  });

  test('REFRESH_EVERY_HOURS falls back to 24 on anything that is not a positive number', () => {
    expect(everyHours({ FACTS: memoryStore(), REFRESH_EVERY_HOURS: '6' })).toBe(6);
    for (const value of [undefined, '0', '-1', 'soon'])
      expect(everyHours({ FACTS: memoryStore(), REFRESH_EVERY_HOURS: value })).toBe(24);
  });
});

describe('the rest of the HTTP surface', () => {
  const authorised = (query = '') =>
    new Request(`http://api/refresh${query}`, {
      method: 'POST',
      headers: { authorization: 'Bearer yes' },
    });
  const limited: Fetch = async () => new Response('slow down', { status: 429 });
  const catalogueUnits = unitsOf(CATALOGUE_REPOS, CATALOGUE_SKILLS);

  test('OPTIONS answers the CORS preflight with no body', async () => {
    const response = await handle(new Request('http://api/facts', { method: 'OPTIONS' }), {
      FACTS: memoryStore(),
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS');
    expect(await response.text()).toBe('');
  });

  test('GET /healthz serves the cycle state, empty before the first slice', async () => {
    const response = await handle(new Request('http://api/healthz'), { FACTS: memoryStore() });
    expect(await response.json()).toEqual({
      ok: true,
      state: { cycleStartedAt: null, completedAt: null, cursor: 0, lastErrors: [] },
    });
  });

  test('an unknown route names the routes that exist', async () => {
    const response = await handle(new Request('http://api/nope'), { FACTS: memoryStore() });
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: string }).error).toContain('GET /facts');
  });

  test('a last purchase nobody could read, and none cached, is a 502 with the reason', async () => {
    const failing: Fetch = async () => new Response('down', { status: 500 });
    const response = await handle(
      new Request(`http://api/x402/last-purchase?url=${encodeURIComponent('https://a.example/x')}`),
      { FACTS: memoryStore(), ARP_X402_LAST_PURCHASE: 'on' },
      failing,
    );
    expect(response.status).toBe(502);
    expect(((await response.json()) as { error: string }).error).toContain('HTTP 500');
  });

  test('POST /refresh with the secret runs one slice and answers its result', async () => {
    const store = memoryStore();
    const response = await handle(authorised(), { FACTS: store, REFRESH_SECRET: ' yes ' }, limited);
    const body = (await response.json()) as { ran: number; idle: boolean; state: CycleState };
    expect(body.ran).toBe(0);
    expect(body.idle).toBe(false);
    expect(body.state.lastErrors).toEqual([expect.stringContaining('HTTP 429')]);
    expect(store.data.has('state')).toBe(true);
  });

  test('?all=1 runs slices back to back until one makes no progress', async () => {
    const store = memoryStore();
    const start = catalogueUnits.length - 2;
    await store.put(
      'state',
      JSON.stringify({
        cycleStartedAt: '2026-11-11T00:00:00.000Z',
        completedAt: null,
        cursor: start,
        lastErrors: [],
      } satisfies CycleState),
    );
    const last = catalogueUnits[start];
    if (last?.kind !== 'page') throw new Error('the catalogue ends with skill pages');
    let calls = 0;
    const onceThenLimited: Fetch = async () => {
      calls += 1;
      return calls === 1 ? page('a skill', 7) : new Response('slow down', { status: 429 });
    };
    const response = await handle(
      authorised('?all=1'),
      { FACTS: store, REFRESH_SECRET: 'yes' },
      onceThenLimited,
    );
    const body = (await response.json()) as { ran: number; state: CycleState };
    // Slice one read a page and hit the limit on the next; slice two read nothing and stopped the loop.
    expect(calls).toBe(3);
    expect(body.ran).toBe(0);
    expect(body.state.cursor).toBe(start + 1);
    const skills = JSON.parse(store.data.get('skills') ?? '{}') as Record<
      string,
      { installs: number }
    >;
    expect(skills[skillLabel(last.skill.repo, last.skill.skill)]?.installs).toBe(7);
  });

  test('an interval that is not a positive number falls back to a day', async () => {
    const store = memoryStore();
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const finished = {
      cycleStartedAt: twoHoursAgo,
      completedAt: twoHoursAgo,
      cursor: catalogueUnits.length,
      lastErrors: [],
    } satisfies CycleState;
    await store.put('state', JSON.stringify(finished));
    const idle = await handle(
      authorised(),
      { FACTS: store, REFRESH_SECRET: 'yes', REFRESH_EVERY_HOURS: 'soon' },
      limited,
    );
    expect(((await idle.json()) as { idle: boolean }).idle).toBe(true);
    const due = await handle(
      authorised(),
      { FACTS: store, REFRESH_SECRET: 'yes', REFRESH_EVERY_HOURS: '1' },
      limited,
    );
    const body = (await due.json()) as { idle: boolean; state: CycleState };
    expect(body.idle).toBe(false);
    expect(body.state.cursor).toBe(0);
  });
});
