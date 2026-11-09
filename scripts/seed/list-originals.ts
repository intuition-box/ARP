/** List the originals of copied skills and file them at their copies' OASF node (task 79, ADR `0150`).
 *
 *      ARP_TARGET=testnet AGENT_ADDRESS=0x906f… bun run scripts/seed/list-originals.ts --json /tmp/originals.json
 *      bun run scripts/agent/agent-send-plan.ts --chain 13579 --plan /tmp/originals.json --execute
 *
 *  Plans and prints. **Signs nothing and sends nothing** (ADR `0038`). Run it after `oasf-tree.ts`'s
 *  `create.json` has landed: a tag needs its node's atom.
 *
 *  Reads `data/catalogue/skill-originals-13579.json`. For each original not yet listed, the same listing
 *  the sponsor makes (`planToolListing`: the skill's atom, its repository's, `source`), then one `has tag`
 *  at the node its copies already carry. The copies keep their tags; hiding them is the search's job.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { formatEther, stringToHex, type Hex } from 'viem';

import { normaliseCategoryLabel } from '../../packages/protocol/src/declare/category.js';
import { atomDataForUri, encodeCreateTriple, encodeDeposit, multiVaultReads } from '../../packages/protocol/src/declare/multivault.js';
import { normaliseToolUrl, toolAtomUri } from '../../packages/protocol/src/declare/tool-thing.js';
import { planToolListing } from '../../packages/protocol/src/sponsor/list-tool.js';
import { HAS_TAG } from '../../packages/protocol/src/sources/intuition/terms.js';

const json = process.argv[process.argv.indexOf('--json') + 1];
if (!process.argv.includes('--json') || json === undefined) {
  console.error('usage: --json <path>');
  process.exit(1);
}
if ((process.env['ARP_TARGET'] ?? 'testnet') !== 'testnet') {
  console.error('refusing: testnet 13579 only (task 79).');
  process.exit(1);
}
const attestor = process.env['AGENT_ADDRESS'] as Hex | undefined;
if (attestor === undefined) {
  console.error('AGENT_ADDRESS must be set: the attestor that signs the plan.');
  process.exit(1);
}
const chainId = 13579;

type Group = { skill: string; original: string; listed: boolean; oasfId: number; arpNode: string | null };
type OasfNode = { id: number; caption: string };
const groups = (JSON.parse(readFileSync('data/catalogue/skill-originals-13579.json', 'utf8')) as { groups: Group[] }).groups;
const oasf = new Map(
  (JSON.parse(readFileSync('data/catalogue/oasf-1.1.0-skills.json', 'utf8')) as { skills: OasfNode[] }).skills.map((n) => [n.id, n]),
);
const record = JSON.parse(readFileSync(`data/deployments/${chainId}.json`, 'utf8')) as {
  intuition: { multiVault: string };
  chain: { rpcUrl: string };
};
const multiVault = record.intuition.multiVault as Hex;
const { createPublicClient, http } = await import('viem');
const client = createPublicClient({ transport: http(process.env['INTUITION_RPC_URL'] ?? record.chain.rpcUrl) });
const reads = multiVaultReads({ address: multiVault, chainId, client });
const [tripleCost, minDeposit, curve] = await Promise.all([reads.tripleCost(), reads.minDeposit(), reads.defaultCurveId()]);
const tripleAssets = tripleCost + minDeposit;

type Call = { kind: string; chainId: number; to: Hex; value: string; data: Hex; why: string };
const listing: Call[] = [];
const tags: Call[] = [];
for (const g of groups.filter((x) => !x.listed)) {
  const plan = await planToolListing({ url: g.original, reads });
  for (const call of plan.calls) {
    listing.push({ kind: call.kind, chainId, to: multiVault, value: call.value.toString(), data: call.data, why: `list the original ${g.skill}: ${call.why}` });
  }
  const label = g.arpNode === 'design' ? 'design' : normaliseCategoryLabel((oasf.get(g.oasfId) as OasfNode).caption);
  const nodeId = await reads.atomId(stringToHex(label));
  if (!(await reads.termExists(nodeId))) throw new Error(`the node "${label}" is not on chain yet: send oasf-tree.ts's create.json first`);
  const skillId = await reads.atomId(atomDataForUri(toolAtomUri(normaliseToolUrl(g.original))));
  const tagId = await reads.tripleId(skillId, HAS_TAG, nodeId);
  if (!(await reads.termExists(tagId))) {
    tags.push({ kind: 'create-triple', chainId, to: multiVault, value: tripleAssets.toString(), data: encodeCreateTriple(skillId, HAS_TAG, nodeId, tripleAssets), why: `${g.skill} (original) has tag ${label}` });
  } else if ((await reads.sharesOf(attestor, tagId, curve)) === 0n) {
    tags.push({ kind: 'deposit', chainId, to: multiVault, value: minDeposit.toString(), data: encodeDeposit(attestor, tagId, curve, 0n), why: `${g.skill} (original) has tag ${label}: stand behind it` });
  }
}
const calls = [...listing, ...tags];
writeFileSync(json, JSON.stringify(calls, null, 2));
console.log(`${listing.length} listing calls + ${tags.length} tags = ${calls.length}, ${formatEther(calls.reduce((s, c) => s + BigInt(c.value), 0n))} tTRUST`);
export {};
