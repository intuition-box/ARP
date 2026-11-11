import type {Hex} from "viem";
import {describe, expect, it} from "vitest";

import {
    AmbiguousToolAtomError,
    EmptyPlanError,
    prepareDeclareUsed,
    ZeroPositionError,
} from "../src/declare/plan.js";
import type {ToolAtomCandidate, ToolAtomLookup} from "../src/declare/tool-atom.js";
import {fakeReads, SUBJECT} from "./helpers.js";

const EXISTING: Hex = `0x${"ee".repeat(32)}`;

const lookupOf = (candidates: ToolAtomCandidate[]): ToolAtomLookup => ({
    findByUrl: async () => candidates,
});

describe("prepareDeclareUsed, the remaining paths", () => {
    it("refuses to choose between two atoms for one URL, naming an unlabelled one", async () => {
        const plan = prepareDeclareUsed({
            subject: SUBJECT,
            tools: ["https://tools.example/mcp"],
            reads: fakeReads(),
            lookup: lookupOf([
                {termId: "0x01", label: null, uri: null},
                {termId: "0x02", label: "MCP", uri: "ipfs://x"},
            ]),
        });
        await expect(plan).rejects.toBeInstanceOf(AmbiguousToolAtomError);
        await expect(plan).rejects.toThrow("0x01 (no label), 0x02 (MCP)");
    });

    it("reuses the one atom found, keeping the normalised URL when it has no pinned URI", async () => {
        const plan = await prepareDeclareUsed({
            subject: SUBJECT,
            tools: ["https://tools.example/mcp"],
            reads: fakeReads({existing: new Set([EXISTING])}),
            lookup: lookupOf([{termId: EXISTING, label: "MCP", uri: null}]),
        });
        expect(plan.tools[0]).toMatchObject({
            atomId: EXISTING,
            atomSource: "existing-thing",
            atomExists: true,
        });
        expect(plan.tools[0]?.atomUri).toMatch(/^https:\/\/tools\.example\/mcp/);
        expect(plan.calls.map((call) => call.kind)).not.toContain("create-atom");
    });

    it("raises when the graph reports an atom the chain denies", async () => {
        await expect(
            prepareDeclareUsed({
                subject: SUBJECT,
                tools: ["https://tools.example/mcp"],
                reads: fakeReads(),
                lookup: lookupOf([{termId: EXISTING, label: "MCP", uri: "ipfs://x"}]),
            }),
        ).rejects.toThrow("isTermCreated");
    });

    it("refuses to create an object atom it was handed", async () => {
        const plan = prepareDeclareUsed({
            subject: SUBJECT,
            tools: [],
            objects: [EXISTING],
            reads: fakeReads(),
        });
        await expect(plan).rejects.toBeInstanceOf(EmptyPlanError);
        await expect(plan).rejects.toThrow("ADR 0054");
    });

    it("says a bare URI atom has no pinned description", async () => {
        const plan = await prepareDeclareUsed({
            subject: SUBJECT,
            tools: ["npm:left-pad"],
            reads: fakeReads(),
        });
        expect(plan.tools[0]?.bareUrlWarning).toBeDefined();
        expect(plan.calls.find((call) => call.kind === "create-atom")?.why).toBe(
            "make npm:left-pad public as a bare URI — no pinned description",
        );
    });

    it("refuses an edge whose birth deposit buys no position", async () => {
        await expect(
            prepareDeclareUsed({
                subject: SUBJECT,
                tools: [],
                objects: [EXISTING],
                reads: fakeReads({existing: new Set([EXISTING]), feeBps: 10_000n}),
            }),
        ).rejects.toBeInstanceOf(ZeroPositionError);
    });
});
