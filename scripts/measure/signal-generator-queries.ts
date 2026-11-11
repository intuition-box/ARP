/** The GraphQL queries `docs/34_ARP_AS_A_SIGNAL_GENERATOR.md` offers an adapter author, run against testnet 13579 (task 134).
 *
 *      bun run scripts/measure/signal-generator-queries.ts > data/measurements/signal-generator-queries-<date>.txt
 *
 *  Each query is printed as the document quotes it, then what the indexer answered, shortened to what the
 *  document cites. The term ids are the ones `scripts/measure/signal-generator-terms.ts` read from the chain;
 *  they are imported from the code here, not retyped, except the plain-string words, which are computed by the
 *  MultiVault exactly as a writer computes them. Read-only: `eth_call` and GraphQL, nothing signed or sent.
 *
 *  `claims.md` check 6: a reader who runs this gets the figures the document prints, on the date it prints.
 */
import {stringToHex, type Hex} from "viem";

import deployment from "../../data/deployments/13579.json";
import testIdentities from "../../apps/web/src/data/arp-test-identities.json";
import {ARP_DOMAIN_ATTESTORS} from "../../packages/protocol/src/arp/attestors.ts";
import {multiVaultReads} from "../../packages/protocol/src/declare/multivault.ts";
import {
    HAS_TYPE,
    IS_A_SUB_DOMAIN_OF,
    SKILL_TYPE,
    USES,
    VERSION,
} from "../../packages/protocol/src/sources/intuition/terms.ts";

const GRAPHQL = deployment.chain.graphqlUrl;
const IN_CONTEXT_OF = deployment.arp.endpointBinding.inContextOf as Hex;
const reads = multiVaultReads({address: deployment.intuition.multiVault as Hex, chainId: 13579, rpcUrl: deployment.chain.rpcUrl}); // this repo's record
const word = (label: string) => reads.atomId(stringToHex(label));
const [HAS_OUTCOME, BECAUSE, WITH, PAID_WITH, HAS_EVIDENCE] = await Promise.all(
    ["has outcome", "because", "with", "paid with", "has evidence"].map(word),
);

async function ask<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(GRAPHQL, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({query, variables}),
        signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.json()) as {data?: T; errors?: unknown}; // Hasura's envelope
    if (body.data === undefined) throw new Error(`${GRAPHQL}: ${JSON.stringify(body.errors)}`);
    return body.data;
}

const print = (title: string, query: string, variables: Record<string, unknown>, answer: unknown) => {
    console.log(`### ${title}\n\n${query}\n\nvariables: ${JSON.stringify(variables)}\n\nanswer:\n${JSON.stringify(answer, null, 1)}\n`);
};

console.log(`# signal-generator-queries, ${new Date().toISOString()}, ${GRAPHQL}\n`);

const ARP_WALLETS = new Set(ARP_DOMAIN_ATTESTORS.map((wallet) => wallet.toLowerCase()));
const AGENT = /^Agent 13579:([0-9]+)$/;
const isTestAgent = (label: string | null | undefined) => {
    const match = label === null || label === undefined ? null : AGENT.exec(label);
    return match !== null && Number(match[1]) >= testIdentities.agents.from && Number(match[1]) <= testIdentities.agents.to;
};

// 1. Every outcome, walked back to its T1.
const Q_OUTCOMES = `query Outcomes($hasOutcome: String!) {
  triples(where: {predicate_id: {_eq: $hasOutcome}}, order_by: {created_at: asc}) {
    term_id created_at creator_id
    object { label }
    subject_term { triple {
      term_id predicate { label } object { label }
      subject { label }
      subject_term { triple { term_id subject { label } predicate { label } object { label } } }
    } }
    positions(where: {shares: {_gt: "0"}}) { account_id }
  }
}`;
type Leg = {term_id: string; predicate: {label: string}; object: {label: string}; subject?: {label: string} | null};
type Outcome = {
    term_id: string;
    created_at: string;
    creator_id: string;
    object: {label: string};
    subject_term: {triple: (Leg & {subject_term: {triple: Leg | null} | null}) | null} | null;
    positions: {account_id: string}[];
};
const outcomes = (await ask<{triples: Outcome[]}>(Q_OUTCOMES, {hasOutcome: HAS_OUTCOME})).triples;
const flat = outcomes.map((row) => {
    const above = row.subject_term?.triple ?? null;
    const t1 = above?.predicate.label === "uses" ? above : (above?.subject_term?.triple ?? null);
    const domain = above?.predicate.label === "in context of" ? above.object.label : null;
    return {
        outcome_term: row.term_id,
        at: row.created_at,
        agent: t1?.subject?.label ?? null,
        tool: t1?.object.label ?? null,
        domain,
        outcome: row.object.label,
        creator_is_arp: ARP_WALLETS.has(row.creator_id.toLowerCase()),
        holders: row.positions.map((position) => position.account_id),
        agent_is_arp_test: isTestAgent(t1?.subject?.label),
    };
});
print("1. Every line's outcome, walked back to T1", Q_OUTCOMES, {hasOutcome: HAS_OUTCOME}, {
    count: flat.length,
    created_by_an_arp_wallet: flat.filter((row) => row.creator_is_arp).length,
    about_an_arp_test_agent: flat.filter((row) => row.agent_is_arp_test).length,
    lines: flat,
});

