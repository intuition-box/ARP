import type {GraphqlTransport} from "@arp-protocol/graphql";
import {describe, expect, it} from "vitest";

import {listRegisteredTools} from "../src/registered-tools.js";
import {INTUITION_URL} from "./helpers.js";

function transport(pages: Record<string, unknown>[], offsets: unknown[] = []): GraphqlTransport {
    let index = 0;
    return {
        async request(_query, variables) {
            offsets.push(variables["offset"]);
            const page = pages[Math.min(index, pages.length - 1)] ?? {};
            index += 1;
            return page;
        },
    };
}

const tool = (id: string, positions: number, assets: string, declarations: number) => ({
    term_id: id,
    label: id,
    data: `ipfs://${id}`,
    term: {vaults: [{position_count: positions, total_assets: assets}]},
    as_object_triples_aggregate: {aggregate: {count: declarations}},
});

describe("listRegisteredTools, edge cases", () => {
    it("lists a tool with no vault at zero and skips one whose figures cannot be read", async () => {
        const page = await listRegisteredTools({
            graphqlUrl: INTUITION_URL,
            transport: transport([
                {
                    atoms: [
                        "junk",
                        {label: "no id"},
                        {term_id: "0xbare"},
                        {
                            term_id: "0xbad",
                            term: {vaults: [{position_count: "x", total_assets: "1"}]},
                        },
                        {
                            term_id: "0xnovault",
                            term: {vaults: ["junk"]},
                            value: {thing: {url: "null"}},
                        },
                        {
                            term_id: "0xurl",
                            term: "x",
                            value: {thing: {url: " https://t.dev "}},
                            as_object_triples_aggregate: {aggregate: "x"},
                        },
                        {
                            term_id: "0xnothing",
                            value: {thing: "x"},
                            as_object_triples_aggregate: "x",
                        },
                    ],
                },
            ]),
        });
        expect(page.truncated).toBe(false);
        const byId = Object.fromEntries(page.tools.map((entry) => [entry.atomId, entry]));
        expect(Object.keys(byId).sort()).toEqual(["0xbare", "0xnothing", "0xnovault", "0xurl"]);
        expect(byId["0xbare"]).toEqual({
            atomId: "0xbare",
            label: null,
            uri: null,
            url: null,
            positionCount: 0,
            assets: 0n,
            declarations: 0,
        });
        expect(byId["0xnovault"]?.url).toBeNull();
        expect(byId["0xurl"]?.url).toBe("https://t.dev");
    });

    it("orders by stakers, then by declarations, then by conviction", async () => {
        const rows = [
            tool("a", 1, "100", 9),
            tool("b", 3, "1", 0),
            tool("c", 1, "100", 2),
            tool("d", 1, "500", 1),
        ];
        const read = (order: "stakers" | "declarations" | "conviction") =>
            listRegisteredTools({
                graphqlUrl: INTUITION_URL,
                transport: transport([{atoms: rows}]),
                order,
            }).then((page) => page.tools.map((entry) => entry.atomId));
        expect(await read("stakers")).toEqual(["b", "d", "a", "c"]);
        expect(await read("declarations")).toEqual(["a", "c", "d", "b"]);
        expect(await read("conviction")).toEqual(["b", "d", "a", "c"]);
    });

    it("pages until the row ceiling and reports truncation", async () => {
        const offsets: unknown[] = [];
        const page = await listRegisteredTools({
            graphqlUrl: INTUITION_URL,
            limit: 1,
            maxRows: 2,
            curveId: 2,
            transport: transport([{atoms: [tool("a", 1, "1", 0)]}], offsets),
        });
        expect(offsets).toEqual([0, 1]);
        expect(page.truncated).toBe(true);
        expect(page.curveId).toBe(2);
    });
});
