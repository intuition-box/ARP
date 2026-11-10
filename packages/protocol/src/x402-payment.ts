import {createPublicClient, getAddress, hexToBigInt, http, isHex, keccak256, stringToBytes, type Address, type Hex} from "viem";

import {ChainUnreadableError, isTransactionAbsent} from "./chain-errors.js";
import {normaliseToolUrl} from "./declare/tool-thing.js";

/**
 * The payment an x402 line refers to, and the check of it at read time (task 89, ADR `0159`).
 *
 * A line about an x402 endpoint can name the transaction that settled the payment, as one more level:
 * `(T3, paid with, "eip155:8453/tx/0x…")`, where T3 is the line's outcome. **Only the network and the
 * hash are written.** The payer, the recipient, the amount and the asset are in the transaction, and
 * a copy on Intuition would be a second source for one datum (`docs/02`): they are read from it,
 * here, every time.
 *
 * The payer is read from the token's `Transfer` log, **never from `tx.from`**, which is the x402
 * facilitator that submitted an EIP-3009 authorisation, or a delegation's redeemer (ADR `0148`).
 *
 * Nothing here signs, sends or spends. It reads a receipt and a block on the paying chain.
 */

/** The predicate of the payment level. A plain string, so its id is the same on every chain. */
export const PAID_WITH_LABEL = "paid with";

/** ERC-20 `Transfer(address indexed from, address indexed to, uint256 value)`. */
export const TRANSFER_TOPIC: Hex = keccak256(stringToBytes("Transfer(address,address,uint256)"));

const NETWORK = /^eip155:([1-9][0-9]{0,9})$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const PAYMENT_LABEL = /^(eip155:[1-9][0-9]{0,9})\/tx\/(0x[0-9a-f]{64})$/;

/** A payment as a line names it: a CAIP-2 network and a settlement transaction. */
export type X402PaymentRef = {network: string; txHash: Hex};

/** The EVM chain id of a CAIP-2 `eip155:<id>` network, or `null` for anything else. */
export function chainIdOfNetwork(network: string): number | null {
    const match = NETWORK.exec(network);
    return match === null ? null : Number(match[1]);
}

/**
 * The payment's atom label, in one spelling: lower case, so one payment is one atom on the graph.
 * Throws on a network that is not `eip155:<id>` or a hash that is not 32 bytes.
 */
export function paymentAtomLabel(ref: X402PaymentRef): string {
    const txHash = ref.txHash.toLowerCase();
    if (chainIdOfNetwork(ref.network) === null) throw new Error(`network ${ref.network} is not eip155:<chain id>`);
    if (!TX_HASH.test(txHash)) throw new Error(`${ref.txHash} is not a transaction hash`);
    return `${ref.network}/tx/${txHash}`;
}

/** The payment a label names, or `null` when the label is not one this module writes. */
export function parsePaymentAtomLabel(label: string): X402PaymentRef | null {
    const match = PAYMENT_LABEL.exec(label);
    if (match === null) return null;
    return {network: match[1] as string, txHash: match[2] as Hex}; // both groups matched
}

/**
 * The longest exact URL a payment level carries. `atomDataMaxLength` is 1,000 bytes on testnet 13579 and
 * on mainnet 1155 (2026-11-10, `scripts/measure/atom-data-max-length.ts`); 512 leaves the network and the
 * hash room under it. Governance can change it, so re-run that script before relying on it again.
 */
export const MAX_EXACT_ENDPOINT_LENGTH = 512;

/**
 * Whether a string is an exact endpoint URL a payment level may carry (task 93, ADR `0162`): `http` or
 * `https` with a host, printable ASCII without a space, at most {@link MAX_EXACT_ENDPOINT_LENGTH}. It is
 * kept **as typed**, never normalised: a reader such as x402 Doctor matches on the URL the payer called.
 */
export function isExactEndpointUrl(value: string): boolean {
    if (value.length === 0 || value.length > MAX_EXACT_ENDPOINT_LENGTH) return false;
    if (!/^https?:\/\/[\x21-\x7e]+$/i.test(value)) return false;
    try {
        return new URL(value).hostname.length > 0;
    } catch {
        return false;
    }
}

/**
 * Whether the exact URL names the tool the line is about: both normalise to one URL. A writer could
 * otherwise name any URL beside somebody else's endpoint (ADR `0162`). The tool's URL is normalised too,
 * so a Thing listed outside `normaliseToolUrl` with `https://www.x.com/` still matches.
 */
export function exactEndpointNamesTool(exact: string, toolUrl: string): boolean {
    if (!isExactEndpointUrl(exact)) return false;
    try {
        return normaliseToolUrl(exact) === normaliseToolUrl(toolUrl);
    } catch {
        return false;
    }
}

const PAYMENT_LEVEL_LABEL = /^(eip155:[1-9][0-9]{0,9})\/tx\/(0x[0-9a-f]{64})(?: (\S+))?$/;

