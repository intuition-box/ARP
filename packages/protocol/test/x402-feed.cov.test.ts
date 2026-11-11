import {
    X402_LEVELS_BY_ID_QUERY,
    X402_PAYMENT_LEVELS_QUERY,
    X402_REASONS_QUERY,
    type GraphqlTransport,
} from "@arp-protocol/graphql";
import {getAddress} from "viem";
import {describe, expect, it, vi} from "vitest";

import {X402_DEFAULT_NETWORKS} from "../src/arp/x402-networks.js";
import {
    buildX402Feed,
    signedByPayer,
    type X402FeedConfig,
    type X402SignedRequest,
} from "../src/x402-feed.js";
import {x402Policy} from "../src/x402-payment.js";
import {PAYER, recordedReads, TX} from "./x402-fixture.js";

const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
const PRED = {paidWith: id(1), hasOutcome: id(2), because: id(3), inContextOf: id(4), uses: id(5)};
const SPONSOR = "0x7793000000000000000000000000000000007ec9";
const ENDPOINT = "https://api.example.com/x402/weather";
const CALLED = "http://www.api.example.com/x402/weather/";
const WRITER = PAYER.toLowerCase();

type Row = Record<string, unknown> & {
    term_id: string | null;
    subject_id: string | null;
    predicate_id: string;
};

const row = (
    term: number,
    subject: number | null,
    predicate: string,
    label: string | null,
    holders: string[],
    extra: Record<string, unknown> = {},
): Row => ({
    term_id: id(term),
    subject_id: subject === null ? null : id(subject),
    predicate_id: predicate,
    creator_id: SPONSOR,
    created_at: "2026-11-09T20:00:00.000",
    subject: null,
    object: {term_id: id(term + 1000), label, data: label, value: null},
    positions: holders.map((account_id) => ({account_id})),
    ...extra,
});

const usesRow = (term: number, writer: string, extra: Record<string, unknown> = {}) =>
    row(term, null, PRED.uses, "weather", [writer], {
        subject: {term_id: id(term + 900), label: "Agent 13579:9"},
        object: {term_id: id(term + 901), label: "weather", value: {thing: {url: ENDPOINT}}},
        ...extra,
    });

/** Form B: uses → in context of `data` → outcome, paid with TX at CALLED, and one reason. */
function line(base: number, writer: string = WRITER, outcome = "failed", reason = "no-delivery") {
    return [
        row(base + 1, base + 2, PRED.paidWith, `eip155:8453/tx/${TX} ${CALLED}`, [writer]),
        row(base + 2, base + 3, PRED.hasOutcome, outcome, [writer]),
        row(base + 3, base + 4, PRED.inContextOf, "data", [writer]),
        usesRow(base + 4, writer),
        row(base + 5, base + 2, PRED.because, reason, [writer]),
    ];
}

function graph(rows: readonly Row[], extra: {paymentPage?: unknown} = {}): GraphqlTransport {
    return {
        async request(query, variables) {
            if (query === X402_PAYMENT_LEVELS_QUERY) {
                if (extra.paymentPage !== undefined) return {triples: extra.paymentPage};
                const offset = Number(variables["offset"]);
                const all = rows.filter((r) => r.predicate_id === PRED.paidWith);
                return {triples: all.slice(offset, offset + Number(variables["limit"]))};
            }
            if (query === X402_LEVELS_BY_ID_QUERY) {
                const ids = new Set(
                    (variables["ids"] as string[]).map((value) => value.toLowerCase()),
                ); // this query's own variables
                return {triples: rows.filter((r) => r.term_id !== null && ids.has(r.term_id))};
            }
            if (query === X402_REASONS_QUERY) {
                const ids = new Set(
                    (variables["ids"] as string[]).map((value) => value.toLowerCase()),
                ); // this query's own variables
                return {
                    triples: rows.filter(
                        (r) =>
                            r.predicate_id === PRED.because &&
                            r.subject_id !== null &&
                            ids.has(r.subject_id),
                    ),
                };
            }
            throw new Error("unexpected query");
        },
    };
}

const config = (rows: readonly Row[], over: Partial<X402FeedConfig> = {}): X402FeedConfig => ({
    transport: graph(rows),
    trace: {chain: "eip155:13579", graphql: "https://testnet.intuition.sh/v1/graphql"},
    predicates: PRED,
    payers: [SPONSOR],
    policy: x402Policy(X402_DEFAULT_NETWORKS),
    readsFor: () => recordedReads(),
    generatedAt: "2026-12-02T00:00:00.000Z",
    ...over,
});

