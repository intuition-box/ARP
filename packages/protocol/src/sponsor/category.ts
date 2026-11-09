import {getAddress, isAddress, isHex, recoverTypedDataAddress, type Address, type Hex} from "viem";

/**
 * What an agent signs to have ARP's sponsoring service add a category to the domain tree (task 73,
 * ADR `0146`): "Agent `agentId`, held by `agent`, asks that `label` sit under `parent`, and that
 * `subject` be filed under it, because `reason`, before `expiresAt`."
 *
 * The tree is read through ARP's attestors only (ADR `0124`), so an agent's own triples would not
 * count: the service writes them, and this signature is what lets it know which agent asked. The rules
 * a category meets are `planCategory`'s, checked by the service, not here.
 *
 * **Nothing on chain checks this signature**, so the domain has no `verifyingContract`, as in
 * `line.ts`. The service spends each `nonce` once, in its ledger. Testnet 13579 only.
 */
export const CATEGORY_REQUEST_TYPES = {
    CategoryRequest: [
        {name: "agent", type: "address"},
        {name: "agentRegistry", type: "string"},
        {name: "agentId", type: "string"},
        {name: "label", type: "string"},
        {name: "parent", type: "string"},
        {name: "subject", type: "bytes32"},
        {name: "reason", type: "string"},
        {name: "nonce", type: "bytes32"},
        {name: "expiresAt", type: "uint256"},
    ],
} as const;

export const CATEGORY_REQUEST_MAX_TTL_SECONDS = 3_600;
/** The sponsor's own bounds on what it hashes and logs (`apps/sponsor`, `propose-category.ts`). */
export const CATEGORY_REQUEST_MAX_LABEL_LENGTH = 64;
export const CATEGORY_REQUEST_MAX_REASON_LENGTH = 500;

export type CategoryRequest = {
    /** The address that holds the agent. */
    agent: Address;
    agentRegistry: string;
    agentId: string;
    /** The category, new or existing. */
    label: string;
    /** The existing category it sits under. `""` when `label` already exists. */
    parent: string;
    /** The skill or tool atom filed under it. */
    subject: Hex;
    /** Why no existing category fits. `""` when `label` already exists. */
    reason: string;
    nonce: Hex;
    /** Unix seconds. */
    expiresAt: number;
};

export type SignedCategoryRequest = {request: CategoryRequest; chainId: number; signature: Hex};

export type CategoryRequestVerdict =
    | {status: "valid"; address: Address}
    | {status: "mismatch"; declared: Address; recovered: Address}
    | {status: "expired"; expiresAt: number}
    | {status: "malformed"; reason: string};

export function categoryRequestTypedData(request: CategoryRequest, chainId: number) {
    return {
        domain: {name: "ARP Category Request", version: "1", chainId} as const,
        types: CATEGORY_REQUEST_TYPES,
        primaryType: "CategoryRequest" as const,
        message: {...request, expiresAt: BigInt(request.expiresAt)},
    };
}

export type CategoryRequestSigner = {
    signTypedData(data: ReturnType<typeof categoryRequestTypedData>): Promise<Hex>;
};

export async function signCategoryRequest(
    request: CategoryRequest,
    chainId: number,
    signer: CategoryRequestSigner,
): Promise<SignedCategoryRequest> {
    return {request, chainId, signature: await signer.signTypedData(categoryRequestTypedData(request, chainId))};
}

const isBytes32 = (value: unknown): value is Hex => typeof value === "string" && isHex(value) && value.length === 66;

/** Every field is read before the signer is recovered. `now` is unix seconds. */
export async function verifyCategoryRequest(signed: unknown, now: number): Promise<CategoryRequestVerdict> {
    if (typeof signed !== "object" || signed === null) return {status: "malformed", reason: "no request"};
    const {request, chainId, signature} = signed as Partial<SignedCategoryRequest>; // each field is checked below
    if (typeof request !== "object" || request === null) return {status: "malformed", reason: "no request"};
    if (typeof chainId !== "number" || !Number.isInteger(chainId)) return {status: "malformed", reason: "chainId"};
    if (typeof signature !== "string" || !isHex(signature)) return {status: "malformed", reason: "signature"};
    const {agent, agentRegistry, agentId, label, parent, subject, reason, nonce, expiresAt} = request;
    if (typeof agent !== "string" || !isAddress(agent)) return {status: "malformed", reason: "agent"};
    if (typeof agentRegistry !== "string" || typeof agentId !== "string") return {status: "malformed", reason: "agent reference"};
    if (typeof label !== "string" || label.length === 0 || label.length > CATEGORY_REQUEST_MAX_LABEL_LENGTH) {
        return {status: "malformed", reason: "label"};
    }
    if (typeof parent !== "string" || parent.length > CATEGORY_REQUEST_MAX_LABEL_LENGTH) return {status: "malformed", reason: "parent"};
    if (!isBytes32(subject)) return {status: "malformed", reason: "subject"};
    if (typeof reason !== "string" || reason.length > CATEGORY_REQUEST_MAX_REASON_LENGTH) return {status: "malformed", reason: "reason"};
    if (!isBytes32(nonce)) return {status: "malformed", reason: "nonce"};
    if (typeof expiresAt !== "number" || !Number.isInteger(expiresAt)) return {status: "malformed", reason: "expiresAt"};
    if (expiresAt <= now) return {status: "expired", expiresAt};
    if (expiresAt > now + CATEGORY_REQUEST_MAX_TTL_SECONDS) return {status: "malformed", reason: "expires too far ahead"};
    let recovered: Address;
    try {
        recovered = await recoverTypedDataAddress({...categoryRequestTypedData(request as CategoryRequest, chainId), signature}); // checked above
    } catch {
        return {status: "malformed", reason: "signature"};
    }
    const declared = getAddress(agent);
    return getAddress(recovered) === declared ? {status: "valid", address: declared} : {status: "mismatch", declared, recovered};
}
