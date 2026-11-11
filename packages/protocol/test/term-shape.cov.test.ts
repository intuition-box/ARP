import {describe, expect, it} from "vitest";
import type {FetchLike, GraphqlTransport} from "@arp-protocol/graphql";

import {
    getAccountActivity,
    getAccountHoldings,
    getTermActivity,
    getTermBackers,
    getTermShape,
    getTermValueHistory,
    INTUITION_MAX_POSITIONS_PAGE,
} from "../src/term-shape.js";
import {INTUITION_URL} from "./helpers.js";

type Seen = {query: string; variables: Record<string, unknown>};

/** Answers each request with the next response, so the breadth query can get its own. */
function transport(responses: Record<string, unknown>[], seen: Seen[] = []): GraphqlTransport {
    let index = 0;
    return {
        async request(query, variables) {
            seen.push({query, variables});
            const next = responses[Math.min(index, responses.length - 1)] ?? {};
            index += 1;
            return next;
        },
    };
}

const jsonFetch =
    (data: Record<string, unknown>): FetchLike =>
    async () =>
        new Response(JSON.stringify({data}), {
            status: 200,
            headers: {"content-type": "application/json"},
        });

describe("getTermShape, edge cases", () => {
    it("reads an empty aggregate as zero, with no shares and no median", async () => {
        const shape = await getTermShape("0xterm", {
            graphqlUrl: INTUITION_URL,
            transport: transport([{agg: {aggregate: {count: 0, sum: null}}}]),
        });
        expect(shape.positionCount).toBe(0);
        expect(shape.totalShares).toBe(0n);
        expect(shape.largestShareBps).toBeNull();
        expect(shape.topThreeShareBps).toBeNull();
        expect(shape.medianBackerBreadth).toBeNull();
        expect(shape.firstPosition).toBeNull();
        expect(shape.lastPosition).toBeNull();
        expect(shape.backersSampled).toBe(false);
    });

    it("tolerates a missing aggregate block", async () => {
        const shape = await getTermShape("0xterm", {
            graphqlUrl: INTUITION_URL,
            transport: transport([{agg: "x"}]),
        });
        expect(shape.positionCount).toBe(0);
        const noAgg = await getTermShape("0xterm", {
            graphqlUrl: INTUITION_URL,
            transport: transport([{agg: {aggregate: "x"}}]),
        });
        expect(noAgg.totalShares).toBe(0n);
    });

    it("drops malformed backers, takes the lower middle on an even count, and flags a full sample", async () => {
        const seen: Seen[] = [];
        const shape = await getTermShape("0xterm", {
            graphqlUrl: INTUITION_URL,
            curveId: 2,
            backerLimit: 2,
            transport: transport(
                [
                    {
                        agg: {aggregate: {count: 2, sum: {shares: "100"}}},
                        first: ["not a record"],
                        last: [{created_at: "2026-10-02"}],
                        backers: [
                            "junk",
                            {account_id: "0xa", shares: "bad"},
                            {account_id: "0xa", shares: "60"},
                            {account_id: "0xb", shares: "40"},
                        ],
                    },
                    {a0: {aggregate: {count: 5}}, a1: "missing"},
                ],
                seen,
            ),
        });
        expect(seen[0]?.variables["curveId"]).toBe("2");
        expect(seen[0]?.variables["limit"]).toBe(2);
        expect(shape.largestShareBps).toBe(6000);
        expect(shape.topThreeShareBps).toBe(10_000);
        expect(shape.firstPosition).toBeNull();
        expect(shape.lastPosition).toBe("2026-10-02");
        // Breadths 5 and 0, minus the term itself: [4, 0] → lower middle is 0.
        expect(shape.medianBackerBreadth).toBe(0);
        expect(shape.backersSampled).toBe(true);
    });

    it("clamps the backer limit to the positions page cap and builds its own transport", async () => {
        const shape = await getTermShape("0xterm", {
            graphqlUrl: INTUITION_URL,
            fetch: jsonFetch({agg: {aggregate: {count: 0}}}),
            backerLimit: 1_000,
        });
        expect(shape.backersRead).toBe(0);
        const seen: Seen[] = [];
        await getTermShape("0xterm", {
            graphqlUrl: INTUITION_URL,
            transport: transport([{}], seen),
            backerLimit: 1_000,
        });
        expect(seen[0]?.variables["limit"]).toBe(INTUITION_MAX_POSITIONS_PAGE);
    });
});

