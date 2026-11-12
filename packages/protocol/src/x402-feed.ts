import {
    isRecord,
    readRecord,
    readString,
    X402_LEVELS_BY_ID_QUERY,
    X402_PAYMENT_LEVELS_QUERY,
    X402_REASONS_QUERY,
    type GraphqlTransport,
} from "@arp-protocol/graphql";
import {getAddress, recoverTypedDataAddress, type Address, type Hex, type TypedDataDefinition} from "viem";

import {normaliseToolUrl} from "./declare/tool-thing.js";
import {isUsageOutcome, isUsageReason, type UsageOutcome} from "./declare/usage-context.js";
import {redactEndpointUrl} from "./endpoint-redaction.js";
import {lineTermsOf, readArchivedLineRequest, type LineRequestTypedDataJson, type SignedLineRequest} from "./sponsor/line.js";
import {privateProbeTarget} from "./verify/probe.js";
import {
    checkX402Payment,
    exactEndpointNamesTool,
    parsePaymentLevelLabel,
    paymentAtomLabel,
    type X402NetworkPolicy,
    type X402TransferReads,
} from "./x402-payment.js";
import type {PayeeSource} from "./x402-terms.js";

/**
 * The x402 outcomes feed (task 89, ADR `0159`): every line about an endpoint that names its payment,
 * kept only when the payment checks out on its own chain when the feed is built.
 *
 * Built for a reader outside ARP: x402 Doctor shows "N paid, M got nothing" beside its verdict, and
 * verifies each settlement itself (the backlog's x402 section, kept outside this repository). So a record carries what that check
 * needs: the endpoint, the outcome, the settlement transaction, its network and the dates.
 *
 * **The endpoint is the URL the payer called** (task 93, ADR `0162`), as the payment level carries it:
 * `http`, `www.`, a trailing slash and the query's order kept, because Doctor matches on that URL. The
 * tool atom's canonical URL (`normaliseToolUrl`) is beside it, and the exact one is kept only when it
 * normalises to it. A line written before task 93 names no exact URL: its `endpoint` is `null`.
 *
 * **No value is ever republished** (task 119, ADR `0186`): both URLs go through `redactEndpointUrl` as
 * they are read, whatever the line wrote, so a query value, an email or an address in a path never
 * reaches the file. A line whose URLs no longer agree once reduced, or that carries credentials, is
 * counted in `skipped`. Schema 3 because `endpoint` and `endpoint_canonical` changed meaning.
 *
 * **What a record proves:** a payment of an accepted asset, from the wallet that wrote the line (or
 * that agent's `agentWallet`), and that wallet's word about the outcome. **Not** that the endpoint
 * delivered or failed to: that is the payer's claim. That the recipient is the endpoint's own payee only
 * when `payee_check` is not `unchecked` (below), and then as far as the reading it names goes.
 *
 * **The request the writer signed** (task 121, ADR `0188`): a line ARP's sponsoring service wrote rests
 * on an EIP-712 `LineRequest` the agent signed, which names the payment and the outcome. The service
 * keeps it, and the feed carries it as `signed_request`, so a reader recovers the signer itself and needs
 * no word of ARP's: `signed_by_payer` is what {@link signedByPayer} says of the two. Added fields, so the
 * schema stays 3: no field changed meaning.
 *
 * **The payment went to the endpoint, for its price** (task 122, ADR `0189`): a version 5 request names the
 * terms the payer paid against (`payTo`, `asset`, `price`, `termsAt`). The feed checks the transfer against
 * them again, and leaves a record out when it does not match. Whether the terms are the endpoint's, ARP's
 * sponsoring service checked when it wrote the line, against its probe's dated reading or a live read, and
 * kept the answer beside the request: `payee_check` is `probe`, `live` or `unchecked`. `by_endpoint` counts
 * only the checked records, with the unchecked ones beside them. Schema 4, because `by_endpoint` changed meaning.
 */
export const X402_FEED_SCHEMA = "arp.x402-outcomes/4";

