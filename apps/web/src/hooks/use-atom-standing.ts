import {useQuery} from "@tanstack/react-query";
import type {Hex} from "viem";
import {getAtomStanding, type AtomStanding} from "@arp-protocol/core";

import {useChainChoice} from "../lib/chain-choice";
import {deployments} from "../lib/deployments";
import {arpPayersFor} from "../lib/sponsor";
import {DOMAIN_ATTESTORS} from "../services/domain-filter";
import {buildAtomView, type AtomView} from "../services/atom-standing-view";
import {hiddenAtomIds, visibleStanding} from "../services/test-identities";

/**
 * One atom and everything pointing at it.
 *
 * Same shape as the other read hooks: the lifecycle lives here, the work lives in the package and
 * the view service, and the query options are exported separately so the key and the mapping are
 * unit-testable without a DOM.
 */

export type AtomStandingFetcher = (
    atomId: string,
    config: {
        graphqlUrl: string;
        limit?: number;
        attestor?: string | readonly string[];
        excludeHolders?: readonly string[];
    },
) => Promise<AtomStanding>;

/** `0x` + 32 bytes. Anything else is a bad route param, not an atom nobody points at. */
export function isAtomId(value: string | undefined): value is Hex {
    return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * The chain leads the key.
 *
 * An atom's **id** is chain-independent — `keccak(atomData)` — while its vault and its edges are
 * per chain, so the same id names a different market on each. Without the chain in the key,
 * switching serves the other chain's answer under the new label (`rules/claims.md` §2 in its UI
 * form, and `lib/chain-choice.ts` on why that trap is invisible).
 */
export function atomStandingQueryKey(
    chainId: number,
    atomId: string | null,
    payers: readonly string[] = [],
) {
    // The attestor is in the key: it decides which outgoing claims come back, so a cached answer
    // read through one address must not be served under another. The payers too: they decide
    // what an edge's support count is (task 144).
    return ["intuition", chainId, "atom-standing", atomId, DOMAIN_ATTESTORS, payers] as const;
}

/** ARP's own test agents' lines are left out of every atom's page (task 74). */
const getVisibleAtomStanding: AtomStandingFetcher = async (atomId, config) => {
    const [standing, hidden] = await Promise.all([
        getAtomStanding(atomId, config),
        hiddenAtomIds(config.graphqlUrl),
    ]);
    return visibleStanding(standing, hidden);
};

/**
 * `payers` are ARP's own paying wallets on this chain: their positions on an edge are not counted
 * as supports, so the sponsor's opening position on an edge it created reads as nobody, the way
 * `/tools`' Signals already read it (task 144, ADR `0143`).
 */
export function atomStandingQueryOptions(
    chain: {chainId: number; graphqlUrl: string; symbol: string; payers?: readonly string[]},
    atomId: string | null,
    fetchStanding: AtomStandingFetcher = getVisibleAtomStanding,
) {
    const payers = chain.payers ?? [];
    return {
        queryKey: atomStandingQueryKey(chain.chainId, atomId, payers),
        queryFn: async (): Promise<AtomView> => {
            if (atomId === null) throw new Error("No atom to read.");
            return buildAtomView(
                await fetchStanding(atomId, {
                    graphqlUrl: chain.graphqlUrl,
                    // Whose positions decide which outgoing claims are ARP's ontology. The same
                    // address `/tools` and the MCP node read through, and not a per-request choice
                    // — a reader who could swap it could make the index say anything.
                    attestor: DOMAIN_ATTESTORS,
                    excludeHolders: payers,
                }),
                chain.symbol,
            );
        },
        enabled: atomId !== null,
        // One graph round trip. The edges move when somebody writes or stakes, which is rare enough
        // that a minute of staleness is cheaper than re-asking the indexer on every remount.
        staleTime: 60_000,
        retry: 0,
    };
}

export function useAtomStanding(atomId: string | null) {
    const chain = useChainChoice();
    // Vite types every `import.meta.env` key through an index signature, so the value arrives as
    // `any`; annotating it here keeps that from crossing into a typed parameter.
    const configured: string | undefined = import.meta.env.VITE_ARP_SPONSOR_ADDRESS;
    const payers = arpPayersFor(chain.chainId, configured, deployments.arp);
    return useQuery(atomStandingQueryOptions({...chain, payers}, atomId));
}
