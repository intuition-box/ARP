import { afterEach, describe, expect, it, mock } from 'bun:test';

import { resolveOnGitHub, skillMarkdownOnGitHub } from '../src/github.ts';

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
