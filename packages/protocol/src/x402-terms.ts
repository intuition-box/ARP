/**
 * The terms an x402 payment was made against, and the check that they are the endpoint's (task 122, ADR `0189`).
 *
 * An x402 endpoint answers an unpaid call with `402` and its payment requirements: on each network, the asset,
 * the amount and who to pay (`PaymentRequirements` in Coinbase's `@x402/core` 2.28: `network`, `asset`,
 * `amount`, `payTo`). The payer signs the ones it paid against into its line request; this module says whether
 * they are the endpoint's, by comparing them with a reading the payer does not control:
 *
 * 1. ARP's probe's dated reading of the endpoint's `402`, the most recent before the payment
 *    (`apps/probe`), which still answers after the endpoint goes dark;
 * 2. a live read of the `402` when the line is written, when the endpoint still answers.
 *
 * Nothing else: a third party's listing is not read here.
 *
 * **No import**, on purpose: `apps/probe` imports this file by path, as the hook imports
 * pure modules, so it carries no viem and no index.
 */

/** One offer of a `402`, every field as the endpoint wrote it except `network`, which is CAIP-2. */
export type X402Offer = {network: string; asset: string; payTo: string; amount: string};

/** The terms a payer says it paid against. `amount` in the asset's smallest unit. */
export type X402Terms = {network: string; asset: string; payTo: string; amount: bigint};

/** A reading of an endpoint's `402`: when (unix seconds), and the EVM offers it made. */
export type X402TermsReading = {at: number; offers: readonly X402Offer[]};

/** Which source agreed with the terms, and the time of its reading; `unchecked` when none could be read. */
export type PayeeCheck =
    | {status: "probe" | "live"; checkedAt: number}
    | {status: "unchecked"; checkedAt: null}
    | {status: "refused"; reason: string};

export type PayeeSource = "probe" | "live" | "unchecked";

const EVM_NETWORK = /^eip155:[1-9][0-9]{0,9}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const AMOUNT = /^(0|[1-9][0-9]{0,77})$/;

/**
 * x402 v1 named networks by a word, v2 by CAIP-2. Only the two this repo reads (`X402_DEFAULT_NETWORKS` and the
 * demo's Base Sepolia); an offer on any other word is left out, never guessed.
 */
const V1_NETWORKS: Readonly<Record<string, string>> = {base: "eip155:8453", "base-sepolia": "eip155:84532"};

function decodeBase64Json(value: string): unknown {
    try {
        const binary = atob(value.trim());
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function offerOf(raw: unknown, version: number): X402Offer | null {
    if (!isObject(raw)) return null;
    const {asset, payTo} = raw;
    const word = raw["network"];
    // v1's `maxAmountRequired`, v2's `amount` (`PaymentRequirementsV1`, `PaymentRequirements`).
    const amount = version === 1 ? raw["maxAmountRequired"] : raw["amount"];
    if (typeof word !== "string" || typeof asset !== "string" || typeof payTo !== "string" || typeof amount !== "string") return null;
    const network = EVM_NETWORK.test(word) ? word : (V1_NETWORKS[word] ?? null);
    if (network === null || !ADDRESS.test(asset) || !ADDRESS.test(payTo) || !AMOUNT.test(amount)) return null;
    return {network, asset, payTo, amount};
}

/**
 * The EVM offers of an x402 `402`, or `null` when the answer is not one: the `PAYMENT-REQUIRED` header (v2,
 * base64 JSON) or the body (v1). An offer on a network or in a shape this does not read is left out, so the
 * list can be empty.
 */
export function x402OffersOf(status: number, header: (name: string) => string | null, body: string): X402Offer[] | null {
    if (status !== 402) return null;
    const encoded = header("payment-required");
    const required = encoded === null ? parseJson(body) : decodeBase64Json(encoded);
    if (!isObject(required)) return null;
    const version = required["x402Version"];
    const accepts = required["accepts"];
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || !Array.isArray(accepts)) return null;
    return accepts.map((raw) => offerOf(raw, version)).filter((offer): offer is X402Offer => offer !== null);
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Whether a reading agrees with the terms: one of its offers is on the terms' network, in their asset, to their
 * payee, for at most their amount. `null` when it agrees, the disagreement otherwise.
 */
export function readingDisagrees(reading: X402TermsReading, terms: X402Terms): string | null {
    const payees = reading.offers.filter((offer) => same(offer.network, terms.network) && same(offer.asset, terms.asset));
    if (payees.length === 0) return `the endpoint asked for no payment in ${terms.asset} on ${terms.network}`;
    const toPayee = payees.filter((offer) => same(offer.payTo, terms.payTo));
    if (toPayee.length === 0) return `the endpoint asked to pay ${[...new Set(payees.map((offer) => offer.payTo))].join(" or ")}, not ${terms.payTo}`;
    const cheapest = toPayee.map((offer) => BigInt(offer.amount)).reduce((a, b) => (b < a ? b : a));
    return cheapest <= terms.amount ? null : `the endpoint asked ${cheapest}, the terms name ${terms.amount}`;
}

/**
 * Whether the terms are the endpoint's (ADR `0189`). The probe's reading is asked first, then a live read:
 *
 * - the first that agrees is the answer, with its reading's time;
 * - a probe reading that disagrees is overruled by a live read that agrees, since a payee can rotate between
 *   the two; one that disagrees with nothing to overrule it refuses;
 * - neither readable is `unchecked`: not refused, and counted apart by every reader.
 *
 * `probe` must be from before `paidAt` (unix seconds); a later one is ignored. `live` returns `null` when the
 * endpoint does not answer with a `402`, and must not throw for that.
 */
export async function checkPayee(params: {
    terms: X402Terms;
    paidAt: number;
    probe: X402TermsReading | null;
    live: () => Promise<X402TermsReading | null>;
}): Promise<PayeeCheck> {
    const {terms} = params;
    const probe = params.probe !== null && params.probe.at <= params.paidAt ? params.probe : null;
    const probeProblem = probe === null ? null : readingDisagrees(probe, terms);
    if (probe !== null && probeProblem === null) return {status: "probe", checkedAt: probe.at};
    const live = await params.live();
    const liveProblem = live === null ? null : readingDisagrees(live, terms);
    if (live !== null && liveProblem === null) return {status: "live", checkedAt: live.at};
    if (liveProblem !== null) return {status: "refused", reason: `live read: ${liveProblem}`};
    if (probeProblem !== null) return {status: "refused", reason: `ARP's probe reading: ${probeProblem}`};
    return {status: "unchecked", checkedAt: null};
}
