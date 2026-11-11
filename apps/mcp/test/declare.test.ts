import {writeFileSync} from "node:fs";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {keccak256, stringToBytes, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";

import {DomainTree, signContentReceipt, type CataloguedSkill} from "@arp-protocol/core";

import {answerOf, errorOf, fakeLookup, fakeReads, type FakeState} from "./helpers/fake-reads.js";

const paths = await vi.hoisted(async () => {
    const {mkdtempSync} = await import("node:fs");
    const {tmpdir} = await import("node:os");
    const {join: joinPath} = await import("node:path");
    const dir = mkdtempSync(joinPath(tmpdir(), "arp-declare-"));
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
    return {dir, receipts: joinPath(dir, "receipts.jsonl"), session: joinPath(dir, "session.jsonl")};
});

/** What the tests change between cases: the chain the server plans for, the catalogue, the fake chain. */
const box = vi.hoisted(() => ({
    chainId: 13579,
    catalogue: null as CataloguedSkill[] | null,
    state: {} as {allExist?: boolean; shares?: bigint},
}));

const core = vi.hoisted(() => ({
    resolveDeclarationSubject: vi.fn(),
    readDomainTree: vi.fn(),
    readEdgeWriters: vi.fn(),
}));
vi.mock("@arp-protocol/core", async (original) => ({
    ...(await original<typeof import("@arp-protocol/core")>()),
    ...core,
}));

const needCheck = vi.hoisted(() => vi.fn());
vi.mock("../src/handlers/declare-need.js", async (original) => ({
    ...(await original<typeof import("../src/handlers/declare-need.js")>()),
    needProblemInSkill: needCheck,
}));

vi.mock("../src/config.js", async (original) => {
    const real = await original<typeof import("../src/config.js")>();
    return {
        ...real,
        get chainId() {
            return box.chainId;
        },
        get sessionCatalogue() {
            return box.catalogue ?? real.sessionCatalogue;
        },
        reads: fakeReads(box.state as FakeState),
        toolAtoms: fakeLookup(),
        RECEIPTS_LOG: paths.receipts,
        SESSION_LOG: paths.session,
    };
});

const {declareUsed, declareSession} = await import("../src/handlers/declare.js");

const SUBJECT = `0x${"5b".repeat(32)}` as Hex;
const DECLARER = privateKeyToAccount(`0x${"88".repeat(32)}`);
const NODE = privateKeyToAccount(`0x${"77".repeat(32)}`);
const GRILL = {atom: "0x0f5d49c4219b44d36e737c57e82dc3ad8bdfcc2d7ee73ba9b75974a4b6935ea3" as Hex, url: "https://github.com/mattpocock/skills?skill=grill-me"};
const SKILL_URL = "https://github.com/acme/skills?skill=deck";
const BASE = {agent_chain_id: 13579, agent_token_id: "6"};

const tree = DomainTree.from("tool", [
    {tripleId: "0xd1", child: "design", parent: "tool", positions: 1, shares: 1n},
    {tripleId: "0xd2", child: "presentation authoring", parent: "design", positions: 1, shares: 1n},
]);

beforeEach(() => {
    box.chainId = 13579;
    box.catalogue = null;
    box.state.allExist = false;
    box.state.shares = 0n;
    core.resolveDeclarationSubject.mockReset().mockResolvedValue(SUBJECT);
    core.readDomainTree.mockReset().mockResolvedValue(tree);
    core.readEdgeWriters.mockReset().mockResolvedValue(new Map());
    needCheck.mockReset().mockResolvedValue(null);
});

describe("arp_declare_used, its arguments", () => {
    it.each([
        [{agent_chain_id: 0}, "agent_chain_id must be a positive integer"],
        [{agent_chain_id: 1.5}, "agent_chain_id must be a positive integer"],
        [{agent_chain_id: 1, agent_token_id: 6}, "agent_token_id must be a decimal string"],
        [{...BASE, tools: "x"}, "tools must be an array of URI strings"],
        [{...BASE, tools: [1]}, "tools must be an array of URI strings"],
        [{...BASE, tools: [], registry: "0x1"}, "registry, when given, must be a 20-byte hex address"],
        [{...BASE, tools: [], domain: 3}, "domain, when given, must be a category of the tree"],
        [{...BASE, tools: [], outcome: "meh"}, "outcome, when given, must be worked or failed"],
        [{...BASE, tools: [], outcome: "failed", reason: "nope"}, "reason, when given, must be one of"],
        [{...BASE, tools: [], outcome: "worked", reason: "missing-program"}, "a reason only follows outcome: failed"],
        [{...BASE, tools: [], outcome: "worked", needs: 3}, "needs, when given, must be a name"],
        [{...BASE, tools: [SKILL_URL, SKILL_URL], outcome: "worked", with: "ffmpeg"}, "needs and with go with exactly one tool"],
        [{...BASE, tools: [], declarer: "me"}, "declarer, when given, must be a 20-byte hex address"],
        [{...BASE, tools: [], budget_wei: "1.5"}, "budget_wei, when given, must be a decimal string of wei"],
        [{...BASE, tools: [], budget_wei: 5}, "budget_wei, when given, must be a decimal string of wei"],
    ])("refuses %j", async (args, message) => {
        const error = await errorOf(await declareUsed(1, args));
        expect(error.code).toBe(-32602);
        expect(error.message).toContain(message);
    });

    it("writes domains and outcomes on testnet only", async () => {
        box.chainId = 1155;
        expect((await errorOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], outcome: "worked"}))).message).toBe(
            "domain and outcome are written on testnet 13579 only for now",
        );
    });

    it("refuses a name the skill's own file does not carry, with the check's sentence", async () => {
        needCheck.mockResolvedValue("the skill's SKILL.md does not name \"ffmpeg\", so it is not planned");
        const error = await errorOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], outcome: "worked", with: "ffmpeg"}));
        expect(error.message).toContain("does not name");
        expect(needCheck).toHaveBeenCalledWith(SKILL_URL, "ffmpeg", undefined);
    });
});

