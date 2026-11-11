import {getAddress, hashTypedData, isAddress, isHex, type Address, type Hex} from "viem";

import {
    contentReceiptTypedData,
    corroborationOf,
    verifyContentReceipt,
    type ContentReceipt,
    type SignedContentReceipt,
} from "./receipt.js";
import {isVersionDigest} from "./skill-version.js";

/**
 * What backs a line, besides the writer's word (task 127, ADR `0192`). One module today: ARP's node's content
 * receipt, "I served this directory, digest D, to this key at T" (`receipt.ts`).
 *
 * The line gains one level, `(T3, has evidence, content-receipt:<hash>)`, on the outcome as `paid with` is. `<hash>`
 * is the receipt's EIP-712 hash, so the atom names one signed receipt and nothing else; the sponsoring service
 * keeps the receipt and serves it at `GET /receipt?hash=`, where a stranger recovers its signer and recomputes its
 * digest with `sha256sum` against the repository at the receipt's commit.
 *
 * **It attests access, never use.** And its signer is ARP's node, a party to the exchange: the evidence weighs 1
 * (`docs/28`), as every line does, until two independent parties can be told from one.
 */

/** The evidence predicate's label. One word for every evidence module, so a reader reads one level. */
export const HAS_EVIDENCE_LABEL = "has evidence";

/** The prefix of a content receipt's evidence atom. */
export const CONTENT_RECEIPT_EVIDENCE_PREFIX = "content-receipt:";

const HASH = /^0x[0-9a-f]{64}$/;
const LABEL = /^content-receipt:(0x[0-9a-f]{64})$/;

/** The EIP-712 hash of a signed receipt's typed data, lower case: what the line request signs and the atom names. */
export function contentReceiptHash(receipt: ContentReceipt, chainId: number): Hex {
    return hashTypedData(contentReceiptTypedData(receipt, chainId)).toLowerCase() as Hex; // viem returns 0x-hex
}

/** `content-receipt:<hash>`. Throws on anything but a lower-case 32-byte hash. */
export function receiptEvidenceLabel(hash: string): string {
    if (!HASH.test(hash)) throw new Error(`${hash} is not a receipt hash, 0x and 64 lower-case hex`);
    return `${CONTENT_RECEIPT_EVIDENCE_PREFIX}${hash}`;
}

/** The receipt hash an evidence atom's label names, or `null` for any other label. */
export function receiptHashOfEvidenceLabel(label: string | null | undefined): Hex | null {
    const match = label === null || label === undefined ? null : LABEL.exec(label);
    return match === null ? null : (match[1] as Hex); // the regex matched 0x and 64 hex
}

export function isReceiptHash(value: unknown): value is Hex {
    return typeof value === "string" && HASH.test(value);
}

export type ReceiptEvidenceVerdict =
    | {status: "accepted"; hash: Hex; signer: Address}
    | {status: "refused"; reason: string};

/**
 * Whether `signed` backs a line by `agent` about `tool`, on version `version`. Every condition, in this order:
 * the hash is the one the request signed; the signature recovers; the receipt is for this chain; its signer is one
 * the reader accepts and it served `agent` (`corroborationOf` is `second-party`); it names the line's tool atom;
 * and **its digest is the line's version** — a receipt over other files is not evidence for this line.
 */
export async function checkReceiptEvidence(params: {
    signed: unknown;
    /** The hash the line request signed. */
    hash: string;
    agent: Address;
    tool: Hex;
    version: string;
    chainId: number;
    /** The content-receipt signers this reader accepts. Empty refuses every receipt. */
    accepted: readonly Address[];
}): Promise<ReceiptEvidenceVerdict> {
    const refused = (reason: string): ReceiptEvidenceVerdict => ({status: "refused", reason});
    const signed = params.signed;
    if (typeof signed !== "object" || signed === null) return refused("no receipt beside the request");
    const {receipt, chainId, node, signature} = signed as Partial<SignedContentReceipt>; // each field checked below
    if (typeof receipt !== "object" || receipt === null) return refused("no receipt beside the request");
    if (typeof chainId !== "number" || typeof node !== "string" || !isAddress(node) || typeof signature !== "string" || !isHex(signature)) {
        return refused("the receipt is malformed");
    }
    if (!isVersionDigest(params.version)) return refused("evidence needs the line's version");
    const whole = {receipt, chainId, node, signature} as SignedContentReceipt; // fields checked above and by the verifier
    const verdict = await verifyContentReceipt(whole);
    if (verdict.status !== "valid") return refused(`the receipt is ${verdict.status}`);
    let hash: Hex;
    try {
        hash = contentReceiptHash(receipt, chainId);
    } catch {
        return refused("the receipt is malformed");
    }
    if (hash !== params.hash.toLowerCase()) return refused("the receipt is not the one the request names");
    if (chainId !== params.chainId) return refused(`the receipt is for chain ${chainId}, the line for ${params.chainId}`);
    const read = corroborationOf(receipt, verdict.signer, params.agent, params.accepted);
    if (read.status !== "second-party") return refused(`the receipt is ${read.status}`);
    if (receipt.atom.toLowerCase() !== params.tool.toLowerCase()) return refused("the receipt names another tool");
    if (receipt.digest.toLowerCase() !== params.version.toLowerCase()) {
        return refused("the receipt's digest is not the line's version: it was over other files");
    }
    return {status: "accepted", hash, signer: getAddress(verdict.signer)};
}
