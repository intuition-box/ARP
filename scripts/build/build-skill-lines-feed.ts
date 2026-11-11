/** Build the skill lines feed from testnet 13579 (task 102, ADR `0171`). Holds no key; reads only.
 *
 *      bun run scripts/build/build-skill-lines-feed.ts [--out apps/web/public/feeds/skill-lines.json]
 *
 *  Reads every `(agent, uses, tool)` edge on Intuition testnet 13579 whose tool is a skill
 *  (`github.com/<owner>/<repo>?skill=<name>`), then each line on it the way `arp_pulse` reads it
 *  (`getPulseUsage`): domain, outcome, reasons, `needs` and `with`. A domain must be a node of ARP's tree
 *  as read from the chain now, or it is written `null`. Schema: `/docs/skill-lines-feed`.
 *
 *  The file is a dated snapshot (ADR `0154`): rerun it to refresh. A failed read writes nothing.
 */
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname} from "node:path";

import {createGraphqlTransport, defaultFetch, isRecord, readRecord, readString} from "../../packages/graphql/src/index.ts";
import {stringToHex, type Hex} from "viem";

import deployment from "../../data/deployments/13579.json";
import testIdentities from "../../apps/web/src/data/arp-test-identities.json";
import {multiVaultReads} from "../../packages/protocol/src/declare/multivault.ts";
import {BECAUSE_LABEL, HAS_OUTCOME_LABEL} from "../../packages/protocol/src/declare/usage-context.ts";
import {NEEDS_LABEL, WITH_LABEL} from "../../packages/protocol/src/declare/line-need.ts";
import {
    ARP_DOMAIN_ATTESTORS,
    getPulseUsage,
    INTUITION_HAS_TAG_MAINNET,
    INTUITION_IS_A_SUB_DOMAIN_OF,
    INTUITION_USES_TERM_ID,
    INTUITION_VERSION_TERM_ID,
    readDomainTree,
    readThingUrl,
    skillRefFromUrl,
    type PulseUsage,
} from "../../packages/protocol/src/index.ts";
import {buildSkillLinesFeed} from "../../packages/protocol/src/skill-lines-feed.ts";

const at = process.argv.indexOf("--out");
const out = at === -1 ? "apps/web/public/feeds/skill-lines.json" : (process.argv[at + 1] ?? "");
if (out === "") {
    console.error("--out takes a path");
    process.exit(1);
}

const graphqlUrl = deployment.chain.graphqlUrl;
const transport = createGraphqlTransport({url: graphqlUrl, fetch: defaultFetch(), timeoutMs: 20_000});
const reads = multiVaultReads({address: deployment.intuition.multiVault as Hex, chainId: deployment.chain.chainId, rpcUrl: deployment.chain.rpcUrl}); // an address in this repo's record
const [hasOutcome, because, needs, withAtom] = await Promise.all(
    [HAS_OUTCOME_LABEL, BECAUSE_LABEL, NEEDS_LABEL, WITH_LABEL].map((label) => reads.atomId(stringToHex(label))),
);

// Every `uses` edge, paged, so a skill is found whether or not it is in ARP's catalogue.
const PAGE = 250;
const USES_EDGES = `query($p: String!, $l: Int!, $o: Int!) { triples(where: {predicate_id: {_eq: $p}}, order_by: {term_id: asc}, limit: $l, offset: $o) { object { term_id label data } } }`;
const objects = new Map<string, {label: string | null; data: string | null}>();
for (let offset = 0; ; offset += PAGE) {
    const data = await transport.request(USES_EDGES, {p: INTUITION_USES_TERM_ID, l: PAGE, o: offset});
    const rows = Array.isArray(data["triples"]) ? data["triples"].filter(isRecord) : [];
    for (const row of rows) {
        const object = readRecord(row, "object");
        const id = object === null ? null : readString(object, "term_id");
        if (object !== null && id !== null) objects.set(id.toLowerCase(), {label: readString(object, "label"), data: readString(object, "data")});
    }
    if (rows.length < PAGE) break;
}

// A skill atom's label is its URL without the scheme; one whose label failed to resolve reads its document.
const tools: {atomId: string; url: string}[] = [];
for (const [atomId, {label, data}] of objects) {
    const fromLabel = label !== null && label.includes("?skill=") ? `https://${label.replace(/^https?:\/\//, "")}` : null;
    const url = fromLabel ?? (label === "Unknown" && data !== null ? await readThingUrl(data) : null);
    if (url !== null && skillRefFromUrl(url) !== null) tools.push({atomId, url});
}

const payers = [deployment.arp.deployer, deployment.arp.sponsor];
const usage = new Map<string, PulseUsage>();
// Small batches, so no read reaches the index's 250-row ceiling unseen (`getPulseUsage` flags it anyway).
for (let index = 0; index < tools.length; index += 20) {
    const batch = await getPulseUsage(
        tools.slice(index, index + 20).map((tool) => tool.atomId),
        // `version`: a line on a version of a skill is a line about the skill (ADR `0192`).
        {graphqlUrl, inContextOf: deployment.arp.endpointBinding.inContextOf, hasOutcome, because, needs, with: withAtom, version: INTUITION_VERSION_TERM_ID, payers, transport},
    );
    for (const [key, value] of batch) usage.set(key, value);
}

const tree = await readDomainTree({
    graphqlUrl,
    hierarchyPredicate: INTUITION_IS_A_SUB_DOMAIN_OF,
    tagPredicate: INTUITION_HAS_TAG_MAINNET,
    root: "tool",
    attestor: ARP_DOMAIN_ATTESTORS,
    transport,
});
if (tree.truncated) throw new Error("the domain tree read was cut; refusing to write a feed that would null real domains");

const feed = buildSkillLinesFeed({
    tools,
    usage,
    domains: new Set(["tool", ...tree.subtree("tool")]),
    payers,
    arpWallets: [...payers, ...testIdentities.addresses.map((row) => row.address)],
    testAgents: {chainId: testIdentities.chainId, from: testIdentities.agents.from, to: testIdentities.agents.to},
    trace: {chain: `eip155:${deployment.chain.chainId}`, graphql: graphqlUrl},
    generatedAt: new Date().toISOString(),
});

mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, `${JSON.stringify(feed, null, 1)}\n`);
const lines = feed.skills.reduce((sum, skill) => sum + skill.lines.length, 0);
const outside = feed.skills.reduce((sum, skill) => sum + skill.lines.filter((line) => !line.arp_test).length, 0);
console.log(`${feed.skills.length} skills, ${lines} lines (${outside} not ARP's tests), ${feed.skipped.count} skipped, truncated ${feed.truncated}: ${out}`);
