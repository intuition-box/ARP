/** Rebuild ARP's testnet domain tree on OASF 1.1.0 (task 79, ADR `0150`).
 *
 *      ARP_TARGET=testnet AGENT_ADDRESS=0x906f… bun run scripts/seed/oasf-tree.ts --out /tmp/oasf
 *      bun run scripts/agent/agent-send-plan.ts --chain 13579 --plan /tmp/oasf/create.json --execute
 *      bun run scripts/agent/agent-send-plan.ts --chain 13579 --plan /tmp/oasf/retire-<holder>.json --execute
 *
 *  Plans and prints. **Signs nothing and sends nothing** — `agent-send-plan.ts` is the only place in
 *  this repo that holds a key (ADR `0038`).
 *
 *  What it plans, from `data/catalogue/oasf-1.1.0-skills.json` and the reviewed
 *  `data/catalogue/oasf-skill-tags-proposal-13579.json`:
 *
 *    1. `create.json`: the atom of every OASF node that carries a skill, and of its ancestors (only
 *       those: the user's rule, 2026-11-09, so a node nobody uses costs nothing); the
 *       `is a sub-domain of` edge of each, up to `tool`; ARP's own `design` node under Web
 *       Development; then one `has tag` per skill at its node. An edge that already exists and that
 *       `AGENT_ADDRESS` holds no position on gets a `minDeposit` deposit instead, because the index
 *       reads positions, not triples (ADR `0124`).
 *    2. `retire-<holder>.json`, one per attestor: a redeem of every hierarchy or tag position the
 *       attestor holds that is not in the new tree. Intuition deletes nothing; redeeming takes the
 *       triple out of ARP's reading (`retire-domain-edge.ts`).
 *
 *  A node's atom is OASF's caption, normalised (`normaliseCategoryLabel`). The OASF id is not written on
 *  chain: the pinned file maps name to id (the user, 2026-11-09). Testnet 13579 only.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatEther, stringToHex, type Hex } from 'viem';

import { normaliseCategoryLabel } from '../../packages/protocol/src/declare/category.js';
import { atomDataForUri, encodeCreateAtom, encodeCreateTriple, encodeDeposit, encodeRedeem, multiVaultReads } from '../../packages/protocol/src/declare/multivault.js';
import { normaliseToolUrl, toolAtomUri } from '../../packages/protocol/src/declare/tool-thing.js';
import { ARP_DOMAIN_ATTESTORS } from '../../packages/protocol/src/arp/attestors.js';
import { HAS_TAG, IS_A_SUB_DOMAIN_OF } from '../../packages/protocol/src/sources/intuition/terms.js';

const ROOT = 'tool';
const DESIGN = { label: 'design', parentId: 602 };

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const out = arg('out');
if (out === undefined) {
  console.error('usage: --out <directory>');
  process.exit(1);
}
if ((process.env['ARP_TARGET'] ?? 'testnet') !== 'testnet') {
  console.error('refusing: this rewrite is for testnet 13579 only (task 79).');
  process.exit(1);
}
const attestor = process.env['AGENT_ADDRESS'] as Hex | undefined;
if (attestor === undefined || !ARP_DOMAIN_ATTESTORS.some((a) => a.toLowerCase() === attestor.toLowerCase())) {
  console.error('AGENT_ADDRESS must be one of ARP_DOMAIN_ATTESTORS: the address that signs create.json.');
  process.exit(1);
}
const chainId = 13579;

type OasfNode = { id: number; name: string; caption: string; parent: string | null };
type Proposed = { url: string; skill: string; oasfId: number; arpNode: string | null; reviewed?: string };
const oasf = (JSON.parse(readFileSync('data/catalogue/oasf-1.1.0-skills.json', 'utf8')) as { skills: OasfNode[] }).skills;
const proposal = (JSON.parse(readFileSync('data/catalogue/oasf-skill-tags-proposal-13579.json', 'utf8')) as { skills: Proposed[] }).skills;
const byId = new Map(oasf.map((n) => [n.id, n]));
const byName = new Map(oasf.map((n) => [n.name, n]));

const record = JSON.parse(readFileSync(`data/deployments/${chainId}.json`, 'utf8')) as {
  intuition: { multiVault: string; graphqlUrl?: string };
  chain: { rpcUrl: string };
};
const multiVault = record.intuition.multiVault as Hex;
const { createPublicClient, http } = await import('viem');
const client = createPublicClient({ transport: http(process.env['INTUITION_RPC_URL'] ?? record.chain.rpcUrl) });
const reads = multiVaultReads({ address: multiVault, chainId, client });
const [atomCost, tripleCost, minDeposit, curve] = await Promise.all([reads.atomCost(), reads.tripleCost(), reads.minDeposit(), reads.defaultCurveId()]);
const atomAssets = atomCost + minDeposit;
const tripleAssets = tripleCost + minDeposit;

// ---- 1. the nodes the skills need, and their edges ---------------------------------------------
const keep = proposal.filter((s) => s.reviewed !== 'skip');
const labelOf = (n: OasfNode) => normaliseCategoryLabel(n.caption);
const edges = new Map<string, string>(); // child label -> parent label
for (const s of keep) {
  let node: OasfNode | undefined = byId.get(s.oasfId);
  if (node === undefined) throw new Error(`${s.url}: OASF id ${s.oasfId} is not in the pin`);
  if (s.arpNode === 'design') edges.set(DESIGN.label, labelOf(byId.get(DESIGN.parentId) as OasfNode));
  while (node !== undefined) {
    const parent: OasfNode | undefined = node.parent === null ? undefined : byName.get(node.parent);
    edges.set(labelOf(node), parent === undefined ? ROOT : labelOf(parent));
    node = parent;
  }
}
const labels = new Set<string>([ROOT, ...edges.keys(), ...edges.values()]);

type Call = { kind: string; chainId: number; to: Hex; value: string; data: Hex; why: string };
const atoms: Call[] = [];
const triples: Call[] = [];
const deposits: Call[] = [];
const idOf = new Map<string, Hex>();
for (const label of [...labels].sort()) {
  const data = stringToHex(label);
  const id = await reads.atomId(data);
  idOf.set(label, id);
  if (!(await reads.termExists(id))) {
    atoms.push({ kind: 'create-atom', chainId, to: multiVault, value: atomAssets.toString(), data: encodeCreateAtom(data, atomAssets), why: `the node "${label}"` });
  }
}
const wanted = new Set<string>();
async function want(subject: Hex, predicate: Hex, object: Hex, why: string): Promise<void> {
  const id = await reads.tripleId(subject, predicate, object);
  // Two catalogue URLs can name one skill atom (azure-reliability did): plan each triple once.
  if (wanted.has(id.toLowerCase())) return;
  wanted.add(id.toLowerCase());
  if (!(await reads.termExists(id))) {
    triples.push({ kind: 'create-triple', chainId, to: multiVault, value: tripleAssets.toString(), data: encodeCreateTriple(subject, predicate, object, tripleAssets), why });
  } else if ((await reads.sharesOf(attestor as Hex, id, curve)) === 0n) {
    deposits.push({ kind: 'deposit', chainId, to: multiVault, value: minDeposit.toString(), data: encodeDeposit(attestor as Hex, id, curve, 0n), why: `${why}: exists, the attestor stands behind it` });
  }
}
for (const [child, parent] of edges) {
  await want(idOf.get(child) as Hex, IS_A_SUB_DOMAIN_OF, idOf.get(parent) as Hex, `${child} is a sub-domain of ${parent}`);
}

// ---- 2. one tag per skill, at its node ----------------------------------------------------------
let missingSkill = 0;
for (const s of keep) {
  const skillId = await reads.atomId(atomDataForUri(toolAtomUri(normaliseToolUrl(s.url))));
  if (!(await reads.termExists(skillId))) {
    missingSkill += 1;
    console.error(`  no atom for ${s.url}: not tagged`);
    continue;
  }
  const node = s.arpNode === 'design' ? DESIGN.label : labelOf(byId.get(s.oasfId) as OasfNode);
  await want(skillId, HAS_TAG, idOf.get(node) as Hex, `${s.skill} has tag ${node}`);
}

// ---- 3. what each attestor holds that the new tree does not ------------------------------------
const graphqlUrl = record.intuition.graphqlUrl ?? 'https://testnet.intuition.sh/v1/graphql';
const HELD = `query($who: [String!]!, $pids: [String!]!, $curveId: numeric!, $limit: Int!, $offset: Int!) {
  positions(where: {account_id: {_in: $who}, curve_id: {_eq: $curveId}, shares: {_gt: "0"}, term: {triple: {predicate_id: {_in: $pids}}}}, limit: $limit, offset: $offset, order_by: {id: asc}) {
    account_id shares term { triple { term_id predicate_id subject { label } object { label } } }
  }
}`;
type Held = { account_id: string; shares: string; term: { triple: { term_id: string; predicate_id: string; subject: { label: string | null }; object: { label: string | null } } } };
const held: Held[] = [];
// The index answers at most 100 rows a page whatever `limit` says: page by what came back.
const PAGE = 100;
for (let offset = 0; ; offset += PAGE) {
  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: HELD, variables: { who: [...ARP_DOMAIN_ATTESTORS], pids: [IS_A_SUB_DOMAIN_OF, HAS_TAG], curveId: curve.toString(), limit: PAGE, offset } }),
  });
  const body = (await res.json()) as { data?: { positions: Held[] }; errors?: unknown };
  if (body.data === undefined) throw new Error(`the index could not be read: ${JSON.stringify(body.errors)}`);
  held.push(...body.data.positions);
  if (body.data.positions.length < PAGE) break;
}
// The old tree's nodes: every label that is a child or parent of a hierarchy edge the attestors hold.
const oldNodes = new Set<string>();
for (const h of held) {
  if (h.term.triple.predicate_id.toLowerCase() !== IS_A_SUB_DOMAIN_OF.toLowerCase()) continue;
  oldNodes.add(h.term.triple.subject.label ?? '');
  oldNodes.add(h.term.triple.object.label ?? '');
}
const retire = new Map<string, Call[]>();
const unredeemable: { holder: string; id: string; what: string; error: string }[] = [];
for (const h of held) {
  const id = h.term.triple.term_id as Hex;
  if (wanted.has(id.toLowerCase())) continue;
  // Only the tree is rewritten: a hierarchy edge, or a tag onto a node of the old tree. Other tags the
  // attestors hold (`maintained`, from `record-maintained.ts`) are not the tree's and stay.
  const isEdge = h.term.triple.predicate_id.toLowerCase() === IS_A_SUB_DOMAIN_OF.toLowerCase();
  if (!isEdge && !oldNodes.has(h.term.triple.object.label ?? '')) continue;
  const holder = h.account_id as Hex;
  const shares = BigInt(h.shares);
  const what = `${h.term.triple.subject.label} — ${h.term.triple.predicate_id === IS_A_SUB_DOMAIN_OF ? 'is a sub-domain of' : 'has tag'} — ${h.term.triple.object.label}`;
  let preview;
  try {
    preview = await reads.previewRedeem(id, curve, shares);
  } catch (error) {
    // A vault that would fall below its minimum shares, or any other revert: listed, not planned.
    unredeemable.push({ holder, id, what, error: String(error instanceof Error ? error.message.split('\n')[0] : error) });
    continue;
  }
  retire.set(holder, [...(retire.get(holder) ?? []), { kind: 'redeem', chainId, to: multiVault, value: '0', data: encodeRedeem(holder, id, curve, shares, preview.assetsAfterFees), why: `retire ${what}` }]);
}

// ---- write -------------------------------------------------------------------------------------
mkdirSync(out, { recursive: true });
const create = [...atoms, ...triples, ...deposits];
writeFileSync(join(out, 'create.json'), JSON.stringify(create, null, 2));
const total = create.reduce((sum, c) => sum + BigInt(c.value), 0n);
console.log(`nodes ${labels.size} (${edges.size} edges), skills ${keep.length} (${missingSkill} without an atom)`);
console.log(`create.json: ${atoms.length} atoms + ${triples.length} triples + ${deposits.length} deposits = ${create.length} calls, ${formatEther(total)} tTRUST, signed by ${attestor}`);
writeFileSync(join(out, 'unredeemable.json'), JSON.stringify(unredeemable, null, 2));
console.log(`old tree nodes: ${oldNodes.size}`);
console.log(`positions held by the attestors: ${held.length}; kept ${held.length - [...retire.values()].flat().length - unredeemable.length}; unredeemable ${unredeemable.length}`);
for (const [holder, calls] of retire) {
  writeFileSync(join(out, `retire-${holder.toLowerCase()}.json`), JSON.stringify(calls, null, 2));
  console.log(`retire-${holder.toLowerCase()}.json: ${calls.length} redeems, signed by ${holder}`);
}
export {};
