import {
    AGENT_EDGE_LIMIT,
    CAPABILITIES_QUERY,
    COHORT_QUERY,
    type FetchLike,
    type GraphqlTransport,
    RESOLVE_AGENT_QUERY,
    TRUST_SURFACE_QUERY,
} from "@arp-protocol/graphql";
import {describe, expect, it} from "vitest";

import {resolveRef} from "../src/caip.js";
import {intuitionSource} from "../src/sources/intuition/index.js";
import {HAS_TAG, HAS_TRUST_PROVIDER} from "../src/sources/intuition/terms.js";
import {INTUITION_URL} from "./helpers.js";

const REF = resolveRef({chainId: 8453, tokenId: "6649"});

/** One answer per query document, so each method's own reads are what it gets back. */
function transport(answers: Map<string, Record<string, unknown>>): GraphqlTransport {
    return {
        async request(query) {
            return answers.get(query) ?? {};
        },
    };
}

describe("intuitionSource, resolving the subject", () => {
    it("skips malformed same-as rows and resolves the first real atom", async () => {
        const source = intuitionSource({
            graphqlUrl: INTUITION_URL,
            transport: transport(
                new Map([
                    [
                        RESOLVE_AGENT_QUERY,
                        {
                            triples: [
                                "junk",
                                {subject: "x"},
                                {subject: {label: "no id"}},
                                {subject: {term_id: "0xa", label: "A"}},
                            ],
                        },
                    ],
                ]),
            ),
        });
        const identity = await source.resolveAgent(REF);
        expect(identity?.sourceHandle).toBe("0xa");
        expect(identity?.provenance.kind).toBe("claim");
    });

    it("answers empty everywhere for an identity nobody claims", async () => {
        const source = intuitionSource({
            graphqlUrl: INTUITION_URL,
            transport: transport(new Map()),
        });
        expect(await source.resolveAgent(REF)).toBeNull();
        expect(await source.getAssessments(REF)).toEqual([]);
        expect(await source.getMarkets?.(REF)).toEqual([]);
        const capabilities = await source.getCapabilities(REF);
        expect(capabilities.tags).toEqual([]);
        expect(capabilities.provenance.origin).toBeNull();
    });
});

describe("intuitionSource, reading what the subject carries", () => {
    const subject = {triples: [{subject: {term_id: "0xa"}}]};
    const full = (row: Record<string, unknown>) =>
        Array.from({length: AGENT_EDGE_LIMIT}, () => row);

    it("marks a full page of capabilities as truncated and drops edges it does not map", async () => {
        const source = intuitionSource({
            graphqlUrl: INTUITION_URL,
            transport: transport(
                new Map<string, Record<string, unknown>>([
                    [RESOLVE_AGENT_QUERY, subject],
                    [
                        CAPABILITIES_QUERY,
                        {
                            triples: [
                                {predicate: {term_id: "0xother"}},
                                ...full({predicate: {term_id: HAS_TAG}, object: {label: "ai"}}),
                            ].slice(0, AGENT_EDGE_LIMIT),
                        },
                    ],
                ]),
            ),
        });
        const capabilities = await source.getCapabilities(REF);
        expect(capabilities.tags).toHaveLength(AGENT_EDGE_LIMIT - 1);
        expect(capabilities.provenance.truncated).toBe(true);
        expect(capabilities.provenance.origin).toBe("0xa");
    });

    it("marks a full trust surface as truncated and drops rows that are not claims", async () => {
        const claimRow = {
            term_id: "0xedge",
            predicate: {term_id: HAS_TRUST_PROVIDER},
            object: {label: "deep3"},
        };
        const source = intuitionSource({
            graphqlUrl: INTUITION_URL,
            curveId: 2n,
            transport: transport(
                new Map<string, Record<string, unknown>>([
                    [RESOLVE_AGENT_QUERY, subject],
                    [
                        TRUST_SURFACE_QUERY,
                        {triples: ["junk", ...full(claimRow)].slice(0, AGENT_EDGE_LIMIT)},
                    ],
                ]),
            ),
        });
        const claims = await source.getAssessments(REF);
        expect(claims).toHaveLength(AGENT_EDGE_LIMIT - 1);
        expect(claims[0]?.provenance.truncated).toBe(true);
        const markets = (await source.getMarkets?.(REF)) ?? [];
        expect(markets).toHaveLength(AGENT_EDGE_LIMIT - 1);
        expect(markets[0]?.provenance.truncated).toBe(true);
    });

    it("lists the cohort, dropping rows it cannot map and reading a missing total as null", async () => {
        const source = intuitionSource({
            graphqlUrl: INTUITION_URL,
            transport: transport(
                new Map<string, Record<string, unknown>>([
                    [COHORT_QUERY, {triples: [{subject: {term_id: "0xa"}}, {subject: null}]}],
                ]),
            ),
        });
        const page = await source.listAgents?.({
            order: "evidence-quantity",
            limit: 10,
            offset: 0,
            name: null,
        });
        expect(page?.agents.map((agent) => agent.sourceHandle)).toEqual(["0xa"]);
        expect(page?.total).toBeNull();
        const empty = await intuitionSource({
            graphqlUrl: INTUITION_URL,
            transport: transport(new Map()),
        }).listAgents?.({
            order: "economic-conviction",
            limit: 10,
            offset: 0,
            name: "loop",
        });
        expect(empty?.agents).toEqual([]);
    });

    it("builds its own transport with a timeout when none is given", async () => {
        const urls: string[] = [];
        const fetchStub: FetchLike = async (url) => {
            urls.push(String(url));
            return new Response(JSON.stringify({data: {triples: []}}), {
                status: 200,
                headers: {"content-type": "application/json"},
            });
        };
        const source = intuitionSource({
            graphqlUrl: INTUITION_URL,
            fetch: fetchStub,
            timeoutMs: 500,
        });
        expect(await source.resolveAgent(REF)).toBeNull();
        expect(urls).toEqual([INTUITION_URL]);
    });
});
