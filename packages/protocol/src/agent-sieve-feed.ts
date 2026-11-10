/**
 * The agent sieve feed (task 102, ADR `0171`): the highest rung of the 8004 sieve each ERC-8004 agent in
 * ARP's directory reached, shaped for a registry that reads it beside its own listing. Pure: it reshapes
 * the reading `scripts/build/build-agent-sieve.ts` already wrote and touches no network.
 *
 * **No name and no description.** An agent's name is text its owner typed; a registry already holds it.
 * The feed keys each agent by `eip155:<chain>:<registry>:<token id>` and carries only the rung, whether a
 * failure left it undecided, the URL that proves it, and the protocols that answered.
 *
 * The rung is a fact per step, not a grade (ADR `0046`, `sieve.ts`).
 */
import {RUNG_NAMES, type Rung} from "./sieve.js";

export const AGENT_SIEVE_SCHEMA = "arp.agent-sieve/1";

export const AGENT_SIEVE_NOTE =
    "Each record is the highest rung of the 8004 sieve one ERC-8004 agent reached when ARP last walked it: " +
    "0 shell, 1 described, 2 declares an address, 3 answers, 4 speaks, 5 used. Each rung is one request anyone can repeat " +
    "(/docs/the-sieve). could_not_say means a failure that is not a verdict left the agent at the rung below. " +
    "It is a fact per step, not a grade.";

export type AgentSieveRow = {
    chainId: number;
    registry: string;
    tokenId: string;
    rung: number;
    couldNotSay: boolean;
    proofUrl: string | null;
    kinds: readonly string[];
    at: string;
};

export type AgentSieveRecord = {
    /** `eip155:<chain>:<registry>:<token id>`: the chain, the registry and the token, in one key. */
    agent: string;
    rung: Rung;
    could_not_say: boolean;
    proof_url: string | null;
    /** The protocols that answered: `mcp`, `a2a`. */
    kinds: string[];
    checked_at: string;
};

export type AgentSieveFeed = {
    schema: typeof AGENT_SIEVE_SCHEMA;
    generated_at: string;
    checked_from: string | null;
    checked_to: string | null;
    source: string;
    note: string;
    rungs: Record<Rung, string>;
    by_rung: Record<Rung, number>;
    agents: AgentSieveRecord[];
    skipped: {count: number};
};

const isRung = (value: number): value is Rung => Number.isInteger(value) && value >= 0 && value <= 5;
/** Only what a probe classifies: a URL, nothing typed beside it. */
const isHttpUrl = (value: string) => /^https?:\/\/[^\s]+$/.test(value) && value.length <= 2048;
const KINDS = new Set(["mcp", "a2a"]);

export function buildAgentSieveFeed(input: {
    rows: readonly AgentSieveRow[];
    checkedFrom: string | null;
    checkedTo: string | null;
    source: string;
    generatedAt: string;
}): AgentSieveFeed {
    let skipped = 0;
    const agents: (AgentSieveRecord & {order: [number, string]})[] = [];
    for (const row of input.rows) {
        if (!isRung(row.rung) || !/^0x[0-9a-fA-F]{40}$/.test(row.registry) || !/^[0-9]{1,78}$/.test(row.tokenId)) {
            skipped += 1;
            continue;
        }
        agents.push({
            agent: `eip155:${row.chainId}:${row.registry}:${row.tokenId}`,
            rung: row.rung,
            could_not_say: row.couldNotSay,
            proof_url: row.proofUrl !== null && isHttpUrl(row.proofUrl) ? row.proofUrl : null,
            kinds: row.kinds.filter((kind) => KINDS.has(kind)),
            checked_at: row.at,
            order: [row.chainId, row.tokenId],
        });
    }
    agents.sort((a, b) => b.rung - a.rung || a.order[0] - b.order[0] || a.order[1].localeCompare(b.order[1], "en", {numeric: true}));
    const byRung = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0} satisfies Record<Rung, number>;
    for (const agent of agents) byRung[agent.rung] += 1;
    return {
        schema: AGENT_SIEVE_SCHEMA,
        generated_at: input.generatedAt,
        checked_from: input.checkedFrom,
        checked_to: input.checkedTo,
        source: input.source,
        note: AGENT_SIEVE_NOTE,
        rungs: {...RUNG_NAMES},
        by_rung: byRung,
        agents: agents.map(({order: _order, ...record}) => record),
        skipped: {count: skipped},
    };
}