/**
 * The payment level's object, as written on the trace chain (task 93, ADR `0162`): the payment, then one
 * space and the exact URL the payer called. One atom per payment as before, since a settlement pays one
 * call; the URL rides in it so that naming it costs no atom and no triple more. `endpoint` `null` writes
 * the label task 89 wrote. Throws on an endpoint {@link isExactEndpointUrl} refuses.
 */
export function paymentLevelLabel(ref: X402PaymentRef, endpoint: string | null): string {
    const payment = paymentAtomLabel(ref);
    if (endpoint === null) return payment;
    if (!isExactEndpointUrl(endpoint)) throw new Error(`${JSON.stringify(endpoint)} is not an exact http(s) URL a payment level can carry`);
    return `${payment} ${endpoint}`;
}

/**
 * A payment level's object read back: the payment, and the exact URL or `null` when the line is older
 * than task 93 and named none. `null` for a label this module does not write, an exact URL included.
 */
export function parsePaymentLevelLabel(label: string): {ref: X402PaymentRef; endpoint: string | null} | null {
    const match = PAYMENT_LEVEL_LABEL.exec(label);
    if (match === null) return null;
    const endpoint = match[3] ?? null;
    if (endpoint !== null && !isExactEndpointUrl(endpoint)) return null;
    return {ref: {network: match[1] as string, txHash: match[2] as Hex}, endpoint}; // groups 1 and 2 matched
}

/** The networks a payment may be on, with the assets accepted on each. Configuration, never a constant here. */
export type X402NetworkPolicy = ReadonlyMap<string, {assets: readonly Address[]}>;

/** The two reads a check makes on the paying chain. A viem `PublicClient` satisfies it. */
export type X402TransferReads = {
    getTransactionReceipt(args: {hash: Hex}): Promise<{
        status: "success" | "reverted";
        blockNumber: bigint;
        logs: readonly {address: Address; topics: readonly Hex[]; data: Hex}[];
    }>;
    getBlock(args: {blockNumber: bigint}): Promise<{timestamp: bigint}>;
};

/** One token transfer in a transaction, as its log says. */
export type X402Transfer = {asset: Address; payer: Address; payTo: Address; amount: bigint};

export type X402PaymentCheck =
    | {status: "paid"; transfer: X402Transfer; paidAt: number}
    | {status: "refused"; reason: string}
    | {status: "unreadable"; reason: string};

/** Every ERC-20 transfer of an accepted asset in a transaction's logs. ERC-721 has a fourth topic, and is left out. */
export function transfersIn(
    logs: readonly {address: Address; topics: readonly Hex[]; data: Hex}[],
    assets: readonly Address[],
): X402Transfer[] {
    const accepted = new Set(assets.map((asset) => asset.toLowerCase()));
    const word = (topic: Hex | undefined) => getAddress(`0x${(topic ?? "").slice(26)}`);
    return logs
        .filter(
            (log) =>
                accepted.has(log.address.toLowerCase()) &&
                log.topics.length === 3 &&
                log.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
                isHex(log.data) &&
                log.data.length === 66,
        )
        .map((log) => ({
            asset: getAddress(log.address),
            payer: word(log.topics[1]),
            payTo: word(log.topics[2]),
            amount: hexToBigInt(log.data),
        }));
}

/**
 * Read a payment and keep it only when it is one transfer, of an accepted asset, from one of `payers`.
 *
 * - `payers` are the addresses the line's writer can pay from: the wallet that stands behind the line
 *   and, when the agent has one, its ERC-8004 `agentWallet`. The caller says which; this reads none.
 * - Several transfers from those addresses in one transaction are refused: which one the line is
 *   about cannot be told, and a guess would be ARP's word, not the payer's.
 * - A transfer to the payer itself, or of nothing, pays no one.
 *
 * `refused` is an answer about the payment. `unreadable` is the chain not answering, and says nothing.
 */
