import type {GraphqlTransport} from "@arp-protocol/graphql";
import {describe, expect, it} from "vitest";

import {DomainTree, readHierarchy, toolsInDomain, type HierarchyTriple} from "../src/domains.js";
import {INTUITION_URL} from "./helpers.js";

type Seen = {variables: Record<string, unknown>};

function transport(pages: Record<string, unknown>[], seen: Seen[] = []): GraphqlTransport {
    let index = 0;
    return {
        async request(_query, variables) {
            seen.push({variables});
            const page = pages[Math.min(index, pages.length - 1)] ?? {};
            index += 1;
            return page;
        },
    };
}

const BASE = {
    graphqlUrl: INTUITION_URL,
    hierarchyPredicate: "0xsub",
    tagPredicate: "0xtag",
    root: "root",
};

const triple = (child: string, parent: string, shares: bigint, positions = 1): HierarchyTriple => ({
    tripleId: `0x${child}-${parent}`,
    child,
    parent,
    positions,
    shares,
});

describe("DomainTree", () => {
    it("ranks contested parents by shares and says whether the lead is settled", () => {
        const tree = DomainTree.from("root", [
            triple("a", "root", 1n),
            triple("a", "b", 5n),
            triple("b", "root", 3n),
            triple("c", "root", 2n),
            triple("c", "b", 2n),
            triple("d", "root", 9n, 0),
        ]);
        const contested = tree.contested();
        expect(contested.map((entry) => [entry.domain, entry.settled])).toEqual([
            ["a", true],
            ["c", false],
        ]);
        expect(contested[0]?.parents.map((parent) => parent.parent)).toEqual(["b", "root"]);
        expect(tree.knows("root")).toBe(true);
        expect(tree.knows("b")).toBe(true);
        expect(tree.knows("d")).toBe(false);
        expect(tree.pathToRoot("a")).toEqual({found: true, path: ["a", "b", "root"]});
        expect(tree.pathToRoot("c")).toMatchObject({found: false, reason: "tied", at: "c"});
        expect(tree.pathToRoot("d")).toMatchObject({found: false, reason: "unknown", at: "d"});
    });

    it("reports an unparented ancestor and a cycle", () => {
        const orphan = DomainTree.from("root", [triple("a", "b", 1n)]);
        expect(orphan.pathToRoot("a")).toMatchObject({found: false, reason: "unparented", at: "b"});

        const cycle = DomainTree.from("root", [triple("a", "b", 1n), triple("b", "a", 1n)]);
        expect(cycle.pathToRoot("a")).toMatchObject({found: false, reason: "cycle", at: "a"});
        // A subtree over a cycle still terminates.
        expect(cycle.subtree("a")).toEqual(["a", "b"]);
    });
});

describe("readHierarchy", () => {
    it("reads every triple on the predicate, one curve only, and pages until a short page", async () => {
        const seen: Seen[] = [];
        const result = await readHierarchy({
            ...BASE,
            curveId: 1n,
            transport: transport(
                [
                    {
                        triples: [
                            "junk",
                            {term_id: null, subject: {data: "a"}, object: {data: "root"}},
                            {
                                term_id: "0xt1",
                                subject: {label: "a"},
                                object: {data: "root"},
                                term: {
                                    vaults: [
                                        "junk",
                                        {curve_id: "1", position_count: 2, total_shares: "10"},
                                        {curve_id: "2", position_count: 9, total_shares: "99"},
                                        {curve_id: null},
                                        {curve_id: "1"},
                                    ],
                                },
                            },
                            {term_id: "0xt2", subject: "x", object: {data: "root"}},
                            {term_id: "0xt3", subject: {data: "b"}, object: {data: "a"}, term: "x"},
                        ],
                    },
                ],
                seen,
            ),
        });
        expect(seen[0]?.variables).toMatchObject({pid: "0xsub", offset: 0});
        expect(seen[0]?.variables["who"]).toBeUndefined();
        expect(result).toEqual({
            triples: [
                {tripleId: "0xt1", child: "a", parent: "root", positions: 2, shares: 10n},
                {tripleId: "0xt3", child: "b", parent: "a", positions: 0, shares: 0n},
            ],
            truncated: false,
        });
    });

    it("reads ARP's own positions when attestors are given, summing a duplicate edge", async () => {
        const seen: Seen[] = [];
        const edge = {term_id: "0xt1", subject: {data: "a"}, object: {data: "root"}};
        const result = await readHierarchy({
            ...BASE,
            attestor: "0xarp",
            transport: transport(
                [
                    {
                        positions: [
                            {term: {triple: edge}, shares: "4"},
                            {term: {triple: edge}, shares: "6"},
                            {term: {triple: edge}},
                            {term: {atom: {}}},
                            {term: "x"},
                        ],
                    },
                ],
                seen,
            ),
        });
        expect(seen[0]?.variables["who"]).toEqual(["0xarp"]);
        expect(result.triples).toEqual([
            {tripleId: "0xt1", child: "a", parent: "root", positions: 1, shares: 10n},
        ]);
    });

    it("stops at the row ceiling and says so", async () => {
        const result = await readHierarchy(
            {...BASE, attestor: ["0x1", "0x2"], transport: transport([{positions: "x"}])},
            {maxRows: 0},
        );
        expect(result).toEqual({triples: [], truncated: true});
        const empty = await readHierarchy({
            ...BASE,
            attestor: ["0x1"],
            transport: transport([{positions: "x"}]),
        });
        expect(empty).toEqual({triples: [], truncated: false});
    });
});

