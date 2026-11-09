import {describe, expect, it} from "vitest";

import {fetchDoc, headingId} from "./docs";

const answer = (body: string, status = 200) => async () => new Response(body, {status});

describe("fetchDoc", () => {
    it("returns the Markdown", async () => {
        expect(await fetchDoc("overview", answer("# Overview"))).toBe("# Overview");
    });

    it("refuses the SPA fallback a static host serves for a missing file", async () => {
        await expect(fetchDoc("nope", answer("<!doctype html><html>"))).rejects.toThrow("not on this site");
    });

    it("refuses an error status", async () => {
        await expect(fetchDoc("nope", answer("", 404))).rejects.toThrow("404");
    });
});

describe("headingId", () => {
    it("keeps a tool name's underscores", () => {
        expect(headingId("arp_declare_used (sponsored)")).toBe("arp_declare_used-sponsored");
    });

    it("gives a route a non-empty id", () => {
        expect(headingId("/pulse/:owner/:repo/:skill")).toBe("pulse-owner-repo-skill");
    });

    it("drops an apostrophe rather than splitting on it", () => {
        expect(headingId("What ARP's server holds")).toBe("what-arps-server-holds");
    });
});
