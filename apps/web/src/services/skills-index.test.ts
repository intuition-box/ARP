import {describe, expect, it} from "vitest";

import {labelKeyOf, searchSkills} from "./skills-index";

describe("searchSkills", () => {
    it("asks the site's own proxy, not skills.sh directly", async () => {
        const urls: string[] = [];
        const fake = (async (input: string | URL | Request) => {
            urls.push(String(input));
            return new Response(JSON.stringify({skills: []}));
        }) as typeof fetch; // a test double with fetch's call shape
        expect(await searchSkills("pdf form", fake)).toEqual({status: "ok", skills: []});
        expect(urls).toEqual(["/skills-index/api/search?q=pdf+form&limit=20"]);
    });
});

describe("labelKeyOf", () => {
    it("matches a skill's URL to the label its atom carries", () => {
        expect(labelKeyOf("https://github.com/OpenAI/skills?skill=transcribe")).toBe("github.com/openai/skills?skill=transcribe");
    });
});