describe("toolsInDomain", () => {
    const tree = DomainTree.from("root", [triple("pay", "root", 1n), triple("card", "pay", 1n)]);

    it("asks once for the whole subtree and maps each tagged tool", async () => {
        const seen: Seen[] = [];
        const result = await toolsInDomain(
            {
                ...BASE,
                curveId: 1,
                attestor: "0xarp",
                transport: transport(
                    [
                        {
                            triples: [
                                {
                                    term_id: "0xtag1",
                                    subject: {
                                        term_id: "0xtool",
                                        label: "Tool",
                                        value: {thing: {url: " https://t.dev "}},
                                    },
                                    object: {data: "card"},
                                    term: {
                                        vaults: [
                                            {
                                                curve_id: "1",
                                                position_count: 3,
                                                positions: [{account_id: "0xarp"}],
                                            },
                                            "junk",
                                        ],
                                    },
                                },
                                {
                                    term_id: "0xtag2",
                                    subject: {term_id: "0xtool2", value: {thing: {url: "null"}}},
                                    term: {vaults: [{curve_id: "2", positions: [{}]}]},
                                },
                                {term_id: "0xtag3", subject: {term_id: "0xtool3", value: "x"}},
                                {
                                    term_id: "0xtag4",
                                    subject: {term_id: "0xtool4", value: {thing: {url: "   "}}},
                                },
                                {term_id: "0xtag5", subject: {label: "no id"}},
                                {term_id: null, subject: {term_id: "0xtool6"}},
                                "junk",
                            ],
                        },
                    ],
                    seen,
                ),
            },
            "pay",
            {tree},
        );
        expect(seen[0]?.variables).toMatchObject({
            pid: "0xtag",
            domains: ["pay", "card"],
            who: ["0xarp"],
        });
        expect(result.domains).toEqual(["pay", "card"]);
        expect(result.truncated).toBe(false);
        expect(result.tools).toEqual([
            {
                atomId: "0xtool",
                domain: "card",
                hostedAt: "https://t.dev",
                label: "Tool",
                tripleId: "0xtag1",
                positions: 3,
                attestorBacked: true,
            },
            {
                atomId: "0xtool2",
                domain: "pay",
                hostedAt: null,
                label: null,
                tripleId: "0xtag2",
                positions: 0,
                attestorBacked: false,
            },
            {
                atomId: "0xtool3",
                domain: "pay",
                hostedAt: null,
                label: null,
                tripleId: "0xtag3",
                positions: 0,
                attestorBacked: false,
            },
            {
                atomId: "0xtool4",
                domain: "pay",
                hostedAt: null,
                label: null,
                tripleId: "0xtag4",
                positions: 0,
                attestorBacked: false,
            },
        ]);
    });

    it("pages with a clamped limit and stops at the row ceiling", async () => {
        const seen: Seen[] = [];
        const row = {term_id: "0xt", subject: {term_id: "0xa"}};
        const result = await toolsInDomain(
            {...BASE, transport: transport([{triples: [row]}], seen)},
            "pay",
            {tree, limit: 0, maxRows: 2},
        );
        expect(seen.map((call) => call.variables["offset"])).toEqual([0, 1]);
        expect(seen[0]?.variables["limit"]).toBe(1);
        expect(seen[0]?.variables["who"]).toEqual(["0x0000000000000000000000000000000000000000"]);
        expect(result.truncated).toBe(true);
        expect(result.tools).toHaveLength(2);
    });

    it("takes the default page for a non-finite limit and stops on a missing list", async () => {
        const seen: Seen[] = [];
        const result = await toolsInDomain({...BASE, transport: transport([{}], seen)}, "pay", {
            tree,
            limit: Number.NaN,
        });
        expect(seen[0]?.variables["limit"]).toBeGreaterThan(1);
        expect(result.tools).toEqual([]);
    });

    it("reads the tree itself when none is given", async () => {
        const result = await toolsInDomain(
            {...BASE, transport: transport([{triples: []}])},
            "root",
        );
        expect(result.domains).toEqual(["root"]);
    });
});