const replace = (rows: Row[], predicate: string, change: (r: Row) => Row) =>
    rows.map((r) => (r.predicate_id === predicate ? change(r) : r));

describe("buildX402Feed, the shapes the graph can take", () => {
    it("stops at its page limit and says the feed was cut", async () => {
        const rows = [...line(0), ...line(100)];
        const feed = await buildX402Feed(config(rows, {pageSize: 1, maxPages: 1}));
        expect(feed.truncated).toBe(true);
    });

    it("says the feed was cut when one outcome's reasons fill a page", async () => {
        const feed = await buildX402Feed(config(line(0), {pageSize: 1}));
        expect(feed.truncated).toBe(true);
        expect(feed.records).toHaveLength(1);
    });

    it("says the feed was cut when a level holds the index's cap of positions", async () => {
        const holders = [
            WRITER,
            ...Array.from({length: 99}, (_, at) => `0x${(at + 1).toString(16).padStart(40, "0")}`),
        ];
        const rows = replace(line(0), PRED.hasOutcome, (r) => ({
            ...r,
            positions: holders.map((account_id) => ({account_id})),
        }));
        expect((await buildX402Feed(config(rows))).truncated).toBe(true);
    });

    it("ignores a row with no id and a page that is not a list", async () => {
        expect(
            (await buildX402Feed(config([], {transport: graph([], {paymentPage: "none"})})))
                .records,
        ).toEqual([]);
        const rows = [{...row(1, 2, PRED.paidWith, "x", [WRITER]), term_id: null}];
        expect(
            (await buildX402Feed(config([], {transport: graph(rows, {paymentPage: rows})}))).skipped
                .count,
        ).toBe(0);
    });

    it("skips a payment that names nothing, and one on no outcome", async () => {
        const noLabel = replace(line(0), PRED.paidWith, (r) => ({...r, object: null}));
        expect((await buildX402Feed(config(noLabel))).skipped.reasons).toEqual({
            "the payment is not written as eip155:<chain>/tx/<hash>, then optionally a space and the URL called": 1,
        });
        const onNothing = replace(line(0), PRED.paidWith, (r) => ({...r, subject_id: null}));
        expect((await buildX402Feed(config(onNothing))).skipped.reasons).toEqual({
            "the payment is not on an outcome": 1,
        });
        const notAWord = replace(line(0), PRED.hasOutcome, (r) => ({
            ...r,
            object: {label: "maybe"},
        }));
        expect((await buildX402Feed(config(notAWord))).skipped.reasons).toEqual({
            "the payment is not on an outcome": 1,
        });
    });

    it("reads form A, an outcome straight on the use, as a line with no domain", async () => {
        const rows = line(0)
            .filter((r) => r.predicate_id !== PRED.inContextOf)
            .map((r) => (r.predicate_id === PRED.hasOutcome ? {...r, subject_id: id(4)} : r));
        const feed = await buildX402Feed(config(rows));
        expect(feed.records.map((r) => [r.domain, r.outcome])).toEqual([[null, "failed"]]);
    });

    it("skips an outcome on no use, an outcome whose context sits on nothing, and a tool with no URL", async () => {
        const noUse = line(0).filter((r) => r.predicate_id !== PRED.uses);
        expect((await buildX402Feed(config(noUse))).skipped.reasons).toEqual({
            "the outcome is not on a use": 1,
        });
        const contextOnNothing = replace(line(0), PRED.inContextOf, (r) => ({
            ...r,
            subject_id: null,
        }));
        expect((await buildX402Feed(config(contextOnNothing))).skipped.reasons).toEqual({
            "the outcome is not on a use": 1,
        });
        const orphan = replace(line(0), PRED.hasOutcome, (r) => ({...r, subject_id: null}));
        expect((await buildX402Feed(config(orphan))).skipped.reasons).toEqual({
            "the outcome is not on a use": 1,
        });
        const noUrl = replace(line(0), PRED.uses, (r) => ({
            ...r,
            object: {term_id: id(905), label: "weather", value: {thing: null}},
        }));
        expect((await buildX402Feed(config(noUrl))).skipped.reasons).toEqual({
            "the tool has no URL the index resolved": 1,
        });
    });

    it("keeps only the reasons in the list that a writer stands behind", async () => {
        const rows = [
            ...line(0, WRITER, "failed", "because I said so"),
            row(6, 2, PRED.because, "missing-key", ["0xstranger"]),
            row(7, 2, PRED.because, null, [WRITER]),
            {...row(8, 2, PRED.because, "missing-file", [WRITER]), subject_id: null},
        ];
        const feed = await buildX402Feed(config(rows));
        expect(feed.records.map((r) => r.reason)).toEqual([null]);
    });

    it("prints the index's time in UTC whatever its spelling, and keeps a time it cannot read", async () => {
        const at = (created_at: string | null) =>
            replace(line(0), PRED.paidWith, (r) => ({...r, created_at}));
        expect(
            (await buildX402Feed(config(at("2026-11-09T21:00:00+01:00")))).records[0]?.written_at,
        ).toBe("2026-11-09T20:00:00.000Z");
        expect(
            (await buildX402Feed(config(at("2026-11-09T20:00:00Z")))).records[0]?.written_at,
        ).toBe("2026-11-09T20:00:00.000Z");
        expect((await buildX402Feed(config(at(null)))).records[0]?.written_at).toBe("");
        // Not a time: kept as written, and a string after any ISO date, so it reads as written after the payment.
        expect((await buildX402Feed(config(at("tuesday")))).records[0]?.written_at).toBe("tuesday");
    });

    it("reads a worked line with no reason", async () => {
        const feed = await buildX402Feed(
            config(line(0, WRITER, "worked").filter((r) => r.predicate_id !== PRED.because)),
        );
        expect(feed.records.map((r) => [r.outcome, r.reason])).toEqual([["worked", null]]);
    });
});

