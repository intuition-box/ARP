import {spawn, spawnSync, type ChildProcess} from "node:child_process";
import {createServer, request as httpRequest, type Server} from "node:http";
import {existsSync, mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {hostedRefusal, loggable} from "../src/hosted.js";

/**
 * The hosted read-only endpoint (task 92, ADR `0161`).
 *
 * The wire half spawns the server, as `server.test.ts` does, and keeps everything it prints. The graph
 * stub answers every query with an error that quotes the query's variables, which real GraphQL servers
 * do: a caller's argument then travels inside an error message, the one place it could reach a log.
 * The same calls go to a server that is not hosted, which must print the argument, so the test can be
 * seen to catch a leak rather than pass on a capture that sees nothing.
 */
const PORT = 3110;
const STUB_PORT = PORT + 9;
const SERVER = new URL("../src/server.ts", import.meta.url).pathname;
const SCRATCH = mkdtempSync(join(tmpdir(), "arp-mcp-hosted-"));
const PUBLIC = "mcp.example.org";
const MULTI_VAULT = "0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91";

/** Arguments no log line has any reason to hold, so finding one in a log is a leak. */
const WORDS = "zebraquokka marmalade pangolin";
const ATOM = `0x${"feedface".repeat(8)}`;

const HOSTED_ENV = {
    ARP_HOSTED: "1",
    ARP_TOOLS: "read",
    ARP_TARGET: "testnet",
    ARP_PUBLIC_HOST: PUBLIC,
};

/** The environment a test run starts from, without anything the developer's shell may hold for ARP. */
function cleanEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [name, value] of Object.entries(process.env)) {
        if (value !== undefined && !name.startsWith("ARP_") && name !== "PORT") env[name] = value;
    }
    return env;
}

function serverEnv(port: number, extra: Record<string, string>): Record<string, string> {
    return {
        ...cleanEnv(),
        ARP_HOME: join(SCRATCH, String(port)),
        PORT: String(port),
        ARP_PULSE_SEARCH: "off",
        ARP_SKILLS_INDEX_URL: `http://127.0.0.1:${STUB_PORT}`,
        INTUITION_GRAPHQL_URL: `http://127.0.0.1:${STUB_PORT}/v1/graphql`,
        INTUITION_RPC_URL: `http://127.0.0.1:${STUB_PORT}/rpc`,
        ARP_MULTI_VAULT: MULTI_VAULT,
        ...extra,
    };
}

type Running = {child: ChildProcess; output: () => string; base: string};

async function start(port: number, extra: Record<string, string>): Promise<Running> {
    let printed = "";
    const child = spawn("bun", ["run", SERVER], {
        cwd: SCRATCH,
        env: serverEnv(port, extra),
        stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => (printed += chunk));
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => (printed += chunk));
    const base = `http://127.0.0.1:${port}/mcp`;
    for (let i = 0; i < 80; i += 1) {
        try {
            const ping = await fetch(base, {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: '{"jsonrpc":"2.0","id":0,"method":"ping"}',
            });
            if (ping.ok) return {child, output: () => printed, base};
        } catch {
            /* not up yet */
        }
        await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`the server on ${port} did not come up:\n${printed}`);
}

async function call(base: string, name: string, args: Record<string, unknown>) {
    const response = await fetch(base, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "tools/call", params: {name, arguments: args}}),
    });
    return JSON.stringify(await response.json());
}

/** Every call a search makes with words in it, through the read tools a hosted server serves. */
async function callsWithWords(base: string): Promise<string[]> {
    return [
        await call(base, "arp_pulse", {queries: [WORDS], constraints: {have_commands: [WORDS]}}),
        await call(base, "arp_tool_reputation", {tool_atom_id: ATOM, attested_by: WORDS}),
        await call(base, "arp_agent_endpoints", {agent: WORDS}),
    ];
}

let stub: Server | null = null;
let hosted: Running | null = null;
let local: Running | null = null;

