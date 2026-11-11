import {getAddress, isAddress, isHex, recoverTypedDataAddress, type Address, type Hex} from "viem";

import {isUsageOutcome, isUsageReason, type UsageOutcome, type UsageReason} from "../declare/usage-context.js";
import {needShapeProblem} from "../declare/line-need.js";
import {isExactEndpointUrl, parsePaymentAtomLabel} from "../x402-payment.js";

/**
 * What an agent signs to have ARP's sponsoring service write one line about a tool it used (ADR `0144`):
 * form B, paid by the service, with a position in the agent's own name on each level.
 *
 * "Agent `agentId`, held by `agent`, says it used `tool`, in `domain`, with this outcome and reason,
 * before `expiresAt`." **Nothing here proves the use**, which is the difference from a sponsored
 * deposit: a failure the hook noted has no receipt. So a line is the agent's word, and it is bounded by
 * daily caps and the budget rather than by a proof. Testnet 13579 only.
 *
 * **Nothing on chain checks this signature**, so the domain has no `verifyingContract`, as in
 * `request.ts`. The service spends each `nonce` once, in its ledger.
 *
 * **Version 2** (task 89, ADR `0159`) adds `payment`: the x402 settlement the line refers to, as
 * `eip155:<chain>/tx/<hash>`, or `""`. The agent signs which payment it claims; the service reads that
 * transaction on its own chain before it writes anything. A version 1 request no longer verifies.
 *
 * **Version 3** (task 93, ADR `0162`) adds `endpoint`: the exact URL the payer called, which a
 * payment requires and nothing else allows. The tool atom stays the canonical URL (`normaliseToolUrl`);
 * the service checks the two agree and writes the exact one in the payment level. A version 2 request no
 * longer verifies, as version 1 did not under version 2: the CLI and the sponsor ship together.
 *
 * **Version 4** (task 97, ADR `0166`) adds `need`: on a `missing-program` or `missing-key` failure, the
 * program or the environment variable's **name** that was missing, and on a worked line what had to be
 * added; `""` for none. The service writes it only when the skill's own SKILL.md names it
 * (`publishableNeed`). A version 3 request no longer verifies.
 *
 * **Still version 4 since task 119** (ADR `0186`): `endpoint` is the URL called **with its values removed**
 * (`redactEndpointUrl`). The typed data is unchanged, so a v4 signer that sends a URL without values still
 * verifies; the service refuses one that carries a value with 422 `endpoint-private`, before it reads anything.
 */
export const LINE_REQUEST_TYPES = {
    LineRequest: [
        {name: "agent", type: "address"},
        {name: "agentRegistry", type: "string"},
        {name: "agentId", type: "string"},
        {name: "tool", type: "bytes32"},
        {name: "domain", type: "string"},
        {name: "outcome", type: "string"},
        {name: "reason", type: "string"},
        {name: "payment", type: "string"},
        {name: "endpoint", type: "string"},
        {name: "need", type: "string"},
        {name: "nonce", type: "bytes32"},
        {name: "expiresAt", type: "uint256"},
    ],
} as const;

export const LINE_MAX_TTL_SECONDS = 3_600;
/** Longer than any category in the tree. Free text is refused later by the tree itself. */
export const LINE_MAX_DOMAIN_LENGTH = 64;

export type LineRequest = {
    /** The address that holds the agent, and that receives the positions. */
    agent: Address;
    agentRegistry: string;
    agentId: string;
    /** The tool's atom. */
    tool: Hex;
    /** A category under `tool`, or `""` for none. */
    domain: string;
    outcome: UsageOutcome;
    /** Only with `failed`. `""` for none. */
    reason: UsageReason | "";
    /** The x402 payment, `eip155:<chain>/tx/<hash>` in lower case (`paymentAtomLabel`), or `""` for none. */
    payment: string;
    /** The exact URL the payer called, values removed (`redactEndpointUrl`), with a payment; `""` without one. */
    endpoint: string;
    /**
     * `needs` on a `missing-program` or `missing-key` failure, `with` on a worked line: a program's or an
     * environment variable's name (`needKindOf`), or `""`. Never with a payment: an endpoint has no SKILL.md.
     */
    need: string;
    nonce: Hex;
    /** Unix seconds. */
    expiresAt: number;
};

export type SignedLineRequest = {request: LineRequest; chainId: number; signature: Hex};

export type LineRequestVerdict =
    | {status: "valid"; address: Address}
    | {status: "mismatch"; declared: Address; recovered: Address}
    | {status: "expired"; expiresAt: number}
    | {status: "malformed"; reason: string};

export function lineRequestTypedData(request: LineRequest, chainId: number) {
    return {
        domain: {name: "ARP Line Request", version: "4", chainId} as const,
        types: LINE_REQUEST_TYPES,
        primaryType: "LineRequest" as const,
        message: {...request, expiresAt: BigInt(request.expiresAt)},
    };
}

