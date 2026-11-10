import { readDomainTree } from '@arp-protocol/core';

import { domainWalk } from './config.js';

type Tree = Awaited<ReturnType<typeof readDomainTree>>;

const TREE_TTL_MS = 5 * 60_000;
let kept: { at: number; tree: Promise<Tree> } | null = null;

/**
 * The domain tree for a search, read once and kept five minutes in this process (task 113): `arp_pulse` and the
 * agents beside it each read it, and four searches in a row read it four times. A failed read is not kept. The
 * paths that write under the tree (`arp line`, a declaration) read it fresh.
 */
export function searchDomainTree(now: () => number = Date.now, read: () => Promise<Tree> = () => readDomainTree(domainWalk())): Promise<Tree> {
  if (kept !== null && now() - kept.at < TREE_TTL_MS) return kept.tree;
  const tree = read();
  const entry = { at: now(), tree };
  kept = entry;
  tree.catch(() => {
    if (kept === entry) kept = null;
  });
  return tree;
}
