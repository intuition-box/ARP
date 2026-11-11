import {describe, expect, it, vi} from "vitest";
import type {AtomStanding, RecentStake} from "@arp-protocol/core";

import {getAddress} from "viem";

import list from "../../data/arp-test-identities.json";
import {
    fetchHiddenAtomIds,
    hiddenAtomIds,
    isHiddenAddress,
    isHiddenAgent,
    isHiddenListing,
    visibleStakes,
    visibleStanding,
} from "../test-identities";

const graph = (data: unknown) =>
    vi.fn(async () => new Response(JSON.stringify({data}), {status: 200}));

describe("what counts as a test identity", () => {
    it("an agent on another registry, or with a token id that is not a number, is not one", () => {
        const ref = {chainId: list.chainId, tokenId: String(list.agents.from)};
        expect(isHiddenAgent(ref)).toBe(true);
        expect(isHiddenAgent({...ref, registry: list.registry.toUpperCase()})).toBe(true);
        expect(
            isHiddenAgent({...ref, registry: "0x0000000000000000000000000000000000000001"}),
        ).toBe(false);
        expect(isHiddenAgent({...ref, tokenId: "0x1"})).toBe(false);
    });

    it("a listing is hidden when any of its identities is, and a missing address is never hidden", () => {
        const test = {
            chainId: list.chainId,
            tokenId: String(list.agents.to),
            registry: getAddress(list.registry),
        };
        const other = {
            chainId: 8453,
            tokenId: "1",
            registry: getAddress("0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"),
        };
        expect(isHiddenListing({ref: null, identities: [other, test]})).toBe(true);
        expect(isHiddenListing({ref: other, identities: []})).toBe(false);
        expect(isHiddenAddress(null)).toBe(false);
        expect(isHiddenAddress(undefined)).toBe(false);
    });

    it("a deposit with no receiver is judged by its signer", () => {
        const wallet = list.addresses[0]?.address ?? "";
        const stake = (account: string) =>
            ({
                id: account,
                kind: "deposit",
                account,
                receiver: null,
                subject: {atomId: "0xa", label: null},
                object: {atomId: "0xb", label: null},
            }) as unknown as RecentStake; // Only the fields the filter reads.
        expect(
            visibleStakes([stake(wallet), stake("0xabc")], new Set()).map((row) => row.id),
        ).toEqual(["0xabc"]);
    });
});

describe("visibleStanding, when nothing or only the amounts are missing", () => {
    const edge = (subject: string) => ({
        tripleId: subject,
        subject: {atomId: subject, label: null, type: null},
        support: {totalAssets: null, positionCount: null},
        oppose: {totalAssets: null, positionCount: null},
    });

    it("returns the same standing when no line is a test agent's", () => {
        // Only the fields `visibleStanding` reads are set.
        const standing = {
            edgeCount: 1,
            groups: [{predicate: {atomId: "0xuses", label: "uses"}, edges: [edge("0xok")]}],
        } as unknown as AtomStanding;
        expect(visibleStanding(standing, new Set(["0xarp"]))).toBe(standing);
    });

    it("an edge with no amounts adds nothing to the recomputed sums", () => {
        // Only the fields `visibleStanding` reads are set.
        const standing = {
            edgeCount: 2,
            groups: [
                {
                    predicate: {atomId: "0xuses", label: "uses"},
                    edges: [edge("0xarp"), edge("0xok")],
                    assets: 9n,
                    positions: 9,
                },
            ],
        } as unknown as AtomStanding;
        expect(visibleStanding(standing, new Set(["0xarp"])).groups[0]).toMatchObject({
            assets: 0n,
            positions: 0,
        });
    });
});

describe("fetchHiddenAtomIds, what the graph may answer", () => {
    it("an answer without triples is a failure, not an empty set", async () => {
        await expect(fetchHiddenAtomIds("https://indexer.test", graph({}))).rejects.toThrow(
            "the graph answered without triples",
        );
    });

    it("skips rows that carry no subject id", async () => {
        const ids = await fetchHiddenAtomIds(
            "https://indexer.test",
            graph({triples: [null, "x", {other: 1}, {subject_id: 7}, {subject_id: "0xAA"}]}),
        );
        expect([...ids]).toEqual(["0xaa"]);
    });

    it("reads through the browser's fetch when none is passed", async () => {
        const fetcher = graph({triples: []});
        vi.stubGlobal("fetch", fetcher);
        try {
            expect((await fetchHiddenAtomIds("https://indexer.default")).size).toBe(0);
            expect(fetcher).toHaveBeenCalledTimes(1);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});

describe("hiddenAtomIds", () => {
    it("asks each graph once per page load", async () => {
        const fetcher = graph({triples: [{subject_id: "0x1"}]});
        const first = await hiddenAtomIds("https://once.test", fetcher);
        const second = await hiddenAtomIds("https://once.test", fetcher);
        expect(second).toBe(first);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("does not keep a failure, so the next read asks again", async () => {
        const failing = vi.fn(async () => new Response("", {status: 502}));
        await expect(hiddenAtomIds("https://retry.test", failing)).rejects.toThrow("502");
        const ok = graph({triples: []});
        expect((await hiddenAtomIds("https://retry.test", ok)).size).toBe(0);
        expect(ok).toHaveBeenCalledTimes(1);
    });
});
