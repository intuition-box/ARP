import {act, renderHook, waitFor} from "@testing-library/react";
import type {RecentDeclaration, RecentStake} from "@arp-protocol/core";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ActivityLog} from "../../services/activity-log";
import {AgentFeed, type EventSourceLike} from "../../services/agent-feed";
import {hiddenAtomIds} from "../../services/test-identities";
import {useActivityLog} from "../use-activity-log";
import {useAgentActivity} from "../use-agent-activity";
import {useChainActivity} from "../use-chain-activity";
import {useChainFacts} from "../use-chain-facts";
import {useRecentDeclarations} from "../use-recent-declarations";
import {hookProviders} from "./hook-providers";

const core = vi.hoisted(() => ({
    getRecentDeclarations: vi.fn<(config: {graphqlUrl: string; limit?: number}) => Promise<RecentDeclaration[]>>(),
    getRecentStakes: vi.fn<(config: {graphqlUrl: string; limit?: number}) => Promise<RecentStake[]>>(),
}));
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    ...core,
}));

const TX = `0x${"ab".repeat(32)}`;

function declaration(overrides: Partial<RecentDeclaration> = {}): RecentDeclaration {
    return {
        tripleId: "0xt1",
        at: "2026-11-10T12:00:00Z",
        txHash: TX,
        subject: {atomId: "0xagent", label: "agent one"},
        object: {atomId: "0xtool", label: "tool one"},
        assets: null,
        positions: 1,
        ...overrides,
    };
}

function stake(overrides: Partial<RecentStake> = {}): RecentStake {
    return {
        id: "0xs-1",
        kind: "deposit",
        at: "2026-11-10T13:00:00Z",
        txHash: TX,
        tripleId: "0xt1",
        subject: {atomId: "0xagent", label: "agent one"},
        object: {atomId: "0xtool", label: "tool one"},
        account: "0xabc",
        receiver: "0xabc",
        assets: 5n,
        ...overrides,
    };
}

afterEach(() => {
    vi.clearAllMocks();
});

describe("useChainActivity", () => {
    it("appends each landed declaration to the log once, oldest first, with its transaction", async () => {
        const log = new ActivityLog();
        const rows = [
            declaration({tripleId: "0xt2", at: "2026-11-10T12:05:00Z", positions: 2}),
            declaration({tripleId: "0xt1"}),
        ];
        const fetchRecent = vi.fn(async () => rows);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useChainActivity({log, fetchRecent, limit: 2}), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const entries = log.all();
        expect(entries.map((entry) => entry.key)).toEqual(["0xt1", "0xt2"]);
        expect(entries[0]).toMatchObject({
            stream: "chain",
            step: "landed",
            label: "uses",
            detail: "agent one → tool one · 1 position",
            chainId: 13579,
            tx: TX,
            at: Date.parse("2026-11-10T12:00:00Z"),
        });
        expect(entries[1]?.detail).toBe("agent one → tool one · 2 positions");
        expect(fetchRecent).toHaveBeenCalledWith({graphqlUrl: "https://testnet.intuition.sh/v1/graphql", limit: 2});
    });

    it("falls back to atom ids, and leaves out a transaction or a time it cannot trust", async () => {
        const log = new ActivityLog({now: () => 42});
        const fetchRecent = vi.fn(async () => [
            declaration({
                txHash: "not-a-hash",
                at: "garbage",
                subject: {atomId: "0xagent", label: null},
                object: {atomId: "0xtool", label: null},
            }),
        ]);
        const {wrapper} = hookProviders();
        renderHook(() => useChainActivity({log, fetchRecent}), {wrapper});
        await waitFor(() => expect(log.all()).toHaveLength(1));
        const [entry] = log.all();
        expect(entry?.detail).toBe("0xagent → 0xtool · 1 position");
        expect(entry).not.toHaveProperty("tx");
        expect(entry?.at).toBe(42);
    });

    it("does not append a row the log already holds", async () => {
        const log = new ActivityLog();
        log.append({stream: "chain", step: "landed", label: "uses", key: "0xT1"});
        const fetchRecent = vi.fn(async () => [declaration({txHash: null})]);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useChainActivity({log, fetchRecent}), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(log.all()).toHaveLength(1);
    });

    it("reads nothing when disabled", () => {
        const fetchRecent = vi.fn(async () => [declaration()]);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useChainActivity({fetchRecent, enabled: false}), {wrapper});
        expect(result.current.fetchStatus).toBe("idle");
        expect(fetchRecent).not.toHaveBeenCalled();
    });
});

