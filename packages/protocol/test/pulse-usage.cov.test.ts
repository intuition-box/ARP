import {
    PULSE_ATOMS_QUERY,
    PULSE_DOMAIN_EDGES_QUERY,
    PULSE_EDGE_TOOLS_QUERY,
    PULSE_EDGE_WRITERS_QUERY,
    PULSE_QUALIFIERS_QUERY,
    PULSE_USES_QUERY,
    PULSE_VERSIONED_USES_QUERY,
    type FetchLike,
    type GraphqlTransport,
} from "@arp-protocol/graphql";
import {afterEach, describe, expect, it, vi} from "vitest";

import {
    findDeclaredTools,
    findToolAtoms,
    getPulseUsage,
    readEdgeWriters,
    readThingUrl,
    usageOnVersion,
    versionedSubject,
    workedInDomain,
    type PulseUsage,
} from "../src/pulse-usage.js";
import {VERSION} from "../src/sources/intuition/terms.js";

const TOOL = "0xaaa";
const CONTEXT = "0xc0";
const OUTCOME = "0xd0";
const BECAUSE = "0xe0";
const NEEDS = "0xf0";
const WITH = "0xf1";
const VERSION_WORD = "0xv1";
const WRITER = "0xWriter";
const DIGEST_LABEL = `sha256:${"ab".repeat(32)}`;

/** A GraphQL endpoint behind `fetch`: answers each query with what `answer` returns for it. */
function graphqlFetch(answer: (query: string, variables: Record<string, unknown>) => unknown): {
    fetch: FetchLike;
    queries: string[];
} {
    const queries: string[] = [];
    const fetch: FetchLike = async (_input, init) => {
        const body: unknown = JSON.parse(String(init?.body));
        const {query, variables} = body as {query: string; variables: Record<string, unknown>}; // the transport's own request body
        queries.push(query);
        return new Response(JSON.stringify({data: answer(query, variables)}), {status: 200});
    };
    return {fetch, queries};
}

