import {
    PULSE_QUALIFIERS_QUERY,
    PULSE_SUBJECT_USES_QUERY,
    PULSE_USES_QUERY,
    type GraphqlTransport,
} from "@arp-protocol/graphql";
import {describe, expect, it} from "vitest";

import {getAgentLines} from "../src/agent-lines.js";

const AGENT = "0xAAA";
const CONTEXT = "0xc0";
const OUTCOME = "0xd0";
const BECAUSE = "0xe0";

type Use = {term_id: string; object_id: string; creator_id: string; subject: {term_id: string; label: string}};
type Qualifier = {term_id: string; subject_id: string; predicate_id: string; creator_id: string; object: {label: string}};

const use = (id: string, subject: string, object: string, by: string): Use => ({
    term_id: id,
    object_id: object,
    creator_id: by,
    subject: {term_id: subject, label: `label ${subject}`},
});
const qualifier = (edge: string, predicate: string, value: string, by: string): Qualifier => ({
    term_id: `${edge}-${value}`,
    subject_id: edge,
    predicate_id: predicate,
    creator_id: by,
    object: {label: value},
});

function transport(uses: Use[], qualifiers: Qualifier[]): GraphqlTransport {
    return {
        request: async (query: string, variables?: unknown) => {
            if (query === PULSE_SUBJECT_USES_QUERY) {
                const {subject} = variables as {subject: string}; // this query's own variables
                return {
                    triples: uses
                        .filter((row) => row.subject.term_id === subject)
                        .map((row) => ({object: {term_id: row.object_id, label: `label ${row.object_id}`}})),
                };
            }
            if (query === PULSE_USES_QUERY) {
                const {tools} = variables as {tools: string[]}; // this query's own variables
                return {triples: uses.filter((row) => tools.includes(row.object_id))};
            }
            if (query === PULSE_QUALIFIERS_QUERY) {
                const {edges} = variables as {edges: string[]}; // this query's own variables
                return {triples: qualifiers.filter((row) => edges.includes(row.subject_id))};
            }
            throw new Error("unexpected query");
        },
    };
}

const read = (uses: Use[], qualifiers: Qualifier[]) =>
    getAgentLines(AGENT, {
        graphqlUrl: "unused",
        inContextOf: CONTEXT,
        hasOutcome: OUTCOME,
        because: BECAUSE,
        payers: [],
        transport: transport(uses, qualifiers),
    });

describe("getAgentLines", () => {
    it("is empty for an agent nobody used and that used nothing", async () => {
        const lines = await read([], []);
        expect(lines.usedBy.declarations).toEqual([]);
        expect(lines.used).toEqual([]);
        expect(lines.truncated).toBe(false);
    });

    it("reads who used the agent, with the domain and outcome its declarer wrote", async () => {
        const lines = await read(
            [use("0x1", "0xhirer", AGENT, "0xH")],
            [qualifier("0x1", CONTEXT, "translation", "0xH"), qualifier("0x1", OUTCOME, "worked", "0xH")],
        );
        expect(lines.usedBy.declarations).toHaveLength(1);
        expect(lines.usedBy.declarations[0]?.agent.atomId).toBe("0xhirer");
        expect(lines.usedBy.byDomain).toEqual({translation: 1});
        expect(lines.usedBy.byOutcome).toEqual({worked: 1});
    });

    it("reads what the agent used, and only its own declaration on that tool", async () => {
        const lines = await read(
            [use("0x2", AGENT, "0xtool", "0xA"), use("0x3", "0xother", "0xtool", "0xO")],
            [qualifier("0x2", CONTEXT, "video", "0xA"), qualifier("0x3", CONTEXT, "music", "0xO")],
        );
        expect(lines.used).toHaveLength(1);
        expect(lines.used[0]?.tool).toEqual({atomId: "0xtool", label: "label 0xtool"});
        expect(lines.used[0]?.declaration.domains).toEqual(["video"]);
    });

    it("keeps a stranger's outcome on the agent's own line apart", async () => {
        const lines = await read(
            [use("0x2", AGENT, "0xtool", "0xA")],
            [qualifier("0x2", OUTCOME, "failed", "0xStranger")],
        );
        expect(lines.used[0]?.declaration.outcomes).toEqual([]);
    });

});
