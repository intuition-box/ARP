import {describe, expect, it} from "vitest";

import {isCallable, sieve, statedEmails, wilsonInterval, type SievedEndpoint} from "../src/sieve.js";
import type {DocumentOutcome, ProbeOutcome} from "../src/verify/types.js";

const READ: DocumentOutcome = {status: "read", url: "https://a.example/agent.json", httpStatus: 200};
const request = {method: "POST" as const, url: "https://a.example/mcp"};

function endpoint(name: string | null, url: string, outcome: ProbeOutcome, protocol: "mcp" | "a2a" | null = null): SievedEndpoint {
    return {
        declaredUnder: "services",
        name,
        protocol,
        version: null,
        capabilities: [],
        classification: {status: "probeable", url, declared: url},
        outcome,
    };
}
const confirmed = (code: "live" | "dead" | "serves-declared-protocol" | "declared-protocol-not-served"): ProbeOutcome => ({
    status: "confirmed",
    code,
    httpStatus: 200,
    request,
    detail: "",
});
const inconclusive: ProbeOutcome = {status: "inconclusive", code: "transport-error", httpStatus: null, request, observed: "", detail: ""};

describe("sieve", () => {
    it("is a shell without a document, and could not say when the read failed in transit", () => {
        expect(sieve({document: {status: "no-token-uri"}, endpoints: [], usedByAnother: false})).toMatchObject({rung: 0, couldNotSay: false});
        const transit: DocumentOutcome = {status: "unreachable", code: "transport-error", url: null, httpStatus: null, detail: ""};
        expect(sieve({document: transit, endpoints: [], usedByAnother: false})).toMatchObject({rung: 0, couldNotSay: true});
    });

    it("does not count a web site or a GitHub link as an agent that answers", () => {
        const result = sieve({
            document: READ,
            endpoints: [endpoint("web", "https://a.example", confirmed("live")), endpoint("OASF", "https://github.com/x/y", confirmed("live"))],
            usedByAnother: false,
        });
        expect(result.rung).toBe(1);
        expect(result.anyLive).toBe(true);
    });

    it("climbs from declares to answers to speaks on callable endpoints", () => {
        const dead = endpoint("MCP", "https://a.example/mcp", confirmed("dead"), "mcp");
        expect(sieve({document: READ, endpoints: [dead], usedByAnother: false}).rung).toBe(2);
        const notServed = endpoint("MCP", "https://a.example/mcp", confirmed("declared-protocol-not-served"), "mcp");
        expect(sieve({document: READ, endpoints: [notServed], usedByAnother: false}).rung).toBe(3);
        const api = endpoint("api", "https://a.example/api", confirmed("live"));
        expect(sieve({document: READ, endpoints: [api], usedByAnother: false}).rung).toBe(3);
        const speaks = endpoint("A2A", "https://a.example/card.json", confirmed("serves-declared-protocol"), "a2a");
        const result = sieve({document: READ, endpoints: [dead, speaks], usedByAnother: false});
        expect(result.rung).toBe(4);
        expect(result.proof?.classification).toMatchObject({url: "https://a.example/card.json"});
    });

    it("marks a callable endpoint with no verdict as could not say, without lifting the rung", () => {
        const result = sieve({document: READ, endpoints: [endpoint("MCP", "https://a.example/mcp", inconclusive, "mcp")], usedByAnother: false});
        expect(result).toMatchObject({rung: 2, couldNotSay: true});
    });

    it("is used when another wallet's line names it", () => {
        expect(sieve({document: READ, endpoints: [], usedByAnother: true}).rung).toBe(5);
    });
});

describe("isCallable", () => {
    it("takes a protocol or an API name, and nothing that cannot be probed", () => {
        expect(isCallable(endpoint("MCP", "https://a.example/mcp", confirmed("live"), "mcp"))).toBe(true);
        expect(isCallable(endpoint("REST", "https://a.example", confirmed("live")))).toBe(true);
        expect(isCallable(endpoint("twitter", "https://x.com/a", confirmed("live")))).toBe(false);
        const templated = {...endpoint("MCP", "x", confirmed("live"), "mcp"), classification: {status: "not-checkable" as const, code: "templated" as const, declared: "https://{host}/mcp"}};
        expect(isCallable(templated)).toBe(false);
    });
});

describe("statedEmails", () => {
    it("reads an email endpoint or a mailto: value, and nothing else", () => {
        const email = {...endpoint("email", "x", confirmed("live")), classification: {status: "not-checkable" as const, code: "non-http-identifier" as const, declared: "Dev@Clawn.ch"}};
        const mailto = {...endpoint("contact", "x", confirmed("live")), classification: {status: "not-checkable" as const, code: "non-http-identifier" as const, declared: "mailto:ops@a.example"}};
        const web = endpoint("web", "https://a.example", confirmed("live"));
        expect(statedEmails([email, mailto, web])).toEqual(["dev@clawn.ch", "ops@a.example"]);
    });
});

describe("wilsonInterval", () => {
    it("matches the repo's quoted interval for 3 of 122", () => {
        const [low, high] = wilsonInterval(3, 122);
        expect(low).toBeCloseTo(0.0084, 3);
        expect(high).toBeCloseTo(0.0698, 3);
    });
});
