import {createHash} from "node:crypto";

import {PULSE_ATOMS_QUERY, PULSE_QUALIFIERS_QUERY, PULSE_USES_QUERY, type GraphqlTransport} from "@arp-protocol/graphql";
import {describe, expect, it} from "vitest";

import {toolAtomUri} from "../src/declare/tool-thing.js";
import {linesSentence, readSkillLines, skillAtom, skillUrlOf} from "../src/failure-lines.js";
import type {PulseUsage} from "../src/pulse-usage.js";

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest();

describe("skillAtom", () => {
    it("builds the atom URI toolAtomUri builds, with a hash from another runtime", () => {
        for (const url of [
            "https://github.com/a/b?skill=gadget",
            "https://github.com/Anthropics/Skills?skill=pptx",
            "https://github.com/x/y?skill=caf%C3%A9",
        ]) {
            expect(skillAtom(url, sha256).uri).toBe(toolAtomUri(url));
        }
        expect(skillAtom("https://github.com/a/b?skill=gadget", sha256).label).toBe("github.com/a/b?skill=gadget");
    });
});

describe("skillUrlOf", () => {
    it("names a skill by its repository and its name, a plugin's prefix dropped", () => {
        expect(skillUrlOf("a/b", "gadget")).toBe("https://github.com/a/b?skill=gadget");
        expect(skillUrlOf("a/b", "tools:gadget")).toBe("https://github.com/a/b?skill=gadget");
    });

    it("refuses a source that is not owner/repo, so nothing is guessed", () => {
        expect(skillUrlOf("/home/me/skills", "gadget")).toBeNull();
        expect(skillUrlOf("a/b/c", "gadget")).toBeNull();
        expect(skillUrlOf("", "gadget")).toBeNull();
    });
});

const URI = "ipfs://bafkreitool";
const TOOL = "0xtool";
const ID = {"has outcome": "0xd0", because: "0xe0", needs: "0xf0", with: "0xf1"} as const;
const CONTEXT = "0xc0";

/** A miniature index: one `uses` edge per wallet, form B, with the levels each one wrote. */
function index(
    lines: {wallet: string; outcome: "failed" | "worked"; reason?: string; name?: string}[],
    seen: {query: string; variables: unknown}[] = [],
): GraphqlTransport {
    const qualifiers: Record<string, unknown>[] = [];
    const uses = lines.map((line, at) => {
        const edge = `0xedge${at}`;
        const context = `${edge}-ctx`;
        const outcome = `${edge}-out`;
        const reason = `${edge}-why`;
        const q = (term: string, subject: string, predicate: string, label: string) =>
            qualifiers.push({term_id: term, subject_id: subject, predicate_id: predicate, creator_id: line.wallet, object: {label}});
        q(context, edge, CONTEXT, "video");
        q(outcome, context, ID["has outcome"], line.outcome);
        if (line.reason !== undefined) q(reason, outcome, ID.because, line.reason);
        if (line.name !== undefined && line.outcome === "failed") q(`${reason}-n`, reason, ID.needs, line.name);
        if (line.name !== undefined && line.outcome === "worked") q(`${outcome}-w`, outcome, ID.with, line.name);
        return {term_id: edge, object_id: TOOL, creator_id: line.wallet, created_at: null, subject: {term_id: `0xagent${at}`, label: null}};
    });
    return {
        request: async (query: string, variables?: unknown) => {
            seen.push({query, variables});
            if (query === PULSE_ATOMS_QUERY) {
                const {uris} = variables as {uris: string[]}; // this query's own variables
                const known: Record<string, string> = {[URI]: TOOL, ...ID};
                return {atoms: uris.filter((uri) => uri in known).map((uri) => ({term_id: known[uri], data: uri}))};
            }
            if (query === PULSE_USES_QUERY) return {triples: uses};
            if (query === PULSE_QUALIFIERS_QUERY) {
                const {edges, predicates} = variables as {edges: string[]; predicates: string[]}; // this query's own variables
                return {triples: qualifiers.filter((row) => edges.includes(row["subject_id"] as string) && predicates.includes(row["predicate_id"] as string))};
            }
            throw new Error("unexpected query");
        },
    };
}

const config = (transport: GraphqlTransport) => ({graphqlUrl: "unused", inContextOf: CONTEXT, payers: [], transport});

describe("readSkillLines", () => {
    it("reads every level of a line, the names included", async () => {
        const usage = await readSkillLines(
            URI,
            config(
                index([
                    {wallet: "0xA", outcome: "failed", reason: "missing-program", name: "ffmpeg"},
                    {wallet: "0xB", outcome: "failed", reason: "missing-program", name: "ffmpeg"},
                    {wallet: "0xC", outcome: "failed", reason: "missing-key"},
                    {wallet: "0xD", outcome: "worked", name: "ffmpeg"},
                    {wallet: "0xE", outcome: "worked", name: "ffmpeg"},
                ]),
            ),
        );
        expect(usage?.byNeed).toEqual({ffmpeg: 2});
        expect(usage?.byWith).toEqual({ffmpeg: 2});
        expect(linesSentence(usage, "github.com/a/b?skill=gadget", "Intuition testnet 13579")).toBe(
            "ARP, lines agents wrote on github.com/a/b?skill=gadget (Intuition testnet 13579): 3 wallets wrote failed · because missing-program (2), missing-key (1) · needs ffmpeg (2); 2 wallets wrote worked · with ffmpeg (2).",
        );
    });

    it("is null for a skill with no atom, after one query", async () => {
        const seen: {query: string; variables: unknown}[] = [];
        expect(await readSkillLines("ipfs://bafkreiother", config(index([], seen)))).toBeNull();
        expect(seen.map((row) => row.query)).toEqual([PULSE_ATOMS_QUERY]);
    });
});

describe("linesSentence", () => {
    const empty: PulseUsage = {declarations: [], agents: 0, wallets: 0, byDomain: {}, byOutcome: {}, byReason: {}, byOthers: [], truncated: false};

    it("says nothing when no wallet wrote an outcome", () => {
        expect(linesSentence(null, "x", "y")).toBeNull();
        expect(linesSentence(empty, "x", "y")).toBeNull();
    });

    it("counts a wallet once, however many agents it wrote about", () => {
        const row = (agent: string) => ({
            tripleId: agent,
            agent: {atomId: agent, label: null},
            writer: "0xA",
            declaredAt: null,
            domains: [],
            outcomes: ["failed"],
            lines: [{domain: null, outcome: "failed" as const, reasons: [], form: "nested" as const}],
        });
        const usage = {...empty, declarations: [row("1"), row("2")], truncated: true};
        expect(linesSentence(usage, "x", "y")).toBe("ARP, lines agents wrote on x (y): at least 1 wallet wrote failed.");
    });
});
