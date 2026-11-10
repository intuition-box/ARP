import {useQuery} from "@tanstack/react-query";

import {readAgentContentsOf, type AgentKey} from "../services/agent-contents";

/**
 * What an agent offers, for its page (task 96): endpoints, protocols, x402, auth, and its answer in
 * the sieve's reading. Not used by a page yet: the agent page is being reworked elsewhere, and this
 * is the hook it drops in (`docs/tasks/96`).
 *
 * Keyed like `use-agent-endpoints.ts`, on the registration file, plus the agent for its sieve row.
 */
export function useAgentContents(agent: AgentKey) {
    return useQuery({
        queryKey: ["agent-contents", agent.registrationFile ?? "none", agent.chainId, agent.tokenId] as const,
        queryFn: () => readAgentContentsOf(agent),
        staleTime: 600_000,
        // One retry: a CORS refusal is permanent, as in `use-agent-endpoints.ts`.
        retry: 1,
    });
}
