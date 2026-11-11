import {beforeEach, describe, expect, it, vi} from "vitest";

import {DomainTree} from "@arp-protocol/core";

import {answerOf, errorOf} from "./helpers/fake-reads.js";

vi.hoisted(() => {
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
});

const box = vi.hoisted(() => ({attestors: ["0x00000000000000000000000000000000000000a7"] as string[] | undefined, index: "https://skills.test" as string | null}));
const core = vi.hoisted(() => ({
    listTools: vi.fn(),
    listRegisteredTools: vi.fn(),
    readDomainTree: vi.fn(),
    toolsInDomain: vi.fn(),
    searchSkillsIndex: vi.fn(),
}));
vi.mock("@arp-protocol/core", async (original) => ({...(await original<typeof import("@arp-protocol/core")>()), ...core}));
vi.mock("../src/config.js", async (original) => {
    const real = await original<typeof import("../src/config.js")>();
    return {
        ...real,
        get DOMAIN_ATTESTORS() {
            return box.attestors;
        },
        get SKILLS_INDEX() {
            return box.index;
        },
    };
});

const {findTools, isGone, isNotFetchable, isOnlyASkillsRepository, requiresFor} = await import("../src/handlers/find-tools.js");

const MOBBIN = "github.com/mobbin/mobbin-mcp-server";
const FIND = "github.com/vercel-labs/skills?skill=find-skills";
const GONE = "github.com/mattpocock/skills?skill=to-prd";
const NOT_FETCHABLE = "github.com/nateherkai/herk-edit-kit?skill=cut-silences";
const HANDOFF = "github.com/mattpocock/skills?skill=claude-handoff";
const atom = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;

const declared = (atomId: string, label: string | null, edges: number) => ({
    atomId,
    label,
    uri: "ipfs://x",
    hostedAt: label === null ? null : `https://${label}`,
    type: "Thing",
    edgeCount: edges,
    declarers: [],
    pricedEdges: 1,
    sponsoredDeposits: 0,
    sponsoredWallets: null,
    declaredDeposits: 0,
    supportAssetsSum: 10n,
    opposeAssetsSum: 0n,
});
const registered = (atomId: string, label: string | null, declarations = 0) => ({
    atomId,
    label,
    uri: "ipfs://r",
    url: label === null ? null : `https://${label}`,
    positionCount: 1,
    assets: 5n,
    declarations,
});

// The listings are cached a minute per order and curve, so a case that sets listings of its own asks
// for a curve no other case reads.
beforeEach(() => {
    box.attestors = ["0x00000000000000000000000000000000000000a7"];
    box.index = "https://skills.test";
    core.listTools.mockReset().mockResolvedValue({
        curveId: 1,
        edgesRead: 3,
        truncated: false,
        sponsor: null,
        tools: [declared(atom(1), MOBBIN, 2), declared(atom(2), GONE, 1)],
    });
    core.listRegisteredTools.mockReset().mockResolvedValue({
        curveId: 1,
        truncated: true,
        tools: [
            registered(atom(1), MOBBIN),
            registered(atom(3), FIND),
            registered(atom(4), NOT_FETCHABLE),
            registered(atom(5), HANDOFF),
            registered(atom(6), "github.com/browser-use/video-use"),
            registered(atom(7), "github.com/acme/one?skill=dup"),
            registered(atom(8), "github.com/acme/two?skill=dup"),
            registered(atom(9), null),
        ],
    });
    core.searchSkillsIndex.mockReset().mockResolvedValue({status: "ok", skills: []});
});

type Row = Record<string, unknown>;
const tools = (out: Row) => out["tools"] as Row[];

describe("arp_find_tools, its arguments", () => {
    it.each([
        [{order: "newest"}, "order must be"],
        [{query: 3}, "query must be a string of at most 200 characters"],
        [{query: "x".repeat(201)}, "query must be a string of at most 200 characters"],
        [{offset: -1}, "offset must be an integer of 0 or more"],
        [{detail: "long"}, "detail must be 'short' or 'full'"],
        [{limit: 0}, "limit must be an integer between 1 and 100"],
        [{limit: 101}, "limit must be an integer between 1 and 100"],
        [{limit: "5"}, "limit must be an integer between 1 and 100"],
        [{curve_id: 1.5}, "curve_id must be an integer"],
        [{domain: 4}, "domain must be a string"],
    ])("refuses %j", async (args, message) => {
        expect((await errorOf(await findTools(1, args))).message).toContain(message);
    });

    it("refuses a domain search on a server with no attestor, rather than read the graph unfiltered", async () => {
        box.attestors = undefined;
        const error = await errorOf(await findTools(1, {domain: "design"}));
        expect(error.code).toBe(-32603);
        expect(error.message).toContain("ARP_DOMAIN_ATTESTOR");
        expect(core.readDomainTree).not.toHaveBeenCalled();
    });
});