// 2. What hangs below one T1, one level at a time.
const t1 = outcomes.find((row) => row.subject_term?.triple?.predicate.label === "in context of")?.subject_term?.triple?.subject_term?.triple?.term_id;
const Q_BELOW = `query Below($terms: [String!]!) {
  triples(where: {subject_id: {_in: $terms}}) {
    term_id subject_id predicate { term_id label } object { label }
    positions(where: {shares: {_gt: "0"}}) { account_id }
  }
}`;
const walk: unknown[] = [];
let level = t1 === undefined ? [] : [t1];
for (let depth = 0; depth < 5 && level.length > 0; depth++) {
    const rows = (await ask<{triples: {term_id: string; subject_id: string; predicate: {term_id: string; label: string}; object: {label: string}; positions: {account_id: string}[]}[]}>(Q_BELOW, {terms: level})).triples;
    walk.push({depth: depth + 2, rows: rows.map((row) => ({term_id: row.term_id, about: row.subject_id, predicate: row.predicate.label, predicate_id: row.predicate.term_id, object: row.object.label, holders: row.positions.length}))});
    level = rows.map((row) => row.term_id);
}
print("2. One line read forward from its T1", Q_BELOW, {terms: [t1]}, walk);

// 3. Versioned uses, and content-receipt evidence: the 0.0.6 shapes.
const Q_V = `query Versioned($uses: String!, $version: String!, $hasEvidence: String!) {
  versioned: triples_aggregate(where: {predicate_id: {_eq: $uses}, object_term: {triple: {predicate_id: {_eq: $version}}}}) { aggregate { count } }
  versions: triples_aggregate(where: {predicate_id: {_eq: $version}, object: {label: {_like: "sha256:%"}}}) { aggregate { count } }
  receipts: triples_aggregate(where: {predicate_id: {_eq: $hasEvidence}, object: {label: {_like: "content-receipt:%"}}}) { aggregate { count } }
  evidenceAny: triples_aggregate(where: {predicate_id: {_eq: $hasEvidence}}) { aggregate { count } }
}`;
print("3. Versioned lines and receipt evidence", Q_V, {uses: USES, version: VERSION, hasEvidence: HAS_EVIDENCE}, await ask(Q_V, {uses: USES, version: VERSION, hasEvidence: HAS_EVIDENCE}));

// 4. Lines that name a payment.
const Q_PAID = `query Paid($paidWith: String!) {
  triples(where: {predicate_id: {_eq: $paidWith}}, order_by: {created_at: asc}) {
    term_id created_at subject_id object { label }
    positions(where: {shares: {_gt: "0"}}) { account_id }
  }
}`;
print("4. Lines that name a payment", Q_PAID, {paidWith: PAID_WITH}, await ask(Q_PAID, {paidWith: PAID_WITH}));

