import {describe, expect, it} from "vitest";

import {readAgentContentsOf, sieveRowOf} from "./agent-contents";
import type {SieveReading} from "./agents-reachable";

const SIEVE: SieveReading = {
    directoryChainId: 13579,
    checkedFrom: "2026-11-09T18:00:00.000Z",
    checkedTo: "2026-11-09T18:10:00.000Z",
    agents: [
        {
            chainId: 8453,
            registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
            tokenId: "2340",
            name: "A",
            rung: 4,
            couldNotSay: false,
            proofUrl: "https://a.dev/a2a",
            kinds: ["a2a"],
            at: "2026-11-09T18:02:01.721Z",
        },
    ],
};

const inline = (document: unknown) =>
    `data:application/json;base64,${btoa(JSON.stringify(document))}`;

const noFetch = (() => {
    throw new Error("an inline document needs no request");
}) as unknown as typeof fetch; // never called: the test proves it

describe("agent contents", () => {
    it("finds the agent's row by chain and token, and nothing for another", () => {
        expect(sieveRowOf(SIEVE, 8453, "2340")?.rung).toBe(4);
        expect(sieveRowOf(SIEVE, 1, "2340")).toBeNull();
    });

    it("reads an inline document with no request, and joins the sieve's answer", async () => {
        const read = await readAgentContentsOf(
            {
                registrationFile: inline({
                    services: [{name: "A2A", endpoint: "https://a.dev/a2a"}],
                    x402Support: true,
                }),
                chainId: 8453,
                tokenId: "2340",
            },
            SIEVE,
            noFetch,
        );
        expect(read).toMatchObject({
            status: "read",
            contents: {
                protocols: ["a2a"],
                x402: "declared",
                auth: [],
                answers: {status: "answered", speaks: ["a2a"]},
            },
        });
    });

    it("says not read when the agent is not in the sieve's reading", async () => {
        const read = await readAgentContentsOf({registrationFile: inline({}), chainId: 8453, tokenId: "1"}, SIEVE, noFetch);
        expect(read).toMatchObject({status: "read", contents: {answers: {status: "not read"}}});
    });

    it("keeps no registration file and an unreadable one apart", async () => {
        expect(await readAgentContentsOf({registrationFile: null, chainId: 8453, tokenId: "1"}, SIEVE, noFetch)).toEqual({status: "none"});
        // Safe: `readRegistrationDocument` only calls it and reads the Response, which this returns.
        const refused = (async () => new Response("no", {status: 404})) as typeof fetch;
        expect(
            await readAgentContentsOf({registrationFile: "https://host.dev/a.json", chainId: 8453, tokenId: "1"}, SIEVE, refused),
        ).toEqual({status: "unreadable", href: "https://host.dev/a.json", detail: "the host answered 404"});
    });
});
