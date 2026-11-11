import {useQuery} from "@tanstack/react-query";

import {fetchLastPurchase} from "../services/last-purchase";

/** Where ARP's Worker answers, or undefined when this build has none — then there is no card. */
const API_URL: string | undefined = import.meta.env.VITE_ARP_API_URL;

/** Whether this build can read the last purchase at all. Without a Worker the card is absent. */
export const hasLastPurchaseSource = API_URL !== undefined && API_URL.trim().length > 0;

/**
 * nohumans.directory's last purchase of `endpoint`, through ARP's Worker (task 120). Only the
 * endpoint's public URL leaves the browser (ADR `0155`). Kept five minutes, as the Worker's own
 * `cache-control` says; the Worker keeps a listed endpoint's answer six hours.
 */
export function useLastPurchase(endpoint: string | null) {
    return useQuery({
        queryKey: ["last-purchase", API_URL, endpoint],
        enabled: hasLastPurchaseSource && endpoint !== null,
        // `enabled` above holds both to a string whenever this runs.
        queryFn: () => fetchLastPurchase(API_URL as string, endpoint as string),
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}