describe("useChainFacts", () => {
    it("merges declarations and stakes once both have answered", async () => {
        const {wrapper} = hookProviders();
        const fetchRecent = vi.fn(async () => [declaration()]);
        // A later stake, in its own transaction: one in the declaring transaction folds into the row.
        const fetchStakes = vi.fn(async () => [stake({txHash: `0x${"cd".repeat(32)}`})]);
        const {result} = renderHook(() => useChainFacts({fetchRecent, fetchStakes}), {wrapper});
        expect(result.current.status).toBe("pending");
        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(result.current.facts.map((fact) => fact.kind).sort()).toEqual(["declared", "deposit"]);
        expect(fetchStakes).toHaveBeenCalledWith({graphqlUrl: "https://testnet.intuition.sh/v1/graphql", limit: 50});
    });

    it("reports an error when either read fails", async () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(
            () =>
                useChainFacts({
                    fetchRecent: async () => [declaration()],
                    fetchStakes: async () => {
                        throw new Error("indexer down");
                    },
                }),
            {wrapper},
        );
        await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("drops stakes on a hidden test identity by default", async () => {
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set(["0xagent"]));
        core.getRecentStakes.mockResolvedValue([stake()]);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useChainFacts({fetchRecent: async () => []}), {wrapper});
        await waitFor(() => expect(result.current.status).toBe("success"));
        expect(result.current.facts).toEqual([]);
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set());
    });
});

describe("useRecentDeclarations", () => {
    it("reads the chosen chain's indexer and hides test identities", async () => {
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set(["0xhidden"]));
        core.getRecentDeclarations.mockResolvedValue([
            declaration(),
            declaration({tripleId: "0xt9", subject: {atomId: "0xhidden", label: "test"}}),
        ]);
        const {wrapper} = hookProviders({isMainnet: true});
        const {result} = renderHook(() => useRecentDeclarations(3), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.map((row) => row.tripleId)).toEqual(["0xt1"]);
        expect(core.getRecentDeclarations).toHaveBeenCalledWith({
            graphqlUrl: "https://mainnet.intuition.sh/v1/graphql",
            limit: 3,
        });
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set());
    });
});

describe("useActivityLog", () => {
    it("re-renders with each entry the log receives", () => {
        const log = new ActivityLog();
        const {result} = renderHook(() => useActivityLog(log));
        expect(result.current).toEqual([]);
        act(() => {
            log.append({stream: "mine", step: "sent", label: "support"});
        });
        expect(result.current.map((entry) => entry.label)).toEqual(["support"]);
    });
});

describe("useAgentActivity", () => {
    it("connects while mounted, follows the feed's status, and disconnects on unmount", () => {
        const source: EventSourceLike = {onopen: null, onmessage: null, onerror: null, close: vi.fn()};
        const feed = new AgentFeed(new ActivityLog(), {
            url: "http://127.0.0.1:4100/events",
            open: () => source,
            readReceipt: async () => null,
        });
        const {result, unmount} = renderHook(() => useAgentActivity(feed));
        expect(result.current.status).toBe("connecting");
        act(() => source.onopen?.(new Event("open")));
        expect(result.current.status).toBe("live");
        expect(result.current.events).toEqual([]);
        unmount();
        expect(source.close).toHaveBeenCalled();
        expect(feed.status()).toBe("off");
    });
});
