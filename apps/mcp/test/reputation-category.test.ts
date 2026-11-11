import {afterEach, describe, expect, it, vi} from "vitest";
import {privateKeyToAccount} from "viem/accounts";

import type {ToolUsage} from "@arp-protocol/core";

import {answerOf, errorOf} from "./helpers/fake-reads.js";

vi.hoisted(() => {
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
    process.env["ARP_SPONSOR"] = "http://sponsor.test";
});

const getToolUsage = vi.hoisted(() => vi.fn());
vi.mock("@arp-protocol/core", async (original) => ({
    ...(await original<typeof import("@arp-protocol/core")>()),
    getToolUsage,
}));

const {toolReputation} = await import("../src/handlers/reputation.js");
const {categoryToSign, proposeCategory} = await import("../src/handlers/category.js");

const TOOL = `0x${"ab".repeat(32)}`;
// A fixed test key, holding nothing.
const AGENT = privateKeyToAccount(`0x${"66".repeat(32)}`);

const usage = (edges: ToolUsage["edges"]): ToolUsage => ({
    toolAtomId: TOOL,
    label: "A tool",
    pinnedUri: "ipfs://x",
    totals: {supportAssets: 7n, opposeAssets: 0n, supportPositions: 1, opposePositions: 0},
    edges,
    provenance: {source: "intuition"},
} as unknown as ToolUsage); // provenance's exact shape is not what this test reads

describe("arp_tool_reputation", () => {
    afterEach(() => getToolUsage.mockReset());

    it("refuses an id that is not 32 bytes", async () => {
        expect(await errorOf(await toolReputation(1, {tool_atom_id: "0x12"}))).toMatchObject({code: -32602});
        expect(getToolUsage).not.toHaveBeenCalled();
    });

    it("reads with the attestor filter only when one is given", async () => {
        getToolUsage.mockResolvedValue(usage([]));
        await toolReputation(1, {tool_atom_id: TOOL});
        expect(getToolUsage.mock.calls[0]?.[1]).not.toHaveProperty("attestedBy");
        await toolReputation(1, {tool_atom_id: TOOL, attested_by: "0xabc"});
        expect(getToolUsage.mock.calls[1]?.[1]).toMatchObject({attestedBy: "0xabc"});
    });

    it("writes amounts as strings and calls an edge staked only when somebody holds a position", async () => {
        getToolUsage.mockResolvedValue(
            usage([
                {tripleId: "0x1", agent: "a", support: {totalAssets: 1_000_000n, positionCount: 0}, oppose: {totalAssets: null, positionCount: null}},
                {tripleId: "0x2", agent: "b", support: {totalAssets: 5n, positionCount: 2}, oppose: {totalAssets: 1n, positionCount: 1}},
            ] as unknown as ToolUsage["edges"]), // the fields `serialise` reads
        );
        const out = await answerOf(await toolReputation(1, {tool_atom_id: TOOL}));
        expect(out["totals"]).toEqual({support_assets_wei: "7", oppose_assets_wei: "0", support_positions: 1, oppose_positions: 0});
        const edges = out["edges"] as {staked: boolean; support: unknown; oppose: unknown}[];
        expect(edges.map((edge) => edge.staked)).toEqual([false, true]);
        expect(edges[0]?.oppose).toEqual({total_assets_wei: "0", position_count: 0});
        expect(edges[1]?.support).toEqual({total_assets_wei: "5", position_count: 2});
        expect(String(out["caveat"])).toMatch(/not a score/);
    });
});

describe("arp_propose_category", () => {
    afterEach(() => vi.unstubAllGlobals());

    const NOW = Math.floor(Date.now() / 1000);
    const asked = categoryToSign({
        domain: "slides",
        parent: "design",
        reason: "no child is about decks",
        declarer: AGENT.address,
        agentRegistry: "eip155:13579:0xC165A2AD2E540A4069E02834009161E2b4490d5A",
        agentId: "8",
        subject: `0x${"0b".repeat(32)}`,
        nowSeconds: NOW,
    });
    const sign = async () => {
        const typed = asked.typed_data as {
            domain: {name: string; version: string; chainId: number};
            types: Record<string, {name: string; type: string}[]>;
            primaryType: "CategoryRequest";
            message: Record<string, unknown>;
        }; // the shape `categoryToSign` builds
        const {EIP712Domain: _domain, ...types} = typed.types;
        return AGENT.signTypedData({...typed, types, message: {...typed.message, expiresAt: BigInt(String(typed.message["expiresAt"]))}});
    };

    it.each([
        [{signature: "0x00"}, "request must be"],
        [{request: null, signature: "0x00"}, "request must be"],
        [{request: {}, signature: "zz"}, "signature must be"],
    ])("refuses %j", async (args, message) => {
        expect((await errorOf(await proposeCategory(1, args))).message).toContain(message);
    });

    it("tells a malformed request apart before asking the sponsor", async () => {
        const fetch = vi.fn();
        vi.stubGlobal("fetch", fetch);
        const error = await errorOf(await proposeCategory(1, {request: {label: "x"}, signature: "0x1234"}));
        expect(error.message).toMatch(/^the request is malformed \(/);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("refuses a request signed by another key without naming a reason", async () => {
        const other = privateKeyToAccount(`0x${"67".repeat(32)}`);
        const typed = asked.typed_data as Parameters<typeof other.signTypedData>[0] & {types: Record<string, unknown>}; // same shape as above
        const {EIP712Domain: _d, ...types} = typed.types;
        const signature = await other.signTypedData({
            ...typed,
            types,
            message: {...(typed.message as Record<string, unknown>), expiresAt: BigInt(asked.request.expiresAt)},
        } as Parameters<typeof other.signTypedData>[0]); // the CategoryRequest typed data, re-typed for viem
        const error = await errorOf(await proposeCategory(1, {request: asked.request, signature}));
        expect(error.message).toMatch(/^the request is [a-z-]+: pass/);
        expect(error.message).not.toContain("(");
    });

    it("hands a valid request to the sponsor and reports what it filed", async () => {
        const fetch = vi.fn(async (_url: string, _init: RequestInit) => Response.json({label: "slides", newCategory: true, created: true}));
        vi.stubGlobal("fetch", fetch);
        const out = await answerOf(await proposeCategory(1, {request: asked.request, signature: await sign()}));
        expect(out).toEqual({filed: "slides", new_category: true, written: true});
        expect(fetch.mock.calls[0]?.[0]).toBe("http://sponsor.test/propose-category");
    });
});
