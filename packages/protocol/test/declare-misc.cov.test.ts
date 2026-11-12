import type {FetchLike, GraphqlTransport} from "@arp-protocol/graphql";
import {getAddress, type Address, type Hex} from "viem";
import {describe, expect, it} from "vitest";

import {namedInSkill} from "../src/declare/line-need.js";
import {readReachabilityState} from "../src/declare/reachability-plan.js";
import {
    resolveDeclarationSubject,
    resolveIdentityAtomStrict,
} from "../src/declare/resolve-subject.js";
import {thingUriOfDigest} from "../src/declare/thing-cid.js";
import {intuitionToolAtomLookup} from "../src/declare/tool-atom.js";
import {SHARE_OFFER, shareOfferLines} from "../src/share-offer.js";
import type {TrustSource} from "../src/sources/source.js";
import type {AgentIdentity} from "../src/types.js";
import {asAgentIdentityAtom, NoAgentIdentityError} from "../src/verify/subject.js";
import {fakeReads, INTUITION_URL} from "./helpers.js";

const REGISTRY: Address = "0xc165a2adc0000000000000000000000000000001";
const AGENT = {chainId: 13579, tokenId: "7", registry: REGISTRY} as const;
const CAIP19 = `eip155:13579/erc721:${getAddress(REGISTRY)}/7`;
const ATOM: Hex = `0x${"5b".repeat(32)}`;
const ACCOUNT: Address = "0x1111111111111111111111111111111111111111";

function identity(overrides: Partial<AgentIdentity>): AgentIdentity {
    return {
        chainId: 13579,
        tokenId: "7",
        registry: REGISTRY,
        caip19: CAIP19,
        sourceHandle: ATOM,
        registrationFile: null,
        owner: null,
        metadata: {name: null, description: null, image: null, url: null, isFallback: false},
        provenance: {sourceId: "intuition", kind: "claim", origin: ATOM},
        ...overrides,
    };
}

function sourceAnswering(answer: AgentIdentity | null): TrustSource {
    return {
        id: "test",
        resolveAgent: async () => answer,
        getAssessments: async () => [],
        getCapabilities: async () => ({
            types: [],
            protocols: [],
            tools: [],
            chains: [],
            tags: [],
            categories: [],
            provenance: {sourceId: "test", kind: "claim", origin: null},
        }),
    };
}

describe("intuitionToolAtomLookup", () => {
    it("returns every atom with an id and skips rows without one", async () => {
        const seen: Record<string, unknown>[] = [];
        const transport: GraphqlTransport = {
            async request(_query, variables) {
                seen.push(variables);
                return {
                    atoms: [
                        "junk",
                        {label: "no id"},
                        {term_id: "0xa", label: "GitHub", data: "ipfs://bafy"},
                        {term_id: "0xb"},
                    ],
                };
            },
        };
        const lookup = intuitionToolAtomLookup({graphqlUrl: INTUITION_URL, transport});
        expect(await lookup.findByUrl("https://github.com")).toEqual([
            {termId: "0xa", label: "GitHub", uri: "ipfs://bafy"},
            {termId: "0xb", label: null, uri: null},
        ]);
        expect(seen).toEqual([{url: "https://github.com"}]);
    });

    it("answers empty when the indexer returns no atoms list, over its own transport", async () => {
        const urls: string[] = [];
        const fetchStub: FetchLike = async (url) => {
            urls.push(String(url));
            return new Response(JSON.stringify({data: {}}), {
                status: 200,
                headers: {"content-type": "application/json"},
            });
        };
        const lookup = intuitionToolAtomLookup({
            graphqlUrl: INTUITION_URL,
            fetch: fetchStub,
            timeoutMs: 1000,
        });
        expect(await lookup.findByUrl("https://unused.example")).toEqual([]);
        expect(urls).toEqual([INTUITION_URL]);
        const noTimeout = intuitionToolAtomLookup({graphqlUrl: INTUITION_URL, fetch: fetchStub});
        expect(await noTimeout.findByUrl("https://unused.example")).toEqual([]);
    });
});

describe("resolveDeclarationSubject", () => {
    it("returns the identity atom the source resolves", async () => {
        expect(
            await resolveDeclarationSubject({agent: AGENT, source: sourceAnswering(identity({}))}),
        ).toBe(ATOM);
    });

    it("throws NoAgentIdentityError when the identity has no atom", async () => {
        await expect(
            resolveDeclarationSubject({agent: AGENT, source: sourceAnswering(null)}),
        ).rejects.toBeInstanceOf(NoAgentIdentityError);
    });

    it("builds the Intuition source when only a URL is given", async () => {
        const urls: string[] = [];
        const fetchStub: typeof fetch = async (url) => {
            urls.push(String(url));
            return new Response(JSON.stringify({data: {triples: []}}), {
                status: 200,
                headers: {"content-type": "application/json"},
            });
        };
        const original = globalThis.fetch;
        globalThis.fetch = fetchStub;
        try {
            await expect(
                resolveDeclarationSubject({agent: AGENT, graphqlUrl: INTUITION_URL}),
            ).rejects.toBeInstanceOf(NoAgentIdentityError);
            expect(
                await resolveIdentityAtomStrict({agent: AGENT, graphqlUrl: INTUITION_URL}),
            ).toEqual({status: "none"});
        } finally {
            globalThis.fetch = original;
        }
        expect(urls.every((url) => url === INTUITION_URL)).toBe(true);
        expect(urls.length).toBeGreaterThan(0);
    });
});

