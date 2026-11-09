import {X402_LEVELS_BY_ID_QUERY, X402_PAYMENT_LEVELS_QUERY, X402_REASONS_QUERY, type GraphqlTransport} from "@arp-protocol/graphql";
import {getAddress} from "viem";
import {describe, expect, it} from "vitest";

import {X402_DEFAULT_NETWORKS} from "../src/arp/x402-networks.js";
import {buildX402Feed, type X402FeedConfig} from "../src/x402-feed.js";
import {x402Policy, type X402TransferReads} from "../src/x402-payment.js";
import {PAYER, PAY_TO, recordedReads, TX} from "./x402-fixture.js";

const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
const PRED = {paidWith: id(1), hasOutcome: id(2), because: id(3), inContextOf: id(4), uses: id(5)};
const SPONSOR = "0x7793000000000000000000000000000000007ec9";
const OTHER = getAddress(`0x${"22".repeat(20)}`);
const ENDPOINT = "https://api.example.com/x402/weather";

type Row = {
    term_id: string;
    subject_id: string | null;
    predicate_id: string;
    creator_id: string;
    created_at: string;
    subject: {term_id: string; label: string | null} | null;
    object: {term_id: string; label: string | null; value: {thing: {url: string} | null} | null};
    positions: {account_id: string}[];
};

const row = (term: number, subject: number | null, predicate: string, label: string, holders: string[], extra: Partial<Row> = {}): Row => ({
    term_id: id(term),
    subject_id: subject === null ? null : id(subject),
    predicate_id: predicate,
    creator_id: SPONSOR,
    created_at: "2026-11-09T20:00:00.000",
    subject: null,
    object: {term_id: id(term + 1000), label, value: null},
    positions: holders.map((account_id) => ({account_id})),
    ...extra,
});

/** One line, form B, by `writer`: uses → in context of `data` → failed → because no-delivery, paid with `tx`. */
function line(base: number, writer: string, tx: string = TX, outcome = "failed") {
    return [
        row(base + 1, base + 2, PRED.paidWith, `eip155:8453/tx/${tx}`, [writer]),
        row(base + 2, base + 3, PRED.hasOutcome, outcome, [writer]),
        row(base + 3, base + 4, PRED.inContextOf, "data", [writer]),
        row(base + 4, null, PRED.uses, "weather", [writer], {
            subject: {term_id: id(base + 900), label: "Agent 13579:9"},
            object: {term_id: id(base + 901), label: "weather", value: {thing: {url: ENDPOINT}}},
        }),
        row(base + 5, base + 2, PRED.because, "no-delivery", [writer]),
    ];
}

function graph(rows: Row[]): GraphqlTransport {
    return {
        async request(query, variables) {
            if (query === X402_PAYMENT_LEVELS_QUERY) {
                const offset = Number(variables["offset"]);
                const all = rows.filter((r) => r.predicate_id === PRED.paidWith);
                return {triples: all.slice(offset, offset + Number(variables["limit"]))};
            }
            if (query === X402_LEVELS_BY_ID_QUERY) {
                const ids = new Set((variables["ids"] as string[]).map((value) => value.toLowerCase()));
                return {triples: rows.filter((r) => ids.has(r.term_id))};
            }
            if (query === X402_REASONS_QUERY) {
                const ids = new Set((variables["ids"] as string[]).map((value) => value.toLowerCase()));
                return {triples: rows.filter((r) => r.predicate_id === PRED.because && r.subject_id !== null && ids.has(r.subject_id))};
            }
            throw new Error("unexpected query");
        },
    };
}

const config = (rows: Row[], over: Partial<X402FeedConfig> = {}): X402FeedConfig => ({
    transport: graph(rows),
    trace: {chain: "eip155:13579", graphql: "https://testnet.intuition.sh/v1/graphql"},
    predicates: PRED,
    payers: [SPONSOR],
    policy: x402Policy(X402_DEFAULT_NETWORKS),
    readsFor: () => recordedReads(),
    generatedAt: "2026-12-02T00:00:00.000Z",
    ...over,
});

