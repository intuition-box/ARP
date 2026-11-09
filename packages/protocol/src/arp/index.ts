/**
 * ARP's own namespace: the two Intuition chain definitions, and nothing else.
 *
 * It held a client, a `ModuleRegistry` reader and an agent-reputation surface — 790 lines, all with
 * zero consumers outside this package, all of it the catalogue ADR `0051` retired. What a namespace
 * for "ARP's own contracts" has left is the chain definitions, because `rules/portability.md` makes
 * this the one file allowed to name a chain. Since task 89 it also names the paying networks an x402
 * line may cite (ADR `0159`), which ARP reads and never signs on.
 */
export {intuitionMainnet, intuitionTestnet} from "./chains.js";
export {ARP_DOMAIN_ATTESTORS} from "./attestors.js";
export {X402_DEFAULT_NETWORKS} from "./x402-networks.js";
