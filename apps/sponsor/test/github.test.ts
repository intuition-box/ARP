import { afterEach, describe, expect, it, mock } from 'bun:test';

import { resolveOnGitHub, resolveOnGitHubCached, skillDigestOnGitHub, skillMarkdownOnGitHub } from '../src/github.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** GitHub as far as the repository read: a tree read after it would mean the check let it through. */
function githubAnswers(repo: Record<string, unknown>): string[] {
  const asked: string[] = [];
  // A stand-in for `fetch`: only the two paths `resolveOnGitHub` asks for are reached.
  globalThis.fetch = mock(async (url: string | URL | Request) => {
    asked.push(String(url));
    return String(url).includes('/git/trees/')
      ? Response.json({ tree: [{ path: 'skills/thing/SKILL.md', type: 'blob', sha: 'abc' }] })
      : Response.json(repo);
  }) as unknown as typeof fetch;
  return asked;
}

describe('a repository that is not public', () => {
  it('is refused, even when a token can read it', async () => {
    const asked = githubAnswers({ full_name: 'acme/secret', private: true });
    const answer = await resolveOnGitHub('https://github.com/acme/secret?skill=thing', 'a-token');
    expect(answer).toEqual({ ok: false, reason: 'github.com/acme/secret is not public' });
    expect(asked.some((url) => url.includes('/git/trees/'))).toBe(false);
  });

  it('is refused when GitHub does not say it is public', async () => {
    githubAnswers({ full_name: 'acme/secret' });
    const answer = await resolveOnGitHub('https://github.com/acme/secret', 'a-token');
    expect(answer.ok).toBe(false);
  });

  it('lets a public repository through', async () => {
    githubAnswers({ full_name: 'acme/open', private: false });
    expect(await resolveOnGitHub('https://github.com/acme/open?skill=thing')).toEqual({
      ok: true,
      fullName: 'acme/open',
    });
  });
});

describe('skillMarkdownOnGitHub (task 97, ADR 0166)', () => {
  /** GitHub's tree and the raw file host, as far as this read reaches them. */
  const host = (tree: { path: string; type: string; sha: string }[], raw: (url: string) => Response) => {
    const asked: string[] = [];
    const fetchImpl = (async (url: string | URL | Request) => {
      asked.push(String(url));
      return String(url).includes('/git/trees/') ? Response.json({ tree }) : raw(String(url));
    }) as unknown as typeof fetch; // the two hosts this read asks
    return { asked, fetchImpl };
  };
  const TREE = [{ path: 'skills/cut-silences/SKILL.md', type: 'blob', sha: 'a' }];

  it('reads the SKILL.md the content server would serve', async () => {
    const { asked, fetchImpl } = host(TREE, () => new Response('needs ffmpeg'));
    const text = await skillMarkdownOnGitHub('https://github.com/acme/kit?skill=cut-silences', { fetch: fetchImpl, now: 1 });
    expect(text).toBe('needs ffmpeg');
    expect(asked[1]).toBe('https://raw.githubusercontent.com/acme/kit/HEAD/skills/cut-silences/SKILL.md');
  });

  it('is null for a repository URL, and for a skill the tree does not hold', async () => {
    const { asked, fetchImpl } = host(TREE, () => new Response('x'));
    expect(await skillMarkdownOnGitHub('https://github.com/acme/kit', { fetch: fetchImpl, now: 2 })).toBeNull();
    expect(asked).toHaveLength(0);
    expect(await skillMarkdownOnGitHub('https://github.com/acme/kit?skill=other', { fetch: fetchImpl, now: 3 })).toBeNull();
  });

  it('throws when GitHub does not answer, which says nothing about the skill', async () => {
    const { fetchImpl } = host(TREE, () => new Response('', { status: 500 }));
    await expect(skillMarkdownOnGitHub('https://github.com/acme/down?skill=cut-silences', { fetch: fetchImpl, now: 4 })).rejects.toThrow('HTTP 500');
  });
});

