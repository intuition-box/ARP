/** Whether every query task 127 changed is accepted by the real index, on both chains (ADR `0192`).
 *
 *      bun run scripts/measure/versioned-queries-valid.ts
 *
 *  A mocked transport proves a variable was passed, not that a query validates (`claims.md` check 4), so each
 *  changed document is sent once to mainnet 1155 and testnet 13579 with real ids. Prints, per chain and query,
 *  `ok` and the row count, or the index's error. Read-only, signs nothing.
 */
import deployment1155 from "../../data/deployments/1155.json";
import deployment13579 from "../../data/deployments/13579.json";
import {
    ATOM_STANDING_QUERY,
    DECLARED_MODULES_FOR_QUERY,
    PULSE_EDGE_TOOLS_QUERY,
    PULSE_SUBJECT_USES_QUERY,
    PULSE_VERSIONED_USES_QUERY,
    RECENT_QUERY,
    TOOL_LISTING_QUERY,
    ATTESTED_TOOL_USAGE_QUERY,
    TOOL_USAGE_QUERY,
    TOOL_WALLETS_QUERY,
} from "../../packages/graphql/src/index.ts";
import {SAME_AS, USES, VERSION} from "../../packages/protocol/src/sources/intuition/terms.ts";

/** ARP's own skill's atom, one id on both chains (ADR `0054`); a tool to ask about, whether or not it has lines. */
const TOOL = "0xee6f20f09cbf6623d40f22bc9f3e8574fac50e394c8f2cf7495bd7463d95242b";
const SPONSOR = deployment13579.arp.sponsor;
const queries: [string, string, Record<string, unknown>][] = [
    ["PULSE_VERSIONED_USES_QUERY", PULSE_VERSIONED_USES_QUERY, {tools: [TOOL], uses: USES, version: VERSION, limit: 5}],
    ["PULSE_SUBJECT_USES_QUERY", PULSE_SUBJECT_USES_QUERY, {subject: TOOL, uses: USES, limit: 5}],
    ["PULSE_EDGE_TOOLS_QUERY", PULSE_EDGE_TOOLS_QUERY, {edges: [TOOL], uses: USES, limit: 5}],
    ["TOOL_USAGE_QUERY", TOOL_USAGE_QUERY, {toolId: TOOL, uses: USES, version: VERSION, curveId: "1"}],
    ["ATTESTED_TOOL_USAGE_QUERY", ATTESTED_TOOL_USAGE_QUERY, {toolId: TOOL, uses: USES, version: VERSION, curveId: "1", attestor: SPONSOR.toLowerCase()}],
    ["TOOL_LISTING_QUERY", TOOL_LISTING_QUERY, {uses: USES, sameAs: SAME_AS, curveId: "1", limit: 5}],
    ["TOOL_WALLETS_QUERY", TOOL_WALLETS_QUERY, {uses: USES, version: VERSION, sameAs: SAME_AS, atomId: TOOL, sponsor: SPONSOR, limit: 5}],
    // As `getRecentDeclarations` sends it: it declares `$curveId` on the document before the request.
    [
        "RECENT_QUERY",
        RECENT_QUERY.replace("$limit: Int!)", "$limit: Int!, $curveId: numeric!)"),
        {uses: USES, sameAs: SAME_AS, limit: 5, curveId: "1"},
    ],
    ["ATOM_STANDING_QUERY", ATOM_STANDING_QUERY, {atomId: TOOL, curveId: "1", limit: 5, attestor: [SPONSOR.toLowerCase()], exclude: [SPONSOR]}],
    ["DECLARED_MODULES_FOR_QUERY", DECLARED_MODULES_FOR_QUERY, {subjects: [TOOL], predicate: USES, limit: 5}],
];

for (const chain of [deployment1155.chain, deployment13579.chain]) {
    for (const [name, query, variables] of queries) {
        const response = await fetch(chain.graphqlUrl, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({query, variables}),
            signal: AbortSignal.timeout(30_000),
        });
        const body = (await response.json()) as {data?: Record<string, unknown[]>; errors?: {message: string}[]}; // Hasura's envelope
        const rows = body.data === undefined ? null : Object.values(body.data).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
        console.log(`${chain.chainId}  ${name.padEnd(28)}  ${body.errors === undefined ? `ok, ${rows} rows` : `ERROR ${body.errors.map((e) => e.message).join("; ")}`}`);
    }
}