export type X402FeedRecord = {
    /**
     * The URL the payer called, as the line names it with its values removed (`redactEndpointUrl`, ADR
     * `0186`), or `null` for a line written before task 93 (ADR `0162`), which named none: unknown, never
     * guessed from the canonical form.
     */
    endpoint: string | null;
    /**
     * The tool atom's URL with its values removed, in `normaliseToolUrl`'s form: https, no `www.`, no
     * trailing `/`, query names sorted. Two URLs that differ only in values have one.
     */
    endpoint_canonical: string;
    outcome: UsageOutcome;
    /** The closed reason the writer gave, or `null`. Several, sorted and joined by a comma. */
    reason: string | null;
    /** The domain the line names, or `null`. */
    domain: string | null;
    settlement_tx: Hex;
    /** CAIP-2. */
    network: string;
    payer: Address;
    pay_to: Address;
    /** In the asset's smallest unit, as a decimal string. */
    amount: string;
    asset: Address;
    /** The settlement block's time, ISO 8601. */
    paid_at: string;
    /** The wallet that stands behind every level of the line. */
    writer: Address;
    /** The payment level's triple id on the trace chain: `(outcome, paid with, payment)`. */
    line_id: Hex;
    /** When the payment level was written, as the index says. */
    written_at: string;
    /**
     * The `LineRequest` ARP's sponsoring service kept for this payment, as typed data and its signature (ADR
     * `0188`). `null` when the feed was built without the service's store, or when the service kept none for
     * this payment: a line it wrote before it kept requests, or one written without it. A kept request can be
     * one whose send reverted; `signed_by_payer` says whether its words are this line's.
     */
    signed_request: X402SignedRequest | null;
    /** {@link signedByPayer} over this record: a reader recomputes it from the record alone. */
    signed_by_payer: boolean;
    /**
     * The price the payer signed it paid against, the `402`'s `amount` in the asset's smallest unit (ADR `0189`),
     * or `null` when no version 5 request is kept for this payment. `amount` is at least this, or no record.
     */
    price: string | null;
    /**
     * Which reading the sponsoring service found the signed terms in when it wrote the line: ARP's probe's,
     * from before the payment, or a live read of the `402`. `unchecked` when neither could be read, or no
     * terms were signed: such a record is not counted in `by_endpoint` as a payment to the endpoint.
     */
    payee_check: PayeeSource;
    /** When the reading `payee_check` names was made, ISO 8601, or `null` when `unchecked`. */
    payee_checked_at: string | null;
};

/** EIP-712 typed data in JSON and the signature over it: viem's `verifyTypedData` takes both as they are. */
export type X402SignedRequest = {typed_data: LineRequestTypedDataJson; signature: Hex};

/** Where the signed requests are read: ARP's sponsoring service, `GET /line-request?payment=<label>`. */
export type X402SignedRequests = {
    /** Named in the feed as `signed_requests_from`. */
    source: string;
    /**
     * The request the service kept for this payment label, or `null` when it kept none. Throws on an outage.
     * Since ADR `0189` the answer also carries `payee_check` and `payee_checked_at` (unix seconds).
     */
    read(payment: string): Promise<unknown>;
};

/** Counted over the records whose `payee_check` is not `unchecked`; those are in `unchecked` alone (ADR `0189`). */
export type X402EndpointSummary = {
    /** Records whose payment the endpoint's own reading names as its payee. */
    records: number;
    worked: number;
    failed: number;
    no_delivery: number;
    /** Distinct paying addresses. Several can be one person. */
    payers: number;
    /** Records about this endpoint whose payee no reading confirmed, counted in nothing above. */
    unchecked: number;
};

export type X402Feed = {
    schema: typeof X402_FEED_SCHEMA;
    generated_at: string;
    /** Where the lines are: the trace chain, never the paying one. */
    trace: {chain: string; graphql: string};
    networks: string[];
    note: string;
    records: X402FeedRecord[];
    /** Keyed by `endpoint_canonical`, so every spelling of one endpoint counts once, old lines included. */
    by_endpoint: Record<string, X402EndpointSummary>;
    /** Lines that name a payment and are left out, by why. */
    skipped: {count: number; reasons: Record<string, number>};
    /** The read hit a limit, so the feed may miss lines. */
    truncated: boolean;
    /** Where `signed_request` was read, or `null` when this build read no signed request at all. */
    signed_requests_from: string | null;
};

