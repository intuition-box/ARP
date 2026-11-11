/** Every term a line is written with, read from the chain, for `docs/34_ARP_AS_A_SIGNAL_GENERATOR.md` (task 134).
 *
 *      bun run scripts/measure/signal-generator-terms.ts > data/measurements/signal-generator-terms-<date>.json
 *
 *  Two kinds of term. A **word** is a plain-string atom whose id follows from its bytes: the script asks the
 *  MultiVault for `calculateAtomId(stringToHex(word))` on each chain, the same call the planners make
 *  (`packages/protocol/src/declare/usage-context.ts`), then asks the indexer whether that term exists, its
 *  label, and how many triples use it as predicate and as object. A **constant** is a frozen id the code
 *  writes with (`terms.ts`, `data/deployments/13579.json`); the script reads it by id the same way.
 *
 *  Two chains, two columns, never summed (`claims.md` check 2). Read-only: an `eth_call` and GraphQL reads,
 *  nothing signed or sent.
 */
import {createPublicClient, http, stringToHex, type Hex} from "viem";

import deployment1155 from "../../data/deployments/1155.json";
import deployment13579 from "../../data/deployments/13579.json";
import {
    AI_AGENT,
    HAS_TAG,
    HAS_TYPE,
    IS_A_SUB_DOMAIN_OF,
    MCP_SERVER_TYPE,
    SAME_AS,
    SKILL_TYPE,
    USES,
    VERSION,
} from "../../packages/protocol/src/sources/intuition/terms.ts";

/** The words a line and its vocabulary are written with: labels from the code, not typed here from memory. */
const WORDS: {word: string; role: string; source: string}[] = [
    {word: "has outcome", role: "predicate, T3", source: "declare/usage-words.ts HAS_OUTCOME_LABEL"},
    {word: "because", role: "predicate, T4", source: "declare/usage-words.ts BECAUSE_LABEL"},
    {word: "needs", role: "predicate, (reason, needs, name)", source: "declare/line-need.ts NEEDS_LABEL"},
    {word: "with", role: "predicate, (outcome, with, name) on a worked line", source: "declare/line-need.ts WITH_LABEL"},
    {word: "paid with", role: "predicate, on the outcome", source: "x402-payment.ts PAID_WITH_LABEL"},
    {word: "has evidence", role: "predicate, on the outcome", source: "line-evidence.ts HAS_EVIDENCE_LABEL"},
    {word: "version", role: "predicate, V = (skill, version, sha256:<digest>)", source: "terms.ts VERSION"},
    {word: "worked", role: "object of has outcome", source: "declare/usage-words.ts USAGE_OUTCOMES"},
    {word: "failed", role: "object of has outcome", source: "declare/usage-words.ts USAGE_OUTCOMES"},
    {word: "missing-key", role: "object of because", source: "declare/usage-words.ts USAGE_REASONS"},
    {word: "missing-program", role: "object of because", source: "declare/usage-words.ts USAGE_REASONS"},
    {word: "missing-file", role: "object of because", source: "declare/usage-words.ts USAGE_REASONS"},
    {word: "not-the-right-tool", role: "object of because", source: "declare/usage-words.ts USAGE_REASONS"},
    {word: "no-delivery", role: "object of because", source: "declare/usage-words.ts USAGE_REASONS"},
    {word: "tool", role: "root of the domain tree", source: "apps/mcp/src/config.ts DOMAIN_ROOT"},
];

const CONSTANTS: {name: string; id: Hex; role: string; source: string}[] = [
    {name: "uses", id: USES, role: "predicate, T1", source: "terms.ts USES"},
    {name: "in context of (13579)", id: deployment13579.arp.endpointBinding.inContextOf as Hex, role: "predicate, T2", source: "data/deployments/13579.json"},
    {name: "has type", id: HAS_TYPE, role: "predicate, (subject, has type, type)", source: "terms.ts HAS_TYPE"},
    {name: "Skill", id: SKILL_TYPE, role: "type atom", source: "terms.ts SKILL_TYPE"},
    {name: "MCP Server", id: MCP_SERVER_TYPE, role: "type atom", source: "terms.ts MCP_SERVER_TYPE"},
    {name: "AIAgent", id: AI_AGENT, role: "type atom", source: "terms.ts AI_AGENT"},
    {name: "version", id: VERSION, role: "predicate", source: "terms.ts VERSION"},
    {name: "has tag", id: HAS_TAG, role: "predicate, (skill, has tag, domain)", source: "terms.ts HAS_TAG"},
    {name: "is a sub-domain of", id: IS_A_SUB_DOMAIN_OF, role: "predicate, (child, is a sub-domain of, parent)", source: "terms.ts IS_A_SUB_DOMAIN_OF"},
    {name: "same as", id: SAME_AS, role: "predicate, agent atom to its ERC-8004 identity", source: "terms.ts SAME_AS"},
];

