import {TRUST_INDEX_CREDIT, type OutsideSignals} from "@arp-protocol/core";

/** A small `outside-signals.json`, shaped as `build-outside-signals.ts` writes it (task 101). */
export const OUTSIDE: OutsideSignals = {
    _note: "test",
    sources: {
        github: {read: "2026-11-10", issuesRead: "2026-11-10", query: "q"},
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
        "github.com/acme/skills": {
            status: "archived",
            perSkill: true,
            issues: {
                total: 12,
                open: 3,
                recent: [
                    {number: 40, state: "open", opened: "2026-11-09"},
                    {number: 31, state: "closed", opened: "2026-10-01"},
                ],
            },
        },
        "github.com/acme/one": {
            status: "active",
            issues: {total: 2, open: 1, recent: [{number: 7, state: "open", opened: "2026-11-02"}]},
        },
        "github.com/acme/unread": {status: null, issues: null},
    },
    skills: {
        "github.com/acme/skills?skill=render": {
            named: 1,
            recent: [{number: 40, state: "open", opened: "2026-11-09"}],
        },
    },
    x402: {
        urls: {
            "https://pay.example/a": {verdict: "go", reasons: [], priceUsd: 0.01, daysChecked: 9, daysPayable: 8},
        },
        hostsAsked: ["pay.example", "quiet.example"],
        hosts: {"pay.example": {endpoints: 5, go: 4, caution: 0, noGo: 1, error: 0}},
    },
};