describe("getTermActivity, edge cases", () => {
    it("uses the asked grain, curve and bucket count and drops malformed rows", async () => {
        const seen: Seen[] = [];
        const buckets = await getTermActivity("0xterm", {
            graphqlUrl: INTUITION_URL,
            grain: "week",
            curveId: 2,
            buckets: 4,
            transport: transport(
                [
                    {
                        rows: [
                            "junk",
                            {bucket: "2026-10-08", count: "x", volume: "1"},
                            {bucket: "2026-10-08", count: "3", volume: "9"},
                            {bucket: "2026-10-01", count: 1, volume: "2"},
                        ],
                    },
                ],
                seen,
            ),
        });
        expect(seen[0]?.query).toContain("signal_stats_weekly");
        expect(seen[0]?.variables).toMatchObject({curveId: "2", limit: 4});
        expect(buckets).toEqual([
            {bucket: "2026-10-01", signals: 1, volume: 2n},
            {bucket: "2026-10-08", signals: 3, volume: 9n},
        ]);
    });

    it("returns nothing when rows are missing", async () => {
        expect(
            await getTermActivity("0xterm", {
                graphqlUrl: INTUITION_URL,
                transport: transport([{}]),
            }),
        ).toEqual([]);
    });
});

describe("getAccountHoldings", () => {
    it("nets deposits against redemptions and counts the two markets apart", async () => {
        const seen: Seen[] = [];
        const holdings = await getAccountHoldings("0xacc", {
            graphqlUrl: INTUITION_URL,
            curveId: 2,
            transport: transport(
                [
                    {
                        held: {aggregate: {count: 3, sum: {shares: "70"}}},
                        deposited: {aggregate: {sum: {assets_after_fees: "10"}}},
                        redeemed: {aggregate: {sum: {assets: "8"}}},
                        onAtoms: {aggregate: {count: 1}},
                        onTriples: {aggregate: {count: 4}},
                    },
                ],
                seen,
            ),
        });
        expect(seen[0]?.variables).toEqual({account: "0xacc", curveId: "2"});
        expect(holdings).toEqual({
            account: "0xacc",
            curveId: 2,
            termsHeld: 3,
            totalShares: 70n,
            depositedAssets: 10n,
            redeemedAssets: 8n,
            netAssets: 2n,
            atomDeposits: 1,
            tripleDeposits: 4,
        });
    });

    it("reads missing or malformed aggregates as zero", async () => {
        const holdings = await getAccountHoldings("0xacc", {
            graphqlUrl: INTUITION_URL,
            transport: transport([
                {held: "x", deposited: {aggregate: "x"}, redeemed: {aggregate: {sum: null}}},
            ]),
        });
        expect(holdings.termsHeld).toBe(0);
        expect(holdings.totalShares).toBe(0n);
        expect(holdings.netAssets).toBe(0n);
        expect(holdings.atomDeposits).toBe(0);
        expect(holdings.tripleDeposits).toBe(0);
    });
});

