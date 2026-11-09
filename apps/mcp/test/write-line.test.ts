import {mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {verifyCategoryRequest, verifyLineRequest, type DomainResolution, type SignedCategoryRequest, type SignedLineRequest} from "@arp-protocol/core";
import type {Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {afterEach, describe, expect, it} from "vitest";

import type {AgentSender} from "../src/desktop/agent-key.js";
import {writeLine, type LoopConfig} from "../src/desktop/loop.js";
import {lineFromArgs, writeLineChecked} from "../src/line.js";

const ATOM = `0x${"77".repeat(32)}` as Hex;
const MULTI_VAULT = "0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91";
const SPONSOR = "0x00000000000000000000000000000000000000aa";
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const dirs: string[] = [];

afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true});
});

function setup(
    line: (body: {request: SignedLineRequest}, calls: number) => {status: number; body: unknown},
    category: {status: number; body: unknown} = {status: 200, body: {label: "slides", newCategory: true, created: true}},
) {
    const categories: SignedCategoryRequest[] = [];
    const stateDir = mkdtempSync(join(tmpdir(), "arp-line-"));
    dirs.push(stateDir);
    writeFileSync(join(stateDir, "agent.json"), JSON.stringify({agentId: "7", identityAtom: `0x${"5b".repeat(32)}`}));
    const asked: string[] = [];
    const sent: unknown[] = [];
    let lines = 0;
    const fake = (async (input: string | URL, init?: RequestInit) => {
        const path = new URL(String(input)).pathname;
        asked.push(path);
        const body = init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>); // this test's own requests
        if (path === "/") return Response.json({multiVault: MULTI_VAULT, sponsor: SPONSOR});
        if (path === "/list-tool") return Response.json({url: "https://github.com/canonical/repo?skill=s", atomId: ATOM});
        if (path === "/gas") return Response.json({next: {to: MULTI_VAULT, data: "0x", value: "0"}});
        if (path === "/propose-category") {
            categories.push((body as {request: SignedCategoryRequest}).request);
            return Response.json(category.body, {status: category.status});
        }
        const answer = line(body as {request: SignedLineRequest}, (lines += 1));
        return Response.json(answer.body, {status: answer.status});
    }) as typeof fetch; // the subset of fetch this module calls
    const agent = {
        address: account.address,
        account,
        client: {},
        send: async (call: unknown) => {
            sent.push(call);
            return {logs: []};
        },
    } as unknown as AgentSender; // the members `writeLine` reaches
    const config: LoopConfig = {
        contentUrl: "http://content",
        sponsorUrl: "http://sponsor",
        registry: "0x00000000000000000000000000000000000000bb",
        multiVault: MULTI_VAULT,
        stateDir,
        fetch: fake,
        sleep: async () => undefined,
    };
    return {config, agent, asked, sent, categories};
}

const ok = {status: 200, body: {termId: ATOM, levels: [ATOM], created: true, transactions: []}};
const INPUT = {toolUrl: "https://github.com/old/repo?skill=s", outcome: "failed", reason: "missing-key"} as const;

