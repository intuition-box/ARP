import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {getPulseUsage, listTools} from "@arp-protocol/core";

import {useChainChoice} from "../lib/chain-choice";
import {LINE_VOCABULARY} from "../lib/line-vocabulary";
import {
    buildLandingField,
    loadLandingField,
    readPaidWords,
    readVocabularyIds,
    type LandingField,
    type LandingFieldReads,
} from "../services/landing-field";
import {fieldOrSample} from "../services/landing-sample";
import {hiddenAtomIds} from "../services/test-identities";

export type LandingFieldRead =
    | {status: "pending"}
    | {status: "failed"}
    /** Answered with nothing: the field is `landing-sample.ts`'s, unmarked (ADR `0152`). */
    | {status: "ok"; field: LandingField};

const READS: LandingFieldReads = {
    listTools,
    getPulseUsage,
    hiddenAtomIds,
    vocabularyIds: readVocabularyIds,
};

export function landingFieldQueryOptions(
    chain: {chainId: number; graphqlUrl: string},
    reads: LandingFieldReads = READS,
) {
    return {
        // The chain leads the key: the most declared tool is a fact about one chain.
        queryKey: ["intuition", chain.chainId, "landing-field"] as const,
        queryFn: () => loadLandingField(chain, LINE_VOCABULARY, reads),
        staleTime: 120_000,
        retry: 0,
    };
}

/**
 * The landing's claim field: the most declared tool on the chain the reader chose, its claims and
 * its latest line. The paid words come from GitHub in a read of their own, so the field never
 * waits on GitHub and loses only that reading when GitHub does not answer.
 */
export function useLandingField(): LandingFieldRead {
    const chain = useChainChoice();
    const read = useQuery(landingFieldQueryOptions(chain));
    const label = read.data?.tool?.label ?? null;
    const paid = useQuery({
        queryKey: ["github", "paid-words", label] as const,
        queryFn: () => readPaidWords(label),
        enabled: read.data?.tool !== null && read.data?.tool !== undefined,
        staleTime: 15 * 60 * 1000,
        retry: 0,
    });
    const paidWords = paid.data;
    const data = read.data;
    const field = useMemo(
        () =>
            data === undefined
                ? null
                : buildLandingField({
                      tool: data.tool,
                      usage: data.usage,
                      hidden: data.hidden,
                      paidWords: paidWords ?? [],
                  }),
        [data, paidWords],
    );
    if (read.isPending) return {status: "pending"};
    if (field === null) return {status: "failed"};
    return {status: "ok", field: fieldOrSample(field)};
}
