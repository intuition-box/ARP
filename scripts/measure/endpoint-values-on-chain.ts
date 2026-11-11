/** Whether an endpoint URL already written on testnet 13579 carries a value (task 119, ADR `0186`). Holds no key; reads only.
 *
 *      bun run scripts/measure/endpoint-values-on-chain.ts [--json data/measurements/endpoint-values-on-chain-<date>.json]
 *
 *  An x402 line writes its endpoint's URL in two atoms: the payment level, `(T3, paid with, "eip155:…/tx/0x… <URL>")`,
 *  and the tool atom T1, the object of `(agent, uses, tool)`. Until task 119 neither removed a query value. This reads,
 *  on Intuition testnet 13579 at the time it runs, four populations, and for each URL says whether
 *  `redactEndpointUrl` would change it (`packages/protocol/src/endpoint-redaction.ts`) and why:
 *
 *    paymentLevels   every `paid with` triple's object, the URL after the payment
 *    x402Tools       the tool atom under each of those lines: payment → outcome → [in context of] → uses → object
 *    usesTools       every Thing that is the object of a `uses` triple, GitHub left out (a skill's `?skill=` is its
 *                    name, not a value an agent sent)
 *    arpListed       every Thing created by ARP's deployer or sponsor, GitHub left out
 *
 *  A URL that changes is printed whole: the measurement exists to say what is already public, and it already is.
 */
import {writeFileSync} from "node:fs";

import {createGraphqlTransport, defaultFetch, isRecord, readRecord, readString, X402_LEVELS_BY_ID_QUERY, X402_PAYMENT_LEVELS_QUERY} from "../../packages/graphql/src/index.ts";
import {getAddress, stringToHex, type Hex} from "viem";

import deployment from "../../data/deployments/13579.json";
import {multiVaultReads} from "../../packages/protocol/src/declare/multivault.ts";
import {redactEndpointUrl} from "../../packages/protocol/src/endpoint-redaction.ts";
import {INTUITION_USES_TERM_ID} from "../../packages/protocol/src/index.ts";
import {PAID_WITH_LABEL, parsePaymentLevelLabel} from "../../packages/protocol/src/x402-payment.ts";

const PAGE = 250;
const transport = createGraphqlTransport({url: deployment.chain.graphqlUrl, fetch: defaultFetch(), timeoutMs: 30_000});
const reads = multiVaultReads({address: deployment.intuition.multiVault as Hex, chainId: deployment.chain.chainId, rpcUrl: deployment.chain.rpcUrl}); // an address in this repo's record
const paidWith = await reads.atomId(stringToHex(PAID_WITH_LABEL));
const ours = [getAddress(deployment.arp.deployer), getAddress(deployment.arp.sponsor)];

type Verdict = {url: string; changes: false} | {url: string; changes: true; why: string[]; redacted: string | null};

/** What `redactEndpointUrl` would do to one URL, and which part made it change. */
function verdict(url: string): Verdict {
    let redacted: string | null;
    try {
        redacted = redactEndpointUrl(url);
    } catch (error) {
        return {url, changes: true, why: [error instanceof Error ? error.message : String(error)], redacted: null};
    }
    if (redacted === url) return {url, changes: false};
    const why: string[] = [];
    const [beforeHash, hash] = [url.split("#")[0] ?? url, url.includes("#")];
    const query = beforeHash.includes("?") ? beforeHash.slice(beforeHash.indexOf("?") + 1) : "";
    if (query.split("&").some((part) => part.indexOf("=") > 0 && part.slice(part.indexOf("=") + 1) !== "")) why.push("query value");
    if (query.split("&").some((part) => part !== "" && part.indexOf("=") <= 0)) why.push("query part with no name");
    if (hash) why.push("fragment");
    if (redacted.includes(":id")) why.push("personal path segment or name");
    return {url, changes: true, why, redacted};
}

/** Only an http(s) URL is an endpoint; anything else (an empty `url`, a label) is counted apart, not as a value. */
function summary(urls: readonly (string | null)[]) {
    const distinct = [...new Set(urls.filter((url): url is string => url !== null))].sort();
    const http = distinct.filter((url) => /^https?:\/\/\S+$/i.test(url));
    const verdicts = http.map(verdict);
    const changed = verdicts.filter((v): v is Extract<Verdict, {changes: true}> => v.changes);
    const by: Record<string, number> = {};
    for (const v of changed) for (const why of v.why) by[why] = (by[why] ?? 0) + 1;
    return {urls: verdicts.length, notHttp: distinct.length - http.length, changed: changed.length, byWhy: by, changedUrls: changed};
}

const rows = (data: Record<string, unknown>, key: string) => (Array.isArray(data[key]) ? data[key].filter(isRecord) : []);

