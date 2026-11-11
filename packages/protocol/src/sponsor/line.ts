import {getAddress, isAddress, isHex, recoverTypedDataAddress, type Address, type Hex} from "viem";

import {isUsageOutcome, isUsageReason, type UsageOutcome, type UsageReason} from "../declare/usage-context.js";
import {needShapeProblem} from "../declare/line-need.js";
import {isExactEndpointUrl, parsePaymentAtomLabel} from "../x402-payment.js";
import type {X402Terms} from "../x402-terms.js";

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
 *
 * **Version 5** (task 122, ADR `0189`) adds the terms the payer paid against, as the endpoint's `402` gave
 * them (`PaymentRequirements`): `payTo`, `asset`, `price` (its `amount`, in the asset's smallest unit) and
 * `termsAt`, when they were received (unix seconds). Their network is the payment's. The service checks the
 * transfer against them, and them against a reading the payer does not control (`checkPayee`). Version 5
 * also refuses `no-delivery` without a payment: it means "paid, nothing received". A version 4 request no
 * longer verifies.
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
        {name: "payTo", type: "string"},
        {name: "asset", type: "string"},
        {name: "price", type: "string"},
        {name: "termsAt", type: "uint256"},
        {name: "nonce", type: "bytes32"},
        {name: "expiresAt", type: "uint256"},
    ],
} as const;

/** The typed data's domain version, one constant, so the request, its JSON and the feed cannot disagree. */
export const LINE_REQUEST_VERSION = "5";

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
    /** With a payment, the `402`'s `payTo` the payer paid against; `""` without one. */
    payTo: string;
    /** With a payment, the `402`'s `asset`; `""` without one. */
    asset: string;
    /** With a payment, the `402`'s `amount`, a decimal string in the asset's smallest unit; `""` without one. */
    price: string;
    /** With a payment, when the payer received those terms, unix seconds; `0` without one. */
    termsAt: number;
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
        domain: {name: "ARP Line Request", version: LINE_REQUEST_VERSION, chainId} as const,
        types: LINE_REQUEST_TYPES,
        primaryType: "LineRequest" as const,
        message: {...request, termsAt: BigInt(request.termsAt), expiresAt: BigInt(request.expiresAt)},
    };
}

/**
 * The same typed data in JSON, as the x402 feed publishes it (task 121, ADR `0188`): `termsAt` and `expiresAt` numbers,
 * no `bigint`. viem's `verifyTypedData` and `recoverTypedDataAddress` take it as it is; a tool built on
 * `eth_signTypedData_v4` adds `EIP712Domain` from the domain's three fields, which it leaves out.
 */
export type LineRequestTypedDataJson = {
    domain: {name: "ARP Line Request"; version: typeof LINE_REQUEST_VERSION; chainId: number};
    types: typeof LINE_REQUEST_TYPES;
    primaryType: "LineRequest";
    message: LineRequest;
};

export function lineRequestTypedDataJson(request: LineRequest, chainId: number): LineRequestTypedDataJson {
    return {domain: {name: "ARP Line Request", version: LINE_REQUEST_VERSION, chainId}, types: LINE_REQUEST_TYPES, primaryType: "LineRequest", message: {...request}};
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

/** The terms a request with a payment signed, or `null` without one. Read after `verifyLineRequest`. */
export function lineTermsOf(request: LineRequest): X402Terms | null {
    const payment = request.payment === "" ? null : parsePaymentAtomLabel(request.payment);
    if (payment === null) return null;
    return {network: payment.network, asset: request.asset, payTo: request.payTo, amount: BigInt(request.price)};
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const PRICE = /^[1-9][0-9]{0,77}$/;

const isBytes32 = (value: unknown): value is Hex => typeof value === "string" && isHex(value) && value.length === 66;

/** Every field is read before the signer is recovered. `now` is unix seconds. */
export async function verifyLineRequest(signed: unknown, now: number): Promise<LineRequestVerdict> {
    if (typeof signed !== "object" || signed === null) return {status: "malformed", reason: "no request"};
    const {request, chainId, signature} = signed as Partial<SignedLineRequest>; // each field is checked below
    if (typeof request !== "object" || request === null) return {status: "malformed", reason: "no request"};
    if (typeof chainId !== "number" || !Number.isInteger(chainId)) return {status: "malformed", reason: "chainId"};
    if (typeof signature !== "string" || !isHex(signature)) return {status: "malformed", reason: "signature"};
    const {agent, agentRegistry, agentId, tool, domain, outcome, reason, payment, endpoint, need, payTo, asset, price, termsAt, nonce, expiresAt} = request;
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
    if (reason === "no-delivery" && payment === "") return {status: "malformed", reason: "no-delivery is paid, nothing received: it names its payment"};
    if (typeof payTo !== "string" || typeof asset !== "string" || typeof price !== "string") return {status: "malformed", reason: "terms"};
    if (typeof termsAt !== "number" || !Number.isInteger(termsAt) || termsAt < 0) return {status: "malformed", reason: "termsAt"};
    if (payment === "" && (payTo !== "" || asset !== "" || price !== "" || termsAt !== 0)) {
        return {status: "malformed", reason: "terms only follow a payment"};
    }
    if (payment !== "") {
        if (!ADDRESS.test(payTo)) return {status: "malformed", reason: "a payment names the payTo it paid against"};
        if (!ADDRESS.test(asset)) return {status: "malformed", reason: "a payment names the asset it paid against"};
        if (!PRICE.test(price)) {
            return {status: "malformed", reason: "a payment names the price it paid against, a positive integer in the asset's smallest unit"};
        }
        if (termsAt === 0) return {status: "malformed", reason: "a payment names when its terms were received"};
    }
    if (!isBytes32(nonce)) return {status: "malformed", reason: "nonce"};
    if (typeof expiresAt !== "number" || !Number.isInteger(expiresAt)) return {status: "malformed", reason: "expiresAt"};
    if (expiresAt <= now) return {status: "expired", expiresAt};
    if (expiresAt > now + LINE_MAX_TTL_SECONDS) return {status: "malformed", reason: "expires too far ahead"};
    if (termsAt > expiresAt) return {status: "malformed", reason: "the terms were received after the request expires"};
    let recovered: Address;
    try {
        recovered = await recoverTypedDataAddress({...lineRequestTypedData(request as LineRequest, chainId), signature}); // checked above
    } catch {
        return {status: "malformed", reason: "signature"};
    }
    const declared = getAddress(agent);
    return getAddress(recovered) === declared ? {status: "valid", address: declared} : {status: "mismatch", declared, recovered};
}
