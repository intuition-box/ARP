import {existsSync, mkdtempSync, statSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {encodeAbiParameters, encodeEventTopics, getAddress, type Hex} from "viem";
import {generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount} from "viem/accounts";

import {DomainTree, bundleManifest, contentDigest, signContentReceipt, verifyCategoryRequest} from "@arp-protocol/core";

import type {AgentSender} from "../src/desktop/agent-key.js";
import {answerOf, errorOf} from "./helpers/fake-reads.js";

/**
 * The sponsored mode's three tools as the server routes them. The content server and the sponsor
 * are a stubbed `fetch`; the one thing replaced is the transaction sender, the chain boundary. The
 * agent key is the real one, created in a temporary `ARP_HOME`.
 */
const home = await vi.hoisted(async () => {
    const {mkdtempSync: makeDir} = await import("node:fs");
    const {tmpdir: temp} = await import("node:os");
    const {join: joinPath} = await import("node:path");
    const dir = makeDir(joinPath(temp(), "arp-desktop-tools-"));
    Object.assign(process.env, {
        ARP_NO_RECEIPTS: "1",
        ARP_TARGET: "testnet",
        ARP_TOOLS: "desktop",
        ARP_HOME: dir,
        ARP_CONTENT: "http://content.test",
        ARP_SPONSOR: "http://sponsor.test",
    });
    return dir;
});

const ATOM = `0x${"ab".repeat(32)}` as Hex;
const IDENTITY = `0x${"cd".repeat(32)}` as Hex;
const SPONSOR = getAddress("0xE596096F4176b682E300d73963e7B04B383C1AA1");
const NODE = privateKeyToAccount(generatePrivateKey());
const URL_OF_SKILL = "github.com/vercel-labs/skills?skill=find-skills";

const sender = vi.hoisted(() => ({made: [] as string[]}));
vi.mock("../src/desktop/agent-key.js", async (original) => {
    const real = await original<typeof import("../src/desktop/agent-key.js")>();
    return {
        ...real,
        agentSender: (account: PrivateKeyAccount): AgentSender => {
            sender.made.push(account.address);
            return fakeSender(account, real.refusal);
        },
    };
});
const readDomainTree = vi.hoisted(() => vi.fn());
vi.mock("@arp-protocol/core", async (original) => ({...(await original<typeof import("@arp-protocol/core")>()), readDomainTree}));

const {desktopTool, loopConfig} = await import("../src/desktop/handlers.js");
const {MULTI_VAULT, record} = await import("../src/config.js");

/** Sends nothing: answers `register()` with the event the registry emits, and refuses what the real sender refuses. */
function fakeSender(account: PrivateKeyAccount, refusal: typeof import("../src/desktop/agent-key.js").refusal): AgentSender {
    const registry = getAddress(String(record.arp?.identityRegistry));
    const registered = {
        address: registry,
        topics: encodeEventTopics({
            abi: [{type: "event", name: "Registered", inputs: [{name: "agentId", type: "uint256", indexed: true}, {name: "agentURI", type: "string", indexed: false}, {name: "to", type: "address", indexed: true}]}],
            eventName: "Registered",
            args: {agentId: 7n, to: account.address},
        }),
        data: encodeAbiParameters([{type: "string"}], [""]),
    };
    return {
        address: account.address,
        account,
        client: {readContract: async () => `0x${"ef".repeat(32)}`} as unknown as AgentSender["client"], // only `readContract` is called on it
        async send(call, permitted) {
            const why = refusal(call, permitted);
            if (why !== null) throw new Error(`refused: ${why}`);
            return {status: "success", transactionHash: "0x05", logs: [registered]} as unknown as Awaited<ReturnType<AgentSender["send"]>>; // the fields the loop reads
        },
    };
}

let routes: string[] = [];
let sponsorAnswer: () => Response;
const bytes = new TextEncoder().encode("# find skills\n");
beforeEach(() => {
    routes = [];
    sponsorAnswer = () => Response.json({label: "design", newCategory: false, created: true});
    readDomainTree.mockReset().mockResolvedValue(
        DomainTree.from("tool", [
            {tripleId: "0xd1", child: "design", parent: "tool", positions: 1, shares: 1n},
            {tripleId: "0xd2", child: "presentation authoring", parent: "design", positions: 1, shares: 1n},
        ]),
    );
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        routes.push(`${init?.method ?? "GET"} ${url.host}${url.pathname}`);
        if (url.host === "content.test") {
            const to = url.searchParams.get("by") as Hex; // the agent's address, which the loop signed for
            if (url.searchParams.get("bundle") === "1") {
                const files = [{path: "SKILL.md", bytes}];
                const signed = await signContentReceipt(
                    {atom: ATOM, url: URL_OF_SKILL, path: "skills/find-skills", digest: contentDigest(new TextEncoder().encode(bundleManifest(files))), to, servedAt: 1, nonce: `0x${"00".repeat(32)}`},
                    13579,
                    NODE,
                );
                return Response.json(
                    {path: "skills/find-skills", files: files.map((f) => ({path: f.path, base64: Buffer.from(f.bytes).toString("base64")}))},
                    {headers: {"x-arp-receipt": JSON.stringify(signed)}},
                );
            }
            const signed = await signContentReceipt(
                {atom: ATOM, url: URL_OF_SKILL, path: "skills/find-skills/SKILL.md", digest: contentDigest(bytes), to, servedAt: 1, nonce: `0x${"00".repeat(32)}`},
                13579,
                NODE,
            );
            return new Response(bytes, {headers: {"x-arp-receipt": JSON.stringify(signed)}});
        }
        if (url.pathname === "/propose-category") return sponsorAnswer();
        if (url.pathname === "/") return Response.json({multiVault: MULTI_VAULT, sponsor: SPONSOR});
        if (url.pathname === "/mint-gas") return Response.json({sent: "0x01"});
        if (url.pathname === "/identity") return Response.json({identityAtom: IDENTITY, sent: []});
        if (url.pathname === "/deposit") return Response.json({sent: "0x03", created: "0x04"});
        return Response.json({error: "no route"}, {status: 404});
    }));
});
afterEach(() => vi.unstubAllGlobals());