describe("arp_find_tools, the short listing", () => {
    it("merges both populations once each, and leaves out what an agent cannot use", async () => {
        const out = await answerOf(await findTools(1, {}));
        const urls = tools(out).map((row) => row["url"]);
        expect(urls[0]).toBe(`https://${MOBBIN}`);
        expect(urls.filter((url) => url === `https://${MOBBIN}`)).toHaveLength(1);
        expect(urls).not.toContain(`https://${GONE}`);
        expect(urls).not.toContain("https://github.com/vercel-labs/skills");
        expect(out).toMatchObject({truncated: true, offset: 0, next_offset: null});
        expect(out).not.toHaveProperty("query");
    });

    it("names a catalogued tool by its title, and says what each skill's file needs", async () => {
        const rows = tools(await answerOf(await findTools(1, {})));
        const byUrl = new Map(rows.map((row) => [row["url"], row]));
        expect(byUrl.get(`https://${MOBBIN}`)).toMatchObject({name: "Mobbin", declarations: 2});
        expect(byUrl.get(`https://${FIND}`)).toMatchObject({name: "find-skills", installs: expect.any(Number)});
        expect(byUrl.get(`https://${FIND}`)).not.toHaveProperty("file_not_read");
        expect(byUrl.get(`https://${NOT_FETCHABLE}`)).toMatchObject({not_fetchable: true});
        expect(byUrl.get(`https://${HANDOFF}`)).toHaveProperty("requires");
    });

    it("shows a skill copied into two repositories once, with how many copies", async () => {
        const dup = tools(await answerOf(await findTools(1, {}))).filter((row) => row["name"] === "dup");
        expect(dup).toEqual([expect.objectContaining({copies: 2, file_not_read: true})]);
    });

    it("pages", async () => {
        const out = await answerOf(await findTools(1, {limit: 2, offset: 1, order: "conviction", curve_id: 2}));
        expect(tools(out)).toHaveLength(2);
        expect(out["next_offset"]).toBe(3);
        expect(core.listTools.mock.calls[0]?.[0]).toMatchObject({order: "conviction", curveId: 2});
        expect(core.listRegisteredTools.mock.calls[0]?.[0]).toMatchObject({curveId: 2});
    });

    it("reads the listings once a minute, not once a call", async () => {
        await findTools(1, {order: "declarations"});
        await findTools(1, {order: "declarations"});
        expect(core.listTools).toHaveBeenCalledTimes(1);
    });
});

describe("arp_find_tools, a search by need", () => {
    it("keeps what holds the words, and lays skills.sh's results in", async () => {
        core.searchSkillsIndex.mockResolvedValue({
            status: "ok",
            skills: [
                {source: "vercel-labs/skills", skill: "find-skills", installs: 9, url: `https://${FIND}`},
                {source: "other/skills", skill: "skill-finder", installs: 42, url: "https://github.com/other/skills?skill=skill-finder"},
                {source: "x", skill: "y", installs: null, url: null},
                {source: "mattpocock/skills", skill: "to-prd", installs: 1, url: `https://${GONE}`},
            ],
        });
        const out = await answerOf(await findTools(1, {query: "  find skills  "}));
        expect(out["query"]).toBe("find skills");
        expect(core.searchSkillsIndex).toHaveBeenCalledWith("find skills", {limit: 20, baseUrl: "https://skills.test"});
        const rows = tools(out);
        expect(rows[0]).toMatchObject({url: `https://${FIND}`, id: atom(3)});
        expect(rows[0]).not.toHaveProperty("in_registry");
        expect(rows[1]).toMatchObject({id: null, url: "https://github.com/other/skills?skill=skill-finder", installs: 42, in_registry: false});
        expect(rows.map((row) => row["url"])).not.toContain(`https://${GONE}`);
        expect(rows.map((row) => row["url"])).not.toContain(`https://${MOBBIN}`);
    });

    it("says when skills.sh did not answer, and searches ARP's catalogue alone", async () => {
        core.searchSkillsIndex.mockResolvedValue({status: "unavailable", reason: "timeout"});
        const out = await answerOf(await findTools(1, {query: "mobbin"}));
        expect(out["skills_index"]).toBe("unavailable");
        expect(tools(out).map((row) => row["url"])).toEqual([`https://${MOBBIN}`]);
    });

    it("sends no word anywhere when the index is off", async () => {
        box.index = null;
        await findTools(1, {query: "mobbin"});
        expect(core.searchSkillsIndex).not.toHaveBeenCalled();
    });

    it("puts a skill nobody can fetch last, and one that missed a word after one that did not", async () => {
        core.listRegisteredTools.mockResolvedValue({
            curveId: 1,
            truncated: false,
            tools: [registered(atom(4), NOT_FETCHABLE, 5), registered(atom(10), "github.com/acme/s?skill=cut-silences-fast", 0), registered(atom(11), "github.com/acme/s?skill=cut-silences-pro", 3)],
        });
        const out = await answerOf(await findTools(1, {query: "cut silences fast", curve_id: 77}));
        expect(tools(out).map((row) => row["name"])).toEqual(["cut-silences-fast", "cut-silences-pro", "cut-silences"]);
    });
});

