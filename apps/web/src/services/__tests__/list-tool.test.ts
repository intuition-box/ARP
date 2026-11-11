import {describe, expect, it, vi} from "vitest";

import {listingRequest, listTool, listToolMessage} from "../list-tool";

const URL_ = "https://github.com/Wieedze/ARP?skill=arp";

function answering(status: number, body: unknown): typeof fetch {
    return vi.fn(async () => new Response(JSON.stringify(body), {status}));
}

describe("listing a tool through the sponsor", () => {
    it("posts the URL as JSON and reads a fresh listing", async () => {
        const fetch = answering(200, {atomId: "0xabc", created: true, transactions: ["0x1"]});
        const result = await listTool(URL_, {endpoint: "http://127.0.0.1:3200", fetch});

        expect(fetch).toHaveBeenCalledWith("http://127.0.0.1:3200/list-tool", {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({url: URL_}),
        });
        expect(result).toEqual({
            status: "listed",
            atomId: "0xabc",
            created: true,
            transactions: ["0x1"],
        });
        expect(listToolMessage(result)).toBe("Listed.");
    });

    it("sends the signed request beside the URL when there is one", async () => {
        const fetch = answering(200, {atomId: "0xabc", created: true, transactions: []});
        const signed = {
            request: {
                address: "0x906f3A52ec089f8D4E9127F91C6bE5Ae0d18f91f",
                url: URL_,
                nonce: `0x${"1".repeat(64)}`,
                expiresAt: 1_800_000_000,
            },
            chainId: 13579,
            signature: "0xdead",
        } as const;
        await listTool(URL_, {endpoint: "http://sponsor", fetch}, signed);
        expect(fetch).toHaveBeenCalledWith("http://sponsor/list-tool", {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({url: URL_, request: signed}),
        });
    });

    it("says already listed when nothing was spent", async () => {
        const result = await listTool(URL_, {
            endpoint: "http://sponsor",
            fetch: answering(200, {atomId: "0xabc", created: false, transactions: []}),
        });
        expect(listToolMessage(result)).toBe("Already listed.");
    });

    it("names the rule that refused it", async () => {
        const cases = [
            [400, {error: "e", rule: "url"}, "That is not a tool or skill URL."],
            [422, {error: "e", rule: "resolves"}, "Nothing found at that URL on GitHub."],
            [429, {error: "e", rule: "limit"}, "Today's limit is reached. Try again tomorrow."],
            [
                503,
                {error: "e", rule: "resolves", retry: true},
                "Not answered right now. Try again.",
            ],
            [409, {error: "e", rule: "pending"}, "Already being added. Try again in a minute."],
            [
                422,
                {error: "e", rule: "not-a-tool"},
                "No skill, plugin, MCP server, A2A agent or x402 endpoint found there.",
            ],
            [422, {error: "e", rule: "unreachable"}, "That URL did not answer."],
            [422, {error: "e", rule: "private-address"}, "That URL is not a public address."],
            [502, {error: "e", rule: "pin"}, "It could not be added."],
        ] as const;
        for (const [status, body, message] of cases) {
            const result = await listTool(URL_, {
                endpoint: "http://sponsor",
                fetch: answering(status, body),
            });
            expect(result.status).toBe("refused");
            expect(listToolMessage(result)).toBe(message);
        }
    });

    it("sends nothing without a sponsor, and says so when it does not answer", async () => {
        const fetch = vi.fn();
        expect(await listTool(URL_, {endpoint: undefined, fetch})).toEqual({status: "unavailable"});
        expect(fetch).not.toHaveBeenCalled();

        const down = vi.fn(async () => {
            throw new TypeError("Failed to fetch");
        });
        const result = await listTool(URL_, {endpoint: "http://sponsor", fetch: down});
        expect(listToolMessage(result)).toBe("Adding is not available right now.");
    });
});

describe("a URL that would publish a value (task 123)", () => {
    const KEY = "sk_live_51Hq9d2eZvKYlo2C8xY7Qw3";

    it("is answered before it is signed or sent, with the form that would be accepted", () => {
        const request = listingRequest(`https://mcp.example.com/mcp?api_key=${KEY}`);
        expect(request).toEqual({
            answer: {status: "private", listable: "https://mcp.example.com/mcp?api_key="},
        });
        if (!("answer" in request)) throw new Error("expected an answer");
        const message = listToolMessage(request.answer);
        expect(message).toBe(
            "That URL carries a value, such as a key, and a listing is public for good. Add https://mcp.example.com/mcp?api_key= instead.",
        );
        expect(message).not.toContain(KEY);
        expect(listingRequest(`https://mcp.example.com/${KEY}/sse`)).toEqual({
            answer: {status: "private", listable: "https://mcp.example.com/:id/sse"},
        });
    });

    it("sends a skill, a repository and a URL with no value in canonical form", () => {
        expect(listingRequest(URL_)).toEqual({send: URL_});
        // A GitHub URL's other parameters never leave the page.
        expect(listingRequest("github.com/a/b?skill=c&token=abc123")).toEqual({
            send: "https://github.com/a/b?skill=c",
        });
        expect(listingRequest("https://www.mcp.example.com/mcp/")).toEqual({
            send: "https://mcp.example.com/mcp",
        });
        expect(listingRequest("not a url")).toEqual({send: "not a url"});
    });

    it("words the sponsor's own refusal the same way", async () => {
        const result = await listTool(URL_, {
            endpoint: "http://127.0.0.1:3200",
            fetch: answering(422, {error: "x", rule: "endpoint-private"}),
        });
        expect(listToolMessage(result)).toBe(
            "That URL carries a value, such as a key, and a listing is public for good. Remove it.",
        );
    });
});
