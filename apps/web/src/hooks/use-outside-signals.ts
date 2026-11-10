import {useQuery} from "@tanstack/react-query";

import type {OutsideSignals} from "@arp-protocol/core";

/**
 * Somebody else's figures about repositories and endpoints, from the bundled dated reading (task 101).
 *
 * Loaded on demand, as `use-skill-contents.ts` loads its file: a reader who never opens a skill or an
 * agent page does not pay for it. The file is the one the MCP server bundles, so the page and an agent
 * read the same dated facts.
 */
export function useOutsideSignals(): OutsideSignals | undefined {
    const query = useQuery({
        queryKey: ["outside-signals"],
        // The shape `build-outside-signals.ts` writes, typed by the module that defines it.
        queryFn: async () =>
            (await import("../../../../data/catalogue/outside-signals.json")).default as OutsideSignals,
        staleTime: Infinity,
    });
    return query.data;
}