describe("writeLine", () => {
    it("lists the tool, signs the line, and says which URL it wrote under", async () => {
        let signed: SignedLineRequest | undefined;
        const {config, agent, asked} = setup((body) => {
            signed = body.request;
            return ok;
        });
        const written = await writeLine(config, agent, INPUT);
        expect(written.toolUrl).toBe("https://github.com/canonical/repo?skill=s");
        expect(asked).toEqual(["/", "/list-tool", "/line"]);
        expect(signed?.request).toMatchObject({tool: ATOM, domain: "", outcome: "failed", reason: "missing-key", agentId: "7"});
        expect(await verifyLineRequest(signed, Math.floor(Date.now() / 1000))).toEqual({status: "valid", address: account.address});
    });

    it("sends the approval once when the sponsor asks for it, then writes", async () => {
        const {config, agent, asked, sent} = setup((_body, calls) => (calls === 1 ? {status: 409, body: {error: "not approved", approve: {}}} : ok));
        await writeLine(config, agent, INPUT);
        expect(asked.filter((path) => path === "/gas")).toHaveLength(1);
        expect(sent).toHaveLength(1);
    });

    it("waits for the indexer to see a new identity", async () => {
        const {config, agent} = setup((_body, calls) => (calls === 1 ? {status: 403, body: {error: "agent 7 has no identity atom on the graph"}} : ok));
        await expect(writeLine(config, agent, INPUT)).resolves.toMatchObject({termId: ATOM});
    });

    it("waits while the index has no document for the tool, or cannot be read", async () => {
        const first = setup((_body, calls) => (calls === 1 ? {status: 422, body: {error: "no document yet", retry: true}} : ok));
        await expect(writeLine(first.config, first.agent, INPUT)).resolves.toMatchObject({termId: ATOM});
        const second = setup((_body, calls) => (calls === 1 ? {status: 503, body: {error: "the chain could not be read", retry: true}} : ok));
        await expect(writeLine(second.config, second.agent, INPUT)).resolves.toMatchObject({termId: ATOM});
    });

    it("does not wait on a refusal that will not change", async () => {
        const {config, agent} = setup(() => ({status: 422, body: {error: "a sponsored line is about a skill or repository on GitHub", rule: "tool"}}));
        await expect(writeLine(config, agent, INPUT)).rejects.toThrow("about a skill or repository on GitHub");
    });

    it("says what the sponsor refused", async () => {
        const {config, agent} = setup(() => ({status: 429, body: {error: "5 sponsored lines a day per agent, reached"}}));
        await expect(writeLine(config, agent, INPUT)).rejects.toThrow("the sponsor refused the line (429): 5 sponsored lines a day per agent, reached");
    });

    it("says the service is down, and where it looked", async () => {
        const {config, agent} = setup(() => ok);
        // A fetch that always throws: nothing of the real one is reached.
        const down = {...config, fetch: (async () => {
            throw new TypeError("fetch failed");
        }) as unknown as typeof fetch};
        await expect(writeLine(down, agent, INPUT)).rejects.toThrow("ARP's sponsoring service did not answer at http://sponsor");
    });
});

describe("writeLine with a domain the tree lacks", () => {
    const NEW = {...INPUT, domain: "slides", newDomain: {parent: "design", why: "no deck category"}};

    it("files the domain with the agent's signature before the line names it", async () => {
        const {config, agent, asked, categories} = setup(() => ok);
        await writeLine(config, agent, NEW);
        expect(asked).toEqual(["/", "/list-tool", "/propose-category", "/line"]);
        expect(categories[0]?.request).toMatchObject({label: "slides", parent: "design", subject: ATOM, reason: "no deck category", agentId: "7"});
        expect(await verifyCategoryRequest(categories[0], Math.floor(Date.now() / 1000))).toEqual({status: "valid", address: account.address});
    });

    it("waits while the new domain reaches the index", async () => {
        const {config, agent} = setup((_body, calls) => (calls === 1 ? {status: 422, body: {error: '"slides" is not a category', rule: "unknown_domain"}} : ok));
        await expect(writeLine(config, agent, NEW)).resolves.toMatchObject({termId: ATOM});
    });

    it("does not wait on an unknown domain it did not file", async () => {
        const {config, agent} = setup(() => ({status: 422, body: {error: '"slides" is not a category', rule: "unknown_domain"}}));
        await expect(writeLine(config, agent, {...INPUT, domain: "slides"})).rejects.toThrow("is not a category");
    });

    it("stops, and writes no line, when the sponsor refuses the domain", async () => {
        const {config, agent, asked} = setup(() => ok, {status: 429, body: {error: "3 new categories a day for 0x…, reached", rule: "limit"}});
        await expect(writeLine(config, agent, NEW)).rejects.toThrow('the domain "slides" could not be added (429)');
        expect(asked).not.toContain("/line");
    });
});

describe("lineFromArgs", () => {
    const args = {toolUrl: "https://github.com/a/b?skill=s", domain: undefined, reason: undefined};

    it("takes closed words", () => {
        expect(lineFromArgs({...args, outcome: "failed", reason: "missing-key", domain: "video"})).toEqual({
            toolUrl: args.toolUrl,
            outcome: "failed",
            reason: "missing-key",
            domain: "video",
        });
    });

    it("takes --parent and --why together, for a --domain", () => {
        expect(lineFromArgs({...args, outcome: "worked", domain: "slides", parent: "design", why: " no deck category "})).toMatchObject({
            domain: "slides",
            newDomain: {parent: "design", why: "no deck category"},
        });
        expect(lineFromArgs({...args, outcome: "worked", domain: "slides", parent: "design"})).toBeInstanceOf(Error);
        expect(lineFromArgs({...args, outcome: "worked", parent: "design", why: "x"})).toBeInstanceOf(Error);
        expect(lineFromArgs({...args, outcome: "worked", domain: "slides", parent: "design", why: "  "})).toBeInstanceOf(Error);
    });

    it("refuses anything else", () => {
        expect(lineFromArgs({...args, outcome: "maybe"})).toBeInstanceOf(Error);
        expect(lineFromArgs({...args, outcome: "failed", reason: "the moon"})).toBeInstanceOf(Error);
        expect(lineFromArgs({...args, outcome: "worked", reason: "missing-key"})).toBeInstanceOf(Error);
    });
});

