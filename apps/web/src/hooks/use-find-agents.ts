import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {findAgents, type FindAgentsPage} from "@arp-protocol/core";

import {useChainChoice} from "../lib/chain-choice";
import {hiddenAtomIds} from "../services/test-identities";

/**
 * Candidates for a job, from what agents declared about themselves.
 *
 * Lifecycle here, the read in the package. Keyed on the **chain** as well as the search, for the
 * reason `lib/chain-choice.ts` states: the same query against two chains is two different answers,
 * and one served from the other's cache is a list under the wrong heading.
 */

export type FindAgentsFetcher = (domain: string, graphqlUrl: string) => Promise<FindAgentsPage>;

/** ARP's own test agents are left out, as everywhere else (task 74). */
const fetchCandidates: FindAgentsFetcher = async (domain, graphqlUrl) => {
    const [page, hidden] = await Promise.all([
        findAgents(domain, {graphqlUrl, limit: 50}),
        hiddenAtomIds(graphqlUrl),
    ]);
    return {...page, agents: page.agents.filter((agent) => !hidden.has(agent.atomId.toLowerCase()))};
};

function findAgentsQueryKey(chainId: number, domain: string) {
    return ["intuition", chainId, "find-agents", domain] as const;
}

function findAgentsQueryOptions(
    chain: {chainId: number; graphqlUrl: string},
    domain: string,
    fetch: FindAgentsFetcher = fetchCandidates,
) {
    const term = domain.trim();
    return {
        queryKey: findAgentsQueryKey(chain.chainId, term),
        queryFn: (): Promise<FindAgentsPage> => fetch(term, chain.graphqlUrl),
        // Nothing runs on an empty box: a search for everything is not a search.
        enabled: term.length > 0,
        staleTime: 60_000,
        retry: 1,
        // Typing a letter should not blank the list that is already on screen.
        placeholderData: keepPreviousData,
    };
}

export function useFindAgents(domain: string) {
    const chain = useChainChoice();
    return useQuery(findAgentsQueryOptions(chain, domain));
}
