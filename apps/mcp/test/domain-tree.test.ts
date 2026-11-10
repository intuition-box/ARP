import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config.js', () => ({ domainWalk: () => ({}) }));

const { searchDomainTree } = await import('../src/domain-tree.js');

type Tree = Awaited<ReturnType<typeof searchDomainTree>>;

describe('searchDomainTree (task 113)', () => {
  it('reads the tree once for five minutes, and again after a failure', async () => {
    let now = 0;
    let reads = 0;
    // A stand-in: only its identity is compared.
    const tree = { subtree: () => [], pathToRoot: () => ({ found: false, path: [] }) } as unknown as Tree;
    const fail = async (): Promise<Tree> => {
      reads += 1;
      throw new Error('graph down');
    };
    const read = async () => ((reads += 1), tree);
    await expect(searchDomainTree(() => now, fail)).rejects.toThrow('graph down');
    expect(await searchDomainTree(() => now, read)).toBe(tree);
    now = 4 * 60_000;
    expect(await searchDomainTree(() => now, read)).toBe(tree);
    expect(reads).toBe(2);
    now = 9 * 60_000 + 1;
    await searchDomainTree(() => now, read);
    expect(reads).toBe(3);
  });
});
