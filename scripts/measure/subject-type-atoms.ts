/** The type atoms and the version predicate task 127 writes with, on both chains (ADR `0192`).
 *
 *      bun run scripts/measure/subject-type-atoms.ts
 *
 *  For each label, every atom that carries it on mainnet 1155 and testnet 13579, its `data`, and two
 *  counts: how many triples point at it as object under the published `has type` (`HAS_TYPE`; a plain-string
 *  `has type` on 13579 is not counted), and how many triples use it as predicate.
 *  The frozen constants in `packages/protocol/src/sources/intuition/terms.ts` are the atom that carries
 *  the edges; this script is how that was chosen and how it is re-checked. Read-only, signs nothing.
 */
import deployment1155 from "../../data/deployments/1155.json";
import deployment13579 from "../../data/deployments/13579.json";
import {HAS_TYPE} from "../../packages/protocol/src/sources/intuition/terms.ts";

const LABELS = ["AIAgent", "MCP Server", "Skill", "Tool", "version", "has version", "version of"];

const ATOMS = `query A($labels: [String!]) {
  atoms(where: {label: {_in: $labels}}, limit: 100) { term_id label data }
}`;
const COUNTS = `query C($id: String!, $hasType: String!) {
  typed: triples_aggregate(where: {object_id: {_eq: $id}, predicate_id: {_eq: $hasType}}) { aggregate { count } }
  asPredicate: triples_aggregate(where: {predicate_id: {_eq: $id}}) { aggregate { count } }
}`;

type Atom = {term_id: string; label: string; data: string};

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

const out: Record<string, unknown[]> = {};
for (const chain of [deployment1155.chain, deployment13579.chain]) {
    const {atoms} = await ask<{atoms: Atom[]}>(chain.graphqlUrl, ATOMS, {labels: LABELS});
    const rows = [];
    for (const atom of atoms) {
        const counts = await ask<{typed: {aggregate: {count: number}}; asPredicate: {aggregate: {count: number}}}>(
            chain.graphqlUrl,
            COUNTS,
            {id: atom.term_id, hasType: HAS_TYPE},
        );
        rows.push({
            label: atom.label,
            termId: atom.term_id,
            data: atom.data.length > 80 ? `${atom.data.slice(0, 80)}…` : atom.data,
            hasTypeEdgesAsObjectUnderHasType: counts.typed.aggregate.count,
            triplesAsPredicate: counts.asPredicate.aggregate.count,
        });
    }
    rows.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : b.hasTypeEdgesAsObjectUnderHasType - a.hasTypeEdgesAsObjectUnderHasType));
    out[String(chain.chainId)] = rows;
}
console.log(JSON.stringify({at: new Date().toISOString(), hasType: HAS_TYPE, chains: out}, null, 2));