describe("arp_find_tools, a search by domain", () => {
    const tree = DomainTree.from("tool", [
        {tripleId: "0xd1", child: "design", parent: "tool", positions: 1, shares: 1n},
        {tripleId: "0xd2", child: "marketing", parent: "tool", positions: 1, shares: 1n},
    ]);
    beforeEach(() => {
        core.readDomainTree.mockReset().mockResolvedValue(tree);
        core.toolsInDomain.mockReset().mockResolvedValue({
            domains: ["design"],
            tools: [
                {atomId: atom(1).toUpperCase().replace("0X", "0x"), domain: "design", attestorBacked: true},
                {atomId: atom(3), domain: "design", attestorBacked: false},
            ],
        });
    });

    it("keeps what ARP's attestor filed there, and says how many other filings it hid", async () => {
        const out = await answerOf(await findTools(1, {domain: " Design ", detail: "full"}));
        expect(core.toolsInDomain.mock.calls[0]?.[1]).toBe("design");
        expect(tools(out).map((row) => row["tool_atom_id"])).toEqual([atom(1)]);
        expect(out).toMatchObject({
            domain: "design",
            domains_walked: ["design"],
            domain_tagged_tools: 1,
            domain_attestors: box.attestors,
            tags_from_others_hidden: 1,
        });
        expect(core.searchSkillsIndex).not.toHaveBeenCalled();
    });

    it("names the domains there are when nothing is filed under the one asked", async () => {
        core.toolsInDomain.mockResolvedValue({domains: ["design"], tools: []});
        const out = await answerOf(await findTools(1, {domain: "design", query: "anything"}));
        expect(out["total"]).toBe(0);
        expect(out["domains_available"]).toEqual(["design", "marketing"]);
        expect(out).toMatchObject({domain: "design", domains_walked: ["design"]});
    });

    it("says the same in the full answer", async () => {
        core.toolsInDomain.mockResolvedValue({domains: ["design"], tools: []});
        const out = await answerOf(await findTools(1, {domain: "design", detail: "full"}));
        expect(out["domains_available"]).toEqual(["design", "marketing"]);
    });
});

describe("arp_find_tools, the full answer", () => {
    it("carries both populations' figures and where each was read", async () => {
        const out = await answerOf(await findTools(1, {detail: "full"}));
        expect(out).toMatchObject({curve_id: 1, edges_read: 3, truncated: true});
        expect(out["purpose_read_at"]).toEqual(expect.any(String));
        expect(out["installs_read_at"]).toEqual(expect.any(String));
        const rows = tools(out);
        const mobbin = rows.find((row) => row["tool_atom_id"] === atom(1));
        expect(mobbin).toMatchObject({provenance: "declared", title: "Mobbin", paid_declarations: 1, support_assets_wei: "10", oppose_assets_wei: "0", position_count: null});
        const find = rows.find((row) => row["tool_atom_id"] === atom(3));
        expect(find).toMatchObject({provenance: "registered", title: "find-skills", paid_declarations: null, oppose_assets_wei: null, position_count: 1});
        expect(String(find?.["purpose"])).toMatch(/^Helps users/);
        // Copies are not collapsed in the full answer.
        expect(rows.filter((row) => String(row["label"]).endsWith("?skill=dup"))).toHaveLength(2);
        const unnamed = rows.find((row) => row["tool_atom_id"] === atom(9));
        expect(unnamed).toMatchObject({label: null, title: null});
    });
});

describe("the row filters", () => {
    it("know a gone skill, an unfetchable one, a bare skills repository and a skill nobody read", () => {
        expect(isGone(null)).toBe(false);
        expect(isGone(`https://${GONE}/`)).toBe(true);
        expect(isNotFetchable(null)).toBe(false);
        expect(isOnlyASkillsRepository(null, 0)).toBe(false);
        expect(isOnlyASkillsRepository("github.com/browser-use/video-use", 1)).toBe(false);
        expect(isOnlyASkillsRepository("github.com/browser-use/video-use", null)).toBe(true);
        expect(requiresFor(null)).toEqual({});
        expect(requiresFor(MOBBIN)).toEqual({});
        expect(requiresFor("github.com/acme/x?skill=y")).toEqual({file_not_read: true});
    });
});
