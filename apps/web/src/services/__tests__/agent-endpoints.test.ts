import {afterEach, describe, expect, it, vi} from "vitest";

import {gatewayUrl, readAgentEndpoints, readRegistrationDocument} from "../agent-endpoints";

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {status, headers: {"content-type": "application/json"}});
const fetchOf = (response: Response | Error) =>
    vi.fn<typeof fetch>(async () => {
        if (response instanceof Error) throw response;
        return response;
    });
const neverFetch = () =>
    vi.fn<typeof fetch>(async () => {
        throw new Error("no request expected");
    });

describe("gatewayUrl", () => {
    it("routes an ipfs:// URI through a public gateway and leaves any other URL alone", () => {
        expect(gatewayUrl("ipfs://bafkrei")).toBe("https://ipfs.io/ipfs/bafkrei");
        expect(gatewayUrl("https://host/agent.json")).toBe("https://host/agent.json");
    });
});

describe("readRegistrationDocument", () => {
    it("an agent with no registration file, or a blank one, has none, and nothing is fetched", async () => {
        const fetchImpl = neverFetch();
        expect(await readRegistrationDocument(null, fetchImpl)).toEqual({status: "none"});
        expect(await readRegistrationDocument("   ", fetchImpl)).toEqual({status: "none"});
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("reads an inline document, base64 or percent-encoded, with no request", async () => {
        const fetchImpl = neverFetch();
        const base64 = `data:application/json;base64,${btoa('{"name":"a"}')}`;
        const plain = `data:application/json,${encodeURIComponent('{"name":"b"}')}`;
        expect(await readRegistrationDocument(base64, fetchImpl)).toEqual({
            status: "read",
            url: base64,
            document: {name: "a"},
        });
        expect(await readRegistrationDocument(plain, fetchImpl)).toMatchObject({
            document: {name: "b"},
        });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("an inline document that does not parse is unreadable, with no link to open", async () => {
        const read = await readRegistrationDocument("data:application/json,{nope", neverFetch());
        expect(read).toMatchObject({status: "unreadable", href: null});
        if (read.status !== "unreadable") throw new Error("expected unreadable");
        expect(read.detail).toMatch(/^the inline document did not parse: /);
    });

    it("fetches a hosted document through the gateway and asks for JSON", async () => {
        const fetchImpl = fetchOf(json({name: "hosted"}));
        const read = await readRegistrationDocument(" ipfs://bafk ", fetchImpl);
        expect(read).toEqual({status: "read", url: "ipfs://bafk", document: {name: "hosted"}});
        expect(fetchImpl).toHaveBeenCalledWith("https://ipfs.io/ipfs/bafk", {
            headers: {accept: "application/json"},
        });
    });

    it("a host that refuses is unreadable with its status and a link a reader can open", async () => {
        const read = await readRegistrationDocument(
            "https://host/agent.json",
            fetchOf(new Response("gone", {status: 404})),
        );
        expect(read).toEqual({
            status: "unreadable",
            url: "https://host/agent.json",
            href: "https://host/agent.json",
            detail: "the host answered 404",
        });
    });

    it("a request the browser cannot make says so, whatever was thrown", async () => {
        const failed = await readRegistrationDocument(
            "https://host/agent.json",
            fetchOf(new TypeError("Failed to fetch")),
        );
        expect(failed).toMatchObject({detail: "could not be read from a browser: Failed to fetch"});
        const odd = await readRegistrationDocument("https://host/agent.json", async () => {
            throw "blocked";
        });
        expect(odd).toMatchObject({detail: "could not be read from a browser: blocked"});
    });
});

describe("readAgentEndpoints", () => {
    it("tells 'published nothing' apart from 'declared no endpoint'", async () => {
        expect(await readAgentEndpoints(null, neverFetch())).toEqual({
            status: "none",
            reason: "no-registration-file",
        });
        expect(
            await readAgentEndpoints("https://host/a.json", fetchOf(json({services: []}))),
        ).toEqual({status: "none", reason: "no-endpoints-declared"});
    });

    it("passes an unreadable document through with its reason", async () => {
        const read = await readAgentEndpoints(
            "https://host/a.json",
            fetchOf(new Response("", {status: 500})),
        );
        expect(read).toMatchObject({status: "unreadable", detail: "the host answered 500"});
    });

    it("splits the declared endpoints into those a probe can check and those it cannot", async () => {
        const document = {
            services: [
                {name: "MCP", endpoint: "https://agent.example/mcp"},
                {name: "ENS", endpoint: "agent.eth"},
            ],
        };
        const read = await readAgentEndpoints("https://host/a.json", fetchOf(json(document)));
        if (read.status !== "read") throw new Error(`expected read, got ${read.status}`);
        expect(read.url).toBe("https://host/a.json");
        expect(read.probeable.map((endpoint) => endpoint.name)).toEqual(["MCP"]);
        expect(read.notCheckable.map((endpoint) => endpoint.name)).toEqual(["ENS"]);
    });
});

describe("with no fetch passed in", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reads through the browser's own fetch", async () => {
        const fetchImpl = fetchOf(json({services: []}));
        vi.stubGlobal("fetch", fetchImpl);
        expect(await readAgentEndpoints("https://host/a.json")).toEqual({
            status: "none",
            reason: "no-endpoints-declared",
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