describe("arp_declare_used, a plain declaration", () => {
    it("plans the atom and the uses edge for the subject the graph resolves", async () => {
        const out = await answerOf(await declareUsed(1, {...BASE, tools: ["ipfs://bafy-tool"], registry: `0x${"c1".repeat(20)}`}));
        expect(core.resolveDeclarationSubject.mock.calls[0]?.[0]).toMatchObject({agent: {chainId: 13579, tokenId: "6", registry: `0x${"c1".repeat(20)}`}});
        expect(out["subject_atom_id"]).toBe(SUBJECT);
        const tools = out["tools"] as {uri: string; atom_exists: boolean; triple_exists: boolean}[];
        expect(tools).toEqual([expect.objectContaining({uri: "ipfs://bafy-tool", atom_exists: false, triple_exists: false})]);
        expect((out["calls"] as {kind: string}[]).map((call) => call.kind)).toEqual(["create-atom", "create-triple"]);
        expect(BigInt(String(out["total_value_wei"]))).toBeGreaterThan(0n);
    });

    it("leaves the registry out of the agent reference when none was named", async () => {
        await declareUsed(1, {...BASE, tools: ["ipfs://bafy-tool"]});
        expect(core.resolveDeclarationSubject.mock.calls[0]?.[0].agent).not.toHaveProperty("registry");
    });

    it("refuses, without a plan, what costs more than the budget", async () => {
        const out = await answerOf(await declareUsed(1, {...BASE, tools: ["ipfs://bafy-tool"], budget_wei: "1"}));
        expect(out).toMatchObject({status: "refused", rule: "over_budget", budget_wei: "1"});
        expect(out).not.toHaveProperty("calls");
    });

    it("plans within a budget that covers it", async () => {
        const out = await answerOf(await declareUsed(1, {...BASE, tools: ["ipfs://bafy-tool"], budget_wei: "1000000"}));
        expect(out).toHaveProperty("calls");
    });
});

