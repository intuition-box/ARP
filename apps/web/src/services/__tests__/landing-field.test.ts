import {describe, expect, it, vi} from "vitest";
import type {PulseDeclaration, PulseUsage, ToolListing} from "@arp-protocol/core";

import {
    buildLandingField,
    EMPTY_FIELD,
    loadLandingField,
    mostDeclaredTool,
    type LandingFieldReads,
} from "../landing-field";

function listing(atomId: string, declarers: string[], label: string | null = null): ToolListing {
    // The fields the landing reads; the rest is shaped as the package returns it.
    return {
        atomId,
        label,
        uri: null,
        hostedAt: null,
        type: null,
        edgeCount: declarers.length,
        declarers,
    } as ToolListing;
}

function declaration(
    agent: string,
    writer: string,
    overrides: Partial<PulseDeclaration> = {},
): PulseDeclaration {
    return {
        tripleId: `edge-${agent}`,
        agent: {atomId: agent, label: `13579:${agent}`},
        writer,
        holders: [writer],
        declaredAt: "2026-11-01T00:00:00Z",
        domains: [],
        outcomes: [],
        lines: [],
        ...overrides,
    };
}

function usage(declarations: PulseDeclaration[]): PulseUsage {
    return {
        declarations,
        agents: 0,
        wallets: 0,
        byDomain: {},
        byOutcome: {},
        byReason: {},
        byOthers: [],
        truncated: false,
    };
}

describe("mostDeclaredTool", () => {
    it("counts agents after the hiding, and skips a tool only ARP's tests declared", () => {
        const tools = [listing("t1", ["a", "b", "c"]), listing("t2", ["d", "e"])];
        expect(mostDeclaredTool(tools, new Set())?.listing.atomId).toBe("t1");
        expect(mostDeclaredTool(tools, new Set(["a", "b"]))?.listing.atomId).toBe("t2");
        expect(mostDeclaredTool(tools, new Set(["a", "b", "c", "d", "e"]))).toBeNull();
    });
});

describe("buildLandingField", () => {
    it("is the empty field when no tool has a declaration", () => {
        expect(buildLandingField({tool: null, usage: null, hidden: new Set(), paidWords: []})).toBe(
            EMPTY_FIELD,
        );
    });

    it("draws the tool's claims, with the latest line and the readings it supports", () => {
        const field = buildLandingField({
            tool: listing("t1", ["a", "b"], "github.com/acme/skills?skill=transcribe"),
            usage: usage([
                declaration("a", "w1", {
                    declaredAt: "2026-11-02T00:00:00Z",
                    domains: ["research"],
                    lines: [{domain: "research", outcome: "worked", reasons: [], form: "nested"}],
                }),
                declaration("b", "w2", {
                    holders: ["w2", "w3"],
                    domains: ["research"],
                    lines: [
                        {
                            domain: "research",
                            outcome: "failed",
                            reasons: ["missing-key"],
                            form: "nested",
                        },
                    ],
                }),
            ]),
            hidden: new Set(),
            paidWords: [],
        });
        expect(field.tool?.name).toBe("transcribe");
        expect(field.rings.map((ring) => ring.name)).toEqual([
            "used by",
            "in context of",
            "has outcome",
        ]);
        expect(field.rings[0]?.claims.map((claim) => [claim.label, claim.positions])).toEqual([
            ["13579:b", 2],
            ["13579:a", 1],
        ]);
        expect(field.rings[1]?.claims).toEqual([
            {key: "context:research", ring: 1, label: "research", isId: false, positions: 2},
        ]);
        expect(field.line).toMatchObject({
            agent: "13579:a",
            tool: "transcribe",
            context: "research",
            outcome: "worked",
        });
        expect(field.readings.map((reading) => reading.kind)).toEqual([
            "useful",
            "for what",
            "working",
        ]);
        expect(field.readings[2]?.text).toBe("failed: missing-key · 1 wallet");
    });

    it("leaves a hidden agent's lines out", () => {
        const field = buildLandingField({
            tool: listing("t1", ["a"]),
            usage: usage([declaration("a", "w1", {domains: ["research"]})]),
            hidden: new Set(["a"]),
            paidWords: [],
        });
        expect(field.rings.every((ring) => ring.claims.length === 0)).toBe(true);
        expect(field.line).toBeNull();
        expect(field.readings).toEqual([]);
    });

    it("caps a ring at six, but always draws the line's own words", () => {
        const many = Array.from({length: 9}, (_, i) =>
            declaration(`a${i}`, `w${i}`, {declaredAt: `2026-11-0${i + 1}T00:00:00Z`}),
        );
        const field = buildLandingField({
            tool: listing("t1", []),
            usage: usage(many),
            hidden: new Set(),
            paidWords: [],
        });
        expect(field.rings[0]?.total).toBe(9);
        expect(field.rings[0]?.claims).toHaveLength(6);
        expect(field.rings[0]?.claims.map((claim) => claim.key)).toContain(field.line?.keys.agent);
    });

    it("adds the paid word as a hollow claim, and nothing when there is none", () => {
        const paid = buildLandingField({
            tool: listing("t1", ["a"]),
            usage: usage([declaration("a", "w1")]),
            hidden: new Set(),
            paidWords: ["stripe"],
        });
        expect(paid.rings[2]?.claims).toContainEqual({
            key: "paid:stripe",
            ring: 2,
            label: "stripe",
            isId: false,
            positions: 0,
        });
        expect(paid.readings.at(-1)?.text).toBe("its files name stripe · no position");
        const none = buildLandingField({
            tool: listing("t1", ["a"]),
            usage: usage([declaration("a", "w1")]),
            hidden: new Set(),
            paidWords: [],
        });
        expect(none.readings.some((reading) => reading.kind === "paid")).toBe(false);
    });

    it("falls back to the listing's agents by id when the lines could not be read", () => {
        const field = buildLandingField({
            tool: listing("t1", ["0xabcdef0123456789"]),
            usage: null,
            hidden: new Set(),
            paidWords: [],
        });
        expect(field.rings[0]?.claims).toHaveLength(1);
        expect(field.rings[0]?.claims[0]?.isId).toBe(true);
        expect(field.line).toBeNull();
        expect(field.linesFailed).toBe(true);
    });
});

