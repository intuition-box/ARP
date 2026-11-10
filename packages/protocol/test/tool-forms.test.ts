import {describe, expect, it} from "vitest";

import {
    isA2aCard,
    isMcpAnswer,
    isMcpSseAnswer,
    isX402Answer,
    manifestForm,
    MAX_MANIFEST_READS,
    repositoryForms,
} from "../src/sponsor/tool-forms.js";

const none = () => null;
const headers = (record: Record<string, string>) => (name: string) => record[name] ?? null;
const base64 = (value: unknown) => btoa(JSON.stringify(value));

describe("repositoryForms", () => {
    it("finds a SKILL.md at any depth, in any case", () => {
        expect(repositoryForms(["README.md", "skills/a/SKILL.md"]).forms).toEqual(["skill"]);
        expect(repositoryForms(["Skill.md"]).forms).toEqual(["skill"]);
    });

    it("finds a Claude plugin or marketplace, at any depth, and a root Gemini extension", () => {
        expect(repositoryForms([".claude-plugin/plugin.json"]).forms).toEqual(["claude-plugin"]);
        expect(repositoryForms(["plugins/x/.claude-plugin/marketplace.json"]).forms).toEqual([
            "claude-plugin",
        ]);
        expect(repositoryForms(["gemini-extension.json"]).forms).toEqual(["gemini-extension"]);
        expect(repositoryForms(["docs/gemini-extension.json"]).forms).toEqual([]);
        expect(repositoryForms([".cursor-plugin/plugin.json", "plugin.json"]).forms).toEqual([]);
    });

    it("names the manifests to read when the names show nothing: server.json shallowest first, then root manifests", () => {
        const {forms, toRead} = repositoryForms([
            "a/b/c/server.json",
            "server.json",
            "x/server.json",
            "package.json",
            "sub/package.json",
            "go.mod",
            "pyproject.toml",
        ]);
        expect(forms).toEqual([]);
        expect(toRead).toEqual(["server.json", "x/server.json", "package.json", "pyproject.toml"]);
        expect(toRead.length).toBeLessThanOrEqual(MAX_MANIFEST_READS);
    });

    it("holds nothing to read in a repository of plain code", () => {
        expect(repositoryForms(["src/index.ts", "README.md", "sub/package.json"])).toEqual({
            forms: [],
            toRead: [],
        });
    });
});

describe("manifestForm", () => {
    it("accepts a server.json only under the official registry's schema", () => {
        const schema = "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";
        expect(manifestForm("server.json", JSON.stringify({$schema: schema, name: "a"}))).toBe(
            "mcp-registry",
        );
        expect(manifestForm("deep/server.json", JSON.stringify({$schema: schema}))).toBe("mcp-registry");
        expect(manifestForm("server.json", JSON.stringify({port: 8080}))).toBeNull();
        expect(manifestForm("server.json", JSON.stringify({$schema: "https://evil.example/schemas/"}))).toBeNull();
        expect(manifestForm("server.json", "not json")).toBeNull();
    });

    it("accepts a package.json that depends on an MCP SDK, or names its registry entry", () => {
        expect(
            manifestForm("package.json", JSON.stringify({dependencies: {"@modelcontextprotocol/sdk": "^1"}})),
        ).toBe("mcp-package");
        expect(manifestForm("package.json", JSON.stringify({peerDependencies: {fastmcp: "^3"}}))).toBe(
            "mcp-package",
        );
        expect(manifestForm("package.json", JSON.stringify({mcpName: "io.github.a/b"}))).toBe("mcp-package");
        // A test or build tool is not what the package is.
        expect(
            manifestForm("package.json", JSON.stringify({devDependencies: {"@modelcontextprotocol/sdk": "^1"}})),
        ).toBeNull();
        expect(manifestForm("package.json", JSON.stringify({keywords: ["mcp"]}))).toBeNull();
        expect(manifestForm("sub/package.json", JSON.stringify({mcpName: "x"}))).toBeNull();
    });

    it("accepts a pyproject.toml that depends on mcp or fastmcp, and not one that only says the word", () => {
        const pep621 = '[project]\nname = "x"\ndependencies = [\n  "httpx>=0.27",\n  "mcp[cli]>=1.2.0",\n]\n';
        expect(manifestForm("pyproject.toml", pep621)).toBe("mcp-package");
        expect(manifestForm("pyproject.toml", '[project]\ndependencies = ["fastmcp>=2"]\n')).toBe("mcp-package");
        const poetry = '[tool.poetry.dependencies]\npython = "^3.11"\nmcp = {version = "^1", extras = ["cli"]}\n';
        expect(manifestForm("pyproject.toml", poetry)).toBe("mcp-package");
        const keywords = '[project]\nname = "mcp-helper"\nkeywords = ["mcp"]\ndependencies = [\n  "requests",\n]\n';
        expect(manifestForm("pyproject.toml", keywords)).toBeNull();
        const after = '[project]\ndependencies = [\n  "requests",\n]\n[tool.x]\nitems = ["mcp"]\n';
        expect(manifestForm("pyproject.toml", after)).toBeNull();
    });

    it("accepts a go.mod that requires an MCP SDK", () => {
        expect(
            manifestForm("go.mod", "module x\n\nrequire (\n\tgithub.com/mark3labs/mcp-go v0.32.0\n)\n"),
        ).toBe("mcp-package");
        expect(
            manifestForm("go.mod", "module x\nrequire github.com/modelcontextprotocol/go-sdk v1.0.0\n"),
        ).toBe("mcp-package");
        expect(manifestForm("go.mod", "module github.com/mark3labs/mcp-go-fork\n")).toBeNull();
    });
});