describe("arp_declare_used, with a domain or an outcome", () => {
    const kinds = (out: Record<string, unknown>) => (out["calls"] as {kind: string; why: string}[]).map((call) => call.kind);

    it("plans the edge, then the context and the outcome, after it", async () => {
        const out = await answerOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], domain: "design", outcome: "worked"}));
        const calls = out["calls"] as {why: string}[];
        expect(kinds(out).slice(0, 2)).toEqual(["create-atom", "create-triple"]);
        expect(calls.some((call) => call.why.includes('in "design"'))).toBe(true);
        expect(calls.some((call) => call.why.includes("say this use worked"))).toBe(true);
        expect(out).not.toHaveProperty("qualifiers_already_written");
        expect(out).not.toHaveProperty("lines_note");
    });

    it("files a word people use under the node that means it", async () => {
        const out = await answerOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], domain: "Slides"}));
        expect((out["calls"] as {why: string}[]).some((call) => call.why.includes('in "presentation authoring"'))).toBe(true);
    });

    it("plans a failure with its reason and the name it needed", async () => {
        const out = await answerOf(
            await declareUsed(1, {...BASE, tools: [SKILL_URL], outcome: "failed", reason: "missing-program", needs: "ffmpeg"}),
        );
        const whys = (out["calls"] as {why: string}[]).map((call) => call.why);
        expect(whys.some((why) => why.includes("failed because of missing-program"))).toBe(true);
        expect(whys.some((why) => why.includes("ffmpeg"))).toBe(true);
    });

    it("names the closest categories when the domain is not one", async () => {
        const error = await errorOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], domain: "design systems"}));
        expect(error.message).toMatch(/^"design systems" is not a category under tool\. Closest: design/);
        expect(error.message).toContain("pass domain_parent and domain_reason");
    });

    it("names none when nothing is close", async () => {
        const error = await errorOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], domain: "zzzz"}));
        expect(error.message).toBe('"zzzz" is not a category under tool. Pick an existing one, or pass domain_parent and domain_reason to add it');
    });

    describe("a new domain", () => {
        const NEW = {...BASE, tools: [SKILL_URL], domain: "zzzz", domain_parent: "design", domain_reason: "nothing fits"};

        it.each([
            [{domain_parent: "design"}],
            [{domain_parent: " ", domain_reason: "x"}],
            [{domain_parent: "design", domain_reason: 4}],
        ])("needs a parent and a reason: %j", async (extra) => {
            const error = await errorOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], domain: "zzzz", ...extra}));
            expect(error.message).toBe("a new domain needs domain_parent, an existing category, and domain_reason, why none fits");
        });

        it("is signed by the agent, so it needs the declarer", async () => {
            expect((await errorOf(await declareUsed(1, NEW))).message).toContain("pass declarer");
        });

        it("is filed only under a tool already on the graph", async () => {
            expect((await errorOf(await declareUsed(1, {...NEW, declarer: DECLARER.address}))).message).toContain(
                "this tool is not on the graph yet",
            );
        });

        it("answers a request to sign, with this chain's registry when the agent is on it", async () => {
            box.state.allExist = true;
            const out = await answerOf(await declareUsed(1, {...NEW, declarer: DECLARER.address}));
            expect(out["status"]).toBe("sign_category_first");
            expect(out["request"]).toMatchObject({label: "zzzz", parent: "design", reason: "nothing fits", agentId: "6"});
            expect(String((out["request"] as {agentRegistry: string}).agentRegistry)).toMatch(/^eip155:13579:0x/);
        });

        it("needs a registry for an agent on another chain", async () => {
            box.state.allExist = true;
            const error = await errorOf(await declareUsed(1, {...NEW, agent_chain_id: 8453, declarer: DECLARER.address}));
            expect(error.message).toBe("a new domain needs registry, the identity registry that holds your agent");
        });
    });

    it("says which lines are already written, and that they are not the caller's word without a declarer", async () => {
        box.state.allExist = true;
        core.readEdgeWriters.mockImplementation(async (edges: string[]) => new Map(edges.map((edge) => [edge.toLowerCase(), "0xsomebody"])));
        const out = await answerOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], domain: "design", outcome: "worked"}));
        expect((out["qualifiers_already_written"] as string[]).length).toBeGreaterThan(0);
        expect(out["qualifiers_note"]).toContain("pass `declarer`");
        expect(out["lines_count_for_their_declarers"]).toEqual([expect.objectContaining({written_by: "0xsomebody"})]);
        expect(out["calls"]).toEqual([]);
    });

    it("deposits on what another wallet wrote, when a declarer is given", async () => {
        box.state.allExist = true;
        core.readEdgeWriters.mockImplementation(async (edges: string[]) => new Map(edges.map((edge) => [edge.toLowerCase(), "0xsomebody"])));
        const out = await answerOf(
            await declareUsed(1, {...BASE, tools: [SKILL_URL], domain: "design", outcome: "worked", declarer: DECLARER.address}),
        );
        expect(kinds(out).every((kind) => kind === "deposit")).toBe(true);
        expect(kinds(out).length).toBeGreaterThan(1);
        expect(out).not.toHaveProperty("qualifiers_note");
        expect(out).not.toHaveProperty("lines_note");
    });

    it("refuses a qualified plan over the budget", async () => {
        const out = await answerOf(await declareUsed(1, {...BASE, tools: [SKILL_URL], outcome: "worked", budget_wei: "10"}));
        expect(out).toMatchObject({status: "refused", rule: "over_budget"});
    });
});

