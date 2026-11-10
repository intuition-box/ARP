import { BECAUSE_LABEL, HAS_OUTCOME_LABEL, NEEDS_LABEL, WITH_LABEL } from '@arp-protocol/core';
import { describe, expect, it } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { bindingChain, type BindingClient } from '../src/binding-chain.js';
import { LINE_WORDS, lineWordAtomIds, lineWordIds } from '../src/line-words.js';
import { memoryFileCache } from '../src/pulse-cache.js';

const REGISTRY = '0xC165A2AD2E540A4069E02834009161E2b4490d5A';

function counting(owner: `0x${string}`, chainSays = false) {
  const asked = { ownerOf: 0, verify: 0 };
  const client: BindingClient = {
    readContract: async () => ((asked.ownerOf += 1), owner),
    verifyMessage: async () => ((asked.verify += 1), chainSays),
  };
  return { asked, chain: bindingChain(client) };
}

describe('bindingChain (task 113)', () => {
  it('asks the owner of one token once, however many proofs name it', async () => {
    const { asked, chain } = counting(REGISTRY);
    const agent = { chainId: 13579, registry: REGISTRY, agentId: 2n } as const;
    const owners = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(() => chain.ownerOf(agent)));
    expect(new Set(owners)).toEqual(new Set([REGISTRY]));
    expect(asked.ownerOf).toBe(1);
    await chain.ownerOf({ ...agent, agentId: 3n });
    expect(asked.ownerOf).toBe(2);
  });

  it('asks again after a failed read, rather than keeping the failure', async () => {
    let calls = 0;
    const chain = bindingChain({
      readContract: async () => {
        calls += 1;
        if (calls === 1) throw new Error('rpc down');
        return REGISTRY;
      },
      verifyMessage: async () => false,
    });
    const agent = { chainId: 13579, registry: REGISTRY, agentId: 2n } as const;
    await expect(chain.ownerOf(agent)).rejects.toThrow('rpc down');
    await expect(chain.ownerOf(agent)).resolves.toBe(REGISTRY);
  });

  it("recovers an EOA's signature without the chain, and asks the chain only for one that does not recover", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const signature = await account.signMessage({ message: 'bind https://node.example' });
    const { asked, chain } = counting(account.address, true);
    expect(await chain.verifyMessage({ chainId: 13579, address: account.address, message: 'bind https://node.example', signature })).toBe(true);
    expect(asked.verify).toBe(0);
    // A contract account's signature recovers to some other address: the chain decides (ERC-1271), here true.
    const other = privateKeyToAccount(generatePrivateKey()).address;
    expect(await chain.verifyMessage({ chainId: 13579, address: other, message: 'bind https://node.example', signature })).toBe(true);
    expect(asked.verify).toBe(1);
  });

  it('still refuses a signature that neither recovers nor verifies on chain', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const signature = await account.signMessage({ message: 'one' });
    const { chain } = counting(account.address, false);
    expect(await chain.verifyMessage({ chainId: 13579, address: account.address, message: 'two', signature })).toBe(false);
  });
});

describe('lineWordIds (task 113)', () => {
  it('takes the four predicates from the graph by their data', () => {
    expect(LINE_WORDS).toEqual([HAS_OUTCOME_LABEL, BECAUSE_LABEL, NEEDS_LABEL, WITH_LABEL]);
    const found = new Map(LINE_WORDS.map((word, at) => [word, `0x${String(at + 1).repeat(64)}`]));
    expect(lineWordIds(found)).toEqual({
      hasOutcome: `0x${'1'.repeat(64)}`,
      because: `0x${'2'.repeat(64)}`,
      needs: `0x${'3'.repeat(64)}`,
      with: `0x${'4'.repeat(64)}`,
    });
  });

  it('gives a word the graph does not hold an id no triple carries, so declarations are still read', () => {
    expect(lineWordIds(new Map()).hasOutcome).toBe(`0x${'0'.repeat(64)}`);
  });
});

describe('lineWordAtomIds (task 113)', () => {
  it('asks again while a word is missing or a read failed, and keeps the pair once both exist', async () => {
    let asked = 0;
    const answers: (Map<string, string> | Error)[] = [
      new Error('graph down'),
      new Map([[HAS_OUTCOME_LABEL, '0xaa']]),
      new Map([[HAS_OUTCOME_LABEL, '0xaa'], [BECAUSE_LABEL, '0xbb']]),
    ];
    const find = async () => {
      const next = answers[asked] ?? new Map();
      asked += 1;
      if (next instanceof Error) throw next;
      return next;
    };
    await expect(lineWordAtomIds('g', find)).rejects.toThrow('graph down');
    expect(await lineWordAtomIds('g', find)).toEqual({ hasOutcome: '0xaa', because: `0x${'0'.repeat(64)}` });
    expect(await lineWordAtomIds('g', find)).toEqual({ hasOutcome: '0xaa', because: '0xbb' });
    expect(await lineWordAtomIds('g', find)).toEqual({ hasOutcome: '0xaa', because: '0xbb' });
    expect(asked).toBe(3);
  });
});

describe('memoryFileCache (task 113)', () => {
  it('keeps a file ten minutes, then forgets it', () => {
    let now = 0;
    const cache = memoryFileCache(() => now);
    cache.set('a/b\nSKILL.md', 'text');
    cache.set('a/b\nmissing', null);
    expect(cache.get('a/b\nSKILL.md')).toBe('text');
    expect(cache.get('a/b\nmissing')).toBeNull();
    expect(cache.get('a/b\nnever')).toBeUndefined();
    now = 10 * 60_000;
    expect(cache.get('a/b\nSKILL.md')).toBeUndefined();
  });
});
