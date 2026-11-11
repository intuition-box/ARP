import {describe, expect, it} from "vitest";

import {
    mapAgentListing,
    mapCapabilityRef,
    mapClaimMarket,
    mapMetadata,
    mapProviderClaim,
} from "../src/sources/intuition/map.js";
import {HAS_TAG, HAS_TRUST_PROVIDER} from "../src/sources/intuition/terms.js";

const CAIP_A = "eip155:8453/erc721:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/6649";
const CAIP_B = "eip155:8453/erc721:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/2340";

describe("mapMetadata", () => {
    it("falls back to the label when the thing has no name, and flags a mirror name", () => {
        expect(
            mapMetadata({label: "Agent 8453:6649", value: {thing: {url: "https://a.dev"}}}),
        ).toEqual({
            name: "Agent 8453:6649",
            description: null,
            image: null,
            url: "https://a.dev",
            isFallback: true,
        });
        expect(mapMetadata({})).toEqual({
            name: null,
            description: null,
            image: null,
            url: null,
            isFallback: false,
        });
    });
});

describe("mapProviderClaim, malformed rows", () => {
    it("drops a non-record, a row with no predicate, and a predicate it does not map", () => {
        expect(mapProviderClaim("x")).toBeNull();
        expect(mapProviderClaim({predicate: {}})).toBeNull();
        expect(mapProviderClaim({predicate: {term_id: "0xother"}})).toBeNull();
    });

    it("maps a trust-provider row with no object to nulls rather than guesses", () => {
        const claim = mapProviderClaim({
            term_id: "0xedge",
            predicate: {term_id: HAS_TRUST_PROVIDER},
        });
        expect(claim).toMatchObject({
            relation: "has-trust-provider",
            label: null,
            provider: {name: null, description: null, image: null, url: null, sourceHandle: null},
            resolverUrl: null,
            pinnedUri: null,
            sourceHandle: "0xedge",
        });
    });
});

describe("mapClaimMarket, malformed rows", () => {
    it("drops rows missing a handle, a predicate, or a mapped relation", () => {
        expect(mapClaimMarket(7)).toBeNull();
        expect(mapClaimMarket({predicate: {term_id: HAS_TRUST_PROVIDER}})).toBeNull();
        expect(mapClaimMarket({term_id: "0xedge"})).toBeNull();
        expect(mapClaimMarket({term_id: "0xedge", predicate: {term_id: "0xother"}})).toBeNull();
    });
});

describe("mapCapabilityRef, malformed rows", () => {
    it("drops what it cannot map and keeps a tag with no object as nulls", () => {
        expect(mapCapabilityRef(null)).toBeNull();
        expect(mapCapabilityRef({predicate: null})).toBeNull();
        expect(mapCapabilityRef({predicate: {term_id: "0xother"}})).toBeNull();
        expect(mapCapabilityRef({predicate: {term_id: HAS_TAG}})).toEqual({
            relation: "has-tag",
            label: null,
            name: null,
            url: null,
            sourceHandle: null,
        });
    });
});

describe("mapAgentListing", () => {
    it("drops a row with no subject or no handle", () => {
        expect(mapAgentListing({})).toBeNull();
        expect(mapAgentListing({subject: {label: "x"}})).toBeNull();
    });

    it("keeps one identity read from the label, skips non-ERC-8004 and duplicate edges", () => {
        const listing = mapAgentListing({
            subject: {
                term_id: "0xagent",
                identity: [
                    {object: {label: CAIP_A}},
                    {object: {value: {thing: {name: CAIP_A}}}},
                    {object: {label: "did:web:clawn.ch"}},
                    {object: {}},
                ],
                identityCount: {aggregate: {count: 4}},
                capabilities: [
                    {predicate_id: HAS_TAG, object: {term_id: "0xtag", label: "ai"}},
                    {predicate_id: null, object: {term_id: "0xtag"}},
                    {predicate_id: HAS_TAG, object: null},
                ],
            },
        });
        expect(listing?.identities).toHaveLength(1);
        expect(listing?.ref?.tokenId).toBe("6649");
        expect(listing?.isIdentityAmbiguous).toBe(false);
        expect(listing?.capabilities).toEqual([
            {predicateId: HAS_TAG, objectId: "0xtag", label: "ai"},
        ]);
        expect(listing?.market).toBeNull();
        expect(listing?.statementCount).toBeNull();
    });

    it("refuses to pick a ref with two identities or an incomplete sample", () => {
        const two = mapAgentListing({
            subject: {
                term_id: "0xagent",
                identity: [{object: {label: CAIP_A}}, {object: {label: CAIP_B}}],
                identityCount: {aggregate: {count: 2}},
            },
        });
        expect(two?.ref).toBeNull();
        expect(two?.isIdentityAmbiguous).toBe(true);

        const unsampled = mapAgentListing({
            subject: {
                term_id: "0xagent",
                identity: [{object: {label: CAIP_A}}],
                identityCount: {aggregate: {count: 99}},
            },
        });
        expect(unsampled?.ref).toBeNull();
        expect(unsampled?.isIdentityAmbiguous).toBe(true);

        const uncounted = mapAgentListing({
            subject: {term_id: "0xagent", identity: [{object: {label: CAIP_A}}]},
        });
        expect(uncounted?.identityEdgeCount).toBeNull();
        expect(uncounted?.ref).toBeNull();
    });

    it("reads the atom's own market at one scope", () => {
        const listing = mapAgentListing({
            subject: {
                term_id: "0xagent",
                term: {
                    total_market_cap: "500",
                    vaults_aggregate: {aggregate: {count: 2, sum: {position_count: 7}}},
                },
                as_subject_triples_aggregate: {aggregate: {count: 12}},
            },
        });
        expect(listing?.market).toEqual({totalMarketCap: 500n, positionCount: 7, vaultCount: 2});
        expect(listing?.statementCount).toBe(12);
        expect(listing?.ref).toBeNull();
    });
});