describe('resolveOnGitHub, the rest of its answers', () => {
  const answers = (repo: Response | (() => Response), tree?: () => Response) => {
    const asked: string[] = [];
    globalThis.fetch = mock(async (url: string | URL | Request) => {
      asked.push(String(url));
      if (String(url).includes('/git/trees/')) return (tree ?? (() => Response.json({ tree: [] })))();
      return typeof repo === 'function' ? repo() : repo.clone();
    }) as unknown as typeof fetch; // a stand-in for the two GitHub paths this read asks
    return asked;
  };

  it('passes a URL that is not on GitHub without asking anyone', async () => {
    const asked = answers(Response.json({}));
    expect(await resolveOnGitHub('https://tool.example/mcp')).toEqual({ ok: true });
    expect(asked).toHaveLength(0);
  });

  it('refuses a GitHub URL that names no repository, and one GitHub says does not exist', async () => {
    answers(new Response('', { status: 404 }));
    expect(await resolveOnGitHub('https://github.com/acme')).toEqual({
      ok: false,
      reason: 'https://github.com/acme names no repository',
    });
    expect(await resolveOnGitHub('https://github.com/acme/gone.git')).toEqual({
      ok: false,
      reason: 'github.com/acme/gone does not exist',
    });
  });

  it('throws on a rate limit or an answer with no full_name, which say nothing about the repository', async () => {
    answers(new Response('', { status: 403 }));
    await expect(resolveOnGitHub('https://github.com/acme/kit')).rejects.toThrow('HTTP 403');
    answers(Response.json({ private: false }));
    await expect(resolveOnGitHub('https://github.com/acme/kit')).rejects.toThrow('no full_name');
  });

  it('refuses a skill in an empty repository or one without its SKILL.md, and throws when the tree fails', async () => {
    const repo = () => Response.json({ full_name: 'acme/kit', private: false });
    answers(repo, () => new Response('', { status: 409 }));
    expect(await resolveOnGitHub('https://github.com/acme/kit?skill=thing')).toEqual({
      ok: false,
      reason: 'github.com/acme/kit is empty',
    });
    answers(repo, () => Response.json({ tree: [{ path: 'README.md', type: 'blob', sha: 'r' }] }));
    expect(await resolveOnGitHub('https://github.com/acme/kit?skill=thing')).toEqual({
      ok: false,
      reason: 'github.com/acme/kit has no SKILL.md for thing',
    });
    answers(repo, () => new Response('', { status: 500 }));
    await expect(resolveOnGitHub('https://github.com/acme/kit?skill=thing')).rejects.toThrow('HTTP 500');
  });

  it('sends the token as a bearer when there is one', async () => {
    const seen: (string | undefined)[] = [];
    globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
      seen.push((init?.headers as Record<string, string>).authorization); // a plain header record
      return Response.json({ full_name: 'acme/kit', private: false });
    }) as unknown as typeof fetch; // a stand-in for the repository read
    await resolveOnGitHub('https://github.com/acme/kit', 'a-token');
    await resolveOnGitHub('https://github.com/acme/kit', '');
    expect(seen).toEqual(['Bearer a-token', undefined]);
  });
});

describe('resolveOnGitHubCached', () => {
  it('asks GitHub once per URL for ten minutes, then again', async () => {
    let asked = 0;
    globalThis.fetch = mock(async () => {
      asked += 1;
      return Response.json({ full_name: 'acme/cached', private: false });
    }) as unknown as typeof fetch; // a stand-in for the repository read
    const url = 'https://github.com/acme/cached';
    expect(await resolveOnGitHubCached(url, 1_000)).toEqual({ ok: true, fullName: 'acme/cached' });
    expect(await resolveOnGitHubCached(url, 1_000 + 9 * 60_000)).toEqual({ ok: true, fullName: 'acme/cached' });
    expect(asked).toBe(1);
    await resolveOnGitHubCached(url, 1_000 + 11 * 60_000);
    expect(asked).toBe(2);
  });

  it('keeps no entry for a URL off GitHub, which costs no request', async () => {
    let asked = 0;
    globalThis.fetch = mock(async () => {
      asked += 1;
      return Response.json({});
    }) as unknown as typeof fetch; // would count any request made
    expect(await resolveOnGitHubCached('https://tool.example/mcp', 1)).toEqual({ ok: true });
    expect(asked).toBe(0);
  });

  it('forgets the oldest URL past a thousand entries', async () => {
    let asked = 0;
    globalThis.fetch = mock(async () => {
      asked += 1;
      return Response.json({ full_name: 'acme/many', private: false });
    }) as unknown as typeof fetch; // counts the repository reads
    const at = 50_000_000;
    for (let i = 0; i <= 1_000; i += 1) await resolveOnGitHubCached(`https://github.com/acme/many-${i}`, at);
    expect(asked).toBe(1_001);
    await resolveOnGitHubCached('https://github.com/acme/many-1000', at);
    expect(asked).toBe(1_001);
    await resolveOnGitHubCached('https://github.com/acme/many-0', at);
    expect(asked).toBe(1_002);
  });
});