async function paged(query: string, variables: Record<string, unknown>, key: string) {
    const all: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += PAGE) {
        const page = rows(await transport.request(query, {...variables, limit: PAGE, offset}), key);
        all.push(...page);
        if (page.length < PAGE) return all;
    }
}

// 1. Payment levels, and the tool atom each line is about.
const levels = await paged(X402_PAYMENT_LEVELS_QUERY, {paidWith}, "triples");
const paymentUrls: string[] = [];
let withoutUrl = 0;
for (const level of levels) {
    const object = readRecord(level, "object");
    const data = object === null ? null : (readString(object, "data") ?? readString(object, "label"));
    const parsed = data === null ? null : parsePaymentLevelLabel(data);
    if (parsed?.endpoint === null || parsed === null) withoutUrl += 1;
    else paymentUrls.push(parsed.endpoint);
}
const byId = new Map<string, Record<string, unknown>>();
const fetchIds = async (ids: (string | null)[]) => {
    const wanted = [...new Set(ids.filter((id): id is string => id !== null).map((id) => id.toLowerCase()))].filter((id) => !byId.has(id));
    for (let at = 0; at < wanted.length; at += PAGE) {
        const chunk = wanted.slice(at, at + PAGE);
        for (const row of rows(await transport.request(X402_LEVELS_BY_ID_QUERY, {ids: chunk, limit: chunk.length}), "triples")) {
            const id = readString(row, "term_id");
            if (id !== null) byId.set(id.toLowerCase(), row);
        }
    }
};
let frontier = levels.map((level) => readString(level, "subject_id"));
for (let depth = 0; depth < 3; depth += 1) {
    await fetchIds(frontier);
    frontier = frontier.map((id) => (id === null ? null : (readString(byId.get(id.toLowerCase()) ?? {}, "subject_id") ?? null)));
}
const toolUrls: string[] = [];
for (const row of byId.values()) {
    if (readString(row, "predicate_id")?.toLowerCase() !== INTUITION_USES_TERM_ID.toLowerCase()) continue;
    const thing = readRecord(readRecord(readRecord(row, "object") ?? {}, "value") ?? {}, "thing");
    const url = thing === null ? null : readString(thing, "url");
    if (url !== null) toolUrls.push(url);
}

// 2. Every Thing that is the object of a `uses` triple, and every Thing ARP created; GitHub left out.
const USES_OBJECTS = `query UsesObjects($uses: String!, $limit: Int!, $offset: Int!) {
    triples(where: {predicate_id: {_eq: $uses}, object: {type: {_eq: Thing}}}, order_by: {term_id: asc}, limit: $limit, offset: $offset) {
        object { value { thing { url } } }
    }
}`;
const OURS_THINGS = `query OurThings($ours: [String!]!, $limit: Int!, $offset: Int!) {
    atoms(where: {creator_id: {_in: $ours}, type: {_eq: Thing}}, order_by: {term_id: asc}, limit: $limit, offset: $offset) {
        value { thing { url } }
    }
}`;
const urlOf = (row: Record<string, unknown>) => {
    const value = readRecord(row, "value") ?? readRecord(readRecord(row, "object") ?? {}, "value");
    const thing = value === null ? null : readRecord(value, "thing");
    return thing === null ? null : readString(thing, "url");
};
const notGithub = (url: string | null) => url === null || !/^https?:\/\/(www\.)?github\.com\//i.test(url);
const usesUrls = (await paged(USES_OBJECTS, {uses: INTUITION_USES_TERM_ID}, "triples")).map(urlOf);
const oursUrls = (await paged(OURS_THINGS, {ours}, "atoms")).map(urlOf);

const result = {
    script: "scripts/measure/endpoint-values-on-chain.ts",
    chain: deployment.chain.chainId,
    readAt: new Date().toISOString(),
    graphql: deployment.chain.graphqlUrl,
    rule: "a URL counts as changed when redactEndpointUrl (packages/protocol/src/endpoint-redaction.ts) does not return it unchanged",
    paymentLevels: {triples: levels.length, withoutUrl, ...summary(paymentUrls)},
    x402Tools: summary(toolUrls),
    usesTools: {usesTriplesWithThing: usesUrls.length, ...summary(usesUrls.filter(notGithub))},
    arpListed: {things: oursUrls.length, ...summary(oursUrls.filter(notGithub))},
};

for (const key of ["paymentLevels", "x402Tools", "usesTools", "arpListed"] as const) {
    const part = result[key];
    console.log(`${key.padEnd(14)} ${part.urls} http(s) URLs (${part.notHttp} not http), ${part.changed} would change ${JSON.stringify(part.byWhy)}`);
}
const at = process.argv.indexOf("--json");
if (at !== -1) {
    const out = process.argv[at + 1] ?? "";
    writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`written: ${out}`);
}
