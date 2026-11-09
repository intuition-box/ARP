import {
    isRecord,
    readRecord,
    readString,
    X402_LEVELS_BY_ID_QUERY,
    X402_PAYMENT_LEVELS_QUERY,
    X402_REASONS_QUERY,
    type GraphqlTransport,
} from "@arp-protocol/graphql";
import {getAddress, type Address, type Hex} from "viem";

import {isUsageOutcome, isUsageReason, type UsageOutcome} from "./declare/usage-context.js";
import {
    checkX402Payment,
    parsePaymentAtomLabel,
    type X402NetworkPolicy,
    type X402TransferReads,
} from "./x402-payment.js";

/**
 * The x402 outcomes feed (task 89, ADR `0159`): every line about an endpoint that names its payment,
 * kept only when the payment checks out on its own chain when the feed is built.
 *
 * Built for a reader outside ARP: x402 Doctor shows "N paid, M got nothing" beside its verdict, and
 * verifies each settlement itself (`FUTURE.md`, x402 section). So a record carries what that check
 * needs: the endpoint, the outcome, the settlement transaction, its network and the dates.
 *
 * **What a record proves:** a payment of an accepted asset, from the wallet that wrote the line (or
 * that agent's `agentWallet`), and that wallet's word about the outcome. **Not** that the endpoint
 * delivered or failed to: that is the payer's claim. Nor that the recipient is the endpoint's own
 * payee, which only the endpoint's 402 answer says; a reader such as Doctor checks it.
 */
export const X402_FEED_SCHEMA = "arp.x402-outcomes/1";

export type X402FeedRecord = {
    /** The endpoint's URL, as its atom's document holds it. */
    endpoint: string;
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
};

export type X402EndpointSummary = {
    records: number;
    worked: number;
    failed: number;
    no_delivery: number;
    /** Distinct paying addresses. Several can be one person. */
    payers: number;
};

export type X402Feed = {
    schema: typeof X402_FEED_SCHEMA;
    generated_at: string;
    /** Where the lines are: the trace chain, never the paying one. */
    trace: {chain: string; graphql: string};
    networks: string[];
    note: string;
    records: X402FeedRecord[];
    by_endpoint: Record<string, X402EndpointSummary>;
    /** Lines that name a payment and are left out, by why. */
    skipped: {count: number; reasons: Record<string, number>};
    /** The read hit a limit, so the feed may miss lines. */
    truncated: boolean;
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
    /** ISO 8601. Passed in, so two builds of one graph differ only here. */
    generatedAt: string;
    pageSize?: number;
    maxPages?: number;
};

export const X402_FEED_NOTE =
    "Each record is one payer's word about one paid call, tied to a payment ARP read on its own chain when this file was built. " +
    "It proves the payment and who made it, not what the endpoint delivered. ARP's own ranking counts an outcome only once 3 distinct wallets say it (ADR 0143); this feed lists every record and leaves the counting to the reader.";

type Level = {
    termId: string;
    subjectId: string | null;
    predicateId: string | null;
    createdAt: string | null;
    subject: {atomId: string | null; label: string | null};
    object: {label: string | null; url: string | null};
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
        object: {label: object === null ? null : readString(object, "label"), url: thing === null ? null : readString(thing, "url")},
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

    type Candidate = {payment: Level; record: Omit<X402FeedRecord, "payer" | "pay_to" | "amount" | "asset" | "paid_at" | "writer">; writers: Set<string>; owner: Address | null; agentWallet: Address | null};
    const candidates: Candidate[] = [];
    for (const payment of payments) {
        const ref = payment.object.label === null ? null : parsePaymentAtomLabel(payment.object.label);
        if (ref === null) {
            skip("the payment is not written as eip155:<chain>/tx/<hash>");
            continue;
        }
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
        const endpoint = uses.object.url;
        if (endpoint === null) {
            skip("the tool has no URL the index resolved");
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
        const checked = await checkX402Payment({
            ref: {network: record.network, txHash: record.settlement_tx},
            payers,
            policy: config.policy,
            reads: config.readsFor(record.network),
        });
        if (checked.status === "unreadable") {
            unreadable.push(checked.reason);
            continue;
        }
        if (checked.status === "refused") {
            skip(checked.reason.startsWith("no transfer") ? "no transfer of an accepted asset from the writer" : checked.reason.replace(/0x[0-9a-fA-F]{40,64}/g, "…"));
            continue;
        }
        const paidAt = new Date(checked.paidAt * 1000).toISOString();
        if (record.written_at !== "" && paidAt > record.written_at) {
            skip("the line was written before the payment");
            continue;
        }
        const payer = checked.transfer.payer;
        const writer = candidate.writers.has(key(payer)) ? payer : (candidate.owner ?? payer);
        verified.push({
            ...record,
            payer,
            pay_to: checked.transfer.payTo,
            amount: checked.transfer.amount.toString(),
            asset: checked.transfer.asset,
            paid_at: paidAt,
            writer,
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
        const summary = (byEndpoint[record.endpoint] ??= {records: 0, worked: 0, failed: 0, no_delivery: 0, payers: 0});
        summary.records += 1;
        summary[record.outcome] += 1;
        if (record.reason?.split(",").includes("no-delivery") === true) summary.no_delivery += 1;
        payersOf.set(record.endpoint, (payersOf.get(record.endpoint) ?? new Set()).add(key(record.payer)));
        summary.payers = payersOf.get(record.endpoint)?.size ?? 0;
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
    };
}
