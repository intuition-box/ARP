import {describe, expect, it} from "vitest";

import {OUTSIDE} from "../test/outside-fixture";
import {endpointsOutsideOf, issueUrl, repoOutsideOf} from "./outside-signals";

describe("repoOutsideOf", () => {
    it("gives a skill its repository's state, its failure issues and those naming it", () => {
        const view = repoOutsideOf(OUTSIDE, "github.com/acme/skills?skill=render");
        expect(view?.status).toEqual({
            value: "archived",
            read: "2026-11-10",
            check: "https://api.github.com/repos/acme/skills",
        });
        expect(view?.issues?.total).toBe(12);
        expect(view?.issues?.open).toBe(3);
        expect(view?.issues?.search).toContain("https://github.com/acme/skills/issues?q=");
        expect(view?.issues?.named).toEqual({count: 1, recent: [{number: 40, state: "open", opened: "2026-11-09"}]});
    });

    it("names no skill for a repository of one, or for the repository's own page", () => {
        expect(repoOutsideOf(OUTSIDE, "github.com/acme/one?skill=x")?.issues?.named).toBeNull();
        expect(repoOutsideOf(OUTSIDE, "github.com/acme/skills")?.issues?.named).toBeNull();
    });

    it("is null where nothing was read, so the page can say not read", () => {
        expect(repoOutsideOf(OUTSIDE, "github.com/acme/unread?skill=x")).toBeNull();
        expect(repoOutsideOf(OUTSIDE, "github.com/elsewhere/x?skill=y")).toBeNull();
        expect(repoOutsideOf(OUTSIDE, null)).toBeNull();
    });

    it("links an issue on GitHub by its number", () => {
        expect(issueUrl("acme/skills", {number: 40, state: "open", opened: "2026-11-09"})).toBe(
            "https://github.com/acme/skills/issues/40",
        );
    });
});

describe("endpointsOutsideOf", () => {
    it("reads an exact row, a host's count, or not listed, and leaves out hosts nobody asked about", () => {
        const rows = endpointsOutsideOf(OUTSIDE, [
            "https://pay.example/a",
            "https://pay.example/mcp",
            "https://quiet.example/a2a",
            "https://never.example/a",
        ]);
        expect(rows.map((row) => row.found.kind)).toEqual(["endpoint", "host", "not-listed"]);
        expect(rows[0]?.check).toBe(
            `https://x402-doctor.fizzl.eu/api/trust?url=${encodeURIComponent("https://pay.example/a")}`,
        );
    });
});
