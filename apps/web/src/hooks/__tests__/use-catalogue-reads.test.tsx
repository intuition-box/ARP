import {renderHook, waitFor} from "@testing-library/react";
import {DomainTree, type AgentLines, type HierarchyTriple, type PulseUsage, type TaggedTool} from "@arp-protocol/core";
import {afterEach, describe, expect, it, vi} from "vitest";

import {useAgentContents} from "../use-agent-contents";
import {useAgentEndpoints} from "../use-agent-endpoints";
import {useAgentLines} from "../use-agent-lines";
import {useDoc} from "../use-doc";
import {useDomainTree} from "../use-domain-tree";
import {useLandingField} from "../use-landing-field";
import {useOutsideSignals} from "../use-outside-signals";
import {usePulse} from "../use-pulse";
import {useSkillContents} from "../use-skill-contents";
import {useSkillsIndex} from "../use-skills-index";
import {useTagIndex} from "../use-tag-index";
import {hookProviders} from "./hook-providers";

/** Each hook's read is mocked at the service that would reach the network; its shaping is real. */
const core = vi.hoisted(() => ({
    readDomainTree: vi.fn(),
    toolsInDomain: vi.fn(),
    listTools: vi.fn(),
}));
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    ...core,
}));
const fetchDoc = vi.hoisted(() => vi.fn());
vi.mock("../../services/docs", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/docs")>()),
    fetchDoc,
}));
const readAgentContentsOf = vi.hoisted(() => vi.fn());
vi.mock("../../services/agent-contents", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/agent-contents")>()),
    readAgentContentsOf,
}));
const readAgentEndpoints = vi.hoisted(() => vi.fn());
vi.mock("../../services/agent-endpoints", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/agent-endpoints")>()),
    readAgentEndpoints,
}));
const searchSkills = vi.hoisted(() => vi.fn());
vi.mock("../../services/skills-index", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/skills-index")>()),
    searchSkills,
}));
const pulse = vi.hoisted(() => ({loadPulse: vi.fn(), pulseContentsEntry: vi.fn()}));
vi.mock("../../services/pulse", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/pulse")>()),
    ...pulse,
}));
const landing = vi.hoisted(() => ({readPaidWords: vi.fn(), readVocabularyIds: vi.fn()}));
vi.mock("../../services/landing-field", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/landing-field")>()),
    ...landing,
}));

const TESTNET_GRAPHQL = "https://testnet.intuition.sh/v1/graphql";

afterEach(() => {
    vi.clearAllMocks();
});

describe("useDoc", () => {
    it("is pending, then hands back the markdown", async () => {
        fetchDoc.mockResolvedValue("# Title");
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useDoc("install"), {wrapper});
        expect(result.current).toEqual({status: "pending"});
        await waitFor(() => expect(result.current).toEqual({status: "ok", markdown: "# Title"}));
        expect(fetchDoc).toHaveBeenCalledWith("install");
    });

    it("says the read failed rather than showing nothing", async () => {
        fetchDoc.mockRejectedValue(new Error("404"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useDoc("missing"), {wrapper});
        await waitFor(() => expect(result.current).toEqual({status: "failed"}));
    });
});

describe("useAgentContents", () => {
    it("reads the agent's own document", async () => {
        readAgentContentsOf.mockResolvedValue({status: "none"});
        const agent = {registrationFile: null, chainId: 13579, tokenId: "3"};
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useAgentContents(agent), {wrapper});
        await waitFor(() => expect(result.current.data).toEqual({status: "none"}));
        expect(readAgentContentsOf).toHaveBeenCalledWith(agent);
    });
});

describe("useAgentEndpoints", () => {
    it("reads the endpoints its registration file declares", async () => {
        readAgentEndpoints.mockResolvedValue({status: "none", reason: "no-endpoints-declared"});
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useAgentEndpoints("ipfs://cid"), {wrapper});
        await waitFor(() => expect(result.current.data?.status).toBe("none"));
        expect(readAgentEndpoints).toHaveBeenCalledWith("ipfs://cid");
    });
});

