/** Build the agent sieve feed (task 102, ADR `0171`). No network, no key.
 *
 *      bun run scripts/build/build-agent-sieve-feed.ts [--out apps/web/public/feeds/agent-sieve.json]
 *
 *  Reshapes `data/catalogue/agent-sieve-13579.json`, which `scripts/build/build-agent-sieve.ts` writes
 *  from one run of `scripts/measure/agent-sieve.ts`: each ERC-8004 agent in ARP's directory with the
 *  highest rung of the 8004 sieve it reached. Names are left out: they are text an owner typed, and a
 *  registry already holds them. Schema: `/docs/agent-sieve-feed`. Refresh the walk, then rerun this.
 */
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname} from "node:path";

import reading from "../../data/catalogue/agent-sieve-13579.json";
import {buildAgentSieveFeed} from "../../packages/protocol/src/agent-sieve-feed.ts";

const at = process.argv.indexOf("--out");
const out = at === -1 ? "apps/web/public/feeds/agent-sieve.json" : (process.argv[at + 1] ?? "");
if (out === "") {
    console.error("--out takes a path");
    process.exit(1);
}

const feed = buildAgentSieveFeed({
    rows: reading.agents,
    checkedFrom: reading.checkedFrom,
    checkedTo: reading.checkedTo,
    source: reading.source,
    // The date of the reading, not of this reshaping: rerunning without a new walk changes nothing.
    generatedAt: reading.checkedTo ?? new Date().toISOString(),
});

// One record per line: small, and a refresh reads as a diff of agents.
const {agents, ...head} = feed;
const body = JSON.stringify(head, null, 1).replace(/\n}$/, "");
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, `${body},\n "agents": [\n${agents.map((agent) => `  ${JSON.stringify(agent)}`).join(",\n")}\n ]\n}\n`);
console.log(`${agents.length} agents, by chain and rung ${JSON.stringify(feed.by_chain)}, ${feed.skipped.count} skipped: ${out}`);
