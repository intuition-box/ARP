import {afterEach, describe, expect, it, vi} from "vitest";

import {fetchSkillMd, parseSkillMd, splitFirstSentence} from "../skill-md";

const front = (...lines: string[]) => `---\n${lines.join("\n")}\n---\nbody\n`;

describe("parseSkillMd, the frontmatter shapes it reads and the ones it leaves out", () => {
    it("reads Windows line endings, quoted values and a literal block", () => {
        const text = front('version: "1.2"', "description: |", "  line one", "  line two").replace(
            /\n/g,
            "\r\n",
        );
        expect(parseSkillMd(text)).toEqual({description: "line one\nline two", version: "1.2"});
        expect(parseSkillMd(front("description: 'single'")).description).toBe("single");
    });

    it("a frontmatter that never closes is no frontmatter", () => {
        expect(parseSkillMd("---\ndescription: open\n")).toEqual({
            description: null,
            version: null,
        });
    });

    it("skips lines that are not key: value, empty values, empty blocks and keys nested under a valued key", () => {
        const parsed = parseSkillMd(
            front(
                "# a comment",
                "name: x",
                "  version: 9",
                "description:",
                "license: >-",
                "",
                "tags: []",
            ),
        );
        expect(parsed).toEqual({description: null, version: null});
    });

    it("a block ends at the first line indented no deeper than its key", () => {
        const parsed = parseSkillMd(front("description: >", "  folded", "", "  on", "version: 2"));
        expect(parsed).toEqual({description: "folded on", version: "2"});
    });

    it("a one-character value is kept as it is", () => {
        expect(parseSkillMd(front("version: 3")).version).toBe("3");
        expect(parseSkillMd(front('version: "')).version).toBe('"');
    });
});

describe("splitFirstSentence, edge cases", () => {
    it("a trailing sentence break with nothing after it keeps the text whole", () => {
        expect(splitFirstSentence("One. Two.")).toEqual({head: "One.", rest: "Two."});
        expect(splitFirstSentence("No break here")).toEqual({head: "No break here", rest: null});
    });
});

describe("fetchSkillMd, the reads it refuses", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("refuses a body whose declared length is over the limit, without reading it", async () => {
        const response = new Response("x".repeat(10), {headers: {"content-length": "5000"}});
        await expect(
            fetchSkillMd("https://raw/SKILL.md", {fetchImpl: async () => response, maxBytes: 100}),
        ).rejects.toThrow("https://raw/SKILL.md is 5000 bytes, over the 100-byte limit");
    });

    it("an answer with no body is an empty file", async () => {
        const response = new Response(null, {status: 200});
        expect(
            await fetchSkillMd("https://raw/SKILL.md", {fetchImpl: async () => response}),
        ).toEqual({description: null, version: null});
    });

    it("reads through the browser's own fetch when none is passed", async () => {
        const fetchImpl = vi.fn(async () => new Response(front("version: 4")));
        vi.stubGlobal("fetch", fetchImpl);
        expect((await fetchSkillMd("https://raw/SKILL.md")).version).toBe("4");
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
