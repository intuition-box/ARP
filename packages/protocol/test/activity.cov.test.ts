import {encodeFunctionData, type Hex} from "viem";
import {describe, expect, it} from "vitest";

import {
    activityFromLine,
    activityFromRecord,
    activityFromWire,
    decodeMultiVaultCall,
} from "../src/activity.js";
import {encodeCreateAtoms, encodeRedeem, multiVaultDeclareAbi} from "../src/declare/multivault.js";

const TERM = `0x${"d".repeat(64)}` as Hex; // 32 bytes of hex
const WALLET = "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF";

describe("decodeMultiVaultCall, the other functions", () => {
    it("counts the atoms a create-atoms makes", () => {
        expect(
            decodeMultiVaultCall(
                encodeCreateAtoms([
                    {atomData: "0x01", assets: 1n},
                    {atomData: "0x02", assets: 1n},
                ]),
            ),
        ).toEqual({fn: "createAtoms", count: 2});
    });

    it("reads the term a redeem leaves", () => {
        expect(decodeMultiVaultCall(encodeRedeem(WALLET, TERM, 1n, 5n, 0n))).toEqual({
            fn: "redeem",
            termId: TERM,
        });
    });

    it("names a read function in the ABI as other, with its selector", () => {
        const data = encodeFunctionData({
            abi: multiVaultDeclareAbi,
            functionName: "getShares",
            args: [WALLET, TERM, 1n],
        });
        expect(decodeMultiVaultCall(data)).toEqual({fn: "other", selector: data.slice(0, 10)});
    });

    it("reads no call from nothing, from text, or from a short selector", () => {
        expect(decodeMultiVaultCall(null)).toEqual({fn: "other", selector: null});
        expect(decodeMultiVaultCall("hello")).toEqual({fn: "other", selector: null});
        expect(decodeMultiVaultCall("0x1234")).toEqual({fn: "other", selector: null});
    });
});

describe("activityFromRecord, what a line can lack", () => {
    it("drops a record that is not an object", () => {
        expect(activityFromRecord("session", "text")).toBeNull();
        expect(activityFromRecord("sent", null)).toBeNull();
    });

    it("reads a receipt by its name when it names no skill, and drops one with neither", () => {
        expect(activityFromRecord("receipt", {name: "pdf"})).toMatchObject({
            source: "receipt",
            name: "pdf",
            at: "",
            url: null,
        });
        expect(activityFromRecord("receipt", {})).toBeNull();
    });

    it("drops a sent line whose chain is not a whole number, and defaults its kind and reason", () => {
        expect(activityFromRecord("sent", {status: "dry", chainId: 1.5})).toBeNull();
        expect(activityFromRecord("sent", {status: "dry"})).toBeNull();
        expect(
            activityFromRecord("sent", {status: "dry", chainId: 13579, hash: "0x12"}),
        ).toMatchObject({kind: "call", why: "", hash: null, value: "0"});
    });

    it("reads a blank line as nothing", () => {
        expect(activityFromLine("session", "   ")).toBeNull();
    });
});

describe("activityFromWire, a decoded call", () => {
    const sent = (decoded: unknown) =>
        activityFromWire({source: "sent", at: "1", chainId: 13579, status: "success", decoded});

    it("keeps a well-formed call of each kind, dropping what is not hex", () => {
        expect(
            sent({
                fn: "createTriples",
                subjects: [TERM, 3, "nope"],
                predicates: "x",
                objects: [TERM],
            }),
        ).toMatchObject({
            decoded: {fn: "createTriples", subjects: [TERM], predicates: [], objects: [TERM]},
        });
        expect(sent({fn: "createAtoms", count: 3})).toMatchObject({
            decoded: {fn: "createAtoms", count: 3},
        });
        expect(sent({fn: "createAtoms", count: "3"})).toMatchObject({
            decoded: {fn: "createAtoms", count: 0},
        });
        expect(sent({fn: "deposit", receiver: WALLET, termId: TERM, curveId: "2"})).toMatchObject({
            decoded: {fn: "deposit", curveId: "2"},
        });
        expect(sent({fn: "deposit", receiver: WALLET, termId: TERM})).toMatchObject({
            decoded: {fn: "deposit", curveId: "0"},
        });
        expect(sent({fn: "redeem", termId: TERM})).toMatchObject({
            decoded: {fn: "redeem", termId: TERM},
        });
        expect(sent({fn: "redeem", termId: 7})).toMatchObject({
            decoded: {fn: "other", selector: null},
        });
        expect(sent({fn: "approve", selector: "0x095ea7b3"})).toMatchObject({
            decoded: {fn: "other", selector: "0x095ea7b3"},
        });
    });

    it("keeps the event's own decoding when the wire carries none, and drops a sent event that does not read", () => {
        expect(sent(null)).toMatchObject({decoded: {fn: "other", selector: null}});
        expect(activityFromWire({source: "sent", status: "pending"})).toBeNull();
        expect(activityFromWire("text")).toBeNull();
    });
});
