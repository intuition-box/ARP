import {getRecentDeclarations, type RecentDeclaration} from "@arp-protocol/core";

import {hiddenAtomIds, visibleDeclarations} from "../services/test-identities";

/**
 * The newest declarations an identified agent wrote.
 *
 * The chain leads the key, as everywhere else: an edge exists on one chain and not the other, and
 * without it switching serves the other chain's answer under the new label.
 *
 * **Empty is an answer, not a failure.** Measured 2026-10-27: mainnet returns 0 and testnet
 * returns 3. The mainnet zero is ARP's own non-activity — nobody has run this loop yet, ARP
 * included — so a caller says "nothing yet" and never falls back to a sample.
 */

export type RecentFetcher = (config: {
    graphqlUrl: string;
    limit?: number;
}) => Promise<RecentDeclaration[]>;

function recentQueryKey(chainId: number, limit: number) {
    return ["intuition", chainId, "recent-declarations", limit] as const;
}

/**
 * The default read leaves out ARP's own test identities (`services/test-identities.ts`, task 74),
 * so both surfaces built on it, `/activity` and the bar, show the same rows.
 */
export const getVisibleRecentDeclarations: RecentFetcher = async (config) => {
    const [rows, hidden] = await Promise.all([
        getRecentDeclarations(config),
        hiddenAtomIds(config.graphqlUrl),
    ]);
    return visibleDeclarations(rows, hidden);
};

export function recentQueryOptions(
    chain: {chainId: number; graphqlUrl: string},
    limit = 8,
    fetchRecent: RecentFetcher = getVisibleRecentDeclarations,
) {
    return {
        queryKey: recentQueryKey(chain.chainId, limit),
        queryFn: (): Promise<RecentDeclaration[]> =>
            fetchRecent({graphqlUrl: chain.graphqlUrl, limit}),
        // A minute. The edges change when somebody writes one, which is rare enough that re-asking
        // the indexer on every mount would be the expensive half of a page.
        staleTime: 60_000,
        retry: 0,
    };
}