beforeAll(async () => {
    stub = createServer((request, response) => {
        let body = "";
        request.on("data", (chunk) => (body += String(chunk)));
        request.on("end", () => {
            response.setHeader("content-type", "application/json");
            if (request.url?.startsWith("/api/search")) {
                response.end(JSON.stringify({skills: []}));
                return;
            }
            // A GraphQL error quoting the request's variables, and a JSON-RPC error quoting its params.
            let parsed: {variables?: unknown; params?: unknown; id?: unknown} = {};
            try {
                parsed = JSON.parse(body) as typeof parsed;
            } catch {
                /* an empty or non-JSON body is echoed as nothing */
            }
            response.end(
                request.url?.startsWith("/rpc")
                    ? JSON.stringify({jsonrpc: "2.0", id: parsed.id ?? null, error: {code: -32000, message: `bad params ${JSON.stringify(parsed.params)}`}})
                    : JSON.stringify({errors: [{message: `invalid variables ${JSON.stringify(parsed.variables)}`}]}),
            );
        });
    });
    await new Promise<void>((resolve) => stub?.listen(STUB_PORT, "127.0.0.1", () => resolve()));
    [hosted, local] = await Promise.all([
        start(PORT, HOSTED_ENV),
        start(PORT + 1, {ARP_TOOLS: "read", ARP_TARGET: "testnet", ARP_NO_RECEIPTS: "1"}),
    ]);
}, 30_000);

afterAll(async () => {
    hosted?.child.kill();
    local?.child.kill();
    await new Promise<void>((resolve) => (stub === null ? resolve() : stub.close(() => resolve())));
    rmSync(SCRATCH, {recursive: true, force: true});
});

describe("hostedRefusal", () => {
    const ok = {...HOSTED_ENV};

    it("accepts the read tools on testnet, with a public name and no key", () => {
        expect(hostedRefusal(ok)).toBeNull();
        expect(hostedRefusal({})).toBeNull();
    });

    it("refuses any tool set but read", () => {
        for (const tools of [undefined, "desktop", "sponsored", "all"]) {
            expect(hostedRefusal({...ok, ARP_TOOLS: tools})).toContain("ARP_TOOLS=read only");
        }
    });

    it("refuses any chain but testnet", () => {
        expect(hostedRefusal({...ok, ARP_TARGET: "mainnet"})).toContain("testnet 13579 only");
        expect(hostedRefusal({...ok, ARP_TARGET: undefined})).toContain("testnet 13579 only");
    });

    it("refuses a key, and private probes", () => {
        for (const name of ["ARP_RECEIPT_KEY", "ARP_AGENT_PRIVATE_KEY", "ARP_ALLOW_PRIVATE_PROBE"]) {
            expect(hostedRefusal({...ok, [name]: "1"})).toContain(`refuses ${name}`);
        }
    });

    it("needs a bare public name, and a public name needs hosting", () => {
        expect(hostedRefusal({...ok, ARP_PUBLIC_HOST: undefined})).toContain("needs ARP_PUBLIC_HOST");
        expect(hostedRefusal({...ok, ARP_PUBLIC_HOST: "https://mcp.example.org"})).toContain("bare host name");
        expect(hostedRefusal({ARP_PUBLIC_HOST: PUBLIC})).toContain("needs ARP_HOSTED=1");
        expect(hostedRefusal({...ok, ARP_HOSTED: "yes"})).toContain("must be 1 or unset");
    });

    it("refuses stdio", () => {
        expect(hostedRefusal({...ok, ARP_TRANSPORT: "stdio"})).toContain("serves HTTP");
    });
});

describe("loggable", () => {
    it("keeps an error's class only when hosted", () => {
        const error = new TypeError(`no such skill ${WORDS}`);
        expect(loggable(error, error.message, {ARP_HOSTED: "1"})).toBe("TypeError");
        expect(loggable(error, error.message, {})).toBe(error.message);
    });
});

