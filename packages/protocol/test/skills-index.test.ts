import {describe, expect, it} from "vitest";

import {parseSkillsIndex, searchSkillsIndex, skillUrlOf} from "../src/skills-index.js";

const answer = {
    query: "transcribe audio",
    skills: [
        {id: "elevenlabs/skills/speech-to-text", source: "elevenlabs/skills", skillId: "speech-to-text", name: "speech-to-text", installs: 13934},
        {id: "openai/skills/transcribe", source: "openai/skills", skillId: "transcribe", name: "transcribe", installs: 4033},
        {id: "openai/skills/transcribe", source: "openai/skills", skillId: "transcribe", name: "transcribe", installs: 4033},
        {source: "", skillId: "nothing"},
        {source: "mintlify.com", skillId: "docs", installs: 12},
        "not a row",
    ],
};

function replying(body: unknown, status = 200): {fetch: typeof fetch; urls: string[]} {
    const urls: string[] = [];
    const fake = (async (input: string | URL | Request) => {
        urls.push(String(input));
        return new Response(JSON.stringify(body), {status});
    }) as typeof fetch; // a test double with fetch's call shape
    return {fetch: fake, urls};
}

describe("skillUrlOf", () => {
    it("gives ARP's address for a GitHub owner/repo", () => {
        expect(skillUrlOf("openai/skills", "transcribe")).toBe("https://github.com/openai/skills?skill=transcribe");
    });
    it("gives none for a host that is not owner/repo", () => {
        expect(skillUrlOf("mintlify.com", "docs")).toBeNull();
    });
    it("gives none for a name that would escape the query string", () => {
        expect(skillUrlOf("a/b", "x&skill=y")).toBeNull();
    });
});

describe("parseSkillsIndex", () => {
    it("keeps well-formed rows once, in skills.sh's order", () => {
        const rows = parseSkillsIndex(answer);
        expect(rows.map((row) => row.skill)).toEqual(["speech-to-text", "transcribe", "docs"]);
        expect(rows[0]).toEqual({
            source: "elevenlabs/skills",
            skill: "speech-to-text",
            installs: 13934,
            url: "https://github.com/elevenlabs/skills?skill=speech-to-text",
        });
        expect(rows[2]?.url).toBeNull();
    });
    it("returns nothing for a body without a list", () => {
        expect(parseSkillsIndex({error: "x"})).toEqual([]);
        expect(parseSkillsIndex(null)).toEqual([]);
    });
});

describe("searchSkillsIndex", () => {
    it("asks skills.sh's search with the query and the limit", async () => {
        const {fetch, urls} = replying(answer);
        const result = await searchSkillsIndex("transcribe audio", {fetch, limit: 5});
        expect(result.status).toBe("ok");
        expect(urls[0]).toBe("https://skills.sh/api/search?q=transcribe+audio&limit=5");
    });
    it("reads through a proxy when given one", async () => {
        const {fetch, urls} = replying(answer);
        await searchSkillsIndex("pdf", {fetch, baseUrl: "/skills-index/"});
        expect(urls[0]).toBe("/skills-index/api/search?q=pdf&limit=20");
    });
    it("says unavailable on an error status, never an empty list", async () => {
        const {fetch} = replying({}, 503);
        expect(await searchSkillsIndex("pdf", {fetch})).toEqual({status: "unavailable", reason: "skills.sh answered 503"});
    });
    it("says unavailable when the request throws", async () => {
        const fetch = (async () => {
            throw new Error("offline");
        }) as unknown as typeof globalThis.fetch; // a double that only throws
        expect(await searchSkillsIndex("pdf", {fetch})).toEqual({status: "unavailable", reason: "offline"});
    });
    it("sends nothing for an empty query", async () => {
        const {fetch, urls} = replying(answer);
        expect(await searchSkillsIndex("  ", {fetch})).toEqual({status: "ok", skills: []});
        expect(urls).toEqual([]);
    });
});
