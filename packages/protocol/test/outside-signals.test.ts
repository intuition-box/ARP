import {describe, expect, it} from "vitest";

import {
    endpointFacts,
    failureIssueQuery,
    failureIssueSearchUrl,
    outsideIndex,
    repoFacts,
    repoLabelOf,
    summariseTrustIndex,
    titleNamesSkill,
    TRUST_INDEX_CREDIT,
    type OutsideSignals,
} from "../src/outside-signals.js";

const FILE: OutsideSignals = {
    _note: "test",
    sources: {
        github: {
            read: "2026-11-10",
            issuesRead: "2026-11-10",
            query: failureIssueQuery("<owner/name>"),
        },
        trustIndex: {
            read: "2026-11-10",
            scan: "2026-11-10",
            revision: "abc",
            credit: TRUST_INDEX_CREDIT,
            licence: "CC BY 4.0",
            dataset: "huggingface.co/datasets/x402Fizzl/x402-trust-index",
        },
    },
    repos: {
        "github.com/owner/pack": {
            status: "active",
            issues: {total: 7, open: 2, recent: [{number: 9, state: "open", opened: "2026-11-01"}]},
            perSkill: true,
        },
        "github.com/owner/old": {status: "archived", issues: null},
        "github.com/owner/gone": {status: "gone", issues: {total: 0, open: 0, recent: []}},
        "github.com/owner/unread": {status: null, issues: null},
    },
    skills: {
        "github.com/owner/pack?skill=pdf-tools": {
            named: 1,
            recent: [{number: 9, state: "open", opened: "2026-11-01"}],
        },
    },
    x402: {
        urls: {
            "https://pay.example/api/a": {
                verdict: "go",
                reasons: [],
                priceUsd: 0.01,
                daysChecked: 9,
                daysPayable: 9,
            },
            "https://pay.example/api/b": {
                verdict: "no_go",
                reasons: ["no_402"],
                priceUsd: null,
                daysChecked: 3,
                daysPayable: 0,
            },
        },
        hostsAsked: ["pay.example", "other.example", "quiet.example"],
        hosts: {
            "pay.example": {endpoints: 4, go: 3, caution: 0, noGo: 1, error: 0},
            "other.example": {endpoints: 2, go: 0, caution: 1, noGo: 0, error: 1},
        },
    },
};

describe("the failure-issue search", () => {
    it("is one query a reader can run again, of five words and four operators", () => {
        expect(failureIssueQuery("a/b")).toBe(
            "repo:a/b is:issue in:title error OR fail OR failed OR broken OR crash",
        );
        expect(failureIssueQuery("a/b").match(/ OR /g)).toHaveLength(4);
        expect(failureIssueSearchUrl("a/b")).toBe(
            `https://github.com/a/b/issues?q=${encodeURIComponent("is:issue in:title error OR fail OR failed OR broken OR crash")}`,
        );
    });

    it("names a skill only as a whole word", () => {
        expect(titleNamesSkill("pdf-tools fails on large files", "pdf-tools")).toBe(true);
        expect(titleNamesSkill("[PDF-Tools] crash", "pdf-tools")).toBe(true);
        expect(titleNamesSkill("pdf-toolset broken", "pdf-tools")).toBe(false);
        expect(titleNamesSkill("superpdf-tools error", "pdf-tools")).toBe(false);
        // A two-letter name would match half the titles.
        expect(titleNamesSkill("ui error", "ui")).toBe(false);
        // A name is text, never a pattern.
        expect(titleNamesSkill("a.b error", "a+b")).toBe(false);
    });
});