/** The holder and `agentWallet` of the agent an identity atom names, or `null` when it names none this reader can read. */
export type X402AgentKeys = (identity: {atomId: string; label: string | null}) => Promise<{
    owner: Address;
    agentWallet: Address | null;
} | null>;

export type X402FeedConfig = {
    transport: GraphqlTransport;
    trace: {chain: string; graphql: string};
    predicates: {paidWith: string; hasOutcome: string; because: string; inContextOf: string; uses: string};
    /** ARP's own wallets: they pay for sponsored lines and say nothing by it (ADR `0144`). */
    payers: readonly string[];
    policy: X402NetworkPolicy;
    readsFor(network: string): X402TransferReads;
    agentKeys?: X402AgentKeys;
    /**
     * Keep a record whose endpoint is a loopback or private address, such as `127.0.0.1`. Only the test
     * feed sets it (task 118): its one seller runs on the machine that paid it. Off, such a line is skipped.
     */
    allowPrivateEndpoints?: boolean;
    /** Absent, every record's `signed_request` is `null` and `signed_by_payer` false. */
    signedRequests?: X402SignedRequests;
    /** ISO 8601. Passed in, so two builds of one graph differ only here. */
    generatedAt: string;
    pageSize?: number;
    maxPages?: number;
};

export const X402_FEED_NOTE =
    "Each record is one payer's word about one paid call, tied to a payment ARP read on its own chain when this file was built. " +
    "It proves the payment and who made it, not what the endpoint delivered. by_endpoint counts a record only when a reading of the endpoint's own 402 named its payee and price (payee_check); the others are counted as unchecked. ARP's own ranking counts an outcome only once 3 distinct wallets say it (ADR 0143); this feed lists every record and leaves the counting to the reader.";

type Level = {
    termId: string;
    subjectId: string | null;
    predicateId: string | null;
    createdAt: string | null;
    subject: {atomId: string | null; label: string | null};
    /** `data` is the atom's whole string; the index cuts `label` at 256 characters. */
    object: {label: string | null; data: string | null; url: string | null};
    /** The creator and every holder, lower case. */
    standing: Set<string>;
    /** The index caps a nested list at 100 with no sign of the cut. */
    capped: boolean;
};

const NESTED_CAP = 100;
const key = (id: string) => id.toLowerCase();

function levelOf(row: Record<string, unknown>): Level | null {
    const termId = readString(row, "term_id");
    if (termId === null) return null;
    const subject = readRecord(row, "subject");
    const object = readRecord(row, "object");
    const value = object === null ? null : readRecord(object, "value");
    const thing = value === null ? null : readRecord(value, "thing");
    const holders = Array.isArray(row["positions"]) ? row["positions"].filter(isRecord) : [];
    const wallets = [readString(row, "creator_id"), ...holders.map((holder) => readString(holder, "account_id"))];
    return {
        termId,
        subjectId: readString(row, "subject_id"),
        predicateId: readString(row, "predicate_id"),
        createdAt: readString(row, "created_at"),
        subject: {atomId: subject === null ? null : readString(subject, "term_id"), label: subject === null ? null : readString(subject, "label")},
        object: {label: object === null ? null : readString(object, "label"), data: object === null ? null : readString(object, "data"), url: thing === null ? null : readString(thing, "url")},
        standing: new Set(wallets.filter((wallet): wallet is string => wallet !== null).map(key)),
        capped: holders.length >= NESTED_CAP,
    };
}

const rowsOf = (data: Record<string, unknown>): Record<string, unknown>[] =>
    Array.isArray(data["triples"]) ? data["triples"].filter(isRecord) : [];

/** An index timestamp as ISO 8601 in UTC, so two reads of one row print one string. */
function isoOf(at: string): string {
    const parsed = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(at) ? at : `${at}Z`);
    return Number.isNaN(parsed) ? at : new Date(parsed).toISOString();
}

