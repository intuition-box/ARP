import type {LineVocabulary} from "../services/landing-field";
import {deployments} from "./deployments";

/**
 * ARP's line words and the wallets that pay for lines and say nothing by it (ADR `0144`). An atom's id
 * does not depend on the chain, so the words are read where ARP made them, testnet 13579.
 */
export const LINE_VOCABULARY: LineVocabulary = {
    rpcUrl: deployments.chain.rpcUrl,
    chainId: deployments.chain.chainId,
    multiVault: deployments.intuition.multiVault,
    inContextOf: deployments.arp.endpointBinding.inContextOf,
    payers: [...new Set([deployments.arp.deployer, deployments.arp.sponsor])],
};