describe("getAccountActivity", () => {
    it("folds rows by day, oldest first, starting from the opening net", async () => {
        const activity = await getAccountActivity("0xacc", {
            graphqlUrl: INTUITION_URL,
            limit: 2,
            transport: transport([
                {
                    deposits: [
                        {created_at: "2026-10-02T10:00:00Z", assets_after_fees: "5"},
                        {created_at: "2026-10-01T09:00:00Z", assets_after_fees: "3"},
                        "junk",
                        {created_at: null, assets_after_fees: "1"},
                    ],
                    redemptions: [{created_at: "2026-10-02T11:00:00Z", assets: "2"}],
                    allDeposited: {aggregate: {sum: {assets_after_fees: "20"}}},
                    allRedeemed: {aggregate: {sum: {assets: "2"}}},
                },
            ]),
        });
        // All-time 18, window 6 → opening 12.
        expect(activity.openingNet).toBe(12n);
        expect(activity.buckets).toEqual([
            {day: "2026-10-01", deposited: 3n, redeemed: 0n, cumulativeNet: 15n},
            {day: "2026-10-02", deposited: 5n, redeemed: 2n, cumulativeNet: 18n},
        ]);
        expect(activity.truncated).toBe(true);
    });

    it("sorts three days whatever the input order and reads missing aggregates as zero", async () => {
        const activity = await getAccountActivity("0xacc", {
            graphqlUrl: INTUITION_URL,
            transport: transport([
                {
                    deposits: [
                        {created_at: "2026-10-03", assets_after_fees: "1"},
                        {created_at: "2026-10-01", assets_after_fees: "1"},
                        {created_at: "2026-10-02", assets_after_fees: "1"},
                        {created_at: "2026-10-02", assets_after_fees: "1"},
                    ],
                    redemptions: "none",
                    allDeposited: "x",
                    allRedeemed: {aggregate: {sum: "x"}},
                },
            ]),
        });
        expect(activity.buckets.map((b) => b.day)).toEqual([
            "2026-10-01",
            "2026-10-02",
            "2026-10-03",
        ]);
        expect(activity.openingNet).toBe(-4n);
        expect(activity.truncated).toBe(false);
    });

    it("builds its own transport", async () => {
        const activity = await getAccountActivity("0xacc", {
            graphqlUrl: INTUITION_URL,
            fetch: jsonFetch({}),
        });
        expect(activity.buckets).toEqual([]);
    });
});

describe("getTermValueHistory", () => {
    it("adds deposits, subtracts redemptions, floors at zero and skips unknown shapes", async () => {
        const seen: Seen[] = [];
        const points = await getTermValueHistory("0xterm", 1n, {
            graphqlUrl: INTUITION_URL,
            transport: transport(
                [
                    {
                        signals: [
                            {created_at: "t1", delta: "10", deposit_id: "d1"},
                            {created_at: "t2", delta: "4", redemption_id: "r1"},
                            {created_at: "t3", delta: "1", deposit_id: null, redemption_id: null},
                            "junk",
                            {created_at: "t4", delta: "x", deposit_id: "d2"},
                            {created_at: "t5", delta: "20", redemption_id: "r2"},
                        ],
                    },
                ],
                seen,
            ),
        });
        expect(seen[0]?.variables).toMatchObject({curveId: "1", limit: 250});
        expect(points).toEqual([
            {at: "t1", value: 10n},
            {at: "t2", value: 6n},
            {at: "t5", value: 0n},
        ]);
    });

    it("returns nothing when there are no signals", async () => {
        expect(
            await getTermValueHistory("0xterm", 2, {
                graphqlUrl: INTUITION_URL,
                transport: transport([{}]),
                limit: 5,
            }),
        ).toEqual([]);
    });
});

describe("getTermBackers", () => {
    it("maps complete rows and drops incomplete ones", async () => {
        const seen: Seen[] = [];
        const backers = await getTermBackers("0xterm", 1, {
            graphqlUrl: INTUITION_URL,
            limit: 3,
            transport: transport(
                [
                    {
                        positions: [
                            {
                                account: {id: "0xa", atom_id: "0xatom", label: "alice"},
                                shares: "5",
                                total_deposit_assets_after_total_fees: "6",
                                total_redeem_assets_for_receiver: "1",
                                created_at: "2026-10-01",
                            },
                            {
                                account: {id: "0xb"},
                                shares: "2",
                                total_deposit_assets_after_total_fees: "2",
                                total_redeem_assets_for_receiver: "0",
                            },
                            {account: "x", shares: "1"},
                            {
                                account: {id: "0xc"},
                                shares: "1",
                                total_deposit_assets_after_total_fees: "1",
                            },
                            "junk",
                        ],
                    },
                ],
                seen,
            ),
        });
        expect(seen[0]?.variables).toMatchObject({curveId: "1", limit: 3});
        expect(backers).toEqual([
            {
                account: "0xa",
                atomId: "0xatom",
                label: "alice",
                shares: 5n,
                deposited: 6n,
                redeemed: 1n,
                openedAt: "2026-10-01",
            },
            {
                account: "0xb",
                atomId: null,
                label: null,
                shares: 2n,
                deposited: 2n,
                redeemed: 0n,
                openedAt: null,
            },
        ]);
    });

    it("returns nothing when positions are missing", async () => {
        expect(
            await getTermBackers("0xterm", 1, {
                graphqlUrl: INTUITION_URL,
                transport: transport([{}]),
            }),
        ).toEqual([]);
    });
});