/**
 * Whether a record's payer signed the words of its line (ADR `0188`). True only when all of these hold,
 * each checkable by anyone from the record alone:
 *
 * 1. the signature recovers, over `typed_data`, to the record's `payer`;
 * 2. the signed `payment` names this settlement, `<network>/tx/<settlement_tx>` in lower case;
 * 3. the signed `outcome`, `reason`, `domain` and `endpoint` are the record's, `""` standing for `null`.
 *
 * The fourth binding matters: a request is kept before the line is sent, so a kept one can belong to a send
 * that reverted, after which the same payment's line was written some other way. Any word that differs
 * gives `false`.
 *
 * So a payment made by the agent's `agentWallet` while the line is signed by the address that holds the
 * agent gives `false`: the payer did not sign. That is the answer, not a fault.
 */
export async function signedByPayer(
    record: Pick<X402FeedRecord, "network" | "settlement_tx" | "outcome" | "reason" | "domain" | "endpoint" | "payer">,
    signed: X402SignedRequest | null,
): Promise<boolean> {
    if (signed === null) return false;
    const {message} = signed.typed_data;
    if (message.payment !== paymentAtomLabel({network: record.network, txHash: record.settlement_tx})) return false;
    if (message.outcome !== record.outcome) return false;
    if (message.reason !== (record.reason ?? "") || message.domain !== (record.domain ?? "") || message.endpoint !== (record.endpoint ?? "")) return false;
    try {
        // JSON carries `termsAt` and `expiresAt` as numbers; viem's types ask bigints, and a value that is neither throws here.
        const typedData: TypedDataDefinition = {...signed.typed_data, message: {...message, termsAt: BigInt(message.termsAt), expiresAt: BigInt(message.expiresAt)}}; // version 5 or 6, its own types
        return getAddress(await recoverTypedDataAddress({...typedData, signature: signed.signature})) === getAddress(record.payer);
    } catch {
        return false;
    }
}

/**
 * The service's answer as a published request, or `null` when it is not one. Read with `verifyLineRequest`
 * at a time just before its expiry: it was spent when the line was written, so only its shape and its
 * signature are in question here.
 */
async function signedRequestOf(stored: unknown): Promise<{signed: X402SignedRequest; request: SignedLineRequest["request"]} | null> {
    if (typeof stored !== "object" || stored === null) return null;
    const {request} = stored as Partial<SignedLineRequest>; // checked by `verifyLineRequest` below
    if (typeof request !== "object" || request === null || typeof request.expiresAt !== "number") return null;
    // A version 5 request archived before version 6 (task 127) still reads as the one the payer signed.
    const read = await readArchivedLineRequest(stored, request.expiresAt - 1);
    if (read === null || read.verdict.status !== "valid") return null;
    const {signature} = stored as SignedLineRequest; // valid, so this is its field
    return {signed: {typed_data: read.typed, signature}, request: read.request};
}

/** The service's payee check kept beside a request (ADR `0189`), or `unchecked` when it kept none this reads. */
function payeeCheckOf(stored: unknown): {payee_check: PayeeSource; payee_checked_at: string | null} {
    const unchecked = {payee_check: "unchecked" as const, payee_checked_at: null};
    if (typeof stored !== "object" || stored === null) return unchecked;
    const {payee_check: check, payee_checked_at: at} = stored as {payee_check?: unknown; payee_checked_at?: unknown}; // each read below
    if ((check !== "probe" && check !== "live") || typeof at !== "number" || !Number.isInteger(at) || at <= 0) return unchecked;
    return {payee_check: check, payee_checked_at: new Date(at * 1000).toISOString()};
}

/**
 * Read the graph, check each payment, and return the feed. Deterministic: the same graph and the same
 * chains give the same records, in the same order; only `generated_at` moves.
 *
 * Throws when a paying chain cannot be read: a snapshot with a hole in it would publish a payer's
 * record as missing, so the previous snapshot is better than this one.
 */