const ABI = [
    {type: "function", name: "calculateAtomId", stateMutability: "pure", inputs: [{name: "data", type: "bytes"}], outputs: [{type: "bytes32"}]},
] as const;

const TERM = `query T($id: String!) {
  atoms(where: {term_id: {_eq: $id}}) { term_id label data type }
  triples(where: {term_id: {_eq: $id}}) { term_id }
  asPredicate: triples_aggregate(where: {predicate_id: {_eq: $id}}) { aggregate { count } }
  asObject: triples_aggregate(where: {object_id: {_eq: $id}}) { aggregate { count } }
}`;

type TermRead = {
    atoms: {term_id: string; label: string | null; data: string | null; type: string}[];
    asPredicate: {aggregate: {count: number}};
    asObject: {aggregate: {count: number}};
};

async function ask<T>(url: string, query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({query, variables}),
        signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.json()) as {data?: T; errors?: unknown}; // Hasura's envelope
    if (body.data === undefined) throw new Error(`${url}: ${JSON.stringify(body.errors)}`);
    return body.data;
}

async function read(graphql: string, id: Hex) {
    const term = await ask<TermRead>(graphql, TERM, {id});
    const atom = term.atoms[0];
    return {
        exists: atom !== undefined,
        label: atom?.label ?? null,
        type: atom?.type ?? null,
        triplesAsPredicate: term.asPredicate.aggregate.count,
        triplesAsObject: term.asObject.aggregate.count,
    };
}

const chains = [
    {chainId: deployment13579.chain.chainId, rpc: deployment13579.chain.rpcUrl, graphql: deployment13579.chain.graphqlUrl, multiVault: deployment13579.intuition.multiVault as Hex},
    {chainId: deployment1155.chain.chainId, rpc: deployment1155.chain.rpcUrl, graphql: deployment1155.chain.graphqlUrl, multiVault: deployment1155.intuition.multiVault as Hex},
];

const words = [];
for (const entry of WORDS) {
    const row: Record<string, unknown> = {...entry};
    for (const chain of chains) {
        const client = createPublicClient({transport: http(chain.rpc)});
        const id = await client.readContract({address: chain.multiVault, abi: ABI, functionName: "calculateAtomId", args: [stringToHex(entry.word)]});
        row[String(chain.chainId)] = {termId: id, ...(await read(chain.graphql, id))};
    }
    words.push(row);
}

const constants = [];
for (const entry of CONSTANTS) {
    const row: Record<string, unknown> = {...entry};
    for (const chain of chains) row[String(chain.chainId)] = await read(chain.graphql, entry.id);
    constants.push(row);
}

// `in context of` is a pinned Thing whose id differs by chain (`data/deployments/13579.json`'s note): every atom with
// the label, on each chain, so a port to 1155 reads its id rather than copying 13579's.
const BY_LABEL = `query L($label: String!) {
  atoms(where: {label: {_eq: $label}}) { term_id type as_predicate_triples_aggregate { aggregate { count } } }
}`;
const byLabel: Record<string, unknown> = {};
for (const chain of chains) {
    const {atoms} = await ask<{atoms: {term_id: string; type: string; as_predicate_triples_aggregate: {aggregate: {count: number}}}[]}>(chain.graphql, BY_LABEL, {label: "in context of"});
    byLabel[String(chain.chainId)] = atoms.map((atom) => ({termId: atom.term_id, type: atom.type, triplesAsPredicate: atom.as_predicate_triples_aggregate.aggregate.count}));
}

console.log(
    JSON.stringify({at: new Date().toISOString(), chains: chains.map(({chainId, graphql, multiVault}) => ({chainId, graphql, multiVault})), words, constants, inContextOfByLabel: byLabel}, null, 2),
);
