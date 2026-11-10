/**
 * What `POST /list-tool` accepts as a tool (task 94, ADR `0163`): the forms a runtime loads, read
 * from a repository's file list or from an endpoint's answer. Pure: the fetching is the caller's
 * (`apps/sponsor/src/admit-tool.ts`).
 *
 * The rule was drawn from the catalogue's 53 repositories (`data/catalogue/tools.json`), measured
 * by `scripts/measure/tool-forms.ts`; ADR `0163` holds the result and why each form is in.
 */

/** A form ARP accepts, and the one it found first. */
export type ToolForm =
    /** A `SKILL.md` at any depth: what a skills runtime loads. */
    | "skill"
    /** `.claude-plugin/plugin.json` or `.claude-plugin/marketplace.json`, at any depth. */
    | "claude-plugin"
    /** `gemini-extension.json` at the repository root. */
    | "gemini-extension"
    /** A `server.json` whose `$schema` is the official MCP registry's. */
    | "mcp-registry"
    /** A root `package.json`, `pyproject.toml` or `go.mod` depending on an MCP SDK. */
    | "mcp-package"
    /** An endpoint that answered MCP `initialize`, or asked for MCP authorisation. */
    | "mcp-endpoint"
    /** An A2A agent card. */
    | "a2a-card"
    /** An x402 `402` carrying payment requirements. */
    | "x402";

/** Why a listing was refused. Stable: callers branch on it. */
export type ToolRefusalRule =
    /** It was reached, and holds or answers nothing a runtime loads. */
    | "not-a-tool"
    /** It could not be reached: a timeout, a refused connection, a failed name. */
    | "unreachable"
    /** It names or resolves to a private, loopback or link-local address. */
    | "private-address";

/** The official MCP registry's schemas, every version: `https://static.modelcontextprotocol.io/schemas/<date>/server.schema.json`. */
export const MCP_REGISTRY_SCHEMA_PREFIX = "https://static.modelcontextprotocol.io/schemas/";

/** The packages that make a project an MCP server, by ecosystem. */
const NPM_MCP_PACKAGES = new Set(["@modelcontextprotocol/sdk", "fastmcp"]);
const PYTHON_MCP_PACKAGES = new Set(["mcp", "fastmcp"]);
const GO_MCP_MODULES = ["github.com/modelcontextprotocol/go-sdk", "github.com/mark3labs/mcp-go"];

/** At most this many manifests are read per repository, so one check is a bounded number of requests. */
export const MAX_MANIFEST_READS = 4;

const basename = (path: string) => path.split("/").pop() ?? "";

/**
 * The forms a repository's file list shows by name alone, and the manifests to read when it shows
 * none. `paths` is every blob path in the tree.
 */
export function repositoryForms(paths: readonly string[]): {forms: ToolForm[]; toRead: string[]} {
    const forms = new Set<ToolForm>();
    for (const path of paths) {
        if (basename(path).toLowerCase() === "skill.md") forms.add("skill");
        if (/(^|\/)\.claude-plugin\/(plugin|marketplace)\.json$/.test(path)) forms.add("claude-plugin");
        if (path === "gemini-extension.json") forms.add("gemini-extension");
    }
    const depth = (path: string) => path.split("/").length;
    const serverJson = paths
        .filter((path) => basename(path) === "server.json")
        .sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))
        .slice(0, 2);
    const roots = ["package.json", "pyproject.toml", "go.mod"].filter((name) => paths.includes(name));
    return {forms: [...forms], toRead: [...serverJson, ...roots].slice(0, MAX_MANIFEST_READS)};
}

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Whether a root `pyproject.toml` depends on `mcp` or `fastmcp`, in PEP 621's array or Poetry's table. */
function pythonDependsOnMcp(text: string): boolean {
    const nameOf = (spec: string) =>
        (/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(spec)?.[1] ?? "").toLowerCase().replace(/_/g, "-");
    const strings = /"[^"]*"|'[^']*'/g;
    // Brackets still open in `[project] dependencies = [...]`; 0 when outside it.
    let depth = 0;
    let inPoetry = false;
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (depth === 0) {
            if (line.startsWith("[")) {
                inPoetry = /^\[tool\.poetry\.dependencies\]/.test(line);
                continue;
            }
            if (inPoetry) {
                if (PYTHON_MCP_PACKAGES.has(nameOf(line)) && /^[A-Za-z0-9._-]+\s*=/.test(line))
                    return true;
                continue;
            }
            if (!/^dependencies\s*=\s*\[/.test(line)) continue;
        }
        for (const match of line.matchAll(strings)) {
            if (PYTHON_MCP_PACKAGES.has(nameOf(match[0].slice(1, -1)))) return true;
        }
        // `mcp[cli]` sits inside a string, so brackets are counted with the strings taken out.
        const bare = line.replace(strings, "").replace(/#.*$/, "");
        depth += (bare.match(/\[/g) ?? []).length - (bare.match(/\]/g) ?? []).length;
        if (depth < 0) depth = 0;
    }
    return false;
}

