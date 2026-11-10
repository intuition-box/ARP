/**
 * What an agent offers, read before somebody's agent calls or pays it: the agent-side twin of
 * `skill-contents.ts` (task 96, ADR `0165`).
 *
 * Five facts, each from where it is written:
 *
 * - **endpoints**: what the registration document declares, each with its host and whether a probe can
 *   reach it (`readDeclaredEndpoints`). Declared, not shown to work.
 * - **protocols**: the ones among them with a handshake ARP can perform, MCP and A2A.
 * - **x402**: the document says it takes x402 payments (`x402Support: true`, or an endpoint named
 *   `x402`). The agent's own word; whether an endpoint answers 402 is not read here.
 * - **auth**: the schemes the document names (`securitySchemes`, `authentication`, `auth`, at the top
 *   or on an endpoint). None named is not "open": most documents say nothing either way.
 * - **answers**: the sieve's dated reading (`sieve.ts`): whether a callable endpoint answered, and
 *   which protocol it spoke. `null` when the agent was not in the reading.
 *
 * Pure: the caller supplies the parsed document and the sieve's row. No network, no score (ADR `0046`).
 */
import {readDeclaredEndpoints} from "./verify/declaration.js";
import type {KnownProtocol} from "./verify/types.js";

/** One agent's row of the sieve's reading, the fields this reads (`data/catalogue/agent-sieve-13579.json`). */
export type SieveReadingRow = {
    rung: number;
    couldNotSay: boolean;
    proofUrl: string | null;
    kinds: string[];
    at: string;
};

export type AgentEndpointFact = {
    name: string | null;
    protocol: KnownProtocol | null;
    /** The host it points at, or `null` when the value is not a URL a probe can reach. */
    host: string | null;
    /** Why a probe cannot reach it, when it cannot: `templated`, `non-http-identifier`, … */
    notCheckable: string | null;
};

export type AgentContents = {
    endpoints: AgentEndpointFact[];
    protocols: KnownProtocol[];
    x402: "declared" | "not declared";
    auth: string[];
    answers:
        | {status: "answered"; speaks: string[]; proofUrl: string | null; at: string}
        | {status: "no answer"; couldNotSay: boolean; at: string}
        | {status: "not read"}
        | null;
};

/** Beyond this a document is listing everything it owns, and the rest is counted, not shown. */
const MAX_ENDPOINTS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hostOf(url: string): string | null {
    try {
        return new URL(url).host;
    } catch {
        return null;
    }
}

/** Scheme names from `securitySchemes: {name: …}`, `authentication: "bearer"`, `auth: {type: "oauth2"}`. */
function authIn(record: Record<string, unknown>): string[] {
    const out: string[] = [];
    const schemes = record["securitySchemes"];
    if (isRecord(schemes)) {
        for (const [name, scheme] of Object.entries(schemes)) {
            const type = isRecord(scheme) && typeof scheme["type"] === "string" ? scheme["type"] : null;
            out.push(type === null || type === name ? name : `${name} (${type})`);
        }
    }
    for (const key of ["authentication", "auth"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim() !== "") out.push(value.trim());
        else if (isRecord(value)) {
            const type = value["type"] ?? value["scheme"];
            if (typeof type === "string" && type.trim() !== "") out.push(type.trim());
        } else if (Array.isArray(value)) {
            for (const item of value) if (typeof item === "string" && item.trim() !== "") out.push(item.trim());
        }
    }
    return out;
}

/** Every record the document lists its endpoints under, to read an endpoint's own `auth`. */
function endpointRecords(document: Record<string, unknown>): Record<string, unknown>[] {
    const lists = [document["endpoints"], document["services"]];
    const registrations = document["registrations"];
    if (Array.isArray(registrations)) for (const entry of registrations) if (isRecord(entry)) lists.push(entry["endpoints"]);
    return lists.flatMap((list) => (Array.isArray(list) ? list.filter(isRecord) : []));
}

/**
 * The facts, from a parsed registration document and the agent's sieve row.
 *
 * @param sieved the agent's row of the dated reading, `null` when it is not in it, `undefined` when
 *   the caller did not look.
 */
export function readAgentContents(document: unknown, sieved?: SieveReadingRow | null): AgentContents {
    const declared = readDeclaredEndpoints(document);
    const endpoints = declared.slice(0, MAX_ENDPOINTS).map((endpoint) => ({
        name: endpoint.name,
        protocol: endpoint.protocol,
        host: endpoint.classification.status === "probeable" ? hostOf(endpoint.classification.url) : null,
        notCheckable: endpoint.classification.status === "not-checkable" ? endpoint.classification.code : null,
    }));
    const protocols = [...new Set(declared.flatMap((endpoint) => (endpoint.protocol === null ? [] : [endpoint.protocol])))].sort();
    const record = isRecord(document) ? document : {};
    const x402 =
        record["x402Support"] === true ||
        record["x402support"] === true ||
        declared.some((endpoint) => (endpoint.name ?? "").toLowerCase() === "x402");
    const auth = [...new Set([record, ...endpointRecords(record)].flatMap(authIn))].sort();
    return {
        endpoints,
        protocols,
        x402: x402 ? "declared" : "not declared",
        auth,
        answers: sieved === undefined ? null : answersOf(sieved),
    };
}

/**
 * Rung 3 answered, rung 4 spoke its protocol. Rung 5 is a line from another wallet, which lifts the
 * rung whatever the endpoint did, so there only `kinds` (protocols that answered) says it answered.
 */
function answersOf(sieved: SieveReadingRow | null): NonNullable<AgentContents["answers"]> {
    if (sieved === null) return {status: "not read"};
    const answered = sieved.rung === 3 || sieved.rung === 4 || (sieved.rung === 5 && sieved.kinds.length > 0);
    if (answered) {
        return {status: "answered", speaks: sieved.rung === 4 ? [...sieved.kinds].sort() : [], proofUrl: sieved.proofUrl, at: sieved.at};
    }
    if (sieved.rung === 5) return {status: "not read"};
    return {status: "no answer", couldNotSay: sieved.couldNotSay, at: sieved.at};
}
