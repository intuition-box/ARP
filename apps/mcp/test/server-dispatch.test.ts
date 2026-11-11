import {existsSync, mkdtempSync, readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

/**
 * The server's one dispatch and its two transports, in process. `server.test.ts` drives a spawned
 * server over the wire; this file reaches the branches a spawned process cannot report coverage for,
 * and the modes (`read`, `desktop`, hosted) that are fixed at module load. The graph is a stubbed
 * `fetch`; the HTTP listener is the one thing replaced, so no port is bound.
 */
vi.setConfig({testTimeout: 30_000});

const MODE_KEYS = ["ARP_TOOLS", "ARP_HOSTED", "ARP_PUBLIC_HOST", "ARP_HOST", "ARP_ALLOWED_HOSTS", "ARP_SHARE", "ARP_TRANSPORT", "PORT"] as const;
const saved = new Map(MODE_KEYS.map((key) => [key, process.env[key]]));
let home: string;

const serveFetch = vi.fn(async () => undefined);

async function loadServer(env: Partial<Record<(typeof MODE_KEYS)[number], string>> = {}) {
    for (const key of MODE_KEYS) delete process.env[key];
    Object.assign(process.env, env);
    vi.resetModules();
    vi.doMock("@arp-protocol/core/node", async (original) => ({
        ...(await original<typeof import("@arp-protocol/core/node")>()),
        serveFetch,
    }));
    return import("../src/server.js");
}

const post = (body: unknown, raw = false) =>
    new Request("http://127.0.0.1:3002/", {method: "POST", headers: {"content-type": "application/json"}, body: raw ? String(body) : JSON.stringify(body)});
const rpc = async (server: Awaited<ReturnType<typeof loadServer>>, method: string, params?: unknown) =>
    (await (await server.handler.fetch(post({jsonrpc: "2.0", id: 7, method, params}))).json()) as {
        result?: Record<string, unknown>;
        error?: {code: number; message: string};
    }; // the JSON-RPC envelope
const call = (server: Awaited<ReturnType<typeof loadServer>>, name: unknown, args?: unknown) => rpc(server, "tools/call", {name, arguments: args});

beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "arp-server-home-"));
    process.env["ARP_HOME"] = home;
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
    serveFetch.mockClear();
    // No case reaches a real host: a read that gets this far fails as an unreachable network would.
    vi.stubGlobal("fetch", vi.fn(async () => {
        throw new Error("no network in this test");
    }));
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    delete process.env["ARP_HOME"];
});