describe("isMcpAnswer", () => {
    const result = {jsonrpc: "2.0", id: 1, result: {protocolVersion: "2025-06-18", serverInfo: {name: "x"}}};

    it("accepts a JSON-RPC result to initialize, as JSON or as one server-sent event", () => {
        expect(isMcpAnswer(200, none, JSON.stringify(result))).toBe(true);
        expect(isMcpAnswer(200, none, `event: message\ndata: ${JSON.stringify(result)}\n\n`)).toBe(true);
    });

    it("accepts a 401 that points at protected-resource metadata, and no other 401", () => {
        const auth = headers({"www-authenticate": 'Bearer resource_metadata="https://x/.well-known/oauth-protected-resource"'});
        expect(isMcpAnswer(401, auth, "")).toBe(true);
        expect(isMcpAnswer(401, headers({"www-authenticate": "Bearer"}), "")).toBe(false);
    });

    it("refuses a JSON-RPC error, a web page, and a server error", () => {
        expect(isMcpAnswer(200, none, JSON.stringify({jsonrpc: "2.0", id: 1, error: {code: -32601}}))).toBe(false);
        expect(isMcpAnswer(200, none, "<html></html>")).toBe(false);
        expect(isMcpAnswer(500, none, JSON.stringify(result))).toBe(false);
    });
});

describe("isMcpSseAnswer", () => {
    it("accepts the older transport's event stream that opens with an endpoint event", () => {
        const sse = headers({"content-type": "text/event-stream; charset=utf-8"});
        expect(isMcpSseAnswer(200, sse, "event: endpoint\ndata: /messages?session=1\n\n")).toBe(true);
        expect(isMcpSseAnswer(200, sse, "event: message\ndata: {}\n\n")).toBe(false);
        expect(isMcpSseAnswer(200, headers({"content-type": "text/plain"}), "event: endpoint\n")).toBe(false);
    });
});

describe("isA2aCard", () => {
    it("accepts a card with a name and a skills list", () => {
        expect(isA2aCard(200, JSON.stringify({name: "agent", skills: [], capabilities: {}}))).toBe(true);
    });

    it("refuses anything else", () => {
        expect(isA2aCard(200, JSON.stringify({name: "agent"}))).toBe(false);
        expect(isA2aCard(200, JSON.stringify({name: " ", skills: []}))).toBe(false);
        expect(isA2aCard(404, JSON.stringify({name: "agent", skills: []}))).toBe(false);
        expect(isA2aCard(200, "<html>")).toBe(false);
    });
});

describe("isX402Answer", () => {
    const offer = {scheme: "exact", network: "eip155:84532", asset: "0xA", amount: "1000", payTo: "0xB"};
    const required = {x402Version: 2, resource: {url: "https://x"}, accepts: [offer]};

    it("accepts a 402 whose PAYMENT-REQUIRED header decodes to payment requirements (v2)", () => {
        expect(isX402Answer(402, headers({"payment-required": base64(required)}), "")).toBe(true);
    });

    it("accepts a v1 402 whose body is the requirements", () => {
        expect(isX402Answer(402, none, JSON.stringify({x402Version: 1, accepts: [offer]}))).toBe(true);
    });

    it("refuses a 402 without requirements, a bad header, an empty offer list, and any other status", () => {
        expect(isX402Answer(402, none, "Payment required")).toBe(false);
        expect(isX402Answer(402, headers({"payment-required": "%%%"}), JSON.stringify(required))).toBe(false);
        expect(isX402Answer(402, none, JSON.stringify({x402Version: 2, accepts: []}))).toBe(false);
        expect(isX402Answer(402, none, JSON.stringify({x402Version: 2, accepts: [{scheme: "exact"}]}))).toBe(false);
        expect(isX402Answer(200, headers({"payment-required": base64(required)}), "")).toBe(false);
    });
});