export async function buildX402Feed(config: X402FeedConfig): Promise<X402Feed> {
    const {transport, predicates} = config;
    const pageSize = config.pageSize ?? 250;
    const maxPages = config.maxPages ?? 40;
    const ours = new Set(config.payers.map(key));
    const skipped: Record<string, number> = {};
    const skip = (reason: string) => {
        skipped[reason] = (skipped[reason] ?? 0) + 1;
    };
    let truncated = false;

    const payments: Level[] = [];
    for (let page = 0; ; page += 1) {
        if (page === maxPages) {
            truncated = true;
            break;
        }
        const rows = rowsOf(
            await transport.request(X402_PAYMENT_LEVELS_QUERY, {paidWith: predicates.paidWith, limit: pageSize, offset: page * pageSize}),
        );
        for (const row of rows) {
            const level = levelOf(row);
            if (level !== null) payments.push(level);
        }
        if (rows.length < pageSize) break;
    }

    const levels = new Map<string, Level>();
    const fetchLevels = async (ids: readonly (string | null)[]) => {
        const wanted = [...new Set(ids.filter((id): id is string => id !== null).map(key))].filter((id) => !levels.has(id));
        for (let at = 0; at < wanted.length; at += pageSize) {
            const chunk = wanted.slice(at, at + pageSize);
            for (const row of rowsOf(await transport.request(X402_LEVELS_BY_ID_QUERY, {ids: chunk, limit: chunk.length}))) {
                const level = levelOf(row);
                if (level !== null) levels.set(key(level.termId), level);
            }
        }
    };
    await fetchLevels(payments.map((payment) => payment.subjectId));
    await fetchLevels([...levels.values()].map((level) => level.subjectId));
    await fetchLevels([...levels.values()].map((level) => level.subjectId));

    const outcomeIds = [...levels.values()].filter((level) => level.predicateId !== null && key(level.predicateId) === key(predicates.hasOutcome)).map((level) => level.termId);
    const reasonsOn = new Map<string, Level[]>();
    for (let at = 0; at < outcomeIds.length; at += pageSize) {
        const chunk = outcomeIds.slice(at, at + pageSize);
        const rows = rowsOf(await transport.request(X402_REASONS_QUERY, {ids: chunk, because: predicates.because, limit: pageSize}));
        if (rows.length >= pageSize) truncated = true;
        for (const row of rows) {
            const level = levelOf(row);
            if (level === null || level.subjectId === null) continue;
            reasonsOn.set(key(level.subjectId), [...(reasonsOn.get(key(level.subjectId)) ?? []), level]);
        }
    }

    type Candidate = {payment: Level; record: Omit<X402FeedRecord, "payer" | "pay_to" | "amount" | "asset" | "paid_at" | "writer" | "signed_request" | "signed_by_payer" | "price" | "payee_check" | "payee_checked_at">; writers: Set<string>; owner: Address | null; agentWallet: Address | null};
    const candidates: Candidate[] = [];
    for (const payment of payments) {
        // `data`, not `label`: the index cuts a label at 256 characters and the exact URL can be longer.
        const written = payment.object.data ?? payment.object.label;
        const level = written === null ? null : parsePaymentLevelLabel(written);
        if (level === null) {
            skip("the payment is not written as eip155:<chain>/tx/<hash>, then optionally a space and the URL called");
            continue;
        }
        const {ref} = level;
        if (!config.policy.has(ref.network)) {
            skip(`network ${ref.network} is not read`);
            continue;
        }
        const outcome = payment.subjectId === null ? undefined : levels.get(key(payment.subjectId));
        if (outcome === undefined || outcome.predicateId === null || key(outcome.predicateId) !== key(predicates.hasOutcome) || outcome.object.label === null || !isUsageOutcome(outcome.object.label)) {
            skip("the payment is not on an outcome");
            continue;
        }
        const above = outcome.subjectId === null ? undefined : levels.get(key(outcome.subjectId));
        let domain: string | null = null;
        let uses = above;
        if (above !== undefined && above.predicateId !== null && key(above.predicateId) === key(predicates.inContextOf)) {
            domain = above.object.label;
            uses = above.subjectId === null ? undefined : levels.get(key(above.subjectId));
        }
        if (uses === undefined || uses.predicateId === null || key(uses.predicateId) !== key(predicates.uses)) {
            skip("the outcome is not on a use");
            continue;
        }
        const canonical = uses.object.url;
        if (canonical === null) {
            skip("the tool has no URL the index resolved");
            continue;
        }
        if (level.endpoint !== null && !exactEndpointNamesTool(level.endpoint, canonical)) {
            skip("the exact URL does not normalise to the tool's URL");
            continue;
        }
        if (config.allowPrivateEndpoints !== true && privateProbeTarget(canonical) !== null) {
            skip("the endpoint is a loopback or private address");
            continue;
        }
        // Reduced on read as well as at the payer (ADR `0186`): what the chain holds is not what the file says.
        let endpoint: string | null;
        let endpointCanonical: string;
        try {
            endpoint = level.endpoint === null ? null : redactEndpointUrl(level.endpoint);
            endpointCanonical = normaliseToolUrl(redactEndpointUrl(canonical));
        } catch {
            skip("the URL carries credentials or has no redacted form");
            continue;
        }
        if (endpoint !== null && !exactEndpointNamesTool(endpoint, endpointCanonical)) {
            skip("the exact URL no longer reduces to the tool's once its values are removed");
            continue;
        }
        const chain = [payment, outcome, ...(uses === above ? [] : above === undefined ? [] : [above]), uses];
        if (chain.some((level) => level.capped)) truncated = true;
        const writers = new Set([...payment.standing].filter((wallet) => !ours.has(wallet) && chain.every((level) => level.standing.has(wallet))));
        if (writers.size === 0) {
            skip("no wallet stands behind every level");
            continue;
        }
        const reasons = (reasonsOn.get(key(outcome.termId)) ?? [])
            .filter((reason) => reason.object.label !== null && isUsageReason(reason.object.label) && [...writers].some((wallet) => reason.standing.has(wallet)))
            .map((reason) => reason.object.label as string); // checked by the filter
        let owner: Address | null = null;
        let agentWallet: Address | null = null;
        if (config.agentKeys !== undefined && uses.subject.atomId !== null) {
            const keys = await config.agentKeys({atomId: uses.subject.atomId, label: uses.subject.label});
            // An agent's wallet is the writer's only when the writer holds the agent.
            if (keys !== null && writers.has(key(keys.owner))) {
                owner = getAddress(keys.owner);
                agentWallet = keys.agentWallet === null ? null : getAddress(keys.agentWallet);
            }
        }
        candidates.push({
            payment,
            writers,
            owner,
            agentWallet,
            record: {
                endpoint,
                endpoint_canonical: endpointCanonical,
                outcome: outcome.object.label,
                reason: reasons.length === 0 ? null : [...new Set(reasons)].sort().join(","),
                domain,
                settlement_tx: ref.txHash,
                network: ref.network,
                line_id: payment.termId as Hex, // an id the index returned
                written_at: payment.createdAt === null ? "" : isoOf(payment.createdAt),
            },
        });
    }

    const verified: X402FeedRecord[] = [];
    const records: X402FeedRecord[] = [];
    const unreadable: string[] = [];
    for (const candidate of candidates) {
        const {record} = candidate;
        const payers = [...candidate.writers].map((wallet) => getAddress(wallet));
        if (candidate.agentWallet !== null) payers.push(candidate.agentWallet);
        // An outage throws and no snapshot is written: a record must not lose its signature to it.
        const stored =
            config.signedRequests === undefined
                ? null
                : await config.signedRequests.read(paymentAtomLabel({network: record.network, txHash: record.settlement_tx}));
        const kept = await signedRequestOf(stored);
        const terms = kept === null ? null : lineTermsOf(kept.request);
        const checked = await checkX402Payment({
            ref: {network: record.network, txHash: record.settlement_tx},
            payers,
            policy: config.policy,
            reads: config.readsFor(record.network),
            ...(terms === null ? {} : {terms}),
        });
        if (checked.status === "unreadable") {
            unreadable.push(checked.reason);
            continue;
        }
        if (checked.status === "refused") {
            skip(
                checked.reason.startsWith("no transfer")
                    ? "no transfer of an accepted asset from the writer"
                    : terms !== null && /\bthe terms\b/.test(checked.reason)
                      ? "the transfer does not match the terms the payer signed"
                      : checked.reason.replace(/0x[0-9a-fA-F]{40,64}/g, "…"),
            );
            continue;
        }
        const paidAt = new Date(checked.paidAt * 1000).toISOString();
        if (record.written_at !== "" && paidAt > record.written_at) {
            skip("the line was written before the payment");
            continue;
        }
        const payer = checked.transfer.payer;
        const writer = candidate.writers.has(key(payer)) ? payer : (candidate.owner ?? payer);
        const signed = kept?.signed ?? null;
        const paid = {...record, payer, pay_to: checked.transfer.payTo, amount: checked.transfer.amount.toString(), asset: checked.transfer.asset, paid_at: paidAt, writer};
        verified.push({
            ...paid,
            signed_request: signed,
            signed_by_payer: await signedByPayer(paid, signed),
            price: terms === null ? null : terms.amount.toString(),
            // Terms the transfer matched, or nothing the service's check could have been about.
            ...(terms === null ? {payee_check: "unchecked" as const, payee_checked_at: null} : payeeCheckOf(stored)),
        });
    }
    if (unreadable.length > 0) throw new Error(`a paying chain could not be read, so no snapshot is written: ${unreadable[0]}`);

    // One payment backs one line. Counted among lines whose payment checked, so a stranger who names
    // somebody else's transaction is dropped for not paying and cannot void the payer's record. A payer
    // who names its own payment on two lines voids both, and only its own.
    const linesPerTx = new Map<string, number>();
    for (const record of verified) {
        const tx = `${record.network}/${record.settlement_tx}`;
        linesPerTx.set(tx, (linesPerTx.get(tx) ?? 0) + 1);
    }
    for (const record of verified) {
        if ((linesPerTx.get(`${record.network}/${record.settlement_tx}`) ?? 0) > 1) skip("one payment is named by several lines");
        else records.push(record);
    }

    records.sort((a, b) => a.written_at.localeCompare(b.written_at) || a.line_id.localeCompare(b.line_id));
    const byEndpoint: Record<string, X402EndpointSummary> = {};
    const payersOf = new Map<string, Set<string>>();
    for (const record of records) {
        const summary = (byEndpoint[record.endpoint_canonical] ??= {records: 0, worked: 0, failed: 0, no_delivery: 0, payers: 0, unchecked: 0});
        // A payment no reading names as the endpoint's is not counted as one to the endpoint (ADR `0189`).
        if (record.payee_check === "unchecked") {
            summary.unchecked += 1;
            continue;
        }
        summary.records += 1;
        summary[record.outcome] += 1;
        if (record.reason?.split(",").includes("no-delivery") === true) summary.no_delivery += 1;
        payersOf.set(record.endpoint_canonical, (payersOf.get(record.endpoint_canonical) ?? new Set()).add(key(record.payer)));
        summary.payers = payersOf.get(record.endpoint_canonical)?.size ?? 0;
    }
    const skippedCount = Object.values(skipped).reduce((sum, n) => sum + n, 0);
    return {
        schema: X402_FEED_SCHEMA,
        generated_at: config.generatedAt,
        trace: config.trace,
        networks: [...config.policy.keys()].sort(),
        note: X402_FEED_NOTE,
        records,
        by_endpoint: Object.fromEntries(Object.entries(byEndpoint).sort(([a], [b]) => a.localeCompare(b))),
        skipped: {count: skippedCount, reasons: Object.fromEntries(Object.entries(skipped).sort(([a], [b]) => a.localeCompare(b)))},
        truncated,
        signed_requests_from: config.signedRequests?.source ?? null,
    };
}
