import {X402_LEVELS_BY_ID_QUERY, X402_PAYMENT_LEVELS_QUERY, X402_REASONS_QUERY, type GraphqlTransport} from "@arp-protocol/graphql";
import {getAddress} from "viem";
import {describe, expect, it} from "vitest";

import {readFileSync} from "node:fs";

import {X402_DEFAULT_NETWORKS, X402_TEST_NETWORKS, x402FeedNetworks} from "../src/arp/x402-networks.js";
import {buildX402Feed, type X402FeedConfig} from "../src/x402-feed.js";
import {x402Policy, x402Reading, type X402TransferReads} from "../src/x402-payment.js";
import {PAYER, PAY_TO, recordedReads, TX, type Fixture} from "./x402-fixture.js";

const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
const PRED = {paidWith: id(1), hasOutcome: id(2), because: id(3), inContextOf: id(4), uses: id(5)};
const SPONSOR = "0x7793000000000000000000000000000000007ec9";
const OTHER = getAddress(`0x${"22".repeat(20)}`);
const ENDPOINT = "https://api.example.com/x402/weather";
/** What the payer called: http, www, a trailing slash. It normalises to `ENDPOINT`. */
const CALLED = "http://www.api.example.com/x402/weather/";

type Row = {
    term_id: string;
    subject_id: string | null;
    predicate_id: string;
    creator_id: string;
    created_at: string;
    subject: {term_id: string; label: string | null} | null;
    object: {term_id: string; label: string | null; data?: string | null; value: {thing: {url: string} | null} | null};
    positions: {account_id: string}[];
};

const row = (term: number, subject: number | null, predicate: string, label: string, holders: string[], extra: Partial<Row> = {}): Row => ({
    term_id: id(term),
    subject_id: subject === null ? null : id(subject),
    predicate_id: predicate,
    creator_id: SPONSOR,
    created_at: "2026-11-09T20:00:00.000",
    subject: null,
    // The index cuts a text atom's label at 256 characters and keeps `data` whole (13579, 2026-11-10).
    object: {term_id: id(term + 1000), label: label.slice(0, 256), data: label, value: null},
    positions: holders.map((account_id) => ({account_id})),
    ...extra,
});

/**
 * One line, form B, by `writer`: uses → in context of `data` → failed → because no-delivery, paid with `tx`
 * at `called`. `called` `null` is a line written before task 93, which named no exact URL.
 */