describe("buildX402Feed, the agent's keys", () => {
    it("asks for no keys when the use names no agent atom", async () => {
        const agentKeys = vi.fn(async () => null);
        const rows = replace(line(0), PRED.uses, (r) => ({...r, subject: null}));
        expect((await buildX402Feed(config(rows, {agentKeys}))).records).toHaveLength(1);
        expect(agentKeys).not.toHaveBeenCalled();
    });

    it("takes the writer as payer when the agent has no keys or no agentWallet", async () => {
        const none = await buildX402Feed(config(line(0), {agentKeys: async () => null}));
        expect(none.records.map((r) => r.writer)).toEqual([PAYER]);
        const noWallet = await buildX402Feed(
            config(line(0), {agentKeys: async () => ({owner: PAYER, agentWallet: null})}),
        );
        expect(noWallet.records.map((r) => [r.payer, r.writer])).toEqual([[PAYER, PAYER]]);
    });
});

describe("buildX402Feed, what the payment check refuses", () => {
    it("counts a reverted payment under its reason, with the hashes removed", async () => {
        const feed = await buildX402Feed(
            config(line(0), {readsFor: () => recordedReads(undefined, {status: "reverted"})}),
        );
        expect(feed.records).toEqual([]);
        const [reason] = Object.keys(feed.skipped.reasons);
        expect(reason).toMatch(/revert/);
        expect(reason).not.toMatch(/0x[0-9a-f]{40}/i);
    });
});

describe("buildX402Feed, a stored request it cannot read", () => {
    const store = (stored: unknown) => ({source: "store", read: async () => stored});

    it("publishes no request for a stored value that is not one", async () => {
        for (const stored of [
            "text",
            {request: null},
            {request: {expiresAt: "soon"}},
            {request: {expiresAt: 5}},
        ]) {
            const feed = await buildX402Feed(config(line(0), {signedRequests: store(stored)}));
            expect(feed.records.map((r) => [r.signed_request, r.payee_check])).toEqual([
                [null, "unchecked"],
            ]);
        }
    });
});

describe("signedByPayer, a request whose times are not numbers", () => {
    it("says false rather than throwing", async () => {
        const record = {
            network: "eip155:8453",
            settlement_tx: TX,
            outcome: "failed" as const,
            reason: null,
            domain: null,
            endpoint: null,
            payer: getAddress(PAYER),
        };
        const signed = {
            typed_data: {
                domain: {name: "ARP Line Request", version: "6", chainId: 13579},
                types: {},
                primaryType: "LineRequest",
                message: {
                    payment: `eip155:8453/tx/${TX.toLowerCase()}`,
                    outcome: "failed",
                    reason: "",
                    domain: "",
                    endpoint: "",
                    termsAt: "x",
                    expiresAt: "y",
                },
            },
            signature: "0x00",
        } as unknown as X402SignedRequest; // a deliberately malformed archive, which the type cannot express
        expect(await signedByPayer(record, signed)).toBe(false);
    });
});