describe("arp_declare_session", () => {
    afterEach(() => {
        writeFileSync(paths.receipts, "");
    });
    const line = (name: string, kind = "skill") => JSON.stringify({at: "2026-11-11T00:00:00Z", kind, name});
    const LOG = [line("grill-me"), line("prototype"), line("find-skills"), line("no-such-skill-anywhere"), line("github", "mcp")].join("\n");

    it.each([
        [{agent_chain_id: -1}, "agent_chain_id must be a positive integer"],
        [{agent_chain_id: 1, agent_token_id: "x"}, "agent_token_id must be a decimal string"],
        [{...BASE, declarer: "0x12"}, "declarer must be a 20-byte hex address"],
        [{...BASE, registry: "0x12"}, "registry, when given, must be a 20-byte hex address"],
        [{...BASE, log: 12}, "log must be the JSONL text of a session log"],
    ])("refuses %j", async (args, message) => {
        expect((await errorOf(await declareSession(1, args))).message).toBe(message);
    });

    it("says where it looked when no log was passed and none is on disk", async () => {
        const error = await errorOf(await declareSession(1, BASE));
        expect(error.message).toContain(paths.session);
        expect(error.message).toContain("PostToolUse");
    });

    it("refuses on a chain with no catalogue rather than naming nothing", async () => {
        box.catalogue = [];
        expect((await errorOf(await declareSession(1, {...BASE, log: LOG}))).message).toContain("ARP_TARGET=testnet");
    });

    it("plans only what it can name, and reports every other invocation as it stands", async () => {
        const out = await answerOf(await declareSession(1, {...BASE, log: LOG, registry: `0x${"c1".repeat(20)}`}));
        const rows = out["invocations"] as Record<string, unknown>[];
        expect(rows.map((row) => row["status"])).toEqual(["resolved", "ambiguous", "unrecorded", "unknown", "unknown"]);
        expect(rows[0]).toMatchObject({atom_id: GRILL.atom, url: GRILL.url, access: "no receipt — this is your own word"});
        expect((rows[1]?.["candidates"] as unknown[]).length).toBeGreaterThan(1);
        expect(rows[2]).toMatchObject({repo: "vercel-labs/skills"});
        expect(rows[4]).toMatchObject({kind: "mcp"});
        expect(out["planned_for"]).toBe(1);
        expect(out["not_planned_for"]).toBe(4);
        expect((out["plan"] as {tools: unknown[]}).tools).toHaveLength(1);
    });

    it("reads the log on disk when none is passed, and plans nothing when nothing resolves", async () => {
        writeFileSync(paths.session, `${line("no-such-skill-anywhere")}\n`);
        const out = await answerOf(await declareSession(1, BASE));
        expect(out["plan"]).toBeNull();
        expect(out["planned_for"]).toBe(0);
    });

    describe("with a receipt held for the resolved skill", () => {
        const receiptFor = (to: `0x${string}` | null) =>
            signContentReceipt(
                {
                    atom: GRILL.atom,
                    url: GRILL.url,
                    path: "grill-me/SKILL.md",
                    digest: keccak256(stringToBytes("bytes")),
                    to,
                    servedAt: 1_793_462_400,
                    nonce: keccak256(stringToBytes("n")),
                },
                13579,
                {address: NODE.address, signTypedData: (data) => NODE.signTypedData(data)},
            );
        const hold = (rows: unknown[]) => writeFileSync(paths.receipts, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n{half`);
        const access = async (args: Record<string, unknown>) =>
            ((await answerOf(await declareSession(1, {...BASE, log: line("grill-me"), ...args})))["invocations"] as {access: string}[])[0]?.access;

        it("asks for the declarer before assessing it", async () => {
            hold([{atom: GRILL.atom.toUpperCase().replace("0X", "0x"), receipt: await receiptFor(DECLARER.address)}, {atom: 3}]);
            expect(await access({})).toBe("a receipt is held — pass `declarer` (the address that will sign) to have it assessed");
        });

        it("assesses it against the declarer and names its signer", async () => {
            hold([{atom: GRILL.atom, receipt: await receiptFor(DECLARER.address)}]);
            expect(await access({declarer: DECLARER.address})).toBe(`unknown-signer (signed by ${NODE.address})`);
        });

        it("says a receipt that does not verify did not", async () => {
            const signed = await receiptFor(null);
            hold([{atom: GRILL.atom, receipt: {...signed, signature: "0x1234"}}]);
            expect(await access({declarer: DECLARER.address})).toMatch(/^receipt did not verify: /);
        });
    });
});