describe("useSkillsIndex", () => {
    it("asks nothing for a blank query and stays pending", () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillsIndex("  "), {wrapper});
        expect(result.current).toEqual({status: "pending"});
        expect(searchSkills).not.toHaveBeenCalled();
    });

    it("returns the index's answer as it came", async () => {
        searchSkills.mockResolvedValue({status: "ok", skills: []});
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillsIndex("pdf"), {wrapper});
        await waitFor(() => expect(result.current).toEqual({status: "ok", skills: []}));
    });

    it("says failed when the index cannot be reached", async () => {
        searchSkills.mockRejectedValue(new Error("down"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillsIndex("pdf"), {wrapper});
        await waitFor(() => expect(result.current).toEqual({status: "failed"}));
    });
});

describe("useOutsideSignals", () => {
    it("loads the committed reading", async () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useOutsideSignals(), {wrapper});
        await waitFor(() => expect(result.current).toBeDefined());
    });
});

describe("useSkillContents", () => {
    it("is pending until the reading loads, then finds a skill it read", async () => {
        const {wrapper} = hookProviders();
        const label = "github.com/vercel-labs/skills?skill=find-skills";
        const {result} = renderHook(() => useSkillContents(label), {wrapper});
        expect(result.current).toEqual({status: "pending"});
        await waitFor(() => expect(result.current.status).toBe("read"));
    });

    it("says not read, with the reading's date, for a skill it did not read", async () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useSkillContents("github.com/nobody/nothing?skill=none"), {wrapper});
        await waitFor(() => expect(result.current.status).toBe("not-read"));
        expect(result.current).toHaveProperty("measuredAt", expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
    });
});

describe("usePulse", () => {
    it("is pending, then ok with no contents when no file was read", async () => {
        pulse.loadPulse.mockResolvedValue({pulse: {status: "not_github"}, atomId: null, usage: null});
        pulse.pulseContentsEntry.mockReturnValue(null);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => usePulse("owner/repo", "skill"), {wrapper});
        expect(result.current).toEqual({status: "pending"});
        await waitFor(() => expect(result.current.status).toBe("ok"));
        expect(result.current).toMatchObject({contents: null});
        expect(pulse.loadPulse).toHaveBeenCalledWith(
            "owner/repo",
            "skill",
            expect.objectContaining({chainId: 13579, graphqlUrl: TESTNET_GRAPHQL}),
        );
    });

    it("carries the files it read as a read contents entry, dated when it was read", async () => {
        const entry = {commit: "HEAD", directory: "skills/x"};
        pulse.loadPulse.mockResolvedValue({pulse: {status: "read"}, atomId: null, usage: null});
        pulse.pulseContentsEntry.mockReturnValue(entry);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => usePulse("owner/repo", "x"), {wrapper});
        await waitFor(() => expect(result.current.status).toBe("ok"));
        expect(result.current).toMatchObject({contents: {status: "read", entry}});
    });

    it("says failed when the read fails", async () => {
        pulse.loadPulse.mockRejectedValue(new Error("rate limited"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => usePulse("owner/repo", "x"), {wrapper});
        await waitFor(() => expect(result.current).toEqual({status: "failed"}));
    });
});

describe("useAgentLines", () => {
    it("waits for an atom", () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useAgentLines(null), {wrapper});
        expect(result.current.fetchStatus).toBe("idle");
    });

    it("reads both sides of an agent's lines on the chosen chain", async () => {
        const usedBy: PulseUsage = {
            declarations: [],
            agents: 0,
            wallets: 0,
            byDomain: {},
            byOutcome: {},
            byReason: {},
            byOthers: [],
            truncated: false,
        };
        const getAgentLines = vi.fn(async (): Promise<AgentLines> => ({usedBy, used: [], truncated: true}));
        const reads = {
            getAgentLines,
            hiddenAtomIds: async () => new Set<string>(),
            vocabularyIds: async () => ({hasOutcome: "0xo", because: "0xb"}),
        };
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useAgentLines("0xagent", reads), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({usedBy: [], used: [], contexts: [], truncated: true});
        expect(getAgentLines).toHaveBeenCalledWith(
            "0xagent",
            expect.objectContaining({graphqlUrl: TESTNET_GRAPHQL, hasOutcome: "0xo", because: "0xb"}),
        );
    });
});