describe("buildX402Feed", () => {
    it("keeps a line whose payment checks, with what Doctor asked for", async () => {
        const rows = line(0, PAYER.toLowerCase()).map((r) => ({...r, created_at: "2026-11-09T20:00:00.000"}));
        const feed = await buildX402Feed(config(rows));
        expect(feed.records).toEqual([
            {
                endpoint: ENDPOINT,
                outcome: "failed",
                reason: "no-delivery",
                domain: "data",
                settlement_tx: TX,
                network: "eip155:8453",
                payer: PAYER,
                pay_to: PAY_TO,
                amount: "20000",
                asset: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
                paid_at: "2026-11-09T19:32:02.000Z",
                writer: PAYER,
                line_id: id(1),
                written_at: "2026-11-09T20:00:00.000Z",
            },
        ]);
        expect(feed.by_endpoint[ENDPOINT]).toEqual({records: 1, worked: 0, failed: 1, no_delivery: 1, payers: 1});
        expect(feed.skipped).toEqual({count: 0, reasons: {}});
        expect(feed.trace.chain).toBe("eip155:13579");
        expect(feed.note).toContain("3 distinct wallets");
    });

    it("leaves out a line whose writer did not make the payment, and counts why", async () => {
        const feed = await buildX402Feed(config(line(0, OTHER.toLowerCase())));
        expect(feed.records).toEqual([]);
        expect(feed.skipped).toEqual({count: 1, reasons: {"no transfer of an accepted asset from the writer": 1}});
    });

    it("accepts the agentWallet of an agent the writer holds, and only then", async () => {
        const holds = await buildX402Feed(config(line(0, OTHER.toLowerCase()), {agentKeys: async () => ({owner: OTHER, agentWallet: PAYER})}));
        expect(holds.records.map((r) => [r.payer, r.writer])).toEqual([[PAYER, OTHER]]);
        const stranger = getAddress(`0x${"33".repeat(20)}`);
        const borrowed = await buildX402Feed(config(line(0, OTHER.toLowerCase()), {agentKeys: async () => ({owner: stranger, agentWallet: PAYER})}));
        expect(borrowed.records).toEqual([]);
    });

    it("leaves out a line nobody but ARP's own wallet stands behind", async () => {
        const feed = await buildX402Feed(config(line(0, SPONSOR)));
        expect(feed.skipped.reasons).toEqual({"no wallet stands behind every level": 1});
    });

    it("leaves out one payment named by two lines", async () => {
        const rows = [...line(0, PAYER.toLowerCase()), ...line(100, PAYER.toLowerCase(), TX, "worked")];
        const feed = await buildX402Feed(config(rows));
        expect(feed.records).toEqual([]);
        expect(feed.skipped.reasons).toEqual({"one payment is named by several lines": 2});
    });

    it("does not let a stranger void a payer's record by naming the same transaction", async () => {
        const rows = [...line(0, PAYER.toLowerCase()), ...line(100, OTHER.toLowerCase())];
        const feed = await buildX402Feed(config(rows));
        expect(feed.records.map((r) => r.writer)).toEqual([PAYER]);
        expect(feed.skipped.reasons).toEqual({"no transfer of an accepted asset from the writer": 1});
    });

    it("leaves out a payment the chain does not have and a label it does not write", async () => {
        const rows = [...line(0, PAYER.toLowerCase(), `0x${"ab".repeat(32)}`), ...line(100, PAYER.toLowerCase())];
        rows[5] = {...(rows[5] as Row), object: {term_id: id(5000), label: "paid on Tuesday", value: null}};
        const feed = await buildX402Feed(config(rows));
        expect(feed.records).toEqual([]);
        expect(feed.skipped.count).toBe(2);
    });

    it("leaves out a line written before its payment", async () => {
        const rows = line(0, PAYER.toLowerCase()).map((r) => ({...r, created_at: "2026-11-09T19:00:00.000"}));
        expect((await buildX402Feed(config(rows))).skipped.reasons).toEqual({"the line was written before the payment": 1});
    });

    it("writes nothing when a paying chain does not answer", async () => {
        const down: X402TransferReads = {
            getTransactionReceipt: async () => {
                throw new Error("fetch failed");
            },
            getBlock: async () => ({timestamp: 0n}),
        };
        await expect(buildX402Feed(config(line(0, PAYER.toLowerCase()), {readsFor: () => down}))).rejects.toThrow(/no snapshot/);
    });

    it("gives the same records for the same graph, so only generated_at moves", async () => {
        const rows = [...line(0, PAYER.toLowerCase()), ...line(100, OTHER.toLowerCase(), `0x${"cd".repeat(32)}`)];
        const a = await buildX402Feed(config(rows));
        const b = await buildX402Feed(config([...rows].reverse(), {generatedAt: "2027-01-01T00:00:00.000Z"}));
        expect({...a, generated_at: ""}).toEqual({...b, generated_at: ""});
    });

    it("is empty, not missing, when no line names a payment", async () => {
        const feed = await buildX402Feed(config([]));
        expect(feed).toMatchObject({records: [], by_endpoint: {}, skipped: {count: 0, reasons: {}}, truncated: false});
    });
});

