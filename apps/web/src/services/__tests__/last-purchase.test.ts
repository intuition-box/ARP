import {describe, expect, it} from "vitest";

import {
    endpointOfLabel,
    fetchLastPurchase,
    lastPurchaseView,
    parseLastPurchase,
} from "../last-purchase";

const TX = "0x7d12d72b606823236946b30f6d7c51f11143df93ee405a93701a0659a0f71997";
const SOURCE = {
    name: "nohumans.directory",
    url: "https://api.nohumans.directory",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    read: "api.nohumans.directory/v1/resolve?url={endpoint}",
};
/** The Worker's answer for the endpoint whose purchase of 2026-10-30 did not deliver (read 2026-11-11). */
const FAILED = {
    source: SOURCE,
    network: "eip155:8453",
    endpoint: "https://api.tickersfeed.net/econ/snapshot",
    listing: "https://api.nohumans.directory/v1/listings/80082624-3d7",
    match: "active",
    listingId: "80082624-3d7",
    purchase: {at: "2026-10-30T09:04:41Z", delivered: false, reason: "stale_data", tx: TX},
    fetchedAt: "2026-11-11T09:00:00.000Z",
};

describe("last purchase", () => {
    it("reads a purchase that did not deliver as its code, its day and its transaction on Base", () => {
        expect(lastPurchaseView({status: "read", answer: parseLastPurchase(FAILED)})).toEqual({
            verdict: "not delivered",
            reason: "stale_data",
            delisted: false,
            day: "2026-10-30",
            tx: {hash: TX, href: `https://basescan.org/tx/${TX}`},
            listing: FAILED.listing,
        });
    });

    it("says never listed, never bought, loading and not read apart, with nothing invented", () => {
        const unknown = parseLastPurchase({
            ...FAILED,
            match: "unknown",
            listing: null,
            purchase: undefined,
        });
        expect(lastPurchaseView({status: "read", answer: unknown}).verdict).toBe(
            "not listed there",
        );
        const never = lastPurchaseView({
            status: "read",
            answer: parseLastPurchase({...FAILED, purchase: null}),
        });
        expect(never).toMatchObject({verdict: "never bought there", day: null, tx: null});
        expect(lastPurchaseView({status: "pending"}).verdict).toBe("…");
        expect(lastPurchaseView({status: "error"}).verdict).toBe("not read");
    });

    it("marks a delisted record and links no explorer for a network it does not know", () => {
        const view = lastPurchaseView({
            status: "read",
            answer: parseLastPurchase({...FAILED, match: "delisted", network: "eip155:1"}),
        });
        expect(view.delisted).toBe(true);
        expect(view.tx).toEqual({hash: TX, href: null});
    });

    it("refuses an answer that is not the shape, rather than showing half of it", () => {
        expect(() => parseLastPurchase({...FAILED, source: undefined})).toThrow();
        expect(() => parseLastPurchase({...FAILED, match: "maybe"})).toThrow();
        expect(() => parseLastPurchase({...FAILED, purchase: {delivered: "yes"}})).toThrow();
        // A transaction that is not 32 bytes of hex is dropped, never linked.
        const bad = parseLastPurchase({...FAILED, purchase: {...FAILED.purchase, tx: "0x12"}});
        expect(bad.match !== "unknown" && bad.purchase?.tx).toBeNull();
    });

    it("sends the endpoint's URL and nothing else", async () => {
        const calls: string[] = [];
        const fetcher = async (input: RequestInfo | URL) => {
            calls.push(String(input));
            return new Response(JSON.stringify(FAILED));
        };
        await fetchLastPurchase("https://api.arp.example/", FAILED.endpoint, fetcher);
        expect(calls).toEqual([
            `https://api.arp.example/x402/last-purchase?url=${encodeURIComponent(FAILED.endpoint)}`,
        ]);
    });

    it("asks only about an atom whose label is an endpoint, never a repository or a skill", () => {
        // A tool atom's label is its URL without the scheme.
        expect(endpointOfLabel("api.tickersfeed.net/econ/snapshot")).toBe(
            "https://api.tickersfeed.net/econ/snapshot",
        );
        expect(endpointOfLabel("mcp.neon.tech/mcp")).toBe("https://mcp.neon.tech/mcp");
        expect(endpointOfLabel("github.com/anthropics/skills?skill=pdf")).toBeNull();
        expect(endpointOfLabel("github.com/anthropics/skills")).toBeNull();
        expect(endpointOfLabel("npmjs.com/package/@paypal/mcp")).toBeNull();
        expect(endpointOfLabel("marketing")).toBeNull();
        expect(endpointOfLabel("US M9 / EU 42.5 / 27 cm")).toBeNull();
        expect(endpointOfLabel(null)).toBeNull();
    });
});