function triple(child: string, parent: string): HierarchyTriple {
    return {tripleId: `${child}-${parent}`, child, parent, positions: 1, shares: 1n};
}

const TREE = DomainTree.from("tool", [triple("payment", "tool"), triple("card", "payment"), triple("search", "tool")]);

function tagged(atomId: string, domain: string): TaggedTool {
    return {atomId, domain, hostedAt: null, label: null, tripleId: `t-${atomId}`, positions: 1, attestorBacked: true};
}

describe("useDomainTree", () => {
    it("offers every domain under the root once the tree is read", async () => {
        core.readDomainTree.mockResolvedValue(TREE);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useDomainTree(), {wrapper});
        expect(result.current.options).toEqual([]);
        await waitFor(() => expect(result.current.tree).toBe(TREE));
        expect(result.current.options.map((option) => option.label)).toEqual(["card", "payment", "search"]);
        expect(result.current.error).toBeNull();
    });

    it("surfaces a failed read as an Error", async () => {
        core.readDomainTree.mockRejectedValue(new Error("graph down"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useDomainTree(), {wrapper});
        await waitFor(() => expect(result.current.error?.message).toBe("graph down"));
    });
});

describe("useTagIndex", () => {
    it("reads nothing and counts nothing without a tree", () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useTagIndex(undefined), {wrapper});
        expect(result.current.index.countFor("payment", undefined)).toBe(0);
        expect(result.current.index.idsUnder(["payment"], undefined)).toBeNull();
        expect(core.toolsInDomain).not.toHaveBeenCalled();
    });

    it("counts a domain with everything beneath it, and lower-cases atom ids", async () => {
        core.toolsInDomain.mockResolvedValue({
            domains: [],
            truncated: false,
            tools: [tagged("0xAAA", "payment"), tagged("0xBBB", "card"), tagged("0xCCC", "search"), tagged("0xDDD", "card")],
        });
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useTagIndex(TREE), {wrapper});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const {index} = result.current;
        expect(index.countFor("payment", TREE)).toBe(3);
        expect(index.countFor("payment", undefined)).toBe(1);
        expect(index.idsUnder([], TREE)).toBeNull();
        expect([...(index.idsUnder(["card", "search"], TREE) ?? [])].sort()).toEqual(["0xbbb", "0xccc", "0xddd"]);
        expect(index.byDomain.get("card")).toEqual(new Set(["0xbbb", "0xddd"]));
        expect(result.current.error).toBeNull();
    });

    it("surfaces a failed read as an Error", async () => {
        core.toolsInDomain.mockRejectedValue(new Error("indexer down"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useTagIndex(TREE), {wrapper});
        await waitFor(() => expect(result.current.error?.message).toBe("indexer down"));
    });
});

describe("useLandingField", () => {
    it("is pending, then falls back to the sample while no tool has a line", async () => {
        core.listTools.mockResolvedValue({tools: []});
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useLandingField(), {wrapper});
        expect(result.current).toEqual({status: "pending"});
        await waitFor(() => expect(result.current.status).toBe("ok"));
        expect(landing.readPaidWords).not.toHaveBeenCalled();
        expect(core.listTools).toHaveBeenCalledWith({graphqlUrl: TESTNET_GRAPHQL, order: "declarations"});
    });

    it("says failed when the listing cannot be read", async () => {
        core.listTools.mockRejectedValue(new Error("indexer down"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useLandingField(), {wrapper});
        await waitFor(() => expect(result.current).toEqual({status: "failed"}));
    });
});