describe("the dispatch, every tool served", () => {
    it("answers initialize with the full instructions, and lists every tool", async () => {
        const server = await loadServer();
        const init = await rpc(server, "initialize", {capabilities: {}});
        expect(init.result).toMatchObject({protocolVersion: "2025-06-18", serverInfo: {name: "ARP"}});
        expect(String(init.result?.["instructions"])).toMatch(/^ARP is a public pulse/);
        const names = ((await rpc(server, "tools/list")).result?.["tools"] as {name: string}[]).map((tool) => tool.name);
        expect(names).toEqual(expect.arrayContaining(["arp_declare_used", "arp_stake_on_used", "arp_pulse"]));
        expect(await rpc(server, "ping")).toMatchObject({result: {}});
    });

    it("refuses what is not a request, and names what it does not know", async () => {
        const server = await loadServer();
        const bad = async (body: unknown, raw = false) => (await (await server.handler.fetch(post(body, raw))).json()) as {error: {code: number}};
        expect((await bad("{not json", true)).error.code).toBe(-32700);
        expect((await bad(null)).error.code).toBe(-32600);
        expect((await bad([1])).error.code).toBe(-32600);
        expect((await bad(4)).error.code).toBe(-32600);
        expect(await rpc(server, "resources/list")).toMatchObject({error: {code: -32601, message: "method not found: resources/list"}});
        expect(await call(server, "arp_nothing")).toMatchObject({error: {code: -32602, message: "unknown tool: arp_nothing"}});
        expect(await call(server, 42)).toMatchObject({error: {code: -32602, message: "unknown tool: null"}});
        expect((await server.handler.fetch(new Request("http://127.0.0.1:3002/", {method: "PUT"}))).status).toBe(405);
    });

    it("keeps a string or a number id, and answers null for any other", async () => {
        const server = await loadServer();
        const idOf = async (id: unknown) => ((await (await server.handler.fetch(post({jsonrpc: "2.0", id, method: "ping"}))).json()) as {id: unknown}).id;
        expect(await idOf("a")).toBe("a");
        expect(await idOf(3)).toBe(3);
        expect(await idOf({x: 1})).toBeNull();
    });

    it("takes a notification with no body", async () => {
        const server = await loadServer();
        const response = await server.handler.fetch(post({jsonrpc: "2.0", method: "notifications/initialized"}));
        expect(response.status).toBe(202);
        expect(await response.text()).toBe("");
    });

    it.each([
        ["arp_tool_reputation", "tool_atom_id must be"],
        ["arp_declare_used", "agent_chain_id must be a positive integer"],
        ["arp_propose_category", "request must be"],
        ["arp_stake_on_used", "receiver must be"],
        ["arp_take_position", "term_id must be"],
        ["arp_exit_position", "term_id must be"],
        ["arp_identity", "agent_chain_id must be a positive integer"],
        ["arp_agent_endpoints", "agent_chain_id must be a positive integer"],
        ["arp_probe_endpoint", "url must be an http or https address"],
        ["arp_find_agents", "order must be"],
        ["arp_record_reachable", "url must be an http or https address"],
        ["arp_find_tools", "order must be"],
        ["arp_pulse", "pass `queries`"],
        ["arp_declare_session", "agent_chain_id must be a positive integer"],
    ])("routes %s to its handler", async (name, message) => {
        const server = await loadServer();
        // An argument no handler accepts, so each answers with its own refusal and reads nothing.
        const args = name === "arp_find_tools" ? {order: "x"} : name === "arp_pulse" ? {} : name === "arp_find_agents" ? {order: "x"} : {agent_chain_id: "x", url: 4, term_id: 1};
        const answer = await call(server, name, args);
        expect(answer.error?.code).toBe(-32602);
        expect(answer.error?.message).toContain(message);
    });

    it("treats arguments that are not an object as none", async () => {
        const server = await loadServer();
        expect((await call(server, "arp_tool_reputation", [1, 2])).error?.message).toContain("tool_atom_id must be");
    });

    it("turns a handler's failure into a redacted internal error, and says which tool failed", async () => {
        const server = await loadServer();
        vi.stubGlobal("fetch", vi.fn(async () => {
            throw new Error("connect refused https://key-123@graph.example/v1/graphql?apikey=secret");
        }));
        const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        const answer = await call(server, "arp_tool_reputation", {tool_atom_id: `0x${"ab".repeat(32)}`});
        expect(answer.error?.code).toBe(-32603);
        expect(answer.error?.message).toMatch(/^arp_tool_reputation failed: /);
        expect(answer.error?.message).not.toContain("secret");
        expect(String(stderr.mock.calls[0]?.[0])).toMatch(/^arp_tool_reputation failed: /);
    });

    it("serves an info document and the content route on GET", async () => {
        const server = await loadServer();
        const info = (await (await server.handler.fetch(new Request("http://127.0.0.1:3002/"))).json()) as Record<string, Record<string, unknown>>;
        expect(info["chain"]).toMatchObject({id: 13579});
        expect(info["content"]).toMatchObject({route: "/content/:atomId", signer: null, attests: "access, never use"});
        expect((info["content"]?.["catalogued_skills"] as number) > 0).toBe(true);
        const content = await server.handler.fetch(new Request("http://127.0.0.1:3002/content/0x12/"));
        expect(content.status).toBe(400);
        expect(((await content.json()) as {error: string}).error).toBe("bad-atom-id");
    });
});

