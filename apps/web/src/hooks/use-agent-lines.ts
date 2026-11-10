import {useQuery} from "@tanstack/react-query";
import {getAgentLines} from "@arp-protocol/core";

import {useChainChoice} from "../lib/chain-choice";
import {LINE_VOCABULARY} from "../lib/line-vocabulary";
import {loadAgentLines, type AgentLinesReads} from "../services/agent-lines";
import {readVocabularyIds} from "../services/landing-field";
import {hiddenAtomIds} from "../services/test-identities";

const READS: AgentLinesReads = {getAgentLines, hiddenAtomIds, vocabularyIds: readVocabularyIds};

/** The agent's lines on the chain the reader chose. Off until the page knows the agent's atom. */
export function useAgentLines(atomId: string | null, reads: AgentLinesReads = READS) {
    const chain = useChainChoice();
    return useQuery({
        queryKey: ["intuition", chain.chainId, "agent-lines", atomId] as const,
        queryFn: () => {
            // `enabled` keeps this from running without an atom.
            if (atomId === null) throw new Error("no atom to read");
            return loadAgentLines(atomId, chain, LINE_VOCABULARY, reads);
        },
        enabled: atomId !== null,
        staleTime: 120_000,
        retry: 0,
    });
}
