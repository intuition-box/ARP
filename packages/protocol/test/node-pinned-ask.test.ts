import {createServer, type Server} from "node:http";
import {setDefaultAutoSelectFamily, type AddressInfo} from "node:net";

import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {pinnedAsk, Refused, type PinnedAskOptions} from "../src/node/index.js";

/** A local server standing in for a stranger's: reached only with `allowPrivate`. */
let server: Server;
let port = 0;
const hits: string[] = [];
beforeAll(async () => {
    server = createServer((request, response) => {
        hits.push(`${request.method} ${request.url} ${request.headers.host} ${request.headers["user-agent"]}`);
        if (request.url === "/mcp") {
            response.setHeader("content-type", "application/json");
            response.setHeader("set-cookie", ["a=1", "b=2"]);
            response.end('{"jsonrpc":"2.0","id":1,"result":{}}');
        } else if (request.url === "/moved") {
            response.writeHead(302, {location: "http://169.254.169.254/"});
            response.end();
        } else if (request.url === "/big") {
            response.end("x".repeat(200_000));
        } else if (request.url === "/sse") {
            response.writeHead(200, {"content-type": "text/event-stream"});
            response.write("data: first\n\n");
        } else if (request.url === "/silent") {
            // Never answers: the deadline is all that ends it.
        } else {
            response.end("page");
        }
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    port = (server.address() as AddressInfo).port;
});
afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
});

const local = (path: string) => `http://pinned.test:${port}${path}`;
const toLoopback = async () => [{address: "127.0.0.1", family: 4}];
const ask = (options: Partial<PinnedAskOptions>) =>
    pinnedAsk({allowPrivate: true, timeoutMs: 2_000, maxBytes: 64 * 1024, userAgent: "arp-test", ...options});
const rejection = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => error);

describe("pinnedAsk", () => {
    it("connects to the address it resolved, sends the body, and reads status, headers and body", async () => {
        const answer = await ask({resolve: toLoopback})(local("/mcp"), {method: "POST", headers: {}, body: "{}"});
        expect(answer.status).toBe(200);
        expect(answer.header("Content-Type")).toBe("application/json");
        expect(answer.header("set-cookie")).toBe("a=1, b=2");
        expect(answer.header("absent")).toBeNull();
        expect(answer.body).toContain('"result"');
        expect(hits.at(-1)).toBe(`POST /mcp pinned.test:${port} arp-test`);
    });

    it("refuses a name that resolves to a private address, before connecting", async () => {
        const before = hits.length;
        const error = await rejection(ask({allowPrivate: false, resolve: toLoopback})(local("/mcp"), {method: "GET", headers: {}}));
        expect(error).toBeInstanceOf(Refused);
        expect((error as Refused).rule).toBe("private-address");
        expect(hits.length).toBe(before);
    });

    it("refuses a literal private address without a lookup, and a scheme that is not http", async () => {
        let looked = 0;
        const guarded = ask({
            allowPrivate: false,
            resolve: async () => {
                looked += 1;
                return [{address: "93.184.216.34", family: 4}];
            },
        });
        for (const url of [`http://127.0.0.1:${port}/`, "http://169.254.169.254/", "http://[::1]/", "http://x.internal/"]) {
            expect(((await rejection(guarded(url, {method: "GET", headers: {}}))) as Refused).rule).toBe("private-address");
        }
        expect(looked).toBe(0);
        expect(((await rejection(guarded("file:///etc/passwd", {method: "GET", headers: {}}))) as Refused).rule).toBe(
            "not-a-tool",
        );
    });

    it("follows no redirect, and caps the body", async () => {
        const open = ask({resolve: toLoopback, maxBytes: 1_000});
        expect((await open(local("/moved"), {method: "GET", headers: {}})).status).toBe(302);
        expect((await open(local("/big"), {method: "GET", headers: {}})).body).toHaveLength(1_000);
    });

    it("keeps what a stream sent by the deadline, and fails one that sent nothing", async () => {
        const quick = ask({resolve: toLoopback, timeoutMs: 300});
        expect((await quick(local("/sse"), {method: "GET", headers: {}})).body).toBe("data: first\n\n");
        const error = await rejection(quick(local("/silent"), {method: "GET", headers: {}}));
        expect(String(error)).toContain("no answer within 300 ms");
    });

    it("fails a name with no address, and a lookup that fails", async () => {
        const none = await rejection(ask({resolve: async () => []})(local("/"), {method: "GET", headers: {}}));
        expect(String(none)).toContain("has no address");
        const broken = await rejection(
            ask({resolve: async () => Promise.reject(new Error("ENOTFOUND"))})(local("/"), {method: "GET", headers: {}}),
        );
        expect(String(broken)).toContain("ENOTFOUND");
        const thrown = await rejection(
            ask({
                resolve: async () => {
                    throw "not an error";
                },
            })(local("/"), {method: "GET", headers: {}}),
        );
        expect(String(thrown)).toContain("not an error");
    });

    it("answers a single-address lookup too, as Node asks without family autoselection", async () => {
        setDefaultAutoSelectFamily(false);
        try {
            expect((await ask({resolve: toLoopback})(local("/mcp"), {method: "GET", headers: {}})).status).toBe(200);
        } finally {
            setDefaultAutoSelectFamily(true);
        }
    });

    it("speaks TLS to an https URL, and fails when the far end does not", async () => {
        const error = await rejection(ask({resolve: toLoopback})(`https://pinned.test:${port}/`, {method: "GET", headers: {}}));
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(Refused);
    });

    it("fails a name the system resolver does not know", async () => {
        const error = await rejection(ask({})("http://nothing-here.invalid/", {method: "GET", headers: {}}));
        expect(String(error)).toMatch(/ENOTFOUND|EAI_AGAIN/);
    });

    it("resolves with the system resolver when given none", async () => {
        const answer = await ask({})(`http://localhost:${port}/mcp`, {method: "GET", headers: {}});
        expect(answer.status).toBe(200);
    });
});