describe("who the HTTP transport answers", () => {
    it("names the loopback by default, and adds a bound address and allowed hosts", async () => {
        const {httpPolicy} = await loadServer();
        expect(httpPolicy({}).hosts).toEqual(expect.arrayContaining(["127.0.0.1:3002", "localhost:3002"]));
        const wide = httpPolicy({ARP_HOST: "0.0.0.0", ARP_ALLOWED_HOSTS: " a.test:3002 , ,b.test "});
        expect(wide.hosts).not.toContain("0.0.0.0:3002");
        expect(wide.hosts).toEqual(expect.arrayContaining(["a.test:3002", "b.test"]));
        expect(wide.origins).toContain("http://a.test:3002");
        expect(httpPolicy({ARP_HOST: "10.0.0.2"}).hosts).toContain("10.0.0.2:3002");
        expect(httpPolicy({ARP_HOST: "fe80::1"}).hosts).toContain("[fe80::1]:3002");
        const hosted = httpPolicy({ARP_PUBLIC_HOST: "MCP.Example.org"});
        expect(hosted.hosts).toContain("mcp.example.org");
        expect(hosted.origins).toContain("https://mcp.example.org");
    });

    it("refuses a foreign Host before the dispatch, and passes its own", async () => {
        const {httpFetch} = await loadServer();
        const foreign = await httpFetch(new Request("http://evil.test/", {headers: {host: "evil.test"}}));
        expect(foreign.status).toBe(403);
        const own = await httpFetch(new Request("http://127.0.0.1:3002/", {method: "POST", headers: {host: "127.0.0.1:3002", "content-type": "application/json"}, body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "ping"})}));
        expect(await own.json()).toMatchObject({result: {}});
    });
});

describe("main", () => {
    const exits = () =>
        vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
            throw new Error(`exit ${String(code)}`);
        });
    const quiet = () => vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    async function* lines(...items: string[]) {
        for (const item of items) yield `${item}\n`;
    }

    it("serves stdio: one answer per request, nothing for a notification, then exits 0", async () => {
        const server = await loadServer();
        exits();
        const log = quiet();
        const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        await expect(
            server.main(["bun", "server.ts", "--stdio"], lines(JSON.stringify({jsonrpc: "2.0", id: 1, method: "ping"}), JSON.stringify({jsonrpc: "2.0", method: "notifications/initialized"}), "{broken")),
        ).rejects.toThrow("exit 0");
        const written = out.mock.calls.map(([chunk]) => JSON.parse(String(chunk)) as {id: unknown; result?: unknown; error?: {code: number}});
        expect(written).toEqual([{jsonrpc: "2.0", id: 1, result: {}}, {jsonrpc: "2.0", id: null, error: {code: -32700, message: "parse error"}}]);
        expect(log.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("ARP MCP server — stdio");
    });

    it("waits for stdout to drain before the next line", async () => {
        const server = await loadServer({ARP_TRANSPORT: "stdio"});
        exits();
        quiet();
        vi.spyOn(process.stdout, "write").mockImplementation(() => {
            setTimeout(() => process.stdout.emit("drain"), 0);
            return false;
        });
        await expect(server.main(["bun"], lines(JSON.stringify({jsonrpc: "2.0", id: 1, method: "ping"})))).rejects.toThrow("exit 0");
    });

    it("listens on HTTP, loopback only, and says what it serves", async () => {
        const server = await loadServer();
        const log = quiet();
        await server.main(["bun", "server.ts"]);
        expect(serveFetch).toHaveBeenCalledWith({port: 3002, hostname: "127.0.0.1", maxBodyBytes: 1024 * 1024}, server.httpFetch);
        const printed = log.mock.calls.map(([chunk]) => String(chunk)).join("");
        expect(printed).toContain("loopback only");
        expect(printed).toContain("receipts:   none — ARP_NO_RECEIPTS=1");
        expect(printed).not.toContain("hosted:");
    });

    it("says so loudly when it is open to the network", async () => {
        const server = await loadServer({ARP_HOST: "0.0.0.0"});
        const log = quiet();
        await server.main(["bun"]);
        expect(log.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("OPEN TO THE NETWORK");
    });

    it("prints the receipt signer when it has one", async () => {
        delete process.env["ARP_NO_RECEIPTS"];
        const server = await loadServer();
        const log = quiet();
        await server.main(["bun"]);
        const printed = log.mock.calls.map(([chunk]) => String(chunk)).join("");
        expect(printed).toMatch(/receipts: {3}signed by 0x[0-9a-fA-F]{40}/);
        expect(printed).toContain("cannot move value");
        expect(existsSync(join(home, "receipt-key"))).toBe(true);
    });
});

