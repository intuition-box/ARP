/** Turn the directory's sieve reading into the file the web app and the MCP server bundle (task 87).
 *
 *      bun run scripts/build/build-agent-sieve.ts data/measurements/agent-sieve-directory-<stamp>.jsonl
 *
 *  Reads one run of `scripts/measure/agent-sieve.ts --population directory` and writes
 *  `data/catalogue/agent-sieve-13579.json`: every agent in ARP's directory on testnet 13579 with its
 *  rung, whether a failure left it undecided, and the URL that proves it. `/agents` and
 *  `arp_find_agents` order by it, with its date. It replaces task 82's `agents-reachable.json`: the
 *  "reachable" agents are the ones at rung 3 or above.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import type { SieveRow } from '../measure/agent-sieve.ts';

const path = process.argv[2];
if (path === undefined) {
  console.error('pass the directory sieve file: data/measurements/agent-sieve-directory-<stamp>.jsonl');
  process.exit(1);
}

const latest = new Map<string, SieveRow>();
for (const line of readFileSync(path, 'utf8').split('\n')) {
  if (line.trim() === '') continue;
  const row = JSON.parse(line) as SieveRow; // a row agent-sieve.ts wrote
  latest.set(`${row.chainId}/${row.tokenId}`, row);
}
const rows = [...latest.values()];
const dates = rows.map((row) => row.at).sort();

const out = {
  _note:
    "Every agent in ARP's directory on testnet 13579 with the highest rung of the 8004 sieve it reached " +
    '(packages/protocol/src/sieve.ts): 0 shell, 1 described, 2 declares an address, 3 answers, 4 speaks, 5 used. ' +
    `Built by scripts/build/build-agent-sieve.ts from ${path}; do not edit by hand.`,
  directoryChainId: 13579,
  source: path,
  checkedFrom: dates[0] ?? null,
  checkedTo: dates.at(-1) ?? null,
  agents: rows
    .map((row) => ({
      chainId: row.chainId,
      registry: row.registry,
      tokenId: row.tokenId,
      name: row.name,
      rung: row.rung,
      couldNotSay: row.couldNotSay,
      proofUrl: row.proof?.url ?? null,
      kinds: [...new Set(row.endpoints.filter((e) => e.protocol !== null && e.status === 'confirmed' && e.code !== 'dead').map((e) => e.protocol ?? ''))],
      at: row.at,
    }))
    .sort((a, b) => b.rung - a.rung || (a.name ?? '').localeCompare(b.name ?? '')),
};
writeFileSync('data/catalogue/agent-sieve-13579.json', `${JSON.stringify(out, null, 2)}\n`);
const count = (rung: number) => out.agents.filter((agent) => agent.rung === rung).length;
console.log(`${rows.length} agents: ${[0, 1, 2, 3, 4, 5].map((rung) => `${rung}:${count(rung)}`).join(' ')}`);
