/** Build data/catalogue/skill-nodes-13579.json, the hook's local copy of the tree (task 84, ADR `0155`).
 *
 *      bun run scripts/build/build-skill-nodes.ts            # write
 *      bun run scripts/build/build-skill-nodes.ts --check    # exit 1 if the committed file differs
 *
 *  From data/catalogue/oasf-skill-tags-proposal-13579.json, rows not reviewed out: each skill's node (`design`
 *  for an ARP design row, else its OASF caption, normalised), and every node with its OASF ancestors, which is
 *  what task 79 wrote on testnet 13579. A skill name filed at two nodes is left out.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { normaliseCategoryLabel } from '../../packages/protocol/src/declare/category.js';

type OasfNode = { id: number; name: string; caption: string; parent: string | null };
type Row = { skill: string; oasfId: number; arpNode: string | null; reviewed?: string };
const PATH = 'data/catalogue/skill-nodes-13579.json';
const oasf = (JSON.parse(readFileSync('data/catalogue/oasf-1.1.0-skills.json', 'utf8')) as { skills: OasfNode[] }).skills;
const rows = (JSON.parse(readFileSync('data/catalogue/oasf-skill-tags-proposal-13579.json', 'utf8')) as { skills: Row[] }).skills;
const byId = new Map(oasf.map((n) => [n.id, n]));
const byName = new Map(oasf.map((n) => [n.name, n]));

const nodes = new Set<string>(['design']);
const names = new Map<string, Set<string>>();
for (const row of rows.filter((r) => r.reviewed !== 'skip')) {
  let node = byId.get(row.oasfId);
  if (node === undefined) throw new Error(`${row.skill}: OASF id ${row.oasfId} is not in the pin`);
  const label = row.arpNode === 'design' ? 'design' : normaliseCategoryLabel(node.caption);
  names.set(row.skill, new Set([...(names.get(row.skill) ?? []), label]));
  while (node !== undefined) {
    nodes.add(normaliseCategoryLabel(node.caption));
    node = node.parent === null ? undefined : byName.get(node.parent);
  }
}
const skills = Object.fromEntries(
  [...names].filter(([, labels]) => labels.size === 1).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([name, labels]) => [name, [...labels][0]]),
);
const doc = {
  _note: "For the hook's failure record, which reads no network (task 84): the nodes of ARP's testnet tree as written by task 79 (data/catalogue/oasf-tree-13579.json), and the node each skill name is filed at, when the name is filed at one node only. Built by scripts/build/build-skill-nodes.ts from data/catalogue/oasf-skill-tags-proposal-13579.json, rows not reviewed out.",
  chainId: 13579,
  oasfVersion: '1.1.0',
  nodes: [...nodes].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  skills,
};
const text = JSON.stringify(doc, null, 1);
if (process.argv.includes('--check')) {
  if (readFileSync(PATH, 'utf8') !== text) {
    console.error(`${PATH} differs from what the proposal builds: run without --check`);
    process.exit(1);
  }
  console.log(`${PATH} matches (${doc.nodes.length} nodes, ${Object.keys(skills).length} skills)`);
} else {
  writeFileSync(PATH, text);
  console.log(`${PATH}: ${doc.nodes.length} nodes, ${Object.keys(skills).length} skills`);
}
export {};
