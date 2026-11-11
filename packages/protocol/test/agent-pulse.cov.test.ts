import {
    AGENT_IDENTITIES_QUERY,
    ATTACHED_DOCUMENTS_QUERY,
    ENDPOINT_SUBJECTS_QUERY,
    IDENTITY_CLAIMS_QUERY,
    PULSE_DOMAIN_EDGES_QUERY,
    PULSE_EDGE_TOOLS_QUERY,
    type FetchLike,
    type GraphqlTransport,
} from "@arp-protocol/graphql";
import type {Hex} from "viem";
import {generatePrivateKey, privateKeyToAccount} from "viem/accounts";
import {afterEach, describe, expect, it, vi} from "vitest";

import {
    findAgentsInDomains,
    findAgentsWithEndpoints,
    readLineReceipts,
    resolveAgentAtom,
    walletControlsSubject,
    wordsMatchingOffer,
} from "../src/agent-pulse.js";
import {canonicalAgentThing, thingUri} from "../src/declare/agent-atom.js";
import type {StrictIdentityAtom} from "../src/declare/index.js";
import {signHireReceipt, type HireReceipt} from "../src/hire-receipt.js";
import type {AgentIdentityAtom} from "../src/verify/subject.js";

const KNOWN = "0xC165A2AD2E540A4069E02834009161E2b4490d5A";
const CAIP = `eip155:13579/erc721:${KNOWN}/2`;
const CANONICAL_2 = thingUri(canonicalAgentThing(13579, "2"));
const ref = {chainId: 13579, registry: KNOWN, tokenId: "2"} as const;
const node = privateKeyToAccount(generatePrivateKey());
const hirer = privateKeyToAccount(generatePrivateKey());
const LINE = `0x${"11".repeat(32)}` as Hex; // 32 bytes of hex
const REGISTRY = `eip155:13579:${KNOWN}`;

/** A GraphQL endpoint behind `fetch`, answering every query with the same data. */
const graphqlFetch =
    (data: unknown): FetchLike =>
    async () =>
        new Response(JSON.stringify({data}), {status: 200});