function line(base: number, writer: string, tx: string = TX, outcome = "failed", called: string | null = CALLED) {
    return [
        row(base + 1, base + 2, PRED.paidWith, `eip155:8453/tx/${tx}${called === null ? "" : ` ${called}`}`, [writer]),
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
                endpoint: CALLED,
                endpoint_canonical: ENDPOINT,
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
        // Keyed by the canonical URL, so every spelling of one endpoint counts under one key.
        expect(feed.by_endpoint[ENDPOINT]).toEqual({records: 1, worked: 0, failed: 1, no_delivery: 1, payers: 1});
        expect(feed.skipped).toEqual({count: 0, reasons: {}});
        expect(feed.trace.chain).toBe("eip155:13579");
        expect(feed.schema).toBe("arp.x402-outcomes/2");
        expect(feed.note).toContain("3 distinct wallets");
    });

    it("keeps a line older than task 93 with its canonical URL, and says the exact one is unknown", async () => {
        const feed = await buildX402Feed(config(line(0, PAYER.toLowerCase(), TX, "failed", null)));
        expect(feed.records.map((r) => [r.endpoint, r.endpoint_canonical])).toEqual([[null, ENDPOINT]]);
        expect(feed.by_endpoint[ENDPOINT]?.records).toBe(1);
    });

    it("reads the exact URL from the atom's data, whole, where the index's label is cut at 256", async () => {
        const long = `${CALLED}?q=${"a".repeat(300)}`;
        const tool = `${ENDPOINT}?q=${"a".repeat(300)}`;
        const rows = line(0, PAYER.toLowerCase(), TX, "failed", long).map((r) =>
            r.predicate_id === PRED.uses ? {...r, object: {...r.object, value: {thing: {url: tool}}}} : r,
        );
        expect((rows[0] as Row).object.label?.length).toBe(256);
        const feed = await buildX402Feed(config(rows));
        expect(feed.records.map((r) => [r.endpoint, r.endpoint_canonical])).toEqual([[long, tool]]);
    });

    it("leaves out an exact URL that does not normalise to the tool's URL", async () => {
        for (const called of ["https://api.example.com/x402/other", "https://evil.example/x402/weather"]) {
            const feed = await buildX402Feed(config(line(0, PAYER.toLowerCase(), TX, "failed", called)));
            expect(feed.records).toEqual([]);
            expect(feed.skipped.reasons).toEqual({"the exact URL does not normalise to the tool's URL": 1});
        }
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

describe("the main feed and the test feed (task 118)", () => {
    const SEPOLIA = JSON.parse(readFileSync(new URL("./fixtures/x402-base-sepolia-usdc-3009.json", import.meta.url), "utf8")) as Fixture; // written by task 91
    const SEPOLIA_PAYER = "0x011a56928886904a79a7f4b18f5b0b352a0fc9ac";
    const LOOPBACK = "https://127.0.0.1:4021/x402-demo/no-delivery";
    /** `line`, paid on Base Sepolia with the recorded settlement, after it, at `tool`. */
    const sepoliaLine = (base: number, tool: string = ENDPOINT) =>
        line(base, SEPOLIA_PAYER, SEPOLIA.receipt.transactionHash, "failed", tool).map((r) => {
            const paid = `eip155:84532/tx/${SEPOLIA.receipt.transactionHash} ${tool}`;
            const object =
                r.predicate_id === PRED.paidWith ? {...r.object, label: paid, data: paid} : r.predicate_id === PRED.uses ? {...r.object, value: {thing: {url: tool}}} : r.object;
            return {...r, created_at: "2026-11-09T21:00:00.000", object};
        });
    const feedOf = (kind: "main" | "test", rows: Row[]) => {
        const reading = x402Reading(x402FeedNetworks(kind, {}), {});
        const readsFor = (network: string) => (network === "eip155:84532" ? recordedReads(SEPOLIA) : recordedReads());
        return buildX402Feed(config(rows, {policy: reading.policy, readsFor, allowPrivateEndpoints: kind === "test"}));
    };
    const SEPOLIA_ENV = {ARP_X402_NETWORKS: "eip155:84532=0x036CbD53842c5426634e7929541eC2318f3dCF7e", ARP_X402_RPC_84532: "http://localhost:8545"};

    it("reads Base for the main feed and Base Sepolia alone for the test feed", () => {
        expect([...x402FeedNetworks("main", {}).keys()]).toEqual(["eip155:8453"]);
        expect([...x402FeedNetworks("test", {}).keys()]).toEqual(["eip155:84532"]);
        // What the end-to-end runbook sets, with an RPC of one's own, is fine for the test feed.
        expect(x402FeedNetworks("test", SEPOLIA_ENV).get("eip155:84532")?.rpcUrl).toBe("http://localhost:8545");
    });

    it("refuses to read Base Sepolia in the main feed, and anything but Base Sepolia in the test feed", () => {
        expect(() => x402FeedNetworks("main", SEPOLIA_ENV)).toThrow(/main x402 feed does not read eip155:84532/);
        const base = {ARP_X402_NETWORKS: "eip155:8453=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", ARP_X402_RPC_8453: "https://mainnet.base.org"};
        expect(() => x402FeedNetworks("test", base)).toThrow(/test x402 feed does not read eip155:8453/);
    });

    it("keeps a Base Sepolia line out of the main feed and in the test feed", async () => {
        const main = await feedOf("main", sepoliaLine(0));
        expect(main.records).toEqual([]);
        expect(main.skipped.reasons).toEqual({"network eip155:84532 is not read": 1});
        const test = await feedOf("test", sepoliaLine(0));
        expect(test.networks).toEqual(["eip155:84532"]);
        expect(test.records.map((r) => [r.network, r.payer, r.amount])).toEqual([["eip155:84532", getAddress(SEPOLIA_PAYER), "2000"]]);
    });

    it("keeps a Base line out of the test feed", async () => {
        const test = await feedOf("test", line(0, PAYER.toLowerCase()));
        expect(test.records).toEqual([]);
        expect(test.skipped.reasons).toEqual({"network eip155:8453 is not read": 1});
        expect((await feedOf("main", line(0, PAYER.toLowerCase()))).records).toHaveLength(1);
    });

    it("keeps a loopback endpoint in the test feed only", async () => {
        const test = await feedOf("test", sepoliaLine(0, LOOPBACK));
        expect(test.records.map((r) => r.endpoint)).toEqual([LOOPBACK]);
        const strict = await buildX402Feed(config(sepoliaLine(0, LOOPBACK), {policy: x402Policy(X402_TEST_NETWORKS), readsFor: () => recordedReads(SEPOLIA)}));
        expect(strict.records).toEqual([]);
        expect(strict.skipped.reasons).toEqual({"the endpoint is a loopback or private address": 1});
    });
});

