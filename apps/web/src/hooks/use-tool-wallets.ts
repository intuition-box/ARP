import {useQuery} from "@tanstack/react-query";
import {getToolWallets, type ToolWallet} from "@arp-protocol/core";

import {useChainChoice} from "../lib/chain-choice";
import {isHiddenAddress} from "../services/test-identities";
import {useSponsorAddress} from "./use-tool-catalog";

/** The wallets the sponsor deposited for on a tool. Nothing to read where no sponsor is known. */
export function useToolWallets(atomId: string) {
    const chain = useChainChoice();
    const sponsor = useSponsorAddress();
    return useQuery({
        queryKey: ["intuition", chain.chainId, "tool-wallets", atomId, sponsor ?? "none"] as const,
        queryFn: async (): Promise<ToolWallet[]> => {
            if (sponsor === null) throw new Error("no sponsor");
            return getToolWallets(atomId, {graphqlUrl: chain.graphqlUrl, sponsor});
        },
        // Every deposit a listed address signed is one of ARP's tests (task 74): nothing to show.
        enabled: sponsor !== null && !isHiddenAddress(sponsor),
        staleTime: 120_000,
        retry: 1,
    });
}
