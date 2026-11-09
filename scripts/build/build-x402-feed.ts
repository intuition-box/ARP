/** Build the x402 outcomes feed from testnet 13579 (task 89, ADR `0159`). Holds no key; reads only.
 *
 *      bun run scripts/build/build-x402-feed.ts [--out apps/web/public/feeds/x402-outcomes.json]
 *
 *  Reads every line that names an x402 payment, `(outcome, paid with, "eip155:<chain>/tx/<hash>")`, on
 *  Intuition testnet 13579, and keeps a record only when the payment checks on its own chain now: the
 *  transaction exists and succeeded, and it holds one transfer of an accepted asset (USDC on Base)
 *  from the wallet that wrote the line or from that agent's ERC-8004 `agentWallet`. Base is read at
 *  `https://mainnet.base.org` unless `ARP_X402_RPC_8453` names another RPC. `ARP_X402_NETWORKS` adds a
 *  network and its asset, with `ARP_X402_RPC_<chain id>` to read it (ADR `0160`):
 *
 *      ARP_X402_NETWORKS=eip155:84532=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
 *      ARP_X402_RPC_84532=https://sepolia.base.org bun run scripts/build/build-x402-feed.ts
 *
 *  The file is a dated snapshot (ADR `0154`): rerun it to refresh. It refuses to write when a paying
 *  chain does not answer, so a record never goes missing because of an outage.
 */
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname} from "node:path";

import {createGraphqlTransport, defaultFetch} from "../../packages/graphql/src/index.ts";
import {createPublicClient, getAddress, http, parseAbi, stringToHex, type Address, type Hex} from "viem";

import deployment from "../../data/deployments/13579.json";
import {BECAUSE_LABEL, HAS_OUTCOME_LABEL} from "../../packages/protocol/src/declare/usage-context.ts";
import {multiVaultReads} from "../../packages/protocol/src/declare/multivault.ts";
import {INTUITION_USES_TERM_ID, isContractRevert} from "../../packages/protocol/src/index.ts";
import {X402_DEFAULT_NETWORKS} from "../../packages/protocol/src/arp/x402-networks.ts";
import {buildX402Feed} from "../../packages/protocol/src/x402-feed.ts";
import {PAID_WITH_LABEL, x402NetworksFrom, x402Reading} from "../../packages/protocol/src/x402-payment.ts";

const at = process.argv.indexOf("--out");
const out = at === -1 ? "apps/web/public/feeds/x402-outcomes.json" : (process.argv[at + 1] ?? "");
if (out === "") {
    console.error("--out takes a path");
    process.exit(1);
}

const chainId = deployment.chain.chainId;
const reads = multiVaultReads({address: deployment.intuition.multiVault as Hex, chainId, rpcUrl: deployment.chain.rpcUrl}); // an address in this repo's record
const [paidWith, hasOutcome, because] = await Promise.all([PAID_WITH_LABEL, HAS_OUTCOME_LABEL, BECAUSE_LABEL].map((label) => reads.atomId(stringToHex(label))));

// ARP's registry on 13579 is the only one whose agents this build reads keys for. A label is anyone's
// to write, so the feed uses an agentWallet only when the line's writer holds that agent (x402-feed.ts).
const registry = createPublicClient({transport: http(deployment.chain.rpcUrl)});
const registryAbi = parseAbi(["function ownerOf(uint256) view returns (address)", "function getAgentWallet(uint256) view returns (address)"]);
const ZERO = "0x0000000000000000000000000000000000000000";
/** A revert is the registry's "none"; anything else is an outage, and stops the build. */
const noneOnRevert = (error: unknown): null => {
    if (isContractRevert(error)) return null;
    throw error;
};
const AGENT_LABEL = new RegExp(`^Agent ${chainId}:([0-9]{1,20})$`);
async function agentKeys(identity: {atomId: string; label: string | null}): Promise<{owner: Address; agentWallet: Address | null} | null> {
    const match = identity.label === null ? null : AGENT_LABEL.exec(identity.label);
    if (match === null) return null;
    const address = getAddress(deployment.arp.identityRegistry);
    const id = BigInt(match[1] as string); // matched digits
    const owner = await registry.readContract({address, abi: registryAbi, functionName: "ownerOf", args: [id]}).catch(noneOnRevert);
    if (owner === null) return null;
    const wallet = await registry.readContract({address, abi: registryAbi, functionName: "getAgentWallet", args: [id]}).catch(noneOnRevert);
    return {owner, agentWallet: wallet === null || wallet === ZERO ? null : wallet};
}

const reading = x402Reading(x402NetworksFrom(X402_DEFAULT_NETWORKS, process.env), process.env);
const feed = await buildX402Feed({
    transport: createGraphqlTransport({url: deployment.chain.graphqlUrl, fetch: defaultFetch(), timeoutMs: 20_000}),
    trace: {chain: `eip155:${chainId}`, graphql: deployment.chain.graphqlUrl},
    predicates: {paidWith, hasOutcome, because, inContextOf: deployment.arp.endpointBinding.inContextOf, uses: INTUITION_USES_TERM_ID},
    payers: [deployment.arp.deployer, deployment.arp.sponsor],
    policy: reading.policy,
    readsFor: reading.readsFor,
    agentKeys,
    generatedAt: new Date().toISOString(),
});

mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, `${JSON.stringify(feed, null, 2)}\n`);
console.log(`${feed.records.length} records, ${feed.skipped.count} skipped, truncated ${feed.truncated}: ${out}`);