describe("writeLineChecked", () => {
    it("refuses an unknown domain before it reaches the sponsor or makes a key", async () => {
        const {config, asked} = setup(() => ok);
        let keys = 0;
        const steps = {config, isCategory: async () => false, agent: () => {
            keys += 1;
            throw new Error("no key in this test");
        }};
        await expect(writeLineChecked(steps, {...INPUT, domain: "zzz"})).rejects.toThrow('"zzz" is not a category under tool');
        expect(asked).toEqual([]);
        expect(keys).toBe(0);
    });

    it("says how to add an unknown domain, and refuses a parent the tree lacks", async () => {
        const {config} = setup(() => ok);
        const steps = {config, isCategory: async (label: string) => label === "design", agent: () => {
            throw new Error("no key in this test");
        }};
        await expect(writeLineChecked(steps, {...INPUT, domain: "slides"})).rejects.toThrow("--parent <category> --why <reason>");
        await expect(
            writeLineChecked(steps, {...INPUT, domain: "slides", newDomain: {parent: "nowhere", why: "x"}}),
        ).rejects.toThrow('--parent "nowhere" is not a category');
    });

    it("hands the writer one normalised word, and drops --parent when the domain exists", async () => {
        const {config, agent} = setup(() => ok);
        const seen: unknown[] = [];
        const write = (async (_config: unknown, _agent: unknown, input: unknown) => {
            seen.push(input);
            return {toolUrl: "", termId: ATOM, levels: [], created: true, transactions: []};
        }) as Parameters<typeof writeLineChecked>[0]["write"];
        const steps = {config, isCategory: async (label: string) => label === "design" || label === "video", agent: () => agent, write};
        await writeLineChecked(steps, {...INPUT, domain: " Slides ", newDomain: {parent: "Design", why: "decks"}});
        await writeLineChecked(steps, {...INPUT, domain: "Video", newDomain: {parent: "design", why: "decks"}});
        expect(seen[0]).toMatchObject({domain: "slides", newDomain: {parent: "design", why: "decks"}});
        expect(seen[1]).toMatchObject({domain: "video"});
        expect(seen[1]).not.toHaveProperty("newDomain");
    });

    it("takes a word people use for a node, and names the closest nodes for an unknown one (task 84)", async () => {
        const {config, agent} = setup(() => ok);
        const seen: unknown[] = [];
        const write = (async (_c: unknown, _a: unknown, input: unknown) => {
            seen.push(input);
            return {toolUrl: "", termId: ATOM, levels: [], created: true, transactions: []};
        }) as Parameters<typeof writeLineChecked>[0]["write"];
        const resolve = async (word: string): Promise<DomainResolution> =>
            word === "slides"
                ? {status: "node", label: "presentation authoring", via: "alias"}
                : {status: "unknown", word, suggestions: ["presentation authoring", "video editing"]};
        const steps = {config, isCategory: async () => false, resolve, agent: () => agent, write};
        await writeLineChecked(steps, {...INPUT, domain: "Slides", newDomain: {parent: "design", why: "x"}});
        expect(seen[0]).toMatchObject({domain: "presentation authoring"});
        expect(seen[0]).not.toHaveProperty("newDomain");
        await expect(writeLineChecked(steps, {...INPUT, domain: "decks"})).rejects.toThrow("Closest: presentation authoring, video editing.");
    });

    it("makes no key when the sponsor does not answer", async () => {
        const {config} = setup(() => ok);
        let keys = 0;
        const down = {...config, fetch: (async () => {
            throw new TypeError("fetch failed");
        }) as unknown as typeof fetch};
        const steps = {config: down, isCategory: async () => true, agent: () => {
            keys += 1;
            throw new Error("no key in this test");
        }};
        await expect(writeLineChecked(steps, {...INPUT, domain: "video"})).rejects.toThrow("did not answer at http://sponsor");
        expect(keys).toBe(0);
    });

    it("asks for the key only once both checks pass", async () => {
        const {config, agent} = setup(() => ok);
        let keys = 0;
        const steps = {config, isCategory: async (label: string) => label === "video", agent: () => {
            keys += 1;
            return agent;
        }};
        await expect(writeLineChecked(steps, {...INPUT, domain: " Video "})).resolves.toMatchObject({termId: ATOM});
        expect(keys).toBe(1);
    });
});