describe("the sponsored tools", () => {
    it("refuses an id that is not one", async () => {
        expect((await errorOf(await desktopTool(1, "arp_get_skill", {id: "0x12"}))).message).toBe("id must be the 0x + 32 bytes id from arp_find_tools");
    });

    it("builds the loop from this chain's record, and creates no key before a tool needs one", () => {
        expect(loopConfig()).toMatchObject({contentUrl: "http://content.test", sponsorUrl: "http://sponsor.test", multiVault: getAddress(MULTI_VAULT), stateDir: home});
        expect(loopConfig()).not.toHaveProperty("skillsDir");
        expect(existsSync(join(home, "agent-key"))).toBe(false);
    });

    it("gets a skill through ARP, showing what it contains before anything is followed", async () => {
        const out = await answerOf(await desktopTool(1, "arp_get_skill", {id: ATOM}));
        expect(out).toMatchObject({name: "find-skills", source: URL_OF_SKILL, skill_md: "# find skills\n"});
        expect(out["contains"]).toEqual(expect.arrayContaining([expect.any(String)]));
        expect(out).not.toHaveProperty("installed");
        expect(statSync(join(home, "agent-key")).mode & 0o777).toBe(0o600);
    });

    it("declares it: registers the agent, makes its identity, and the sponsor deposits in its name", async () => {
        await desktopTool(1, "arp_get_skill", {id: ATOM});
        const out = await answerOf(await desktopTool(1, "arp_declare_used", {id: ATOM}));
        expect(out).toEqual({declared: "find-skills", supported_by: "ARP, in your name", note: "Public now. Nothing was asked of the person and nothing was charged."});
        expect(routes).toEqual(expect.arrayContaining(["POST sponsor.test/mint-gas", "POST sponsor.test/identity", "POST sponsor.test/deposit"]));
        // One sender for the whole session, made from the one key.
        expect(new Set(sender.made).size).toBe(1);
    });

    it("answers a failure as an error the agent can read, not a crash", async () => {
        const out = await answerOf(await desktopTool(1, "arp_declare_used", {id: `0x${"01".repeat(32)}`}));
        expect(String(out["error"])).toContain("arp_get_skill first");
    });
});

