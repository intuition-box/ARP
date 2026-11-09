import reading from "../data/agents-reachable.json";

/**
 * Agents in the directory that answered a request, from one dated reading (task 82). A browser
 * cannot probe 286 endpoints itself (no CORS on most, and one visit would cost a probe each), so
 * `scripts/measure/directory-reachable.ts` measures and `scripts/build/build-agents-reachable.ts`
 * writes the file this reads. The date travels with it.
 */
export type ReachableAgent = {chainId: number; tokenId: string; name: string; kinds: string[]; host: string | null};

/** `directoryChainId` is the chain whose directory was read, not the agents' own identity chains. */
export type ReachableReading = {directoryChainId: number; measuredAt: string; listed: number; agents: ReachableAgent[]};

export function reachableReading(): ReachableReading {
    // The shape `build-agents-reachable.ts` writes; checked by `agents-reachable.test.ts` rather than at runtime.
    return reading as ReachableReading;
}

/** `2026-11-09`, the day the reading was taken. */
export function readingDay(measuredAt: string): string {
    return measuredAt.slice(0, 10);
}
