import {useQuery} from "@tanstack/react-query";

import {deployments} from "../lib/deployments";
import {loadPulse, pulseContentsEntry, type PulseView} from "../services/pulse";
import type {SkillContentsRead} from "./use-skill-contents";

export type PulseRead =
    | {status: "pending"}
    | {status: "failed"}
    /** `contents` is `null` when no file was read; dated by when this page read it. */
    | {status: "ok"; view: PulseView; contents: SkillContentsRead | null};

/** Testnet 13579, like the rest of ARP's own reads (`rules/portability.md`). Cached: GitHub allows 60 an hour. */
export function usePulse(source: string, skill: string): PulseRead {
    const query = useQuery({
        queryKey: ["pulse", source, skill],
        queryFn: () =>
            loadPulse(source, skill, {
                chainId: deployments.chain.chainId,
                multiVault: deployments.intuition.multiVault,
                rpcUrl: deployments.chain.rpcUrl,
                graphqlUrl: deployments.chain.graphqlUrl,
                inContextOf: deployments.arp.endpointBinding.inContextOf,
                // The deployer sent for the sponsor until it was hosted with its own key (ADR `0149`).
                linePayers: [...new Set([deployments.arp.deployer, deployments.arp.sponsor])],
            }),
        staleTime: 15 * 60 * 1000,
        retry: 1,
    });
    if (query.data !== undefined) {
        const entry = pulseContentsEntry(query.data.pulse);
        return {
            status: "ok",
            view: query.data,
            contents:
                entry === null
                    ? null
                    : {status: "read", measuredAt: new Date(query.dataUpdatedAt).toISOString(), entry},
        };
    }
    return query.isError ? {status: "failed"} : {status: "pending"};
}