const fromMap = (answers: Map<string, unknown>): GraphqlTransport => ({
    request: async (query: string) => {
        const data = answers.get(query);
        if (data === undefined) throw new Error("unexpected query");
        return data as Record<string, unknown>; // every answer in these maps is a record
    },
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("findToolAtoms over fetch", () => {
    it("reads through the fetch it is given, and skips a row missing its id or URI", async () => {
        const {fetch, queries} = graphqlFetch(() => ({
            atoms: [
                {term_id: "0x1", data: "https://a"},
                {term_id: "0x2"},
                {data: "https://c"},
                "not a row",
            ],
        }));
        const atoms = await findToolAtoms(["https://a", "https://c"], {
            graphqlUrl: "https://index.test/graphql",
            fetch,
        });
        expect([...atoms]).toEqual([["https://a", "0x1"]]);
        expect(queries).toEqual([PULSE_ATOMS_QUERY]);
    });

    it("falls back to the global fetch, and reads a missing list as no atom", async () => {
        const {fetch} = graphqlFetch(() => ({atoms: "nothing"}));
        vi.stubGlobal("fetch", fetch);
        const atoms = await findToolAtoms(["https://a"], {
            graphqlUrl: "https://index.test/graphql",
            timeoutMs: 500,
        });
        expect(atoms.size).toBe(0);
    });
});

describe("readEdgeWriters over fetch", () => {
    it("lower-cases the edge id and skips a row with no creator", async () => {
        vi.stubGlobal(
            "fetch",
            graphqlFetch(() => ({
                triples: [{term_id: "0xAB", creator_id: "0xW"}, {term_id: "0xCD"}],
            })).fetch,
        );
        const writers = await readEdgeWriters(["0xAB", "0xCD"], {
            graphqlUrl: "https://index.test/graphql",
        });
        expect([...writers]).toEqual([["0xab", "0xW"]]);
    });

    it("reads through a fetch given in config, with a timeout", async () => {
        const {fetch, queries} = graphqlFetch(() => ({triples: []}));
        const writers = await readEdgeWriters(["0x1"], {
            graphqlUrl: "https://index.test/graphql",
            fetch,
            timeoutMs: 100,
        });
        expect(writers.size).toBe(0);
        expect(queries).toEqual([PULSE_EDGE_WRITERS_QUERY]);
    });
});

describe("findDeclaredTools", () => {
    const versionedObject = (
        tool: Record<string, unknown>,
        predicate: string = VERSION,
        label: string = DIGEST_LABEL,
    ) => ({
        object: null,
        object_term: {triple: {predicate_id: predicate, subject: tool, object: {label}}},
    });

    it("asks nothing for no domain", async () => {
        const {fetch, queries} = graphqlFetch(() => ({triples: []}));
        expect(await findDeclaredTools([], {graphqlUrl: "u", inContextOf: CONTEXT, fetch})).toEqual(
            [],
        );
        expect(queries).toEqual([]);
    });

    it("stops after the domain read when no edge names a domain", async () => {
        const {fetch, queries} = graphqlFetch(() => ({triples: [{subject_id: null}]}));
        expect(
            await findDeclaredTools(["video"], {graphqlUrl: "u", inContextOf: CONTEXT, fetch}),
        ).toEqual([]);
        expect(queries).toEqual([PULSE_DOMAIN_EDGES_QUERY]);
    });

    it("takes a skill's URL from its label, or from its pinned document, once per atom", async () => {
        vi.stubGlobal(
            "fetch",
            graphqlFetch((query) =>
                query === PULSE_DOMAIN_EDGES_QUERY
                    ? {triples: [{subject_id: "0xedge"}]}
                    : {
                          triples: [
                              {object: {term_id: "0xa", label: "github.com/acme/skills?skill=pdf"}},
                              {
                                  object: {
                                      term_id: "0xa",
                                      label: "https://github.com/acme/skills?skill=pdf",
                                  },
                              },
                              {object: {term_id: "0xb", label: "Unknown", data: "ipfs://doc"}},
                              {object: {term_id: "0xc", label: "Unknown", data: "ipfs://empty"}},
                              {object: {label: "no id"}},
                              versionedObject({
                                  term_id: "0xd",
                                  label: "http://github.com/acme/skills?skill=docx",
                              }),
                              versionedObject({term_id: "0xe", label: "x?skill=y"}, "0xnotversion"),
                              versionedObject(
                                  {term_id: "0xf", label: "x?skill=y"},
                                  VERSION,
                                  "1.0.0",
                              ),
                          ],
                      },
            ).fetch,
        );
        const read: string[] = [];
        const tools = await findDeclaredTools(["video"], {
            graphqlUrl: "u",
            inContextOf: CONTEXT,
            readThing: async (uri) => {
                read.push(uri);
                return uri === "ipfs://doc" ? "https://github.com/acme/skills?skill=ocr" : null;
            },
        });
        expect(tools).toEqual([
            {atomId: "0xa", url: "https://github.com/acme/skills?skill=pdf"},
            {atomId: "0xb", url: "https://github.com/acme/skills?skill=ocr"},
            {atomId: "0xd", url: "https://github.com/acme/skills?skill=docx"},
        ]);
        expect(read).toEqual(["ipfs://doc", "ipfs://empty"]);
    });

    it("drops an unlabelled atom when the caller cannot read documents", async () => {
        const answers = new Map<string, unknown>([
            [PULSE_DOMAIN_EDGES_QUERY, {triples: [{subject_id: "0xedge"}]}],
            [
                PULSE_EDGE_TOOLS_QUERY,
                {
                    triples: [
                        {object: {term_id: "0xb", label: "Unknown", data: "ipfs://doc"}},
                        {object: {term_id: "0xc"}},
                    ],
                },
            ],
        ]);
        expect(
            await findDeclaredTools(["video"], {
                graphqlUrl: "u",
                inContextOf: CONTEXT,
                transport: fromMap(answers),
            }),
        ).toEqual([]);
    });
});

describe("versionedSubject", () => {
    it("returns the tool of a version triple, and null for anything else", () => {
        const tool = {term_id: "0xt"};
        expect(
            versionedSubject({
                object_term: {
                    triple: {
                        predicate_id: VERSION.toUpperCase().replace("0X", "0x"),
                        subject: tool,
                        object: {label: DIGEST_LABEL},
                    },
                },
            }),
        ).toEqual(tool);
        expect(versionedSubject({})).toBeNull();
        expect(versionedSubject({object_term: {}})).toBeNull();
        expect(versionedSubject({object_term: {triple: {subject: tool}}})).toBeNull();
        expect(
            versionedSubject({object_term: {triple: {predicate_id: VERSION, subject: tool}}}),
        ).toBeNull();
    });
});

describe("readThingUrl", () => {
    const answering =
        (body: string, status = 200): FetchLike =>
        async () =>
            new Response(body, {status});

    it("reads nothing that is not on IPFS", async () => {
        const fetch = vi.fn(answering("{}"));
        expect(await readThingUrl("https://example.com/doc", fetch)).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("returns a skill URL from the document, and nothing for another URL or a non-object", async () => {
        expect(
            await readThingUrl(
                "ipfs://cid",
                answering(JSON.stringify({url: "https://github.com/a/b?skill=c"})),
            ),
        ).toBe("https://github.com/a/b?skill=c");
        expect(
            await readThingUrl(
                "ipfs://cid",
                answering(JSON.stringify({url: "https://example.com"})),
            ),
        ).toBeNull();
        expect(await readThingUrl("ipfs://cid", answering(JSON.stringify(["no"])))).toBeNull();
    });

    it("returns null when every gateway fails, rather than throwing", async () => {
        expect(await readThingUrl("ipfs://cid", answering("gone", 404))).toBeNull();
    });

    it("uses the global fetch when none is given", async () => {
        vi.stubGlobal("fetch", answering(JSON.stringify({url: "https://github.com/a/b?skill=d"})));
        expect(await readThingUrl("ipfs://cid")).toBe("https://github.com/a/b?skill=d");
    });
});

describe("workedInDomain", () => {
    it("counts nothing for a tool with no usage", () => {
        expect(workedInDomain(undefined, "video")).toBe(0);
    });
});

const use = (id: string, subject: string, by = WRITER, extra: Record<string, unknown> = {}) => ({
    term_id: id,
    object_id: TOOL,
    creator_id: by,
    created_at: "2026-11-05T10:00:00Z",
    subject: {term_id: subject, label: `agent ${subject}`},
    ...extra,
});
const qualifier = (
    edge: string,
    predicate: string,
    value: string | null,
    by: string | null = WRITER,
    extra: Record<string, unknown> = {},
) => ({
    term_id: `${edge}-${value}`,
    subject_id: edge,
    predicate_id: predicate,
    creator_id: by,
    object: value === null ? null : {label: value},
    ...extra,
});

function transport(
    uses: unknown[],
    qualifiers: unknown[],
    usesQuery = PULSE_USES_QUERY,
): GraphqlTransport {
    return {
        request: async (query: string, variables?: unknown) => {
            if (query === usesQuery) return {triples: uses};
            if (query === PULSE_QUALIFIERS_QUERY) {
                const {edges} = variables as {edges: string[]}; // this query's own variables
                return {
                    triples: qualifiers.filter((row) =>
                        edges.includes((row as {subject_id: string}).subject_id),
                    ),
                }; // the rows this test built
            }
            throw new Error(`unexpected query`);
        },
    };
}

const read = (
    uses: unknown[],
    qualifiers: unknown[],
    extra: {version?: string; needs?: string; with?: string; payers?: string[]} = {},
) =>
    getPulseUsage([TOOL], {
        graphqlUrl: "unused",
        inContextOf: CONTEXT,
        hasOutcome: OUTCOME,
        because: BECAUSE,
        payers: extra.payers ?? [],
        ...(extra.needs === undefined ? {} : {needs: extra.needs}),
        ...(extra.with === undefined ? {} : {with: extra.with}),
        ...(extra.version === undefined ? {} : {version: extra.version}),
        transport: transport(
            uses,
            qualifiers,
            extra.version === undefined ? PULSE_USES_QUERY : PULSE_VERSIONED_USES_QUERY,
        ),
    });

describe("getPulseUsage, the paths the main suite does not walk", () => {
    it("asks nothing for no tool, over fetch", async () => {
        const {fetch, queries} = graphqlFetch(() => ({triples: []}));
        const usage = await getPulseUsage([], {
            graphqlUrl: "u",
            inContextOf: CONTEXT,
            hasOutcome: OUTCOME,
            because: BECAUSE,
            payers: [],
            fetch,
        });
        expect(usage.size).toBe(0);
        expect(queries).toEqual([]);
    });

    it("reads over the global fetch when no transport is given", async () => {
        vi.stubGlobal(
            "fetch",
            graphqlFetch((query) =>
                query === PULSE_USES_QUERY ? {triples: [use("0x1", "a")]} : {triples: "none"},
            ).fetch,
        );
        const usage = (
            await getPulseUsage([TOOL], {
                graphqlUrl: "u",
                inContextOf: CONTEXT,
                hasOutcome: OUTCOME,
                because: BECAUSE,
                payers: [],
            })
        ).get(TOOL);
        expect(usage?.declarations).toHaveLength(1);
        expect(usage?.wallets).toBe(1);
    });

    it("skips a use row missing its id, its writer or its subject", async () => {
        const usage = (
            await read(
                [
                    {...use("0x1", "a"), term_id: null},
                    {...use("0x2", "b"), creator_id: null},
                    {...use("0x3", "c"), subject: null},
                    {...use("0x4", "d"), subject: {label: "no id"}},
                    {...use("0x5", "e"), object_id: null},
                ],
                [],
            )
        ).get(TOOL);
        expect(usage?.declarations).toEqual([]);
    });

    it("skips a qualifier missing its subject, predicate, writer, value or id", async () => {
        const usage = (
            await read(
                [use("0x1", "a")],
                [
                    {...qualifier("0x1", CONTEXT, "video"), subject_id: null},
                    {...qualifier("0x1", CONTEXT, "audio"), predicate_id: null},
                    qualifier("0x1", CONTEXT, "image", null),
                    qualifier("0x1", CONTEXT, null),
                    {...qualifier("0x1", CONTEXT, "text"), term_id: null},
                    qualifier("0xunknown", CONTEXT, "video"),
                ],
            )
        ).get(TOOL);
        expect(usage?.byDomain).toEqual({});
        expect(usage?.byOthers).toEqual([]);
    });

    it("skips an outcome on a domain whose row lacks a subject, a value, an id, or a known word", async () => {
        const usage = (
            await read(
                [use("0x1", "a")],
                [
                    qualifier("0x1", CONTEXT, "video"),
                    {...qualifier("0x1-video", OUTCOME, "worked"), term_id: null},
                    qualifier("0x1-video", OUTCOME, null),
                    qualifier("0x1-video", OUTCOME, "maybe"),
                    {...qualifier("0x1-video", OUTCOME, "failed"), subject_id: null},
                ],
            )
        ).get(TOOL);
        expect(usage?.byDomain).toEqual({video: 1});
        expect(usage?.byOutcome).toEqual({});
    });

    it("keeps a stranger's domain on the edge apart, as context", async () => {
        const usage = (
            await read([use("0x1", "a")], [qualifier("0x1", CONTEXT, "video", "0xStranger")])
        ).get(TOOL);
        expect(usage?.byOthers).toMatchObject([
            {predicate: "context", value: "video", writer: "0xStranger"},
        ]);
    });

    it("keeps a stranger's reason apart, and skips a reason row with no value or predicate", async () => {
        const usage = (
            await read(
                [use("0x1", "a")],
                [
                    qualifier("0x1", CONTEXT, "video"),
                    qualifier("0x1-video", OUTCOME, "failed"),
                    qualifier("0x1-video-failed", BECAUSE, "missing-file", "0xStranger"),
                    qualifier("0x1-video-failed", BECAUSE, null),
                    {...qualifier("0x1-video-failed", BECAUSE, "no-delivery"), predicate_id: null},
                    {...qualifier("0x1-video-failed", BECAUSE, "no-delivery"), subject_id: null},
                ],
            )
        ).get(TOOL);
        expect(usage?.byReason).toEqual({});
        expect(usage?.byOthers).toMatchObject([{predicate: "reason", writer: "0xStranger"}]);
    });

    it("gives the same reason once, written by the creator and held by the declarer", async () => {
        const usage = (
            await read(
                [use("0x1", "a")],
                [
                    qualifier("0x1", CONTEXT, "video"),
                    qualifier("0x1-video", OUTCOME, "failed"),
                    qualifier("0x1-video-failed", BECAUSE, "missing-file"),
                    {
                        ...qualifier("0x1-video-failed", BECAUSE, "missing-file", "0xStranger"),
                        term_id: "dup",
                        positions: [{account_id: WRITER}],
                    },
                ],
            )
        ).get(TOOL);
        expect(usage?.declarations[0]?.lines).toEqual([
            {domain: "video", outcome: "failed", reasons: ["missing-file"], form: "nested"},
        ]);
    });

    it("keeps a stranger's `with` apart and ignores `with` on a failure or of no shape", async () => {
        const usage = (
            await read(
                [use("0x1", "a"), use("0x2", "b")],
                [
                    qualifier("0x1", OUTCOME, "worked"),
                    qualifier("0x1-worked", WITH, "ffmpeg", "0xStranger"),
                    qualifier("0x1-worked", WITH, "not a name!"),
                    qualifier("0x2", OUTCOME, "failed"),
                    qualifier("0x2-failed", WITH, "ffmpeg"),
                ],
                {with: WITH},
            )
        ).get(TOOL);
        expect(usage?.byWith).toEqual({});
        expect(usage?.byOthers).toMatchObject([
            {predicate: "with", value: "ffmpeg", writer: "0xStranger"},
        ]);
    });

    it("merges a line written twice, its reasons and its names, and keeps `with` on form A per domain", async () => {
        const usage = (
            await read(
                [use("0x1", "a")],
                [
                    qualifier("0x1", CONTEXT, "video"),
                    qualifier("0x1", OUTCOME, "worked"),
                    qualifier("0x1-worked", WITH, "ffmpeg"),
                    {
                        ...qualifier("0x1", OUTCOME, "worked", "0xStranger"),
                        term_id: "0x1-worked-again",
                        positions: [{account_id: WRITER}],
                    },
                    qualifier("0x1-worked-again", WITH, "OPENAI_API_KEY"),
                ],
                {with: WITH},
            )
        ).get(TOOL);
        expect(usage?.declarations[0]?.lines).toEqual([
            {
                domain: "video",
                outcome: "worked",
                reasons: [],
                form: "sibling",
                with: ["ffmpeg", "OPENAI_API_KEY"],
            },
        ]);
        expect(usage?.byWith).toEqual({ffmpeg: 1, OPENAI_API_KEY: 1});
    });

    it("skips a needs row with no subject or value, and keeps a stranger's apart", async () => {
        const usage = (
            await read(
                [use("0x1", "a")],
                [
                    qualifier("0x1", OUTCOME, "failed"),
                    qualifier("0x1-failed", BECAUSE, "missing-program"),
                    qualifier("0x1-failed-missing-program", NEEDS, null),
                    {...qualifier("0x1-failed-missing-program", NEEDS, "ffmpeg"), subject_id: null},
                    qualifier("0x1-failed-missing-program", NEEDS, "jq", "0xStranger"),
                ],
                {needs: NEEDS},
            )
        ).get(TOOL);
        expect(usage?.byNeed).toEqual({});
        expect(usage?.byOthers).toMatchObject([{predicate: "needs", value: "jq"}]);
    });

    it("records a stranger's row with no id or value as empty strings", async () => {
        const usage = (
            await read(
                [use("0x1", "a")],
                [
                    qualifier("0x1-video", OUTCOME, "worked", "0xStranger"),
                    qualifier("0x1", CONTEXT, "video"),
                ],
            )
        ).get(TOOL);
        expect(usage?.byOthers).toMatchObject([{predicate: "outcome", value: "worked"}]);
    });

    it("skips a holder with no account, and a holder repeated", async () => {
        const usage = (
            await read(
                [
                    use("0x1", "a", WRITER, {
                        positions: [
                            {},
                            {account_id: WRITER.toLowerCase()},
                            {account_id: "0xH"},
                            {account_id: "0xH"},
                        ],
                    }),
                ],
                [qualifier("0x1", CONTEXT, "video", "0xH")],
            )
        ).get(TOOL);
        expect(usage?.declarations.map((row) => row.writer)).toEqual([WRITER, "0xH"]);
        expect(usage?.declarations[0]?.holders).toEqual([WRITER.toLowerCase(), "0xH", "0xH"]);
    });

    it("excludes a payer's versioned row from the per-version count", async () => {
        const PAYER = "0xPayer";
        const versioned = (id: string, by: string) =>
            use(id, "a", by, {
                object_id: null,
                object_term: {
                    triple: {
                        predicate_id: VERSION_WORD,
                        subject_id: TOOL,
                        object: {label: DIGEST_LABEL},
                    },
                },
            });
        const usage = (
            await read([versioned("0x1", WRITER), versioned("0x2", PAYER), use("0x3", "b")], [], {
                version: VERSION_WORD,
                payers: [PAYER],
            })
        ).get(TOOL);
        expect(usage?.byVersion).toEqual({[`0x${"ab".repeat(32)}`]: 1});
        expect(usage?.declarations.map((row) => row.version)).toEqual([
            `0x${"ab".repeat(32)}`,
            `0x${"ab".repeat(32)}`,
            undefined,
        ]);
    });

    it("drops a versioned read's row that names another tool or a malformed version", async () => {
        const usage = (
            await read(
                [
                    use("0x1", "a", WRITER, {object_id: "0xother"}),
                    use("0x2", "b", WRITER, {object_id: null}),
                    use("0x3", "c", WRITER, {object_term: {}}),
                    use("0x4", "d", WRITER, {
                        object_term: {
                            triple: {
                                predicate_id: "0xelse",
                                subject_id: TOOL,
                                object: {label: DIGEST_LABEL},
                            },
                        },
                    }),
                    use("0x5", "e", WRITER, {
                        object_term: {
                            triple: {predicate_id: VERSION_WORD, subject_id: TOOL, object: null},
                        },
                    }),
                    use("0x6", "f", WRITER, {
                        object_term: {
                            triple: {predicate_id: VERSION_WORD, object: {label: DIGEST_LABEL}},
                        },
                    }),
                ],
                [],
                {version: VERSION_WORD},
            )
        ).get(TOOL);
        expect(usage?.declarations.map((row) => row.tripleId)).toEqual([
            "0x3",
            "0x4",
            "0x5",
            "0x6",
        ]);
        expect(usage?.declarations.every((row) => row.version === undefined)).toBe(true);
        expect(usage?.byVersion).toEqual({});
    });
});

describe("usageOnVersion", () => {
    const usage: PulseUsage = {
        declarations: [
            {
                tripleId: "0x1",
                version: "0xd1",
                agent: {atomId: "a", label: null},
                writer: "0xW",
                declaredAt: null,
                domains: ["video"],
                outcomes: ["failed"],
                lines: [
                    {
                        domain: "video",
                        outcome: "failed",
                        reasons: ["missing-file"],
                        form: "nested",
                        needs: ["ffmpeg"],
                    },
                ],
            },
            {
                tripleId: "0x2",
                version: "0xd1",
                agent: {atomId: "b", label: null},
                writer: "0xPayer",
                declaredAt: null,
                domains: [],
                outcomes: ["worked"],
                lines: [
                    {domain: null, outcome: "worked", reasons: [], form: "sibling", with: ["jq"]},
                ],
            },
            {
                tripleId: "0x3",
                agent: {atomId: "c", label: null},
                writer: "0xV",
                declaredAt: null,
                domains: [],
                outcomes: [],
                lines: [],
            },
        ],
        agents: 3,
        wallets: 3,
        byDomain: {},
        byOutcome: {},
        byReason: {},
        byOthers: [],
        truncated: false,
    };

    it("counts only the declarations on that digest, and a payer as no wallet", () => {
        const on = usageOnVersion(usage, "0xD1", ["0xPAYER"]);
        expect(on.declarations.map((row) => row.tripleId)).toEqual(["0x1", "0x2"]);
        expect(on.wallets).toBe(1);
        expect(on.byNeed).toEqual({ffmpeg: 1});
        expect(on.byWith).toEqual({jq: 1});
    });
});