const byQuery = (answers: Record<string, unknown>): GraphqlTransport => ({
    request: async (query: string) => {
        for (const [name, data] of Object.entries(answers)) {
            if (name === query) return data as Record<string, unknown>; // each answer here is a record
        }
        throw new Error("unexpected query");
    },
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("resolveAgentAtom, the edges", () => {
    it("asks the index itself when no resolver is given, and finds nobody in an empty graph", async () => {
        vi.stubGlobal("fetch", graphqlFetch({triples: [], atoms: []}));
        expect(await resolveAgentAtom(ref, {graphqlUrl: "https://index.test/graphql"})).toEqual({
            status: "none",
        });
    });

    it("skips a claim with no subject or no atom id, and reads a claim with no creator", async () => {
        vi.stubGlobal(
            "fetch",
            graphqlFetch({
                triples: [
                    {creator_id: "0xa"},
                    {subject: {data: CANONICAL_2}},
                    {subject: {term_id: `0x${"aa".repeat(32)}`, data: CANONICAL_2}},
                ],
            }),
        );
        const answer = await resolveAgentAtom(ref, {
            graphqlUrl: "https://index.test/graphql",
            timeoutMs: 500,
            strict: async () => ({status: "ambiguous", reason: "two"}),
            controllersOf: async () => [],
        });
        expect(answer).toMatchObject({status: "found", atom: `0x${"aa".repeat(32)}`});
    });

    it("reads over the fetch it is given", async () => {
        const fetch = vi.fn(graphqlFetch({triples: "none"}));
        const answer = await resolveAgentAtom(ref, {
            graphqlUrl: "u",
            fetch,
            strict: async () => ({status: "ambiguous", reason: "two"}),
        });
        expect(answer).toEqual({status: "ambiguous", reason: "two"});
        expect(fetch).toHaveBeenCalledOnce();
    });
});

describe("walletControlsSubject, the edges", () => {
    const control = (
        rows: unknown[],
        extra: {resolveStrict?: () => Promise<StrictIdentityAtom>; claims?: unknown[]} = {},
    ) =>
        walletControlsSubject("0xsubject", hirer.address, {
            graphqlUrl: "u",
            chainId: 13579,
            knownRegistries: [KNOWN],
            transport: byQuery({
                [AGENT_IDENTITIES_QUERY]: {triples: rows},
                [IDENTITY_CLAIMS_QUERY]: {triples: extra.claims ?? []},
            }),
            controllersOf: async () => [hirer.address],
            ...(extra.resolveStrict === undefined ? {} : {resolveStrict: extra.resolveStrict}),
        });

    it("says no when the identity resolves to no atom", async () => {
        const rows = [{subject: {data: CANONICAL_2}, object: {label: CAIP}}];
        expect(await control(rows, {resolveStrict: async () => ({status: "none"})})).toBe("no");
    });

    it("skips a row with no object, and reads a name from the atom's thing over its label", async () => {
        const rows = [
            {subject: {data: CANONICAL_2}},
            {subject: null, object: {label: "Unknown", value: {thing: {name: CAIP}}}},
        ];
        expect(
            await control(rows, {
                resolveStrict: async () => ({
                    status: "found",
                    atom: "0xsubject" as AgentIdentityAtom,
                }),
            }),
        ).toBe("yes"); // a test atom id; the brand is not under test
    });

    it("skips a row whose object has neither a name nor a label", async () => {
        expect(await control([{subject: {data: CANONICAL_2}, object: {value: {}}}])).toBe("no");
    });

    it("resolves back through the index when no resolver is given, and says no when it finds nobody", async () => {
        vi.stubGlobal("fetch", graphqlFetch({triples: [], atoms: []}));
        const rows = [{subject: {data: CANONICAL_2}, object: {label: CAIP}}];
        const answer = await walletControlsSubject("0xsubject", hirer.address, {
            graphqlUrl: "u",
            chainId: 13579,
            knownRegistries: [KNOWN],
            transport: byQuery({[AGENT_IDENTITIES_QUERY]: {triples: rows}}),
            controllersOf: async () => [hirer.address],
        });
        expect(answer).toBe("no");
    });
});

describe("findAgentsInDomains, the edges", () => {
    const find = (
        answers: Record<string, unknown>,
        back: StrictIdentityAtom = {status: "found", atom: "0xagent" as AgentIdentityAtom}, // a test atom id; the brand is not under test
    ) =>
        findAgentsInDomains(["document"], {
            graphqlUrl: "u",
            inContextOf: "0xc0",
            chainId: 13579,
            knownRegistries: [KNOWN],
            transport: byQuery(answers),
            resolveStrict: async () => back,
        });

    it("stops when no edge names a subject", async () => {
        expect(await find({[PULSE_DOMAIN_EDGES_QUERY]: {triples: [{}]}})).toEqual({
            agents: [],
            truncated: false,
        });
    });

    it("stops when no edge names a tool with an id", async () => {
        const answer = await find({
            [PULSE_DOMAIN_EDGES_QUERY]: {triples: [{subject_id: "0xe1"}]},
            [PULSE_EDGE_TOOLS_QUERY]: {triples: [{object: null}, {object: {label: "no id"}}]},
        });
        expect(answer).toEqual({agents: [], truncated: false});
    });

    it("keeps an agent with no label, and skips an identity row with no subject id", async () => {
        const answer = await find({
            [PULSE_DOMAIN_EDGES_QUERY]: {triples: [{subject_id: "0xe1"}]},
            [PULSE_EDGE_TOOLS_QUERY]: {triples: [{object: {term_id: "0xagent"}}]},
            [AGENT_IDENTITIES_QUERY]: {
                triples: [
                    {object: {label: CAIP}},
                    {subject_id: "0xagent", subject: {data: CANONICAL_2}, object: {label: CAIP}},
                ],
            },
        });
        expect(answer.agents).toEqual([
            {atomId: "0xagent", label: null, caip19: CAIP, ambiguous: false},
        ]);
    });

    it("reads over the global fetch and its own resolver when none is given", async () => {
        vi.stubGlobal("fetch", graphqlFetch({triples: []}));
        const answer = await findAgentsInDomains(["document"], {
            graphqlUrl: "u",
            inContextOf: "0xc0",
            chainId: 13579,
            knownRegistries: [KNOWN],
        });
        expect(answer).toEqual({agents: [], truncated: false});
    });
});

describe("findAgentsWithEndpoints", () => {
    it("identifies each subject once, keeping its first label, and says the read was cut at its limit", async () => {
        const answer = await findAgentsWithEndpoints({
            graphqlUrl: "u",
            hasEndpoint: "0xend",
            chainId: 13579,
            knownRegistries: [KNOWN],
            limit: 3,
            transport: byQuery({
                [ENDPOINT_SUBJECTS_QUERY]: {
                    triples: [
                        {subject_id: "0xagent", subject: {label: "Agent 2"}},
                        {subject_id: "0xagent", subject: {label: "dup"}},
                        {subject: null},
                    ],
                },
                [AGENT_IDENTITIES_QUERY]: {
                    triples: [
                        {
                            subject_id: "0xagent",
                            subject: {data: CANONICAL_2},
                            object: {label: CAIP},
                        },
                    ],
                },
            }),
            resolveStrict: async () => ({status: "found", atom: "0xagent" as AgentIdentityAtom}), // a test atom id; the brand is not under test
        });
        expect(answer).toEqual({
            agents: [{atomId: "0xagent", label: "Agent 2", caip19: CAIP, ambiguous: false}],
            truncated: true,
        });
    });

    it("asks no identity when nobody has an endpoint", async () => {
        const answer = await findAgentsWithEndpoints({
            graphqlUrl: "u",
            hasEndpoint: "0xend",
            chainId: 13579,
            knownRegistries: [KNOWN],
            transport: byQuery({
                [ENDPOINT_SUBJECTS_QUERY]: {triples: [{subject: {label: "no id"}}]},
            }),
        });
        expect(answer).toEqual({agents: [], truncated: false});
    });
});

describe("wordsMatchingOffer, the edges", () => {
    it("matches nothing in an offer of punctuation", () => {
        expect(wordsMatchingOffer(["convert pdf documents"], "!!!")).toBeNull();
    });
});

describe("readLineReceipts, the edges", () => {
    const fields = (overrides: Partial<HireReceipt> = {}): HireReceipt => ({
        version: 2,
        agentRegistry: REGISTRY,
        agentId: "2",
        requester: hirer.address,
        payment: `0x${"22".repeat(32)}`,
        paid: "1000",
        requestHash: `0x${"33".repeat(32)}`,
        resultHash: `0x${"44".repeat(32)}`,
        issuedAt: 1_000,
        termId: LINE,
        expiresAt: 2_000,
        ...overrides,
    });

    const readWith = (
        rows: unknown[],
        extra: {
            fetchDocument?: (uri: string) => Promise<unknown>;
            fetch?: FetchLike;
            chainId?: number;
        } = {},
    ) =>
        readLineReceipts(
            {tripleId: LINE, writer: hirer.address},
            {
                graphqlUrl: "u",
                transport: byQuery({[ATTACHED_DOCUMENTS_QUERY]: {triples: rows}}),
                inContextOf: "0xc0",
                agentRegistry: REGISTRY,
                agentId: "2",
                boundNodes: [node.address],
                chainId: extra.chainId ?? 13579,
                getPayment: async () => {
                    throw new Error("payment read when it should not be");
                },
                subjectControl: async () => {
                    throw new Error("unreachable");
                },
                ...(extra.fetchDocument === undefined ? {} : {fetchDocument: extra.fetchDocument}),
                ...(extra.fetch === undefined ? {} : {fetch: extra.fetch}),
            },
        );

    it("reads no count when the index gives none, and skips a row that names no IPFS document", async () => {
        const out = await readWith([
            {subject: null},
            {subject: {data: "https://x"}},
            {subject: {}},
        ]);
        expect(out).toEqual({receipts: [], unreadable: [], othersNotRead: 0});
    });

    it("says why a document could not be read, whatever was thrown", async () => {
        const out = await readWith([{subject: {data: "ipfs://a"}}], {
            fetchDocument: async () => {
                throw "gateway down";
            },
        });
        expect(out.unreadable).toEqual([{document: "ipfs://a", reason: "gateway down"}]);
    });

    it("fetches a document from a gateway with the fetch it is given", async () => {
        const fetch: FetchLike = async () =>
            new Response(JSON.stringify({not: "a receipt"}), {status: 200});
        const out = await readWith([{subject: {data: "ipfs://a"}}], {fetch});
        expect(out).toEqual({receipts: [], unreadable: [], othersNotRead: 0});
    });

    it("reads no payment on another chain or for a receipt that names none, and treats a failed control read as unknown", async () => {
        const signedOn = await signHireReceipt(
            fields(),
            {chainId: 1, verifyingContract: hirer.address},
            node,
        );
        const out = await readWith([
            {subject: {data: "ipfs://a", value: {json_object: {data: signedOn}}}},
        ]);
        expect(out.receipts[0]).toMatchObject({
            paymentUnread: false,
            paidWei: null,
            subjectControl: "unknown",
        });
        expect(out.receipts[0]?.checks).toMatchObject({
            paymentMined: false,
            paymentFromRequester: false,
            paymentToSigner: false,
        });
    });

    it("reads a receipt whose requester and payment are not strings as naming nobody", async () => {
        const signedHere = await signHireReceipt(
            fields(),
            {chainId: 13579, verifyingContract: hirer.address},
            node,
        );
        const altered = {
            ...signedHere,
            receipt: {...signedHere.receipt, requester: 7, payment: 9, termId: 3},
        };
        const out = await readWith([
            {subject: {data: "ipfs://a", value: {json_object: {data: altered}}}},
        ]);
        expect(out.receipts[0]?.signature).not.toBe("valid");
        expect(out.receipts[0]).toMatchObject({signer: null, paidWei: null});
        expect(out.receipts[0]?.checks).toMatchObject({
            requesterStandsBehindTheLine: false,
            namesThisLine: false,
            signerIsABoundNode: false,
        });
    });
});