describe("the hosted server", () => {
    it("logs none of a caller's arguments, while a local server shows the capture would see them", async () => {
        const answeredHosted = await callsWithWords(hosted!.base);
        const answeredLocal = await callsWithWords(local!.base);
        // Give stderr a moment to flush what the calls printed.
        await new Promise((r) => setTimeout(r, 300));

        // The control: the same calls, on a server that is not hosted, put an argument in its log.
        expect(local!.output()).toContain(ATOM.slice(2, 18));
        expect(local!.output()).toContain(WORDS);
        // The caller still gets its own error back, argument included.
        expect(answeredHosted.join("\n")).toContain(ATOM.slice(2, 18));
        expect(answeredLocal.length).toBe(3);

        const printed = hosted!.output();
        expect(printed).toContain("arp_tool_reputation failed");
        for (const word of [...WORDS.split(" "), ATOM.slice(2, 18)]) {
            expect(printed).not.toContain(word);
        }
    });

    it("writes no key under its home", () => {
        expect(existsSync(join(SCRATCH, String(PORT), "receipt-key"))).toBe(false);
        // The local server, which may sign receipts, was started with ARP_NO_RECEIPTS=1 and writes none either.
    });

    it("answers its public name and that name's https origin, and nothing else", async () => {
        const post = (headers: Record<string, string>) =>
            fetch(hosted!.base, {
                method: "POST",
                headers: {"content-type": "application/json", ...headers},
                body: '{"jsonrpc":"2.0","id":1,"method":"ping"}',
            }).then((r) => r.status);
        // `fetch` sets `Host` from the URL and will not let a caller replace it, so a raw request does.
        const withHost = (host: string, origin?: string) =>
            new Promise<number>((resolve, reject) => {
                const body = '{"jsonrpc":"2.0","id":1,"method":"ping"}';
                const request = httpRequest(
                    {
                        host: "127.0.0.1",
                        port: PORT,
                        method: "POST",
                        path: "/mcp",
                        headers: {host, "content-type": "application/json", "content-length": body.length, ...(origin ? {origin} : {})},
                    },
                    (response) => {
                        response.resume();
                        resolve(response.statusCode ?? 0);
                    },
                );
                request.on("error", reject);
                request.end(body);
            });
        expect(await post({})).toBe(200);
        expect(await withHost(PUBLIC)).toBe(200);
        expect(await withHost(PUBLIC, `https://${PUBLIC}`)).toBe(200);
        expect(await withHost(PUBLIC, "https://elsewhere.example")).toBe(403);
        expect(await withHost(`http://${PUBLIC}`)).toBe(403);
        expect(await withHost("elsewhere.example")).toBe(403);
    });

    it("lists the read tools only, and asks nothing about sharing", async () => {
        const listed = await fetch(hosted!.base, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
        }).then((r) => r.json() as Promise<{result: {tools: {name: string}[]}}>);
        expect(listed.result.tools.map((t) => t.name)).toEqual(["arp_pulse", "arp_tool_reputation", "arp_agent_endpoints"]);
        const init = await fetch(hosted!.base, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "initialize", params: {protocolVersion: "2025-06-18", capabilities: {}}}),
        }).then((r) => r.json() as Promise<{result: {instructions: string}}>);
        expect(init.result.instructions).toContain("LOOK HERE FIRST");
        expect(init.result.instructions).not.toContain("SHARING");
    });
});

describe("a refused hosted setting", () => {
    it("exits before it listens or makes a key", () => {
        const home = join(SCRATCH, "refused");
        for (const extra of [
            {ARP_TOOLS: "sponsored"},
            {ARP_TARGET: "mainnet"},
            {ARP_RECEIPT_KEY: `0x${"11".repeat(32)}`},
            {ARP_PUBLIC_HOST: ""},
        ]) {
            const run = spawnSync("bun", ["run", SERVER], {
                cwd: SCRATCH,
                env: {...serverEnv(PORT + 5, HOSTED_ENV), ARP_HOME: home, ...extra},
                encoding: "utf8",
                timeout: 15_000,
            });
            expect(run.status).toBe(1);
            expect(run.stderr).toContain("ARP_");
            expect(existsSync(join(home, "receipt-key"))).toBe(false);
        }
    });

    it("refuses --stdio", () => {
        const run = spawnSync("bun", ["run", SERVER, "--stdio"], {
            cwd: SCRATCH,
            env: serverEnv(PORT + 6, HOSTED_ENV),
            input: "",
            encoding: "utf8",
            timeout: 15_000,
        });
        expect(run.status).toBe(1);
        expect(run.stderr).toContain("serves HTTP");
    });
});