/** The form a manifest declares, read from its text, or `null`. `path` is where it sits in the tree. */
export function manifestForm(path: string, text: string): ToolForm | null {
    const name = basename(path);
    if (name === "server.json") {
        const parsed = parseJson(text);
        const schema = isRecord(parsed) ? parsed["$schema"] : null;
        return typeof schema === "string" && schema.startsWith(MCP_REGISTRY_SCHEMA_PREFIX)
            ? "mcp-registry"
            : null;
    }
    if (path === "package.json") {
        const parsed = parseJson(text);
        if (!isRecord(parsed)) return null;
        // `mcpName` is what the official registry reads to tie an npm package to a server.
        if (typeof parsed["mcpName"] === "string") return "mcp-package";
        for (const field of ["dependencies", "peerDependencies"]) {
            const deps = parsed[field];
            if (isRecord(deps) && Object.keys(deps).some((dep) => NPM_MCP_PACKAGES.has(dep)))
                return "mcp-package";
        }
        return null;
    }
    if (path === "pyproject.toml") return pythonDependsOnMcp(text) ? "mcp-package" : null;
    if (path === "go.mod") {
        const requires = text
            .split("\n")
            .map((line) => line.replace(/\/\/.*$/, "").trim().replace(/^require\s+/, ""));
        return requires.some((line) => GO_MCP_MODULES.some((module) => line.startsWith(`${module} `)))
            ? "mcp-package"
            : null;
    }
    return null;
}

/** An MCP streamable-HTTP answer may come as one server-sent event: its `data:` lines, joined. */
function unframe(body: string): string {
    if (!/^\s*(event|data|id):/m.test(body) || body.trimStart().startsWith("{")) return body;
    return body
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trim())
        .join("\n");
}

/** A header lookup, as `Headers` or a lower-cased record would give it. */
export type HeaderLookup = (name: string) => string | null;

/**
 * Whether an answer to MCP `initialize` is one: a JSON-RPC result naming a protocol version or a
 * server, or a `401` whose `WWW-Authenticate` points at protected-resource metadata (the MCP
 * authorisation spec; the user accepted that answer as an MCP identity on 2026-10-30,
 * `data/catalogue/remote-endpoints.json`).
 */
export function isMcpAnswer(status: number, header: HeaderLookup, body: string): boolean {
    if (status === 401) return /resource_metadata\s*=/i.test(header("www-authenticate") ?? "");
    if (status < 200 || status >= 300) return false;
    const parsed = parseJson(unframe(body));
    const result = isRecord(parsed) ? parsed["result"] : null;
    return (
        isRecord(result) &&
        (typeof result["protocolVersion"] === "string" || isRecord(result["serverInfo"]))
    );
}

/**
 * Whether a `GET` answered as MCP's older HTTP+SSE transport: an event stream whose first event is
 * `endpoint`, naming where to post messages.
 */
export function isMcpSseAnswer(status: number, header: HeaderLookup, body: string): boolean {
    if (status < 200 || status >= 300) return false;
    if (!/^text\/event-stream/i.test(header("content-type") ?? "")) return false;
    return /^event:\s*endpoint\s*$/m.test(body);
}

/** Whether a body is an A2A agent card: a `name` and a `skills` list, the card's two defining fields. */
export function isA2aCard(status: number, body: string): boolean {
    if (status < 200 || status >= 300) return false;
    const parsed = parseJson(body);
    return (
        isRecord(parsed) &&
        typeof parsed["name"] === "string" &&
        parsed["name"].trim().length > 0 &&
        Array.isArray(parsed["skills"])
    );
}

function decodeBase64Json(value: string): unknown {
    try {
        const binary = atob(value.trim());
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

function isPaymentRequired(value: unknown): boolean {
    if (!isRecord(value)) return false;
    const version = value["x402Version"];
    const accepts = value["accepts"];
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return false;
    if (!Array.isArray(accepts) || accepts.length === 0) return false;
    return accepts.every(
        (offer) =>
            isRecord(offer) &&
            typeof offer["scheme"] === "string" &&
            typeof offer["network"] === "string" &&
            typeof offer["payTo"] === "string",
    );
}

/**
 * Whether an answer is an x402 payment request: a `402` whose `PAYMENT-REQUIRED` header (x402 v2)
 * decodes to payment requirements, or whose body is them (x402 v1, which had no header). Each offer
 * names a scheme, a network and a payee.
 */
export function isX402Answer(status: number, header: HeaderLookup, body: string): boolean {
    if (status !== 402) return false;
    const encoded = header("payment-required");
    if (encoded !== null) return isPaymentRequired(decodeBase64Json(encoded));
    return isPaymentRequired(parseJson(body));
}