describe("the read-only mode", () => {
    it("serves the registry reads only, with instructions that never mention a chain", async () => {
        const server = await loadServer({ARP_TOOLS: "read"});
        const init = await rpc(server, "initialize");
        expect(String(init.result?.["instructions"])).toMatch(/^ARP is a public registry/);
        const names = ((await rpc(server, "tools/list")).result?.["tools"] as {name: string}[]).map((tool) => tool.name);
        expect(names).not.toContain("arp_declare_used");
        expect(await call(server, "arp_declare_used", {})).toMatchObject({error: {code: -32602, message: "unknown tool: arp_declare_used"}});
        const log = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        await server.main(["bun"]);
        expect(log.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("(ARP_TOOLS=read)");
    });
});

describe("the sponsored mode", () => {
    it("routes the loop's tools to the local agent, and writes the extension's sharing answer at initialize", async () => {
        const server = await loadServer({ARP_TOOLS: "desktop", ARP_SHARE: "true"});
        const init = await rpc(server, "initialize");
        expect(String(init.result?.["instructions"])).toContain("TO USE A SKILL YOU FOUND, call arp_get_skill");
        expect(JSON.parse(readFileSync(join(home, "sharing.json"), "utf8"))).toMatchObject({failures: true, how: "desktop"});
        expect(await call(server, "arp_get_skill", {id: "nope"})).toMatchObject({error: {code: -32602, message: expect.stringContaining("id must be")}});
    });

    it("refuses to listen on HTTP, where anything on the port could spend its identity", async () => {
        const server = await loadServer({ARP_TOOLS: "sponsored"});
        vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
            throw new Error(`exit ${String(code)}`);
        });
        const log = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        await expect(server.main(["bun"])).rejects.toThrow("exit 1");
        expect(log.mock.calls.map(([chunk]) => String(chunk)).join("")).toContain("runs over stdio only");
        expect(serveFetch).not.toHaveBeenCalled();
    });
});

describe("the hosted mode", () => {
    const HOSTED = {ARP_HOSTED: "1", ARP_TOOLS: "read", ARP_PUBLIC_HOST: "mcp.example.org"};

    it("holds no key, logs no argument, and refuses stdio", async () => {
        delete process.env["ARP_NO_RECEIPTS"];
        const server = await loadServer(HOSTED);
        const init = await rpc(server, "initialize");
        expect(String(init.result?.["instructions"])).toMatch(/^ARP is a public registry/);
        const log = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        await server.main(["bun"]);
        const printed = log.mock.calls.map(([chunk]) => String(chunk)).join("");
        expect(printed).toContain("hosted:     answers mcp.example.org");
        expect(printed).toContain("receipts:   none — hosted, no key");
        vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
            throw new Error(`exit ${String(code)}`);
        });
        await expect(server.main(["bun", "--stdio"])).rejects.toThrow("exit 1");
    });

    it("keeps only the error's class in its log line, while the caller still gets the message", async () => {
        const server = await loadServer(HOSTED);
        vi.stubGlobal("fetch", vi.fn(async () => {
            throw new TypeError("the caller's words");
        }));
        const log = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        const answer = await call(server, "arp_tool_reputation", {tool_atom_id: `0x${"ab".repeat(32)}`});
        expect(answer.error?.message).toContain("arp_tool_reputation failed");
        expect(String(log.mock.calls[0]?.[0])).not.toContain("the caller's words");
    });
});
