import {describe, expect, it} from "vitest";

import {prepareDeclareUsed} from "../src/declare/index.js";
import {normaliseToolUrl} from "../src/declare/tool-thing.js";
import {canonicalToolUrl, planToolListing} from "../src/sponsor/list-tool.js";
import {publishableToolUrl, ToolUrlCarriesValuesError} from "../src/tool-url-values.js";

import {fakeReads, SUBJECT} from "./helpers.js";

const KEY = "sk_live_51Hq9d2eZvKYlo2C8xY7Qw3";

describe("publishableToolUrl (task 123, ADR 0190)", () => {
    it("accepts a URL with no value, and a GitHub skill's name", () => {
        for (const url of [
            "https://example.com/mcp",
            "https://example.com/mcp?api_key=",
            "https://api.example.com/weather/:id?city=",
            "https://github.com/a/b",
            "https://github.com/a/b?skill=c",
            "https://github.com/user123456/repo/tree/main",
        ]) {
            expect(publishableToolUrl(url), url).toEqual({ok: true});
        }
    });

    it("refuses a value in the query, the path or a fragment, and names the form it would accept", () => {
        const cases: [string, string][] = [
            [`https://example.com/mcp?api_key=${KEY}`, "https://example.com/mcp?api_key="],
            [`https://example.com/mcp?b=2&api_key=${KEY}`, "https://example.com/mcp?b=&api_key="],
            [`https://example.com/mcp/${KEY}`, "https://example.com/mcp/:id"],
            ["https://example.com/u/alice@example.com/sse", "https://example.com/u/:id/sse"],
            ["https://mainnet.example.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", "https://mainnet.example.io/v3/:id"],
        ];
        for (const [url, listable] of cases) {
            const verdict = publishableToolUrl(url);
            expect(verdict, url).toMatchObject({ok: false, listable});
            if (!verdict.ok) expect(verdict.listable ?? "").not.toContain(KEY);
        }
        expect(publishableToolUrl(`https://example.com/mcp?api_key=${KEY}`)).toMatchObject({
            why: expect.stringContaining("api_key"),
        });
    });

    it("refuses a GitHub URL with any parameter but skill, and names the skill's own URL", () => {
        expect(publishableToolUrl("https://github.com/a/b?skill=c&token=abc")).toEqual({
            ok: false,
            why: "its query carries token",
            listable: "https://github.com/a/b?skill=c",
        });
        expect(publishableToolUrl("https://github.com/a/b?tab=readme")).toMatchObject({
            ok: false,
            listable: "https://github.com/a/b",
        });
    });

    it("accepts every form canonicalToolUrl gives a GitHub URL, so a skill always lists", () => {
        for (const pasted of [
            "github.com/a/b?skill=c&token=abc",
            "https://github.com/a/b/tree/main?x=1",
            "github.com/a/b.git?skill=web%20design",
        ]) {
            expect(publishableToolUrl(canonicalToolUrl(pasted)), pasted).toEqual({ok: true});
        }
    });

    it("is stable: what it names as listable is accepted", () => {
        for (const url of [`https://example.com/mcp/${KEY}?q=${KEY}`, "https://github.com/a/b?skill=c&skill=d"]) {
            const verdict = publishableToolUrl(normaliseToolUrl(url));
            expect(verdict.ok, url).toBe(false);
            if (!verdict.ok && verdict.listable !== null) {
                expect(publishableToolUrl(verdict.listable)).toEqual({ok: true});
            }
        }
    });
});

describe("the planners that create a tool's atom refuse a URL with a value", () => {
    it("planToolListing throws before any read", async () => {
        let read = false;
        const reads = {
            ...fakeReads(),
            atomId: async () => {
                read = true;
                return "0x00" as const;
            },
        };
        const refused = await planToolListing({url: `https://example.com/mcp?api_key=${KEY}`, reads}).catch((error: unknown) => error);
        expect(refused).toBeInstanceOf(ToolUrlCarriesValuesError);
        // The message is what a caller logs or forwards, so it never holds the value it refused.
        expect(String((refused as Error).message)).not.toContain(KEY);
        expect((refused as ToolUrlCarriesValuesError).listable).toBe("https://example.com/mcp?api_key=");
        expect(read).toBe(false);
    });

    it("prepareDeclareUsed throws before the lookup is asked", async () => {
        let asked = false;
        const lookup = {
            findByUrl: async () => {
                asked = true;
                return [];
            },
        };
        await expect(
            prepareDeclareUsed({
                subject: SUBJECT,
                tools: [`https://example.com/mcp?api_key=${KEY}`],
                reads: fakeReads(),
                lookup,
            }),
        ).rejects.toThrow(/cannot be listed: it carries a value for api_key/);
        expect(asked).toBe(false);
    });

    it("prepareDeclareUsed still plans a URL with none", async () => {
        const plan = await prepareDeclareUsed({
            subject: SUBJECT,
            tools: ["https://example.com/mcp?api_key="],
            reads: fakeReads(),
        });
        expect(plan.calls.map((c) => c.kind)).toEqual(["create-atom", "create-triple"]);
    });
});
