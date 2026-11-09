/** Turn the dated reachability measurement into the file the web app bundles (task 82).
 *
 *      bun run scripts/build/build-agents-reachable.ts
 *
 *  Reads `data/measurements/directory-reachable-2026-11-09T1505.json`
 *  (`scripts/measure/directory-reachable.ts`) and writes `apps/web/src/data/agents-reachable.json`:
 *  every agent in the directory that answered one request on a callable endpoint it declared, with
 *  the kind of endpoint and its host. `/agents` lists these first. A new reading needs a new run of
 *  the measurement and of this script; the date travels with the file.
 */
import {writeFileSync} from "node:fs";

import measured from "../../data/measurements/directory-reachable-2026-11-09T1505.json";

type Answering = {caip19: string; name: string; kinds: string[]; endpoints: string[]};

// The shape `directory-reachable.ts` writes; `caip19` is matched by a regex before use.
const agents = (measured.answering as Answering[]).flatMap((row) => {
    const match = /^eip155:(\d+)\/erc721:0x[0-9a-fA-F]{40}\/(\d+)$/.exec(row.caip19);
    if (match === null) return [];
    const host = (() => {
        try {
            return new URL(row.endpoints[0] ?? "").host;
        } catch {
            return null;
        }
    })();
    return [{chainId: Number(match[1]), tokenId: match[2] ?? "", name: row.name, kinds: row.kinds, host}];
});

const out = {
    _note:
        "Agents in ARP's directory on testnet 13579 that answered one request on a callable endpoint they declared " +
        "(MCP initialize, or a 2xx on an A2A card or an API). Built by scripts/build/build-agents-reachable.ts from a " +
        "committed measurement; do not edit by hand.",
    directoryChainId: measured.chain,
    measuredAt: measured.at,
    listed: measured.listed,
    agents,
};
writeFileSync("apps/web/src/data/agents-reachable.json", `${JSON.stringify(out, null, 2)}\n`);
console.log(`${agents.length} reachable of ${measured.listed}, measured ${measured.at}`);
