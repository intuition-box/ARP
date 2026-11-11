import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test';

import {
  categoryLog,
  categoryTree,
  compoundsFrom,
  lineSubjectCheck,
  lineToolUrl,
  toolCheck,
} from '../src/categories.ts';
import type { CategoryLogEntry } from '../src/routes/propose-category.ts';
import { restoreFetch, stubFetch } from './fetch-stub.ts';

const GRAPHQL = 'https://index.test/graphql';

afterEach(() => {
  restoreFetch();
  setSystemTime();
});

/** One hierarchy position as the indexer returns it when read through ARP's attestors. */
const edge = (id: string, child: string, parent: string) => ({
  shares: '1000',
  term: { triple: { term_id: id, subject: { label: child }, object: { label: parent } } },
});

describe('the category tree', () => {
  it('knows a category under the root, and a label that is only a parent', async () => {
    stubFetch(() =>
      Response.json({
        data: { positions: [edge('0x1', 'payment', 'tool'), edge('0x2', 'orphan', 'nowhere')] },
      }),
    );
    const tree = categoryTree(GRAPHQL);
    expect(await tree.isCategory('payment')).toBe(true);
    expect(await tree.isCategory('orphan')).toBe(false);
    expect(await tree.isKnown('nowhere')).toBe(true);
    expect(await tree.isKnown('video')).toBe(false);
  });

  it('is read again after a minute, or at once after invalidate', async () => {
    let reads = 0;
    stubFetch(() => {
      reads += 1;
      return Response.json({ data: { positions: [edge('0x1', 'payment', 'tool')] } });
    });
    setSystemTime(new Date('2026-11-11T00:00:00Z'));
    const tree = categoryTree(GRAPHQL);
    await tree.isCategory('payment');
    await tree.isKnown('payment');
    expect(reads).toBe(1);
    setSystemTime(new Date('2026-11-11T00:01:01Z'));
    await tree.isCategory('payment');
    expect(reads).toBe(2);
    tree.invalidate();
    await tree.isCategory('payment');
    expect(reads).toBe(3);
  });

  it('refuses to answer from a truncated read', async () => {
    // Full pages forever: the hierarchy walk stops at its row ceiling and says so.
    let page = 0;
    stubFetch(() => {
      page += 1;
      const rows = Array.from({ length: 100 }, (_, i) =>
        edge(`0x${page}-${i}`, `c${page}-${i}`, 'tool'),
      );
      return Response.json({ data: { positions: rows } });
    });
    await expect(categoryTree(GRAPHQL).isCategory('payment')).rejects.toThrow('truncated');
  });
});

describe("a line's subject", () => {
  const atomWithUrl = (url: unknown) => () =>
    Response.json({ data: { atom: { value: { thing: url === undefined ? null : { url } } } } });

  it('reads the URL the index resolves for an atom, or null before it does', async () => {
    const asked = stubFetch(atomWithUrl('https://github.com/acme/kit'));
    expect(await lineToolUrl(GRAPHQL)('0xabc')).toBe('https://github.com/acme/kit');
    expect(asked[0]?.body).toMatchObject({ variables: { id: '0xabc' } });
    stubFetch(atomWithUrl(undefined));
    expect(await lineToolUrl(GRAPHQL)('0xabc')).toBeNull();
    stubFetch(() => new Response('', { status: 502 }));
    await expect(lineToolUrl(GRAPHQL)('0xabc')).rejects.toThrow('502');
  });

  it('is github for a GitHub URL, other for any other or a malformed one, unseen without one', async () => {
    stubFetch(atomWithUrl('https://github.com/acme/kit?skill=x'));
    expect(await lineSubjectCheck(GRAPHQL)('0x1')).toBe('github');
    stubFetch(atomWithUrl('https://agent.example/card'));
    expect(await lineSubjectCheck(GRAPHQL)('0x1')).toBe('other');
    stubFetch(atomWithUrl('not a url'));
    expect(await lineSubjectCheck(GRAPHQL)('0x1')).toBe('other');
    stubFetch(atomWithUrl(undefined));
    expect(await lineSubjectCheck(GRAPHQL)('0x1')).toBe('unseen');
  });
});

describe('whether an atom is a tool', () => {
  const atom = (type: string, url: string | null) => () =>
    Response.json({ data: { atom: { type, value: { thing: { url } } } } });

  it('is a Thing whose URL is a tool URL, and nothing else', async () => {
    stubFetch(atom('Thing', 'https://github.com/acme/kit'));
    expect(await toolCheck(GRAPHQL)('0x1')).toBe(true);
    stubFetch(atom('TextObject', 'https://github.com/acme/kit'));
    expect(await toolCheck(GRAPHQL)('0x1')).toBe(false);
    stubFetch(atom('Thing', null));
    expect(await toolCheck(GRAPHQL)('0x1')).toBe(false);
    stubFetch(atom('Thing', 'not a url'));
    expect(await toolCheck(GRAPHQL)('0x1')).toBe(false);
  });

  it('throws when the indexer fails', async () => {
    stubFetch(() => new Response('', { status: 500 }));
    await expect(toolCheck(GRAPHQL)('0x1')).rejects.toThrow('HTTP 500');
  });
});

describe('the files beside the tree', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'arp-sponsor-categories-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reads the allowed compounds with their reason, and none from a file without any', () => {
    const path = join(dir, 'domains.proposal.json');
    writeFileSync(
      path,
      JSON.stringify({ compounds: [{ label: 'motion design', why: 'no one word' }] }),
    );
    expect([...compoundsFrom(path)]).toEqual([['motion design', 'no one word']]);
    writeFileSync(path, '{}');
    expect(compoundsFrom(path).size).toBe(0);
  });

  it('appends one JSON line per proposal, readable by its owner only', () => {
    const path = join(dir, 'category-log.jsonl');
    const write = categoryLog(path);
    const entry: CategoryLogEntry = {
      at: 1,
      label: 'payment',
      parent: 'tool',
      newCategory: true,
      subjectId: `0x${'1'.repeat(64)}`,
      agent: null,
      reason: 'it fits',
      transactions: [],
      status: 'complete',
    };
    write(entry);
    write({ ...entry, at: 2 });
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    expect(lines.map((line) => (JSON.parse(line) as CategoryLogEntry).at)).toEqual([1, 2]);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });
});