describe('skillMarkdownOnGitHub, the rest', () => {
  it('is null when the tree is gone or the file is, throws when the raw host fails, and remembers', async () => {
    let raw: () => Response = () => new Response('', { status: 404 });
    let tree: () => Response = () => new Response('', { status: 404 });
    let asked = 0;
    const fetchImpl = (async (url: string | URL | Request) => {
      asked += 1;
      return String(url).includes('/git/trees/') ? tree() : raw();
    }) as unknown as typeof fetch; // the two hosts this read asks
    expect(await skillMarkdownOnGitHub('https://github.com/acme/m1?skill=s', { fetch: fetchImpl, now: 10 })).toBeNull();
    tree = () => Response.json({ tree: [{ path: 'skills/s/SKILL.md', type: 'blob', sha: 'a' }] });
    expect(await skillMarkdownOnGitHub('https://github.com/acme/m2?skill=s', { fetch: fetchImpl, now: 10 })).toBeNull();
    raw = () => new Response('', { status: 503 });
    await expect(skillMarkdownOnGitHub('https://github.com/acme/m3?skill=s', { fetch: fetchImpl, now: 10 })).rejects.toThrow('HTTP 503');
    tree = () => new Response('', { status: 500 });
    await expect(skillMarkdownOnGitHub('https://github.com/acme/m4?skill=s', { fetch: fetchImpl, now: 10 })).rejects.toThrow('HTTP 500');
    const before = asked;
    expect(await skillMarkdownOnGitHub('https://github.com/acme/m1?skill=s', { fetch: fetchImpl, now: 20 })).toBeNull();
    expect(asked).toBe(before);
  });
});

describe('skillDigestOnGitHub (task 127, ADR 0192)', () => {
  const SHA = 'a'.repeat(40);
  /** GitHub's commit and tree APIs and the raw host, for one skill directory. */
  const repository = (files: Record<string, string>, commit: () => Response = () => Response.json({ sha: SHA })) => {
    const asked: string[] = [];
    const fetchImpl = (async (url: string | URL | Request) => {
      const u = String(url);
      asked.push(u);
      if (u.endsWith('/commits/HEAD')) return commit();
      if (u.includes('/git/trees/'))
        return Response.json({
          tree: [
            ...Object.keys(files).map((path, i) => ({ path, type: 'blob', sha: `s${i}` })),
            { path: 'skills/thing', type: 'tree', sha: 't' },
          ],
        });
      const path = u.split(`/${SHA}/`)[1] ?? '';
      const text = files[decodeURIComponent(path)];
      return text === undefined ? new Response('', { status: 404 }) : new Response(text);
    }) as unknown as typeof fetch; // the three GitHub hosts this read asks
    return { asked, fetchImpl };
  };
  const SKILL = { 'skills/thing/SKILL.md': '# thing', 'skills/thing/run.sh': 'echo hi' };

  it('digests the skill directory at the commit HEAD names, and the digest follows the content', async () => {
    const one = repository(SKILL);
    const digest = await skillDigestOnGitHub('https://github.com/acme/d1?skill=thing', { fetch: one.fetchImpl, now: 1 });
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/);
    expect(one.asked.some((u) => u.includes(`/git/trees/${SHA}`))).toBe(true);
    const same = await skillDigestOnGitHub('https://github.com/acme/d2?skill=thing', {
      fetch: repository(SKILL).fetchImpl,
      now: 1,
    });
    expect(same).toBe(digest);
    const changed = await skillDigestOnGitHub('https://github.com/acme/d3?skill=thing', {
      fetch: repository({ ...SKILL, 'skills/thing/run.sh': 'echo bye' }).fetchImpl,
      now: 1,
    });
    expect(changed).not.toBe(digest);
  });

  it('is null for a URL that names no skill, a repository with no commit, or a skill it does not hold', async () => {
    const none = repository(SKILL);
    expect(await skillDigestOnGitHub('https://github.com/acme/d4', { fetch: none.fetchImpl, now: 1 })).toBeNull();
    expect(none.asked).toHaveLength(0);
    const empty = repository(SKILL, () => new Response('', { status: 409 }));
    expect(await skillDigestOnGitHub('https://github.com/acme/d5?skill=thing', { fetch: empty.fetchImpl, now: 1 })).toBeNull();
    const other = repository(SKILL);
    expect(await skillDigestOnGitHub('https://github.com/acme/d6?skill=missing', { fetch: other.fetchImpl, now: 1 })).toBeNull();
  });

  it('throws when GitHub fails or names no commit, and remembers an answer for ten minutes', async () => {
    const down = repository(SKILL, () => new Response('', { status: 500 }));
    await expect(skillDigestOnGitHub('https://github.com/acme/d7?skill=thing', { fetch: down.fetchImpl, now: 1 })).rejects.toThrow('HTTP 500');
    const odd = repository(SKILL, () => Response.json({ sha: 'not-a-sha' }));
    await expect(skillDigestOnGitHub('https://github.com/acme/d8?skill=thing', { fetch: odd.fetchImpl, now: 1 })).rejects.toThrow('no commit');
    const once = repository(SKILL);
    const url = 'https://github.com/acme/d9?skill=thing';
    const first = await skillDigestOnGitHub(url, { fetch: once.fetchImpl, now: 1 });
    const count = once.asked.length;
    expect(await skillDigestOnGitHub(url, { fetch: once.fetchImpl, now: 2 })).toBe(first);
    expect(once.asked).toHaveLength(count);
  });
});
