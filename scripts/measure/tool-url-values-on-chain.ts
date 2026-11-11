/** How many tool atoms on testnet 13579 carry a value in their URL (task 123, ADR `0190`). Holds no key; reads only.
 *
 *      bun run scripts/measure/tool-url-values-on-chain.ts [--json data/measurements/tool-url-values-on-chain-<date>.json]
 *
 *  Reads every `Thing` atom on Intuition testnet 13579 at the time it runs, whoever created it, and for each http(s)
 *  `url` asks `publishableToolUrl` (`packages/protocol/src/tool-url-values.ts`) whether a listing would accept it
 *  as written. It counts three populations: every Thing, the Things ARP's deployer or sponsor created, and the
 *  Things that are the object of a `uses` triple. For the last two, a URL that would be refused is printed whole:
 *  it is already public, and the measurement exists to say what is. For every Thing, which holds other projects'
 *  atoms by the ten thousand, only the counts by reason and the fifteen commonest hosts are kept.
 *
 *  Task 119's `endpoint-values-on-chain.ts` left GitHub out and read ARP's own Things and `uses` objects only; this
 *  reads every Thing and applies the listing rule, under which a GitHub URL may carry `?skill=` and nothing else.
 */
import {writeFileSync} from "node:fs";

import {createGraphqlTransport, defaultFetch, isRecord, readRecord, readString} from "../../packages/graphql/src/index.ts";
import {getAddress} from "viem";

import deployment from "../../data/deployments/13579.json";
import {INTUITION_USES_TERM_ID} from "../../packages/protocol/src/index.ts";
import {publishableToolUrl} from "../../packages/protocol/src/tool-url-values.ts";

const PAGE = 250;
const transport = createGraphqlTransport({url: deployment.chain.graphqlUrl, fetch: defaultFetch(), timeoutMs: 30_000});
const ours = new Set([getAddress(deployment.arp.deployer), getAddress(deployment.arp.sponsor)].map((a) => a.toLowerCase()));

const THINGS = `query Things($limit: Int!, $offset: Int!) {
    atoms(where: {type: {_eq: Thing}}, order_by: {term_id: asc}, limit: $limit, offset: $offset) {
        term_id
        creator_id
        value { thing { url } }
    }
}`;
const USES_OBJECTS = `query UsesObjects($uses: String!, $limit: Int!, $offset: Int!) {
    triples(where: {predicate_id: {_eq: $uses}, object: {type: {_eq: Thing}}}, order_by: {term_id: asc}, limit: $limit, offset: $offset) {
        object_id
    }
}`;

/** The public indexer answers 429 under a burst; a page is asked again after a pause, five times at most. */
async function withRetry<T>(ask: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await ask();
        } catch (error) {
            if (attempt >= 5 || !String(error).includes("429")) throw error;
            await new Promise((resolve) => setTimeout(resolve, 5_000 * attempt));
        }
    }
}

async function paged(query: string, variables: Record<string, unknown>, key: string) {
    const all: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += PAGE) {
        const data = await withRetry(() => transport.request(query, {...variables, limit: PAGE, offset}));
        const page = Array.isArray(data[key]) ? data[key].filter(isRecord) : [];
        all.push(...page);
        if (page.length < PAGE) return all;
    }
}

type Thing = {termId: string; creator: string; url: string | null};
const things: Thing[] = (await paged(THINGS, {}, "atoms")).map((row) => {
    const thing = readRecord(readRecord(row, "value") ?? {}, "thing");
    return {
        termId: (readString(row, "term_id") ?? "").toLowerCase(),
        creator: (readString(row, "creator_id") ?? "").toLowerCase(),
        url: thing === null ? null : readString(thing, "url"),
    };
});
const usedIds = new Set((await paged(USES_OBJECTS, {uses: INTUITION_USES_TERM_ID}, "triples")).map((row) => (readString(row, "object_id") ?? "").toLowerCase()));

/** `listed`: keep and print each refused URL. Off for every Thing, which holds other projects' atoms by the ten thousand. */
function summary(population: readonly Thing[], listed: boolean) {
    const http = population.filter((t): t is Thing & {url: string} => t.url !== null && /^https?:\/\/\S+$/i.test(t.url));
    const refused = http.flatMap((t) => {
        const verdict = publishableToolUrl(t.url);
        return verdict.ok ? [] : [{termId: t.termId, url: t.url, why: verdict.why, listable: verdict.listable}];
    });
    const github = http.filter((t) => /^https?:\/\/(www\.)?github\.com(\/|\?|$)/i.test(t.url)).length;
    const byWhy: Record<string, number> = {};
    const byHost: Record<string, number> = {};
    for (const row of refused) {
        const why =
            [row.why.includes("a value for") ? "query value" : null, row.why.includes("looks personal") ? "personal path segment" : null, row.why.includes("fragment") ? "fragment" : null]
                .filter((w): w is string => w !== null)
                .join(" + ") || "other";
        byWhy[why] = (byWhy[why] ?? 0) + 1;
        const host = new URL(row.url).host;
        byHost[host] = (byHost[host] ?? 0) + 1;
    }
    const topHosts = Object.fromEntries(Object.entries(byHost).sort(([, a], [, b]) => b - a).slice(0, 15));
    return {things: population.length, httpUrls: http.length, github, refused: refused.length, byWhy, topHosts, ...(listed ? {refusedUrls: refused} : {})};
}

const result = {
    script: "scripts/measure/tool-url-values-on-chain.ts",
    chain: deployment.chain.chainId,
    readAt: new Date().toISOString(),
    graphql: deployment.chain.graphqlUrl,
    rule: "a URL counts as refused when publishableToolUrl (packages/protocol/src/tool-url-values.ts) does not accept it as written",
    allThings: summary(things, false),
    arpCreated: summary(things.filter((t) => ours.has(t.creator)), true),
    usesObjects: summary(things.filter((t) => usedIds.has(t.termId)), true),
};

for (const key of ["allThings", "arpCreated", "usesObjects"] as const) {
    const part = result[key];
    console.log(`${key.padEnd(12)} ${part.things} Things, ${part.httpUrls} http(s) URLs (${part.github} GitHub), ${part.refused} would be refused ${JSON.stringify(part.byWhy)}`);
    for (const row of "refusedUrls" in part ? (part.refusedUrls ?? []) : []) console.log(`  ${row.url}  (${row.why})`);
}
const at = process.argv.indexOf("--json");
if (at !== -1) {
    const out = process.argv[at + 1] ?? "";
    writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`written: ${out}`);
}
