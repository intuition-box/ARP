import { type DomainWords } from '@arp-protocol/core';

import aliasTable from '../../../data/catalogue/domain-aliases.json';

/**
 * The tree's labels and the alias table, for `resolveDomain` and `domainInText` (task 84, ADR `0155`).
 * Both are read on this machine; the words they are matched against never leave it.
 */
export function domainWords(tree: { subtree(label: string): string[] }, root = 'tool'): DomainWords {
  return { labels: tree.subtree(root), aliases: aliasTable.aliases as Record<string, string> };
}
