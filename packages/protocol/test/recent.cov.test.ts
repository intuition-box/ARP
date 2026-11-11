import type {FetchLike} from "@arp-protocol/graphql";
import {afterEach, describe, expect, it, vi} from "vitest";

import {getRecentDeclarations, getRecentStakes} from "../src/recent.js";
import {VERSION} from "../src/sources/intuition/terms.js";

/** A GraphQL endpoint behind `fetch`: every query gets `data`, and the variables it was sent are kept. */
function graphqlFetch(data: unknown): {fetch: FetchLike; variables: Record<string, unknown>[]} {
    const variables: Record<string, unknown>[] = [];
    const fetch: FetchLike = async (_input, init) => {
        const body: unknown = JSON.parse(String(init?.body));
        variables.push((body as {variables: Record<string, unknown>}).variables); // the transport's own request body
        return new Response(JSON.stringify({data}), {status: 200});
    };
    return {fetch, variables};
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getRecentDeclarations, the edges", () => {
    it("reads over the fetch it is given, with the curve asked for", async () => {
        const {fetch, variables} = graphqlFetch({triples: "none"});
        expect(
            await getRecentDeclarations({
                graphqlUrl: "https://index.test/graphql",
                fetch,
                timeoutMs: 100,
                curveId: 2,
            }),
        ).toEqual([]);
        expect(variables[0]).toMatchObject({curveId: "2", limit: 8});
    });

    it("reads over the global fetch, rolls a use of a version up to its skill, and reads no amount without a term", async () => {
        const versioned = {
            term_id: "0xuse",
            created_at: "2026-11-10T10:00:00Z",
            subject: {term_id: "0xagent"},
            object: null,
            object_term: {
                triple: {
                    predicate_id: VERSION,
                    subject: {term_id: "0xskill", label: "pdf"},
                    object: {label: `sha256:${"ab".repeat(32)}`},
                },
            },
        };
        vi.stubGlobal(
            "fetch",
            graphqlFetch({
                triples: [versioned, {...versioned, term_id: "0xother", object_term: null}],
            }).fetch,
        );
        const rows = await getRecentDeclarations({graphqlUrl: "https://index.test/graphql"});
        expect(rows).toEqual([
            {
                tripleId: "0xuse",
                at: "2026-11-10T10:00:00Z",
                txHash: null,
                subject: {atomId: "0xagent", label: null},
                object: {atomId: "0xskill", label: "pdf"},
                assets: null,
                positions: 0,
            },
        ]);
    });

    it("reads no position count from a term with no vault list", async () => {
        const row = {
            term_id: "0x1",
            created_at: "t",
            subject: {term_id: "a"},
            object: {term_id: "b"},
            term: {vaults: "none"},
        };
        const {fetch} = graphqlFetch({triples: [row]});
        expect((await getRecentDeclarations({graphqlUrl: "u", fetch}))[0]).toMatchObject({
            positions: 0,
            assets: null,
        });
    });
});

describe("getRecentStakes, the edges", () => {
    const stake = (id: string, at: string, over: Record<string, unknown> = {}) => ({
        id,
        created_at: at,
        term: {
            triple: {
                term_id: "0xclaim",
                subject: {term_id: "0xagent"},
                object: {term_id: "0xtool"},
            },
        },
        ...over,
    });

    it("reads over the global fetch, takes a list that is missing as empty, and keeps ties in place", async () => {
        vi.stubGlobal(
            "fetch",
            graphqlFetch({
                deposits: [stake("d1", "2026-11-10"), stake("d2", "2026-11-10"), "row"],
                redemptions: null,
            }).fetch,
        );
        const rows = await getRecentStakes({graphqlUrl: "https://index.test/graphql"});
        expect(rows.map((row) => [row.id, row.kind, row.subject.label, row.assets])).toEqual([
            ["d1", "deposit", null, null],
            ["d2", "deposit", null, null],
        ]);
    });

    it("drops a stake with no id, no date, or a triple missing its subject or object", async () => {
        const {fetch, variables} = graphqlFetch({
            deposits: [
                stake("ok", "2026-11-10"),
                stake("", "2026-11-10", {id: null}),
                stake("no-date", "2026-11-10", {created_at: null}),
                stake("no-subject", "2026-11-10", {
                    term: {triple: {term_id: "0xc", subject: null, object: {term_id: "0xt"}}},
                }),
                stake("no-object", "2026-11-10", {
                    term: {triple: {term_id: "0xc", subject: {term_id: "0xa"}, object: {}}},
                }),
                stake("no-id", "2026-11-10", {
                    term: {triple: {subject: {term_id: "0xa"}, object: {term_id: "0xt"}}},
                }),
            ],
            redemptions: [stake("r1", "2026-11-11")],
        });
        const rows = await getRecentStakes({graphqlUrl: "u", fetch, timeoutMs: 100, limit: 3});
        expect(rows.map((row) => row.id)).toEqual(["r1", "ok"]);
        expect(variables[0]).toMatchObject({limit: 3});
    });
});
