import {describe, expect, it} from "vitest";

import {
    endpointFacts,
    outsideIndex,
    summariseTrustIndex,
    TRUST_INDEX_CREDIT,
    type OutsideSignals,
} from "../src/outside-signals.js";

const FILE: OutsideSignals = {
    _note: "test",
    sources: {
        github: {read: "2026-11-10", issuesRead: "2026-11-10", query: "q"},
        trustIndex: {
            read: "2026-11-09",
            scan: null,
            revision: "abc",
            credit: TRUST_INDEX_CREDIT,
            licence: "CC BY 4.0",
            dataset: "d",
        },
    },
    repos: {},
    skills: {},
    x402: {
        urls: {
            "https://pay.example/a": {
                verdict: "go",
                reasons: [],
                priceUsd: null,
                daysChecked: 1,
                daysPayable: 1,
            },
        },
        hostsAsked: ["pay.example"],
        hosts: {},
    },
};

describe("outsideIndex, labels that name no repository", () => {
    it("reads nothing for a label that is not a GitHub repository", () => {
        const index = outsideIndex(FILE);
        expect(index.repo("https://example.com/x")).toBeNull();
        expect(index.skill("https://example.com/x?skill=pdf")).toBeNull();
    });
});

describe("endpointFacts, a reading with no scan date", () => {
    it("dates the fact by the reading, and says one day in the singular", () => {
        expect(endpointFacts(FILE, "https://pay.example/a")).toEqual([
            {
                says: "go, payable on 1 of 1 day checked",
                per: TRUST_INDEX_CREDIT,
                on: "2026-11-09",
                check: expect.stringContaining(encodeURIComponent("https://pay.example/a")),
                licence: "CC BY 4.0",
            },
        ]);
    });
});

describe("summariseTrustIndex, a wanted row", () => {
    it("keeps its documented figures and counts a no_go on its host", () => {
        const summary = summariseTrustIndex(
            [
                {
                    url: "https://pay.example/a",
                    verdict: "no_go",
                    reasons: "none",
                    price_usd: 0.5,
                    days_checked: 4,
                    days_payable: 1,
                },
            ],
            {urls: new Set(["https://pay.example/a"]), hosts: new Set(["pay.example"])},
        );
        expect(summary.urls).toEqual({
            "https://pay.example/a": {
                verdict: "no_go",
                reasons: [],
                priceUsd: 0.5,
                daysChecked: 4,
                daysPayable: 1,
            },
        });
        expect(summary.hosts).toEqual({
            "pay.example": {endpoints: 1, go: 0, caution: 0, noGo: 1, error: 0},
        });
    });

    it("counts a URL it cannot parse as malformed", () => {
        expect(
            summariseTrustIndex([{url: "not a url", verdict: "go"}], {
                urls: new Set(),
                hosts: new Set(),
            }).malformed,
        ).toBe(1);
    });
});
