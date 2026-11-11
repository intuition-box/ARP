import {describe, expect, it, vi} from "vitest";
import type {PulseDeclaration, PulseUsage, ToolListing} from "@arp-protocol/core";

/**
 * The two reads `landing-field.ts` makes itself, stubbed where they leave the browser: the
 * MultiVault reads (an RPC) and the GitHub-backed pulse.
 */
const atomId = vi.hoisted(() => vi.fn());
const multiVaultReads = vi.hoisted(() => vi.fn(() => ({atomId})));
const readPulse = vi.hoisted(() => vi.fn());
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    multiVaultReads,
    readPulse,
}));

const {buildLandingField, loadLandingField, readPaidWords, readVocabularyIds} =
    await import("../landing-field");

const VOCABULARY = {
    rpcUrl: "https://rpc.test",
    chainId: 13579,
    multiVault: "0x0000000000000000000000000000000000000001",
    inContextOf: "0x01",
    payers: [],
} as const;

function listing(id: string, declarers: string[]): ToolListing {
    // The fields the landing reads; the rest is shaped as the package returns it.
    return {
        atomId: id,
        label: null,
        uri: null,
        hostedAt: null,
        type: null,
        edgeCount: declarers.length,
        declarers,
    } as ToolListing;
}
const usageOf = (declarations: PulseDeclaration[]): PulseUsage => ({
    declarations,
    agents: 0,
    wallets: 0,
    byDomain: {},
    byOutcome: {},
    byReason: {},
    byOthers: [],
    truncated: false,
});
const declaration = (over: Partial<PulseDeclaration>): PulseDeclaration => ({
    tripleId: "edge",
    agent: {atomId: "0xagentagentagent01", label: null},
    writer: "w1",
    declaredAt: null,
    domains: [],
    outcomes: [],
    lines: [],
    ...over,
});

describe("readVocabularyIds", () => {
    it("reads the two vocabulary atoms' ids off the chain the vocabulary names", async () => {
        atomId.mockResolvedValueOnce("0xoutcome").mockResolvedValueOnce("0xbecause");
        expect(await readVocabularyIds(VOCABULARY)).toEqual({
            hasOutcome: "0xoutcome",
            because: "0xbecause",
        });
        expect(multiVaultReads).toHaveBeenCalledWith({
            address: VOCABULARY.multiVault,
            chainId: 13579,
            rpcUrl: "https://rpc.test",
        });
    });
});

describe("readPaidWords", () => {
    it("reads nothing for a label that is not a skill", async () => {
        expect(await readPaidWords("github.com/acme/repo")).toEqual([]);
        expect(await readPaidWords(null)).toEqual([]);
        expect(readPulse).not.toHaveBeenCalled();
    });

    it("returns the paid words a skill's files name, asked by repository and skill", async () => {
        readPulse.mockResolvedValueOnce({paidWords: ["OpenAI"]});
        expect(await readPaidWords("github.com/acme/skills?skill=draw")).toEqual(["OpenAI"]);
        expect(readPulse.mock.calls[0]?.[0]).toMatchObject({source: "acme/skills", skill: "draw"});
    });

    it("leaves the reading out when the pulse has none or GitHub does not answer", async () => {
        readPulse.mockResolvedValueOnce({status: "unreadable"});
        expect(await readPaidWords("github.com/acme/skills?skill=draw")).toEqual([]);
        readPulse.mockRejectedValueOnce(new Error("rate limited"));
        expect(await readPaidWords("github.com/acme/skills?skill=draw")).toEqual([]);
    });
});

describe("loadLandingField, a tool the lines say nothing about", () => {
    it("is no usage, not an error", async () => {
        const out = await loadLandingField({graphqlUrl: "g"}, VOCABULARY, {
            listTools: vi.fn(async () => ({
                curveId: 1,
                edgesRead: 1,
                truncated: false,
                sponsor: null,
                tools: [listing("T1", ["a"])],
            })),
            getPulseUsage: vi.fn(async () => new Map<string, PulseUsage>()),
            hiddenAtomIds: async () => new Set<string>(),
            vocabularyIds: async () => ({hasOutcome: "0x02", because: "0x03"}),
        });
        expect(out.tool?.atomId).toBe("T1");
        expect(out.usage).toBeNull();
    });
});

describe("buildLandingField, rows with fields missing", () => {
    it("names an unlabelled agent by its id, counts no holders, and still finds the latest line", () => {
        const field = buildLandingField({
            tool: listing("t1", ["0xagentagentagent01"]),
            usage: usageOf([
                declaration({}),
                declaration({
                    tripleId: "edge2",
                    agent: {atomId: "0xother000000000002", label: " "},
                }),
            ]),
            hidden: new Set(),
            paidWords: [],
        });
        const agents = field.rings[0]?.claims ?? [];
        expect(agents).toHaveLength(2);
        expect(agents.every((claim) => claim.isId && claim.positions === 0)).toBe(true);
    });

    it("by id only, a hidden declarer is still left out", () => {
        const field = buildLandingField({
            tool: listing("t1", ["0xHIDDEN", "0xshown0000000000"]),
            usage: null,
            hidden: new Set(["0xhidden"]),
            paidWords: [],
        });
        expect(field.rings[0]?.claims.map((claim) => claim.key)).toEqual([
            "agent:0xshown0000000000",
        ]);
    });
});
