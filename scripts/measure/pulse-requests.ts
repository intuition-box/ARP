/** How many requests one `arp_pulse` call makes, by host, by GraphQL operation and by RPC method (task 113).
 *
 *      bun run scripts/measure/pulse-requests.ts ["smart contract audit" …]
 *
 *  Wraps `globalThis.fetch`, imports `pulse` from `apps/mcp/src/handlers/pulse.ts` against testnet 13579 in
 *  read mode, and calls it once with the phrases given (default one, "smart contract audit"). Before the call
 *  the per-repository file-list cache under `ARP_HOME` is deleted, so GitHub is asked cold; the search package
 *  `npx skills` stays cached, and it runs in a child process this count does not see. Writes one dated file under
 *  `data/measurements/` (ADR `0064`) with the counts and the call's output, so a before and an after can be
 *  compared field by field. n = 1 per run: the counts are what one run did, not a mean.
 *
 *  Read-only. The phrases go where `arp_pulse` sends them (skills.sh, through the search package); nothing else.
 */
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

const phrases = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["smart contract audit"];
const home = process.env["ARP_HOME"] ?? join(tmpdir(), "arp-pulse-requests");
mkdirSync(home, {recursive: true});
rmSync(join(home, "pulse-listings"), {recursive: true, force: true});
process.env["ARP_TARGET"] = "testnet";
process.env["ARP_TOOLS"] = "read";
process.env["ARP_HOME"] = home;

const byHost = new Map<string, number>();
const byGraphql = new Map<string, number>();
const byRpc = new Map<string, number>();
const byKind = new Map<string, number>();
const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
let first: number | null = null;
let last = 0;
const started = Date.now();

const original = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    first ??= Date.now() - started;
    bump(byHost, url.host);
    const body = typeof init?.body === "string" ? init.body : null;
    if (url.pathname.includes("graphql") && body !== null) {
        const query = (JSON.parse(body) as {query?: string}).query ?? ""; // a GraphQL request body
        bump(byGraphql, /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? "anonymous");
    } else if (url.host.includes("rpc") && body !== null) {
        const parsed = JSON.parse(body) as unknown; // a JSON-RPC request or batch
        for (const call of Array.isArray(parsed) ? parsed : [parsed]) {
            const row = call as {method?: string; params?: [{to?: string; data?: string}?]}; // JSON-RPC fields
            const data = row.params?.[0]?.data;
            bump(
                byRpc,
                row.method === "eth_call" && typeof data === "string"
                    ? `eth_call ${row.params?.[0]?.to ?? "?"} ${data.slice(0, 10)}`
                    : (row.method ?? "?"),
            );
        }
    } else if (url.host === "raw.githubusercontent.com") {
        bump(byKind, `raw ${url.pathname.endsWith("SKILL.md") ? "SKILL.md" : "other file"}`);
    } else if (url.host === "api.github.com") {
        bump(byKind, `api ${url.pathname.includes("/git/trees/") ? "tree" : "repository"}`);
    }
    const response = await original(input, init);
    last = Date.now() - started;
    return response;
}) as typeof fetch; // `as`: the wrapper takes fetch's two arguments and returns its promise; `preconnect` is not used here

const {pulse} = await import("../../apps/mcp/src/handlers/pulse.ts");
const response = await pulse(1, {queries: phrases});
const ms = Date.now() - started;
const answer = (await response.json()) as {result?: {content?: {text?: string}[]}}; // the JSON-RPC envelope
const output = JSON.parse(answer.result?.content?.[0]?.text ?? "null") as unknown; // the tool's JSON text

const sorted = (map: Map<string, number>) => Object.fromEntries([...map].sort((a, b) => b[1] - a[1]));
const total = [...byHost.values()].reduce((sum, n) => sum + n, 0);
const at = new Date().toISOString();
const result = {
    measuredAt: at,
    script: "scripts/measure/pulse-requests.ts",
    chainId: 13579,
    phrases,
    n: 1,
    note: "One run, cold file-list cache, search package cached. Counts are of this run; the time includes the search package.",
    ms,
    firstRequestMs: first,
    lastResponseMs: last,
    total,
    byHost: sorted(byHost),
    byGithubKind: sorted(byKind),
    byGraphql: sorted(byGraphql),
    byRpc: sorted(byRpc),
    output,
};
const file = `data/measurements/pulse-requests-${at.slice(0, 19).replace(/:/g, "")}.json`;
writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({...result, output: undefined}, null, 2));
console.log(`wrote ${file}`);
process.exit(0);