describe("a repository's facts", () => {
    it("reads the repository out of a skill or repository label", () => {
        expect(repoLabelOf("github.com/Owner/Pack?skill=x")).toBe("github.com/owner/pack");
        expect(repoLabelOf("https://github.com/owner/pack/")).toBe("github.com/owner/pack");
        expect(repoLabelOf("gitlab.com/owner/pack")).toBeNull();
    });

    it("says who said it, when, and where to ask again", () => {
        const facts = repoFacts(FILE, "github.com/owner/pack?skill=pdf-tools", "pdf-tools");
        expect(facts).toEqual([
            {
                says: "repository neither archived nor deleted",
                per: "GitHub",
                on: "2026-11-10",
                check: "https://api.github.com/repos/owner/pack",
            },
            {
                says: "7 issue titles name a failure (2 open); 1 among the newest read name this skill",
                per: "GitHub search",
                on: "2026-11-10",
                check: failureIssueSearchUrl("owner/pack"),
            },
        ]);
    });

    it("reads a skill of a several-skill repository that no title names as zero, not as unread", () => {
        expect(repoFacts(FILE, "github.com/owner/pack?skill=other", "other")[1]?.says).toBe(
            "7 issue titles name a failure (2 open); 0 among the newest read name this skill",
        );
        expect(outsideIndex(FILE).skill("github.com/owner/old?skill=x")).toBeNull();
    });

    it("says archived and deleted as GitHub does", () => {
        expect(repoFacts(FILE, "github.com/owner/old")[0]?.says).toBe(
            "repository archived by its owner",
        );
        expect(repoFacts(FILE, "github.com/owner/gone")[0]?.says).toBe(
            "repository not found (deleted, renamed or private)",
        );
        expect(repoFacts(FILE, "github.com/owner/gone")[1]?.says).toBe(
            "0 issue titles name a failure (0 open)",
        );
    });

    it("says nothing about a repository nobody read, which is not 'nothing found'", () => {
        expect(repoFacts(FILE, "github.com/owner/unread")).toEqual([]);
        expect(repoFacts(FILE, "github.com/someone/else?skill=x")).toEqual([]);
    });
});

describe("an endpoint's Trust Index facts", () => {
    it("credits the index as its licence asks, with the scan's day and the live lookup", () => {
        const [fact] = endpointFacts(FILE, "https://pay.example/api/a");
        expect(fact).toEqual({
            says: "go, payable on 9 of 9 days checked",
            per: TRUST_INDEX_CREDIT,
            on: "2026-11-10",
            check: `https://x402-doctor.fizzl.eu/api/trust?url=${encodeURIComponent("https://pay.example/api/a")}`,
            licence: "CC BY 4.0",
        });
        expect(endpointFacts(FILE, "https://pay.example/api/b")[0]?.says).toBe(
            "no_go, payable on 0 of 3 days checked (no_402)",
        );
    });

    it("tells an address the index does not list from a host it lists", () => {
        expect(endpointFacts(FILE, "https://pay.example/mcp")[0]?.says).toBe(
            "this address is not listed; its host has 4 listed endpoints: 3 go, 0 caution, 1 no_go",
        );
        expect(endpointFacts(FILE, "https://other.example/")[0]?.says).toContain("1 unreachable");
        expect(endpointFacts(FILE, "https://quiet.example/a2a")[0]?.says).toBe("not listed");
    });

    it("says nothing about a host that was not looked up, or a string that is not a URL", () => {
        expect(endpointFacts(FILE, "https://never.example/a")).toEqual([]);
        expect(endpointFacts(FILE, "not a url")).toEqual([]);
        expect(outsideIndex(FILE).endpoint("https://never.example/a").asked).toBe(false);
    });
});

describe("summariseTrustIndex", () => {
    it("keeps the rows asked for, counts each host, and skips what the card does not document", () => {
        const summary = summariseTrustIndex(
            [
                {
                    url: "https://pay.example/a",
                    verdict: "go",
                    reasons: [],
                    price_usd: 0.01,
                    days_checked: 2,
                    days_payable: 2,
                },
                {url: "https://pay.example/b", verdict: "error", reasons: ["unreachable", 4]},
                {url: "https://Pay.Example/c", verdict: "caution"},
                {url: "https://elsewhere.example/a", verdict: "go"},
                {url: "https://pay.example/d", verdict: "maybe"},
                {url: 42, verdict: "go"},
                {},
            ],
            {urls: new Set(["https://pay.example/b"]), hosts: new Set(["pay.example"])},
        );
        expect(summary.rows).toBe(7);
        expect(summary.malformed).toBe(3);
        expect(summary.hosts).toEqual({
            "pay.example": {endpoints: 3, go: 1, caution: 1, noGo: 0, error: 1},
        });
        expect(summary.urls).toEqual({
            "https://pay.example/b": {
                verdict: "error",
                reasons: ["unreachable"],
                priceUsd: null,
                daysChecked: 0,
                daysPayable: 0,
            },
        });
    });
});
