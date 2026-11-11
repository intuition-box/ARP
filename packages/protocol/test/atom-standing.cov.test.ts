import {describe, expect, it} from "vitest";
import type {FetchLike, GraphqlTransport} from "@arp-protocol/graphql";

import {
    getAtomStanding,
    getDeclaredModulesFor,
    getListedCapabilitiesFor,
    resolveAgentRefForAtom,
} from "../src/atom-standing.js";
import {USES, VERSION} from "../src/sources/intuition/terms.js";
import {INTUITION_URL} from "./helpers.js";

type Seen = {query: string; variables: Record<string, unknown>};

function transport(data: Record<string, unknown>, seen: Seen[] = []): GraphqlTransport {
    return {
        async request(query, variables) {
            seen.push({query, variables});
            return data;
        },
    };
}

const CAIP = "eip155:8453/erc721:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/6649";
const DIGEST = `sha256:${"a".repeat(64)}`;

describe("getAtomStanding, edge cases", () => {
    it("passes a single attestor as a list and a custom curve as a string", async () => {
        const seen: Seen[] = [];
        await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({}, seen),
            attestor: "0xAbC",
            curveId: 4n,
            limit: 10,
        });
        expect(seen[0]?.variables["attestor"]).toEqual(["0xAbC"]);
        expect(seen[0]?.variables["curveId"]).toBe("4");
        expect(seen[0]?.variables["limit"]).toBe(10);
    });

    it("passes several attestors through and clamps the limit", async () => {
        const seen: Seen[] = [];
        await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({}, seen),
            attestor: ["0x1", "0x2"],
            limit: 100_000,
        });
        expect(seen[0]?.variables["attestor"]).toEqual(["0x1", "0x2"]);
        expect(seen[0]?.variables["limit"]).toBeLessThan(100_000);
    });

    it("reads an absent atom as not existing, with no market, url or groups", async () => {
        const standing = await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({atom: "nope", claims: null, triples: null}),
        });
        expect(standing.exists).toBe(false);
        expect(standing.label).toBeNull();
        expect(standing.type).toBeNull();
        expect(standing.pinnedUri).toBeNull();
        expect(standing.url).toBeNull();
        expect(standing.market).toBeNull();
        expect(standing.groups).toEqual([]);
        expect(standing.claims).toEqual([]);
        expect(standing.truncated).toBe(false);
    });

    it("treats a blank thing url as no url and keeps a real one", async () => {
        const blank = await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({atom: [{term_id: "0xatom", value: {thing: {url: "  "}}}]}),
        });
        expect(blank.url).toBeNull();
        const real = await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({
                atom: [{term_id: "0xatom", value: {thing: {url: "https://x.dev"}}}],
            }),
        });
        expect(real.url).toBe("https://x.dev");
        const noThing = await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({atom: [{term_id: "0xatom", value: {}}]}),
        });
        expect(noThing.url).toBeNull();
    });

    it("drops malformed claims and edges, and reads a version claim as about its skill", async () => {
        const standing = await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({
                atom: [{term_id: "0xatom"}],
                claims: [
                    "junk",
                    {term_id: "0xc0", predicate: null, object: {term_id: "0xo"}},
                    {term_id: "0xc1", predicate: {term_id: USES}, object: null},
                    {
                        term_id: "0xc2",
                        predicate: {term_id: USES, label: "uses"},
                        object_term: {
                            triple: {
                                predicate_id: VERSION,
                                subject: {term_id: "0xskill", label: "skill", type: "Thing"},
                                object: {label: DIGEST},
                            },
                        },
                        term: {vaults: ["x", {positions: []}, {positions: [{account_id: "0x1"}]}]},
                    },
                    {
                        term_id: "0xc3",
                        predicate: {term_id: USES},
                        object: {term_id: "0xo"},
                        term: "not a record",
                    },
                ],
                triples: [
                    7,
                    {term_id: "0xt0", predicate: {term_id: "0xp"}, subject: null},
                    {term_id: "0xt1", predicate: null, subject: {term_id: "0xs"}},
                    {term_id: "0xt2", predicate: {term_id: "0xp"}, subject: {term_id: "0xs"}},
                    {term_id: "0xt3", predicate: {term_id: "0xp"}, subject: {term_id: "0xs2"}},
                ],
            }),
            limit: 2,
        });
        expect(standing.claims.map((c) => c.tripleId)).toEqual(["0xc2", "0xc3"]);
        expect(standing.claims[0]?.object.atomId).toBe("0xskill");
        expect(standing.claims[0]?.attestorBacked).toBe(true);
        expect(standing.claims[1]?.attestorBacked).toBe(false);
        expect(standing.groups).toHaveLength(1);
        expect(standing.groups[0]?.edges.map((e) => e.tripleId)).toEqual(["0xt2", "0xt3"]);
        expect(standing.groups[0]?.assets).toBe(0n);
        expect(standing.groups[0]?.positions).toBe(0);
        expect(standing.edgeCount).toBe(2);
        expect(standing.truncated).toBe(true);
    });

    it("builds its own transport from graphqlUrl and the injected fetch", async () => {
        const calls: string[] = [];
        const fetchStub: FetchLike = async (url) => {
            calls.push(String(url));
            return new Response(JSON.stringify({data: {atom: []}}), {
                status: 200,
                headers: {"content-type": "application/json"},
            });
        };
        const standing = await getAtomStanding("0xatom", {
            graphqlUrl: INTUITION_URL,
            fetch: fetchStub,
        });
        expect(calls).toEqual([INTUITION_URL]);
        expect(standing.exists).toBe(false);
    });
});