export async function checkX402Payment(params: {
    ref: X402PaymentRef;
    payers: readonly Address[];
    policy: X402NetworkPolicy;
    reads: X402TransferReads;
}): Promise<X402PaymentCheck> {
    const {ref, policy, reads} = params;
    const allowed = policy.get(ref.network);
    if (allowed === undefined) return {status: "refused", reason: `network ${ref.network} is not one this reader accepts`};
    if (!TX_HASH.test(ref.txHash.toLowerCase())) return {status: "refused", reason: `${ref.txHash} is not a transaction hash`};
    let receipt;
    try {
        receipt = await reads.getTransactionReceipt({hash: ref.txHash});
    } catch (error) {
        if (isTransactionAbsent(error)) return {status: "refused", reason: `transaction ${ref.txHash} not found on ${ref.network}`};
        return {status: "unreadable", reason: new ChainUnreadableError(`transaction ${ref.txHash}`, error).message};
    }
    if (receipt.status !== "success") return {status: "refused", reason: `transaction ${ref.txHash} reverted`};
    const payers = new Set(params.payers.map((payer) => payer.toLowerCase()));
    const from = transfersIn(receipt.logs, allowed.assets).filter((transfer) => payers.has(transfer.payer.toLowerCase()));
    if (from.length === 0) {
        return {status: "refused", reason: `no transfer of an accepted asset from ${[...params.payers].join(" or ")} in ${ref.txHash}`};
    }
    if (from.length > 1) return {status: "refused", reason: `${from.length} transfers from the payer in ${ref.txHash}; which one is meant cannot be told`};
    const transfer = from[0] as X402Transfer; // length checked above
    if (transfer.payTo === transfer.payer) return {status: "refused", reason: "the transfer pays its own sender"};
    if (transfer.amount === 0n) return {status: "refused", reason: "the transfer moves nothing"};
    let block;
    try {
        block = await reads.getBlock({blockNumber: receipt.blockNumber});
    } catch (error) {
        return {status: "unreadable", reason: new ChainUnreadableError(`block ${receipt.blockNumber}`, error).message};
    }
    return {status: "paid", transfer, paidAt: Number(block.timestamp)};
}

/** Read-only reads of a paying chain over one RPC URL. Nothing here can sign: there is no account. */
export function x402TransferReads(rpcUrl: string): X402TransferReads {
    const client = createPublicClient({transport: http(rpcUrl, {timeout: 20_000})});
    return {
        getTransactionReceipt: (args) => client.getTransactionReceipt(args),
        getBlock: (args) => client.getBlock(args),
    };
}

/** A network table: the assets accepted on each paying network, and a public RPC to read it. */
export type X402NetworkTable = ReadonlyMap<string, {assets: readonly Address[]; rpcUrl: string}>;

const NETWORK_ENTRY = /^(eip155:[1-9][0-9]{0,9})=(0x[0-9a-fA-F]{40})$/;

/**
 * `defaults` plus the networks an operator adds by configuration (task 91, ADR `0160`):
 * `ARP_X402_NETWORKS="eip155:84532=0x036C…CF7e"`, comma-separated, one accepted asset per entry. A
 * network not in `defaults` has no public RPC here, so `ARP_X402_RPC_<chain id>` must name one.
 * Throws on a malformed entry or a missing RPC, so a typo is never a network silently left out.
 */
export function x402NetworksFrom(defaults: X402NetworkTable, env: Readonly<Record<string, string | undefined>>): X402NetworkTable {
    const table = new Map([...defaults].map(([network, entry]) => [network, {assets: [...entry.assets], rpcUrl: entry.rpcUrl}]));
    const added = (env["ARP_X402_NETWORKS"] ?? "").split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
    for (const entry of added) {
        const match = NETWORK_ENTRY.exec(entry);
        if (match === null) throw new Error(`ARP_X402_NETWORKS: "${entry}" is not eip155:<chain id>=<asset address>`);
        const network = match[1] as string; // matched
        const asset = getAddress(match[2] as string); // matched, 40 hex digits
        const rpcUrl = env[`ARP_X402_RPC_${chainIdOfNetwork(network) ?? ""}`] ?? table.get(network)?.rpcUrl;
        if (rpcUrl === undefined || rpcUrl === "") {
            throw new Error(`ARP_X402_NETWORKS adds ${network}: set ARP_X402_RPC_${chainIdOfNetwork(network)} to an RPC that reads it`);
        }
        const known = table.get(network);
        const assets = known === undefined ? [asset] : known.assets.includes(asset) ? known.assets : [...known.assets, asset];
        table.set(network, {assets, rpcUrl});
    }
    return table;
}

/** A policy from a network table, such as `X402_DEFAULT_NETWORKS`. */
export function x402Policy(networks: ReadonlyMap<string, {assets: readonly Address[]}>): X402NetworkPolicy {
    return new Map([...networks].map(([network, {assets}]) => [network, {assets}]));
}

/**
 * The policy and a read-only client per network, from a network table and an environment: the RPC of
 * chain `<id>` is `ARP_X402_RPC_<id>` when set, the table's public one otherwise. Clients are made once.
 */
export function x402Reading(
    networks: ReadonlyMap<string, {assets: readonly Address[]; rpcUrl: string}>,
    env: Readonly<Record<string, string | undefined>>,
): {policy: X402NetworkPolicy; readsFor(network: string): X402TransferReads} {
    const clients = new Map<string, X402TransferReads>();
    return {
        policy: x402Policy(networks),
        readsFor(network) {
            const known = clients.get(network);
            if (known !== undefined) return known;
            const entry = networks.get(network);
            if (entry === undefined) throw new Error(`network ${network} is not configured`);
            const reads = x402TransferReads(env[`ARP_X402_RPC_${chainIdOfNetwork(network) ?? ""}`] ?? entry.rpcUrl);
            clients.set(network, reads);
            return reads;
        },
    };
}
