import { type DomainWords } from '@arp-protocol/core';

import aliasTable from '../../../data/catalogue/domain-aliases.json';

/**
 * The tree's labels and the alias table, for `resolveDomain` and `domainInText` (task 84, ADR `0155`).
 * Both are read on this machine; the words they are matched against never leave it. The one exception is
 * ARP's hosted read-only endpoint: there this machine is ARP's, the words came from a caller who chose
 * it, and none is kept (ADR `0161`).
 */
export function domainWords(tree: { subtree(label: string): string[] }, root = 'tool'): DomainWords {
  return { labels: tree.subtree(root), aliases: aliasTable.aliases as Record<string, string> };
}
