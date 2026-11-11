import {describe, expect, it, vi} from "vitest";

import {FAKE_MULTI_VAULT, answerOf, errorOf, fakeReads} from "./helpers/fake-reads.js";

const TERM = `0x${"ab".repeat(32)}`;
const ABSENT = `0x${"cd".repeat(32)}`;
const RECEIVER = "0x00000000000000000000000000000000000000b1";

vi.hoisted(() => {
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
});

vi.mock("../src/config.js", async (original) => ({
    ...(await original<typeof import("../src/config.js")>()),
    reads: fakeReads({existing: new Set([TERM]), shares: 1_000n}),
}));

const {stakeOnUsed, takePosition, exitPosition} = await import("../src/handlers/positions.js");

describe("arp_stake_on_used", () => {
    const stake = (args: Record<string, unknown>) => stakeOnUsed(1, args);

    it.each([
        [{receiver: "nope", targets: [{}]}, "receiver must be a 20-byte hex address"],
        [{receiver: RECEIVER}, "targets must be a non-empty array"],
        [{receiver: RECEIVER, targets: []}, "targets must be a non-empty array"],
        [{receiver: RECEIVER, targets: [{triple_id: "0x1"}]}, "each target needs a triple_id of 0x + 32 bytes"],
        [{receiver: RECEIVER, targets: [{triple_id: TERM, amount_wei: 5}]}, "each target needs amount_wei as a decimal string of wei"],
        [{receiver: RECEIVER, targets: [{triple_id: TERM, amount_wei: "5"}], curve_id: 1.5}, "curve_id must be an integer"],
    ])("refuses %j", async (args, message) => {
        expect(await errorOf(await stake(args))).toEqual({code: -32602, message});
    });

    it("plans one deposit per existing edge, unsigned, with amounts as strings", async () => {
        const out = await answerOf(
            await stake({receiver: RECEIVER, targets: [{triple_id: TERM, amount_wei: "500"}, {triple_id: ABSENT, amount_wei: "500"}], curve_id: 2}),
        );
        expect(out["curve_id"]).toBe("2");
        expect(out["min_deposit_wei"]).toBe("100");
        expect(out["targets"]).toEqual([
            {triple_id: TERM, receiver: RECEIVER, amount_wei: "500", exists: true},
            {triple_id: ABSENT, receiver: RECEIVER, amount_wei: "500", exists: false},
        ]);
        const calls = out["calls"] as {kind: string; to: string; value_wei: string; preview?: unknown}[];
        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({kind: "deposit", to: FAKE_MULTI_VAULT, value_wei: "500", preview: {shares: "500", assets_after_fees_wei: "500"}});
        expect(out["total_value_wei"]).toBe("500");
        expect(String(out["caveat"])).toMatch(/UNSIGNED/);
    });
});

describe("arp_take_position", () => {
    const take = (args: Record<string, unknown>) => takePosition(2, args);

    it.each([
        [{term_id: "0x1"}, "term_id must be 0x + 32 bytes"],
        [{term_id: TERM, receiver: "x"}, "receiver must be a 0x address"],
        [{term_id: TERM, receiver: RECEIVER, amount_wei: "1e3"}, "amount_wei must be a decimal string of wei"],
        [{term_id: TERM, receiver: RECEIVER, amount_wei: "1000", curve_id: "1"}, "curve_id must be an integer"],
        [{term_id: TERM, receiver: RECEIVER, amount_wei: "1000", min_shares: 3}, "min_shares must be a decimal string"],
    ])("refuses %j", async (args, message) => {
        expect(await errorOf(await take(args))).toEqual({code: -32602, message});
    });

    it("returns the deposit with what the chain says it buys", async () => {
        const out = await answerOf(await take({term_id: TERM, receiver: RECEIVER, amount_wei: "1000", curve_id: 3, min_shares: "7"}));
        expect(out).toMatchObject({
            term_id: TERM,
            receiver: RECEIVER,
            curve_id: "3",
            amount_wei: "1000",
            shares: "1000",
            assets_after_fees_wei: "1000",
            min_deposit_wei: "100",
            chain_id: 13579,
        });
        expect((out["calls"] as {value_wei: string}[])[0]?.value_wei).toBe("1000");
    });

    it("prices on the default curve when none is named", async () => {
        const out = await answerOf(await take({term_id: TERM, receiver: RECEIVER, amount_wei: "1000"}));
        expect(out["curve_id"]).toBe("1");
    });
});

describe("arp_exit_position", () => {
    const exit = (args: Record<string, unknown>) => exitPosition(3, args);

    it.each([
        [{term_id: 1}, "term_id must be 0x + 32 bytes"],
        [{term_id: TERM, account: "x"}, "account must be a 0x address"],
        [{term_id: TERM, account: RECEIVER, receiver: "x"}, "receiver must be a 0x address"],
        [{term_id: TERM, account: RECEIVER, receiver: RECEIVER, shares: 1}, "shares must be a decimal string"],
        [{term_id: TERM, account: RECEIVER, receiver: RECEIVER, curve_id: "a"}, "curve_id must be an integer"],
        [{term_id: TERM, account: RECEIVER, receiver: RECEIVER, min_assets: "-1"}, "min_assets must be a decimal string"],
    ])("refuses %j", async (args, message) => {
        expect(await errorOf(await exit(args))).toEqual({code: -32602, message});
    });

    it("redeems the whole position by default, sending no value", async () => {
        const out = await answerOf(await exit({term_id: TERM, account: RECEIVER, receiver: RECEIVER}));
        expect(out).toMatchObject({shares: "1000", held_shares: "1000", assets_after_fees_wei: "500", curve_id: "1"});
        expect((out["calls"] as {kind: string; value_wei: string}[])[0]).toMatchObject({kind: "redeem", value_wei: "0"});
    });

    it("redeems part of it on the curve and floor given", async () => {
        const out = await answerOf(
            await exit({term_id: TERM, account: RECEIVER, receiver: RECEIVER, shares: "200", curve_id: 2, min_assets: "10"}),
        );
        expect(out).toMatchObject({shares: "200", held_shares: "1000", assets_after_fees_wei: "100", curve_id: "2"});
    });
});