/**
 * The same typed data in JSON, as the x402 feed publishes it (task 121, ADR `0188`): `expiresAt` a number,
 * no `bigint`. viem's `verifyTypedData` and `recoverTypedDataAddress` take it as it is; a tool built on
 * `eth_signTypedData_v4` adds `EIP712Domain` from the domain's three fields, which it leaves out.
 */
export type LineRequestTypedDataJson = {
    domain: {name: "ARP Line Request"; version: "4"; chainId: number};
    types: typeof LINE_REQUEST_TYPES;
    primaryType: "LineRequest";
    message: LineRequest;
};

export function lineRequestTypedDataJson(request: LineRequest, chainId: number): LineRequestTypedDataJson {
    return {domain: {name: "ARP Line Request", version: "4", chainId}, types: LINE_REQUEST_TYPES, primaryType: "LineRequest", message: {...request}};
}

export type LineRequestSigner = {
    signTypedData(data: ReturnType<typeof lineRequestTypedData>): Promise<Hex>;
};

export async function signLineRequest(
    request: LineRequest,
    chainId: number,
    signer: LineRequestSigner,
): Promise<SignedLineRequest> {
    return {request, chainId, signature: await signer.signTypedData(lineRequestTypedData(request, chainId))};
}

const isBytes32 = (value: unknown): value is Hex => typeof value === "string" && isHex(value) && value.length === 66;

/** Every field is read before the signer is recovered. `now` is unix seconds. */
export async function verifyLineRequest(signed: unknown, now: number): Promise<LineRequestVerdict> {
    if (typeof signed !== "object" || signed === null) return {status: "malformed", reason: "no request"};
    const {request, chainId, signature} = signed as Partial<SignedLineRequest>; // each field is checked below
    if (typeof request !== "object" || request === null) return {status: "malformed", reason: "no request"};
    if (typeof chainId !== "number" || !Number.isInteger(chainId)) return {status: "malformed", reason: "chainId"};
    if (typeof signature !== "string" || !isHex(signature)) return {status: "malformed", reason: "signature"};
    const {agent, agentRegistry, agentId, tool, domain, outcome, reason, payment, endpoint, need, nonce, expiresAt} = request;
    if (typeof agent !== "string" || !isAddress(agent)) return {status: "malformed", reason: "agent"};
    if (typeof agentRegistry !== "string" || typeof agentId !== "string") return {status: "malformed", reason: "agent reference"};
    if (!isBytes32(tool)) return {status: "malformed", reason: "tool"};
    if (typeof domain !== "string" || domain.length > LINE_MAX_DOMAIN_LENGTH) return {status: "malformed", reason: "domain"};
    if (!isUsageOutcome(outcome)) return {status: "malformed", reason: "outcome"};
    if (reason !== "" && !isUsageReason(reason)) return {status: "malformed", reason: "reason"};
    if (reason !== "" && outcome !== "failed") return {status: "malformed", reason: "a reason only follows a failure"};
    if (typeof payment !== "string" || (payment !== "" && parsePaymentAtomLabel(payment) === null)) {
        return {status: "malformed", reason: "payment is eip155:<chain>/tx/<hash>, lower case, or empty"};
    }
    if (typeof endpoint !== "string") return {status: "malformed", reason: "endpoint"};
    if (payment === "" && endpoint !== "") return {status: "malformed", reason: "an endpoint only follows a payment"};
    if (payment !== "" && !isExactEndpointUrl(endpoint)) {
        return {status: "malformed", reason: "a payment names the exact http(s) URL that was called"};
    }
    if (typeof need !== "string") return {status: "malformed", reason: "need"};
    const needProblem = needShapeProblem({need, outcome, reason});
    if (needProblem !== null) return {status: "malformed", reason: needProblem};
    if (need !== "" && payment !== "") return {status: "malformed", reason: "a need names a skill's word, and a paid endpoint has no SKILL.md"};
    if (!isBytes32(nonce)) return {status: "malformed", reason: "nonce"};
    if (typeof expiresAt !== "number" || !Number.isInteger(expiresAt)) return {status: "malformed", reason: "expiresAt"};
    if (expiresAt <= now) return {status: "expired", expiresAt};
    if (expiresAt > now + LINE_MAX_TTL_SECONDS) return {status: "malformed", reason: "expires too far ahead"};
    let recovered: Address;
    try {
        recovered = await recoverTypedDataAddress({...lineRequestTypedData(request as LineRequest, chainId), signature}); // checked above
    } catch {
        return {status: "malformed", reason: "signature"};
    }
    const declared = getAddress(agent);
    return getAddress(recovered) === declared ? {status: "valid", address: declared} : {status: "mismatch", declared, recovered};
}