describe("loadLandingField", () => {
    const vocabulary = {
        rpcUrl: "",
        chainId: 13579,
        multiVault: "0x0000000000000000000000000000000000000000",
        inContextOf: "0x01",
        payers: [],
    } as const;

    function reads(overrides: Partial<LandingFieldReads> = {}): LandingFieldReads {
        return {
            listTools: vi.fn(async () => ({
                curveId: 1,
                edgesRead: 1,
                truncated: false,
                sponsor: null,
                tools: [listing("t1", ["a"])],
            })) as never,
            getPulseUsage: vi.fn(
                async () => new Map([["t1", usage([declaration("a", "w1")])]]),
            ) as never,
            hiddenAtomIds: vi.fn(async () => new Set<string>()),
            vocabularyIds: vi.fn(async () => ({hasOutcome: "0x02", because: "0x03"})),
            ...overrides,
        };
    }

    it("fails the whole read when the hiding cannot be read, so tests are never shown", async () => {
        await expect(
            loadLandingField(
                {graphqlUrl: "g"},
                vocabulary,
                reads({hiddenAtomIds: vi.fn(async () => Promise.reject(new Error("down")))}),
            ),
        ).rejects.toThrow("down");
    });

    it("keeps the tool when only the lines fail", async () => {
        const out = await loadLandingField(
            {graphqlUrl: "g"},
            vocabulary,
            reads({getPulseUsage: vi.fn(async () => Promise.reject(new Error("down"))) as never}),
        );
        expect(out.tool?.atomId).toBe("t1");
        expect(out.usage).toBeNull();
    });
});

describe("fieldOrSample", () => {
    it("is the sample only when the chain answered with no tool, and real data replaces it", async () => {
        const {fieldOrSample, SAMPLE_FIELD} = await import("../landing-sample");
        expect(fieldOrSample(EMPTY_FIELD)).toEqual({field: SAMPLE_FIELD, sample: true});
        const real = buildLandingField({
            tool: listing("t1", ["a"]),
            usage: usage([declaration("a", "w1")]),
            hidden: new Set(),
            paidWords: [],
        });
        expect(fieldOrSample(real)).toEqual({field: real, sample: false});
    });
});
