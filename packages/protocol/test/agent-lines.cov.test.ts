import {PULSE_SUBJECT_USES_QUERY, type FetchLike} from "@arp-protocol/graphql";
import {afterEach, describe, expect, it, vi} from "vitest";

import {getAgentLines} from "../src/agent-lines.js";
import type {PulseUsage} from "../src/pulse-usage.js";
import {VERSION} from "../src/sources/intuition/terms.js";

const AGENT = "0xAAA";
const base = {
    graphqlUrl: "https://index.test/graphql",
    inContextOf: "0xc0",
    hasOutcome: "0xd0",
    because: "0xe0",
    payers: [],
};

const empty = (over: Partial<PulseUsage> = {}): PulseUsage => ({
    declarations: [],
    agents: 0,
    wallets: 0,
    byDomain: {},
    byOutcome: {},
    byReason: {},
    byOthers: [],
    truncated: false,
    ...over,
});

/** The index behind `fetch`, answering the subject's uses with `triples`; every other query is the injected `read`'s. */
const indexFetch =
    (triples: unknown): FetchLike =>
    async (_input, init) => {
        const body: unknown = JSON.parse(String(init?.body));
        const {query} = body as {query: string}; // the transport's own request body
        if (query !== PULSE_SUBJECT_USES_QUERY) throw new Error("unexpected query");
        return new Response(JSON.stringify({data: {triples}}), {status: 200});
    };

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getAgentLines, the edges", () => {
    it("reads over the fetch it is given, skipping a use of itself, of nothing, and of a version's skill it rolls up", async () => {
        const asked: string[][] = [];
        const lines = await getAgentLines(AGENT, {
            ...base,
            fetch: indexFetch([
                {object: {term_id: "0xaaa"}},
                {object: null},
                {object: {label: "no id"}},
                {
                    object: null,
                    object_term: {
                        triple: {
                            predicate_id: VERSION,
                            subject: {term_id: "0xskill", label: "pdf"},
                            object: {label: `sha256:${"ab".repeat(32)}`},
                        },
                    },
                },
            ]),
            read: async (ids) => {
                asked.push([...ids]);
                return new Map([[AGENT.toLowerCase(), empty()]]);
            },
        });
        expect(asked).toEqual([[AGENT, "0xskill"]]);
        expect(lines).toEqual({usedBy: empty(), used: [], truncated: false});
    });

    it("reads over the global fetch, reads a page that is not a list as no use, and carries a cut tool read", async () => {
        vi.stubGlobal("fetch", indexFetch("none"));
        const none = await getAgentLines(AGENT, {
            ...base,
            timeoutMs: 100,
            read: async () => new Map([[AGENT.toLowerCase(), empty()]]),
        });
        expect(none.used).toEqual([]);

        vi.stubGlobal("fetch", indexFetch([{object: {term_id: "0xtool"}}]));
        const cut = await getAgentLines(AGENT, {
            ...base,
            read: async () =>
                new Map([
                    [AGENT.toLowerCase(), empty()],
                    ["0xtool", empty({truncated: true})],
                ]),
        });
        expect(cut.truncated).toBe(true);
    });

    it("throws when the usage read leaves out the agent", async () => {
        await expect(
            getAgentLines(AGENT, {...base, fetch: indexFetch([]), read: async () => new Map()}),
        ).rejects.toThrow(/left out the agent/);
    });
});