describe("resolveAgentRefForAtom", () => {
    it("finds the CAIP-19 ref on an outgoing same-as edge", async () => {
        const ref = await resolveAgentRefForAtom("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({
                out: [
                    "junk",
                    {object: null},
                    {object: {label: "not a caip"}},
                    {object: {label: CAIP}},
                ],
                back: null,
            }),
        });
        expect(ref).toEqual({chainId: 8453, tokenId: "6649"});
    });

    it("reads the reverse orientation too", async () => {
        const ref = await resolveAgentRefForAtom("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({out: [], back: [{subject: {label: CAIP}}]}),
        });
        expect(ref).toEqual({chainId: 8453, tokenId: "6649"});
    });

    it("returns null when no edge names an agent", async () => {
        const ref = await resolveAgentRefForAtom("0xatom", {
            graphqlUrl: INTUITION_URL,
            transport: transport({out: [{object: {label: "@handle"}}], back: [{subject: {}}]}),
        });
        expect(ref).toBeNull();
    });

    it("builds its own transport when none is given", async () => {
        const fetchStub: FetchLike = async () =>
            new Response(JSON.stringify({data: {out: [], back: []}}), {
                status: 200,
                headers: {"content-type": "application/json"},
            });
        expect(
            await resolveAgentRefForAtom("0xatom", {graphqlUrl: INTUITION_URL, fetch: fetchStub}),
        ).toBeNull();
    });
});

describe("getDeclaredModulesFor", () => {
    it("returns nothing without asking when there are no subjects", async () => {
        const seen: Seen[] = [];
        expect(
            await getDeclaredModulesFor([], {
                graphqlUrl: INTUITION_URL,
                transport: transport({}, seen),
            }),
        ).toEqual({});
        expect(seen).toHaveLength(0);
    });

    it("groups uses by subject, dedupes subjects and modules, and folds versions to the skill", async () => {
        const seen: Seen[] = [];
        const modules = await getDeclaredModulesFor(["0xa", "0xa", "0xb"], {
            graphqlUrl: INTUITION_URL,
            transport: transport(
                {
                    triples: [
                        "junk",
                        {subject: {term_id: "0xa"}, object: {term_id: "0xt1"}},
                        {subject: {term_id: "0xa"}, object: {term_id: "0xt1"}},
                        {
                            subject: {term_id: "0xb"},
                            object_term: {
                                triple: {
                                    predicate_id: VERSION,
                                    subject: {term_id: "0xskill"},
                                    object: {label: DIGEST},
                                },
                            },
                        },
                        {subject: null, object: {term_id: "0xt2"}},
                        {subject: {term_id: "0xa"}, object: {}},
                    ],
                },
                seen,
            ),
        });
        expect(modules).toEqual({"0xa": ["0xt1"], "0xb": ["0xskill"]});
        expect(seen[0]?.variables["subjects"]).toEqual(["0xa", "0xb"]);
        expect(seen[0]?.variables["predicate"]).toBe(USES);
    });

    it("uses the predicate it is given and survives a missing triples field", async () => {
        const seen: Seen[] = [];
        const modules = await getDeclaredModulesFor(["0xa"], {
            graphqlUrl: INTUITION_URL,
            transport: transport({}, seen),
            predicateId: "0xother",
        });
        expect(modules).toEqual({});
        expect(seen[0]?.variables["predicate"]).toBe("0xother");
    });

    it("builds its own transport when none is given", async () => {
        const fetchStub: FetchLike = async () =>
            new Response(JSON.stringify({data: {triples: []}}), {
                status: 200,
                headers: {"content-type": "application/json"},
            });
        expect(
            await getDeclaredModulesFor(["0xa"], {graphqlUrl: INTUITION_URL, fetch: fetchStub}),
        ).toEqual({});
    });
});

describe("getListedCapabilitiesFor, malformed input", () => {
    it("returns an empty list when the atom or its capabilities are missing", async () => {
        expect(
            await getListedCapabilitiesFor("0xa", {
                graphqlUrl: INTUITION_URL,
                transport: transport({atoms: null}),
            }),
        ).toEqual([]);
        expect(
            await getListedCapabilitiesFor("0xa", {
                graphqlUrl: INTUITION_URL,
                transport: transport({
                    atoms: [{capabilities: ["junk", {object: null}, {object: {term_id: "0x1"}}]}],
                }),
            }),
        ).toEqual(["0x1"]);
    });

    it("builds its own transport when none is given", async () => {
        const fetchStub: FetchLike = async () =>
            new Response(JSON.stringify({data: {atoms: []}}), {
                status: 200,
                headers: {"content-type": "application/json"},
            });
        expect(
            await getListedCapabilitiesFor("0xa", {graphqlUrl: INTUITION_URL, fetch: fetchStub}),
        ).toEqual([]);
    });
});
