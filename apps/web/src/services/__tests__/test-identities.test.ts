import {describe, expect, it, vi} from "vitest";
import type {AtomStanding, RecentDeclaration, RecentStake} from "@arp-protocol/core";

import {
    fetchHiddenAtomIds,
    hiddenCaip19s,
    isHiddenAddress,
    isHiddenAgent,
    visibleBackers,
    visibleDeclarations,
    visibleStakes,
    visibleStanding,
} from "../test-identities";

const end = (atomId: string) => ({atomId, label: atomId});
const line = (subject: string, object: string): RecentDeclaration => ({
    tripleId: `${subject}-${object}`,
    at: "2026-11-09T10:00:00Z",
    txHash: null,
    subject: end(subject),
    object: end(object),
    assets: null,
    positions: 0,
});
const side = {
    totalMarketCap: null,
    totalAssets: 5n,
    marketCap: null,
    totalShares: null,
    currentSharePrice: null,
    positionCount: 1,
};

describe("the list", () => {
    it("hides agents 13579:1 to 45 on ARP's registry, and nothing else", () => {
        expect(isHiddenAgent({chainId: 13579, tokenId: "1"})).toBe(true);
        expect(isHiddenAgent({chainId: 13579, tokenId: "45"})).toBe(true);
        expect(isHiddenAgent({chainId: 13579, tokenId: "46"})).toBe(false);
        expect(isHiddenAgent({chainId: 8453, tokenId: "5"})).toBe(false);
        expect(
            isHiddenAgent({chainId: 13579, tokenId: "5", registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"}),
        ).toBe(false);
        expect(hiddenCaip19s()).toHaveLength(45);
    });

    it("hides the four wallets, whatever their case", () => {
        expect(isHiddenAddress("0xe596096f4176b682e300d73963e7b04b383c1aa1")).toBe(true);
        expect(isHiddenAddress("0x56BC52C2A0B863C39dBcBE9aC853f301D79bec42")).toBe(false);
        expect(isHiddenAddress(null)).toBe(false);
    });
});

describe("what is left out", () => {
    const hidden = new Set(["0xarp"]);

    it("drops a line about a test agent, as its subject or its object", () => {
        const rows = [line("0xARP", "0xtool"), line("0xother", "0xarp"), line("0xother", "0xtool")];
        expect(visibleDeclarations(rows, hidden).map((row) => row.tripleId)).toEqual(["0xother-0xtool"]);
    });

    it("drops a stake held by a listed wallet, and keeps one the sponsor signed for a tester", () => {
        const stake = (account: string, receiver: string): RecentStake => ({
            id: `${account}-${receiver}`,
            kind: "deposit",
            at: "2026-11-09T10:00:00Z",
            txHash: null,
            tripleId: "0xt",
            subject: end("0xother"),
            object: end("0xtool"),
            account,
            receiver,
            assets: 1n,
        });
        const sponsor = "0xE596096F4176b682E300d73963e7B04B383C1AA1";
        const rows = [stake(sponsor, "0xabc"), stake("0xabc", sponsor), stake("0xabc", "0xabc")];
        // The sponsor signing for a tester stays: whose position it is decides.
        expect(visibleStakes(rows, hidden).map((row) => row.id)).toEqual([
            `${sponsor}-0xabc`,
            "0xabc-0xabc",
        ]);
    });

    it("judges a redeem by its signer, whose position it was, whatever address receives it", () => {
        const sponsor = "0xE596096F4176b682E300d73963e7B04B383C1AA1";
        const redeem = (account: string, receiver: string): RecentStake => ({
            id: `${account}-${receiver}`,
            kind: "redeem",
            at: "2026-11-09T10:00:00Z",
            txHash: null,
            tripleId: "0xt",
            subject: end("0xother"),
            object: end("0xtool"),
            account,
            receiver,
            assets: 1n,
        });
        const rows = [redeem(sponsor, "0xabc"), redeem("0xabc", sponsor)];
        expect(visibleStakes(rows, hidden).map((row) => row.id)).toEqual([`0xabc-${sponsor}`]);
    });

    it("recomputes an atom's group from the lines left, and drops an emptied one", () => {
        const edge = (subject: string) => ({
            tripleId: subject,
            subject: {atomId: subject, label: null, type: null},
            support: side,
            oppose: side,
        });
        const standing = {
            edgeCount: 3,
            groups: [
                {predicate: {atomId: "0xuses", label: "uses"}, edges: [edge("0xarp"), edge("0xother")], assets: 10n, positions: 2},
                {predicate: {atomId: "0xrates", label: "rates"}, edges: [edge("0xARP")], assets: 5n, positions: 1},
            ],
        } as unknown as AtomStanding; // Only the two fields read here are set.
        const out = visibleStanding(standing, hidden);
        expect(out.edgeCount).toBe(1);
        expect(out.groups).toHaveLength(1);
        expect(out.groups[0]).toMatchObject({assets: 5n, positions: 1});
    });

    it("drops a listed wallet from a term's backers", () => {
        const backer = (account: string) => ({account, atomId: null, label: null, shares: 1n, assets: 1n});
        // Only the fields the filter and the page read.
        const rows = [backer("0x906f3a52ec089f8d4e9127f91c6be5ae0d18f91f"), backer("0xabc")] as never[];
        expect(visibleBackers(rows)).toHaveLength(1);
    });
});

describe("fetchHiddenAtomIds", () => {
    it("asks for the subjects of `same as` edges to the 45 identities, and lowercases them", async () => {
        const fetcher = vi.fn(async () =>
            new Response(JSON.stringify({data: {triples: [{subject_id: "0xABC"}]}}), {status: 200}),
        );
        const ids = await fetchHiddenAtomIds("https://indexer.test", fetcher);
        expect([...ids]).toEqual(["0xabc"]);
        const body = JSON.parse(String((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body));
        expect(body.variables.labels).toHaveLength(45);
    });

    it("throws on a failed read rather than hiding nothing", async () => {
        await expect(
            fetchHiddenAtomIds("https://indexer.test", async () => new Response("", {status: 502})),
        ).rejects.toThrow("502");
    });
});