// 5. Reasons and named needs: on ARP's lines (their subject is an outcome from query 1), then every use of the word.
// The words are plain strings, so anybody else's triple with the same word shares its id: a reader keys on the
// structure, never on the predicate alone.
const NEEDS = await word("needs");
const Q_WHY = `query Why($because: String!, $with: String!, $needs: String!, $outcomes: [String!]!) {
  because: triples(where: {predicate_id: {_eq: $because}, subject_id: {_in: $outcomes}}) { object { label } }
  with: triples(where: {predicate_id: {_eq: $with}, subject_id: {_in: $outcomes}}) { object { label } }
  needs: triples_aggregate(where: {predicate_id: {_eq: $needs}}) { aggregate { count } }
  becauseAnywhere: triples_aggregate(where: {predicate_id: {_eq: $because}}) { aggregate { count } }
  withAnywhere: triples_aggregate(where: {predicate_id: {_eq: $with}}) { aggregate { count } }
}`;
type Row = {object: {label: string} | null};
const outcomeTerms = outcomes.map((row) => row.term_id);
const whyVars = {because: BECAUSE, with: WITH, needs: NEEDS, outcomes: outcomeTerms};
const why = await ask<{because: Row[]; with: Row[]; needs: {aggregate: {count: number}}; becauseAnywhere: {aggregate: {count: number}}; withAnywhere: {aggregate: {count: number}}}>(Q_WHY, whyVars);
// An object that is a triple has no atom row: counted apart, never a label.
const tally = (rows: Row[]) =>
    rows.reduce<Record<string, number>>((all, row) => {
        const key = row.object?.label ?? "(object is a triple)";
        return {...all, [key]: (all[key] ?? 0) + 1};
    }, {});
print("5. Reasons and named needs on these lines, and every use of the same words", Q_WHY, {...whyVars, outcomes: `the ${outcomeTerms.length} outcome terms of query 1`}, {
    because_on_lines: tally(why.because),
    with_on_lines: tally(why.with),
    needs_anywhere: why.needs.aggregate.count,
    because_anywhere: why.becauseAnywhere.aggregate.count,
    with_anywhere: why.withAnywhere.aggregate.count,
});

// 6. The domain tree as ARP reads it: edges an ARP attestor holds a position on.
const Q_TREE = `query Tree($subDomainOf: String!, $attestors: [String!]!) {
  all: triples_aggregate(where: {predicate_id: {_eq: $subDomainOf}}) { aggregate { count } }
  attested: triples(where: {predicate_id: {_eq: $subDomainOf}, positions: {account_id: {_in: $attestors}, shares: {_gt: "0"}}}, limit: 1000) {
    subject { label } object { label }
  }
}`;
const tree = await ask<{all: {aggregate: {count: number}}; attested: {subject: {label: string}; object: {label: string}}[]}>(Q_TREE, {subDomainOf: IS_A_SUB_DOMAIN_OF, attestors: [...ARP_DOMAIN_ATTESTORS]});
const pathToTool = (label: string): string[] | null => {
    const path = [label];
    for (let at = label; at !== "tool"; ) {
        const parent = tree.attested.find((edge) => edge.subject.label === at)?.object.label;
        if (parent === undefined || path.includes(parent)) return null;
        path.push(parent);
        at = parent;
    }
    return path;
};
const children = (parent: string) => tree.attested.filter((edge) => edge.object.label === parent).map((edge) => edge.subject.label).sort();
print("6. The domain tree ARP's attestors stand behind", Q_TREE, {subDomainOf: IS_A_SUB_DOMAIN_OF, attestors: ARP_DOMAIN_ATTESTORS}, {
    edges_on_chain: tree.all.aggregate.count,
    edges_attested: tree.attested.length,
    under_tool: children("tool"),
    under_video: children("video"),
    // Each domain a line of query 1 names, and its path up to `tool` in the attested tree, or `null` when it is not in it.
    domains_named_by_lines: Object.fromEntries(
        [...new Set(flat.map((row) => row.domain).filter((label): label is string => label !== null))].map((label) => [label, pathToTool(label)]),
    ),
});

// 7. Typed subjects.
const Q_TYPE = `query Typed($hasType: String!, $skill: String!) {
  triples(where: {predicate_id: {_eq: $hasType}, object_id: {_eq: $skill}}) { subject { label } creator_id }
}`;
print("7. Subjects typed Skill", Q_TYPE, {hasType: HAS_TYPE, skill: SKILL_TYPE}, await ask(Q_TYPE, {hasType: HAS_TYPE, skill: SKILL_TYPE}));

// 8. `uses` edges by kind of object: an atom (a skill, a tool, an agent) or a triple (a version).
const Q_USES = `query Uses($uses: String!, $inContextOf: String!) {
  uses: triples_aggregate(where: {predicate_id: {_eq: $uses}}) { aggregate { count } }
  usesQualified: triples_aggregate(where: {predicate_id: {_eq: $inContextOf}, subject_term: {triple: {predicate_id: {_eq: $uses}}}}) { aggregate { count } }
}`;
print("8. All `uses` edges, and those carrying a domain", Q_USES, {uses: USES, inContextOf: IN_CONTEXT_OF}, await ask(Q_USES, {uses: USES, inContextOf: IN_CONTEXT_OF}));