describe("arp_file_category", () => {
    const file = (args: Record<string, unknown>) => desktopTool(2, "arp_file_category", {id: ATOM, ...args});

    it.each([[{}], [{category: " "}], [{category: 4}]])("needs a category name: %j", async (args) => {
        expect((await errorOf(await file(args))).message).toBe("category must be a category name");
    });

    it("refuses a word that is no category, naming the closest, when no parent is given", async () => {
        expect(await answerOf(await file({category: "design systems"}))).toEqual({
            refused: "unknown_category",
            detail: '"design systems" is not a category. Closest: design. Pick one, or pass parent and reason to add it.',
        });
        expect((await answerOf(await file({category: "zzzz"})))["detail"]).toBe('"zzzz" is not a category. Pick one, or pass parent and reason to add it.');
    });

    it("files under the node a word means, signed by the agent's registered key", async () => {
        let signed: unknown;
        sponsorAnswer = () => Response.json({label: "presentation authoring", newCategory: false, created: true});
        vi.mocked(fetch).mockImplementationOnce(async (_input, init) => {
            signed = (JSON.parse(String(init?.body)) as {request: unknown}).request;
            return sponsorAnswer();
        });
        expect(await answerOf(await file({category: "slides"}))).toEqual({filed: "presentation authoring", new_category: false, written: true});
        expect(signed).toMatchObject({request: {label: "presentation authoring", parent: "", agentId: "7", subject: ATOM}});
        expect(await verifyCategoryRequest(signed as Parameters<typeof verifyCategoryRequest>[0], Math.floor(Date.now() / 1000))).toMatchObject({status: "valid"});
    });

    it("asks for a new category with its parent and reason", async () => {
        let body = "";
        vi.mocked(fetch).mockImplementationOnce(async (_input, init) => {
            body = String(init?.body);
            return Response.json({label: "decks", newCategory: true, created: true});
        });
        expect(await answerOf(await file({category: "decks", parent: "design", reason: "none fits"}))).toEqual({filed: "decks", new_category: true, written: true});
        expect(JSON.parse(body)).toMatchObject({request: {request: {label: "decks", parent: "design", reason: "none fits"}}});
    });
});

describe("the sponsored mode in a project", () => {
    it("installs into the project's skills directory only when the person accepts, and says why not otherwise", async () => {
        const project = mkdtempSync(join(tmpdir(), "arp-project-"));
        process.env["ARP_SKILLS_DIR"] = ".claude/skills";
        process.env["ARP_PROJECT_DIR"] = project;
        vi.resetModules();
        const fresh = await import("../src/desktop/handlers.js");
        delete process.env["ARP_SKILLS_DIR"];
        delete process.env["ARP_PROJECT_DIR"];
        const config = fresh.loopConfig();
        expect(config).toMatchObject({skillsDir: join(project, ".claude/skills"), projectReceipts: join(project, ".arp/receipts.jsonl")});
        expect(config.reviewContext?.(`https://${URL_OF_SKILL}`)).toMatchObject({thirdParty: [expect.objectContaining({label: "installs", source: "skills.sh"})]});
        expect(config.reviewContext?.("https://github.com/nobody/nothing?skill=x")).toEqual({committedAt: null, thirdParty: []});
        expect(config.reviewContext?.("not a url")).toEqual({committedAt: null, thirdParty: []});

        const get = async () => answerOf(await fresh.desktopTool(1, "arp_get_skill", {id: ATOM}));
        const unasked = await get();
        expect(unasked).toMatchObject({installed: false});
        expect(String(unasked["note"])).toContain("This client cannot show the person the install question.");

        const session = await import("../src/client-session.js");
        session.recordClientCapabilities({capabilities: {elicitation: {}}});
        session.setRequester(async () => ({action: "decline"}));
        const declined = await get();
        expect(String(declined["note"])).toContain("The client answered without an accept.");

        session.setRequester(async () => ({action: "accept", content: {install: true}}));
        const installed = await get();
        expect(installed["installed_at"]).toBe(join(project, ".claude/skills", "find-skills", "SKILL.md"));
        expect(installed["files"]).toBe(1);
        expect(existsSync(join(project, ".claude/skills", "find-skills", "SKILL.md"))).toBe(true);
        session.setRequester(null);
    });
});
