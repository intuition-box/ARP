/** Writes task 127's three levels on a local fork of testnet 13579, never on the chain itself (ADR `0192`).
 *
 *      anvil --fork-url https://testnet.rpc.intuition.systems/http --port 8546 &
 *      bun run scripts/sandbox/versioned-line-fork.ts --rpc http://127.0.0.1:8546
 *
 *  On the fork, against the real MultiVault and its real terms: the type `(ARP's skill, has type, Skill)` as
 *  `/list-tool` plans it, the version `V = (skill, version, sha256:<digest of skills/arp>)`, the use
 *  `T1 = (agent, uses, V)` with a triple as its object, the outcome on T1, and the evidence
 *  `(outcome, has evidence, content-receipt:<hash>)`. Every planned term is then read back with `isTermCreated`.
 *
 *  It signs with anvil's first development key, which is public and holds nothing anywhere else, and it refuses
 *  any RPC that is not loopback, so nothing it sends can reach 13579. The agent atom is a fork-only atom; the
 *  receipt is signed by a key generated for the run. Prints JSON: the ids and whether each exists.
 */
import {createPublicClient, createWalletClient, defineChain, http, keccak256, stringToBytes, stringToHex, type Hex} from "viem";
import {generatePrivateKey, privateKeyToAccount} from "viem/accounts";

import deployment from "../../data/deployments/13579.json";
import {encodeCreateAtom, encodeCreateTriple, multiVaultReads} from "../../packages/protocol/src/declare/multivault.ts";
import {prepareUsageContext} from "../../packages/protocol/src/declare/usage-context.ts";
import {planVersionedUse} from "../../packages/protocol/src/declare/versioned-use.ts";
import {contentReceiptHash, receiptEvidenceLabel} from "../../packages/protocol/src/line-evidence.ts";
import {skillDirectoryDigest} from "../../packages/protocol/src/node/skill-directory.ts";
import {signContentReceipt} from "../../packages/protocol/src/receipt.ts";
import {USES} from "../../packages/protocol/src/sources/intuition/terms.ts";
import {planToolListing} from "../../packages/protocol/src/sponsor/list-tool.ts";

const at = process.argv.indexOf("--rpc");
const rpc = at === -1 ? "" : (process.argv[at + 1] ?? "");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(rpc)) {
    throw new Error("--rpc is a loopback anvil fork, http://127.0.0.1:<port>: this script never sends to a real chain");
}

/** Anvil's first development account: a published key that holds nothing outside a local node. */
const ANVIL_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(ANVIL_0);
const chain = defineChain({
    id: deployment.chain.chainId,
    name: "Intuition testnet fork",
    nativeCurrency: deployment.chain.nativeCurrency,
    rpcUrls: {default: {http: [rpc]}},
});
const multiVault = deployment.intuition.multiVault as Hex; // an address in this repo's record
const reads = multiVaultReads({address: multiVault, chainId: chain.id, rpcUrl: rpc});
const wallet = createWalletClient({account, chain, transport: http(rpc)});
const client = createPublicClient({chain, transport: http(rpc)});

const SKILL_URL = "https://github.com/intuition-box/ARP?skill=arp";
const sent: {why: string; hash: Hex; status: string}[] = [];
async function send(call: {to: Hex; value: bigint; data: Hex; why: string}) {
    const hash = await wallet.sendTransaction({to: call.to, value: call.value, data: call.data});
    const receipt = await client.waitForTransactionReceipt({hash});
    sent.push({why: call.why, hash, status: receipt.status});
    if (receipt.status !== "success") throw new Error(`${call.why}: ${hash} reverted`);
}

// 1. The type, as `/list-tool` plans it for a skill that is already listed.
const listing = await planToolListing({url: SKILL_URL, reads});
for (const call of listing.calls) await send(call);

// 2. The version: the digest of this repository's `skills/arp`, the files ARP's own skill ships.
const digest = skillDirectoryDigest(new URL("../../skills/arp", import.meta.url).pathname);
if (digest === null) throw new Error("skills/arp could not be read");
const versioned = await planVersionedUse({tool: listing.atomId, digest, reads});
for (const call of versioned.calls) await send(call);

// 3. A fork-only agent atom, and T1 = (agent, uses, V): a triple whose object is a triple.
const agentData = stringToHex(`fork-agent-${Date.now()}`);
const agentAtom = await reads.atomId(agentData);
const [atomCost, tripleCost, minDeposit] = await Promise.all([reads.atomCost(), reads.tripleCost(), reads.minDeposit()]);
await send({to: multiVault, value: atomCost + minDeposit, data: encodeCreateAtom(agentData, atomCost + minDeposit), why: "a fork-only agent atom"});
const t1 = await reads.tripleId(agentAtom, USES, versioned.versionTripleId);
await send({
    to: multiVault,
    value: tripleCost + minDeposit,
    data: encodeCreateTriple(agentAtom, USES, versioned.versionTripleId, tripleCost + minDeposit),
    why: "T1 = (agent, uses, V)",
});

// 4. The outcome on T1, and the evidence on the outcome.
const node = privateKeyToAccount(generatePrivateKey());
const receipt = await signContentReceipt(
    {atom: listing.atomId, url: SKILL_URL, path: "skills/arp", digest, to: account.address, servedAt: Math.floor(Date.now() / 1000), nonce: keccak256(stringToBytes(`fork-${Date.now()}`))},
    chain.id,
    node,
);
const evidence = receiptEvidenceLabel(contentReceiptHash(receipt.receipt, chain.id));
const plan = await prepareUsageContext({
    usesTripleId: t1,
    outcome: "worked",
    evidence,
    inContextOf: deployment.arp.endpointBinding.inContextOf as Hex, // an id in this repo's record
    isCategory: async () => false,
    reads,
});
if (plan.status !== "planned") throw new Error(`the levels were refused: ${plan.detail}`);
for (const call of plan.calls) await send(call);

const exists = async (id: Hex | null) => (id === null ? null : await reads.termExists(id));
console.log(
    JSON.stringify(
        {
            rpc,
            chainId: chain.id,
            skill: {url: SKILL_URL, atomId: listing.atomId, typeTriple: listing.type?.tripleId ?? null, typeExists: await exists(listing.type?.tripleId ?? null)},
            version: {digest, digestAtom: versioned.digestAtomId, V: versioned.versionTripleId, exists: await exists(versioned.versionTripleId)},
            t1: {id: t1, objectIsV: true, exists: await exists(t1)},
            outcome: {id: plan.outcomeTripleId, exists: await exists(plan.outcomeTripleId)},
            evidence: {label: evidence, id: plan.evidenceTripleId, exists: await exists(plan.evidenceTripleId)},
            sent,
        },
        null,
        2,
    ),
);
