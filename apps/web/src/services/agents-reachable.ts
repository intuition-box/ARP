import reading from "../../../../data/catalogue/agent-sieve-13579.json";

/**
 * The directory through the 8004 sieve (task 87): each agent's highest rung, from one dated walk
 * (`scripts/measure/agent-sieve.ts --population directory`, bundled by
 * `scripts/build/build-agent-sieve.ts`). A browser cannot probe the agents itself: most send no CORS
 * header, and one visit would cost a probe each. The date travels with the file.
 *
 * "Reachable" is rung 3 and above: a callable endpoint answered (3), or served the protocol it
 * declares (4), or another wallet's line names the agent (5). Rung 0 is a shell: no registration
 * file that resolves.
 */
export type SievedAgent = {
    chainId: number;
    registry: string;
    tokenId: string;
    name: string | null;
    rung: 0 | 1 | 2 | 3 | 4 | 5;
    couldNotSay: boolean;
    proofUrl: string | null;
    kinds: string[];
    at: string;
};

/** `directoryChainId` is the chain whose directory was read, not the agents' own identity chains. */
export type SieveReading = {directoryChainId: number; checkedFrom: string | null; checkedTo: string | null; agents: SievedAgent[]};

export type ReachableReading = {
    directoryChainId: number;
    /** When the walk ended: the oldest a figure on the page can be. */
    measuredAt: string;
    /** Rung 3 and above, highest rung first. */
    agents: SievedAgent[];
    /** `chainId/tokenId` of every shell, which the full list hides behind a count. */
    shells: ReadonlySet<string>;
};

export const RUNG_LABELS: Readonly<Record<SievedAgent["rung"], string>> = {
    0: "Shell",
    1: "Described",
    2: "Declares an address",
    3: "Answers",
    4: "Speaks",
    5: "Used",
};

export function readingOf(sieve: SieveReading): ReachableReading {
    return {
        directoryChainId: sieve.directoryChainId,
        measuredAt: sieve.checkedTo ?? sieve.checkedFrom ?? "",
        agents: sieve.agents.filter((agent) => agent.rung >= 3).sort((a, b) => b.rung - a.rung),
        shells: new Set(sieve.agents.filter((agent) => agent.rung === 0).map((agent) => `${agent.chainId}/${agent.tokenId}`)),
    };
}

export function reachableReading(): ReachableReading {
    // The shape `build-agent-sieve.ts` writes; checked by `agents-reachable.test.ts` rather than at runtime.
    return readingOf(reading as SieveReading);
}

/** `2026-11-09`, the day the reading was taken. */
export function readingDay(measuredAt: string): string {
    return measuredAt.slice(0, 10);
}

/** The host a proof URL names, or `null`. */
export function hostOf(url: string | null): string | null {
    if (url === null) return null;
    try {
        return new URL(url).host;
    } catch {
        return null;
    }
}