describe("resolveIdentityAtomStrict, the remaining answers", () => {
    it("answers none for an identity with no source handle", async () => {
        expect(
            await resolveIdentityAtomStrict({
                agent: AGENT,
                source: sourceAnswering(identity({sourceHandle: null})),
            }),
        ).toEqual({status: "none"});
    });

    it("answers ambiguous with a default reason when the provenance carries no note", async () => {
        const verdict = await resolveIdentityAtomStrict({
            agent: AGENT,
            source: sourceAnswering(
                identity({provenance: {sourceId: "intuition", kind: "derived", origin: ATOM}}),
            ),
        });
        expect(verdict).toEqual({
            status: "ambiguous",
            reason: `${CAIP19} has no single identity atom`,
        });
    });
});

describe("asAgentIdentityAtom", () => {
    it("accepts an atom reached from an ERC-8004 CAIP-19 and refuses anything else", () => {
        expect(asAgentIdentityAtom(ATOM, CAIP19)).toBe(ATOM);
        expect(() => asAgentIdentityAtom(ATOM, `caip10:eip155:1:${ACCOUNT}`)).toThrow(
            NoAgentIdentityError,
        );
        try {
            asAgentIdentityAtom(ATOM, "wallet");
        } catch (error) {
            expect(error).toBeInstanceOf(NoAgentIdentityError);
            expect(error instanceof NoAgentIdentityError && error.operatingAccount).toBe("wallet");
            expect(error instanceof Error && error.message).toContain("ADR 0032");
        }
    });
});

describe("readReachabilityState", () => {
    const TOOL: Hex = `0x${"01".repeat(32)}`;
    const PRED: Hex = `0x${"02".repeat(32)}`;
    const STATE: Hex = `0x${"03".repeat(32)}`;

    async function idsOf(): Promise<{triple: Hex; counter: Hex}> {
        const reads = fakeReads();
        const triple = await reads.tripleId(TOOL, PRED, STATE);
        return {triple, counter: await reads.counterTripleId(triple)};
    }

    it("reports none when the account holds neither side", async () => {
        const reads = fakeReads();
        const state = await readReachabilityState(reads, ACCOUNT, TOOL, PRED, STATE, 1n);
        expect(state.recorded).toBe("none");
        expect(state.shares).toBe(0n);
        expect(state.bothSides).toBe(false);
        expect(state.terms.exists).toBe(false);
    });

    it("reports up on the triple and down on the counter", async () => {
        const {triple, counter} = await idsOf();
        const up = await readReachabilityState(
            fakeReads({
                held: {[triple.toLowerCase()]: 5n},
                existing: new Set([triple.toLowerCase()]),
            }),
            ACCOUNT,
            TOOL,
            PRED,
            STATE,
            1n,
        );
        expect(up).toMatchObject({recorded: "up", shares: 5n, bothSides: false});
        expect(up.terms).toMatchObject({
            triple,
            counter,
            subject: TOOL,
            predicate: PRED,
            object: STATE,
            exists: true,
        });

        const down = await readReachabilityState(
            fakeReads({held: {[counter.toLowerCase()]: 3n}}),
            ACCOUNT,
            TOOL,
            PRED,
            STATE,
            1n,
        );
        expect(down).toMatchObject({recorded: "down", shares: 3n, bothSides: false});
    });

    it("reports a contradiction rather than resolving it", async () => {
        const {triple, counter} = await idsOf();
        const both = await readReachabilityState(
            fakeReads({held: {[triple.toLowerCase()]: 2n, [counter.toLowerCase()]: 9n}}),
            ACCOUNT,
            TOOL,
            PRED,
            STATE,
            1n,
        );
        expect(both).toMatchObject({recorded: "up", shares: 2n, bothSides: true});
    });
});

describe("thingUriOfDigest", () => {
    it("encodes a digest whose CID fills whole base32 groups without padding", () => {
        expect(thingUriOfDigest(new Uint8Array([0]))).toBe("ipfs://bafkreiaa");
    });
});

describe("shareOfferLines", () => {
    it("lists what leaves, who signs, what never leaves, the service and how to change it, in order", () => {
        expect(shareOfferLines()).toEqual([
            SHARE_OFFER.sends,
            SHARE_OFFER.signer,
            SHARE_OFFER.never,
            SHARE_OFFER.service,
            SHARE_OFFER.later,
        ]);
    });
});

describe("namedInSkill", () => {
    it("never finds a name that is neither a program nor a key", () => {
        expect(namedInSkill("Not A Name!", "Not A Name! is right here")).toBe(false);
    });
});
