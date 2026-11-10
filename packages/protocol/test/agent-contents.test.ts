import {describe, expect, it} from "vitest";

import {readAgentContents, type SieveReadingRow} from "../src/agent-contents.js";

const row = (over: Partial<SieveReadingRow> = {}): SieveReadingRow => ({
    rung: 4,
    couldNotSay: false,
    proofUrl: "https://a.dev/mcp",
    kinds: ["mcp"],
    at: "2026-11-09T18:00:00.000Z",
    ...over,
});

const DOCUMENT = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "A",
    services: [
        {name: "MCP", endpoint: "https://a.dev/mcp", auth: {type: "bearer"}},
        {name: "A2A", endpoint: "https://a.dev/.well-known/agent-card.json"},
        {name: "web", endpoint: "https://a.dev"},
        {name: "ENS", endpoint: "a.eth"},
        {name: "api", endpoint: "https://{host}/v1"},
    ],
    securitySchemes: {apiKey: {type: "apiKey"}, oauth2: {type: "oauth2"}},
    x402Support: true,
};

describe("readAgentContents", () => {
    it("reads endpoints, protocols, x402, auth and the sieve's answer", () => {
        expect(readAgentContents(DOCUMENT, row())).toEqual({
            endpoints: [
                {name: "MCP", protocol: "mcp", host: "a.dev", notCheckable: null},
                {name: "A2A", protocol: "a2a", host: "a.dev", notCheckable: null},
                {name: "web", protocol: null, host: "a.dev", notCheckable: null},
                {name: "ENS", protocol: null, host: null, notCheckable: "non-http-identifier"},
                {name: "api", protocol: null, host: null, notCheckable: "templated"},
            ],
            protocols: ["a2a", "mcp"],
            x402: "declared",
            auth: ["apiKey", "bearer", "oauth2"],
            answers: {status: "answered", speaks: ["mcp"], proofUrl: "https://a.dev/mcp", at: "2026-11-09T18:00:00.000Z"},
        });
    });

    it("says nothing declared where the document says nothing, and does not read silence as open", () => {
        expect(readAgentContents({name: "B"}, null)).toEqual({
            endpoints: [],
            protocols: [],
            x402: "not declared",
            auth: [],
            answers: {status: "not read"},
        });
    });

    it("leaves answers null when the caller did not look at the sieve", () => {
        expect(readAgentContents(DOCUMENT).answers).toBeNull();
    });

    it("an x402 endpoint is a declared payment too", () => {
        expect(readAgentContents({services: [{name: "x402", endpoint: "https://pay.dev"}]}).x402).toBe("declared");
    });

    it("rung 3 answered without speaking; below it no answer, with whether a failure left it open", () => {
        expect(readAgentContents(DOCUMENT, row({rung: 3, kinds: []})).answers).toMatchObject({status: "answered", speaks: []});
        expect(readAgentContents(DOCUMENT, row({rung: 2, couldNotSay: true})).answers).toEqual({
            status: "no answer",
            couldNotSay: true,
            at: "2026-11-09T18:00:00.000Z",
        });
    });

    it("rung 5 is a line, not an answer: answered only when a protocol did", () => {
        expect(readAgentContents(DOCUMENT, row({rung: 5, kinds: ["a2a"]})).answers).toMatchObject({status: "answered", speaks: []});
        expect(readAgentContents(DOCUMENT, row({rung: 5, kinds: []})).answers).toEqual({status: "not read"});
    });

    it("a document that is not an object reads as nothing declared", () => {
        expect(readAgentContents("not json").endpoints).toEqual([]);
    });
});
