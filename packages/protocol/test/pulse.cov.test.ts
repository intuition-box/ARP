import {afterEach, describe, expect, it, vi} from "vitest";

import {
    MAX_SKILL_FILES_READ,
    githubPulseSource,
    parseSkillsFind,
    readPulse,
    readSkillFacts,
    type ListedFile,
    type PulseSource,
    type RepositoryListing,
    type SkillSearchResult,
} from "../src/pulse.js";
import {CONTENTS_LIMITS} from "../src/skill-contents.js";

const result = (source: string, skill: string): SkillSearchResult => ({
    source,
    skill,
    installs: 1,
    installsText: "1",
    url: null,
});
const skillMd = (name: string, body = "Body") => `---\nname: ${name}\n---\n${body}\n`;

/** A repository in memory: `texts` are served, `sizes` override a listed size, `unread` are listed and not served. */
function sourceOf(
    texts: Record<string, string>,
    extra: {
        sizes?: Record<string, number>;
        unread?: string[];
        listing?: Partial<RepositoryListing>;
        failing?: string[];
    } = {},
): PulseSource & {asked: string[]} {
    const asked: string[] = [];
    const listed: ListedFile[] = [...Object.keys(texts), ...(extra.unread ?? [])].map((path) => ({
        path,
        sha: `blob:${path}`,
        size: extra.sizes?.[path] ?? (texts[path] ?? "").length,
    }));
    return {
        asked,
        listing: async () => ({
            rootTreeId: "tree:root",
            files: listed,
            trees: new Map(),
            truncated: false,
            ...extra.listing,
        }),
        file: async (_repo, path) => {
            asked.push(path);
            if (extra.failing?.includes(path)) throw new Error("read failed");
            return texts[path] ?? null;
        },
        repository: async () => null,
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("parseSkillsFind, counts", () => {
    it("reads billions and a plain count with thousands separators", () => {
        const rows = parseSkillsFind("a/b@c 2B installs\nd/e@f 1,234 installs\n");
        expect(rows.map((row) => row.installs)).toEqual([2_000_000_000, 1234]);
    });
});

describe("readSkillFacts, the scripts it runs", () => {
    it("names no absent file for a path outside the repository or a placeholder", () => {
        expect(
            readSkillFacts("bash ~/bin/run.sh and node /opt/x.js and python input.py", [])
                .runsAbsentFiles,
        ).toEqual([]);
    });
});

describe("readPulse, the scripts it reads", () => {
    it("skips a placeholder and a script the repository does not hold, and reads the one it does", async () => {
        const source = sourceOf({
            "s/SKILL.md": skillMd(
                "s",
                "Run `python your/run.py`, `node scripts/gone.mjs` and `bash scripts/go.sh`.",
            ),
            "s/scripts/go.sh": "#!/bin/sh\necho hi\n",
        });
        const pulse = await readPulse(result("a/b", "s"), source);
        expect(pulse.status).toBe("read");
        expect(source.asked).toContain("s/scripts/go.sh");
        expect(source.asked).not.toContain("your/run.py");
    });

    it("does not fetch a script under examples/, or one past the size cap, and lists it as not fetched", async () => {
        const source = sourceOf(
            {
                "s/SKILL.md": skillMd(
                    "s",
                    "Run `bash examples/demo.sh` and `bash scripts/big.sh`.",
                ),
                "s/examples/demo.sh": "echo demo",
                "s/scripts/big.sh": "echo big",
            },
            {sizes: {"s/scripts/big.sh": CONTENTS_LIMITS.fileChars + 1}},
        );
        const pulse = await readPulse(result("a/b", "s"), source);
        expect(source.asked).toEqual(["s/SKILL.md"]);
        expect(pulse.status === "read" ? pulse.contains.read.skipped : []).toEqual([
            {path: "examples/demo.sh", why: "not fetched"},
            {path: "scripts/big.sh", why: "too large"},
        ]);
    });

    it("lists a script it asked for and was not served as not fetched", async () => {
        const source = sourceOf(
            {"s/SKILL.md": skillMd("s", "Run `bash scripts/go.sh`.")},
            {unread: ["s/scripts/go.sh"]},
        );
        const pulse = await readPulse(result("a/b", "s"), source);
        expect(source.asked).toContain("s/scripts/go.sh");
        expect(pulse.status === "read" ? pulse.contains.read.skipped : []).toEqual([
            {path: "scripts/go.sh", why: "not fetched"},
        ]);
    });
});

describe("readPulse, before an install", () => {
    it("reads the directory's text files, names a binary, and keeps a failed read as not fetched", async () => {
        const source = sourceOf(
            {"s/SKILL.md": skillMd("s"), "s/notes.txt": "plain", "s/logo.png": "bytes"},
            {failing: ["s/broken.md"], unread: ["s/broken.md"]},
        );
        const pulse = await readPulse(result("a/b", "s"), source, {
            directory: {by: new Promise(() => undefined)},
        });
        expect(source.asked).toEqual(expect.arrayContaining(["s/notes.txt", "s/broken.md"]));
        expect(source.asked).not.toContain("s/logo.png");
        const skipped = pulse.status === "read" ? pulse.contains.read.skipped : [];
        expect(skipped).toEqual([
            {path: "broken.md", why: "not fetched"},
            {path: "logo.png", why: "binary"},
        ]);
    });

    it("stops reading the directory once the install starts", async () => {
        const source = sourceOf({"s/SKILL.md": skillMd("s"), "s/notes.txt": "plain"});
        const pulse = await readPulse(result("a/b", "s"), source, {
            directory: {by: Promise.resolve()},
        });
        expect(pulse.status === "read" ? pulse.contains.read.skipped : []).toEqual([
            {path: "notes.txt", why: "not fetched"},
        ]);
    });
});

describe("readPulse, finding the file", () => {
    it("says incomplete rather than read past its limit of SKILL.md files", async () => {
        const texts: Record<string, string> = {};
        for (let at = 0; at <= MAX_SKILL_FILES_READ; at += 1)
            texts[`d${at}/SKILL.md`] = skillMd(`d${at}`);
        const pulse = await readPulse(result("a/b", "wanted"), sourceOf(texts));
        expect(pulse).toMatchObject({status: "incomplete", reason: "too_many_skill_files"});
    });

    it("reads a SKILL.md with no name as not the skill", async () => {
        const pulse = await readPulse(
            result("a/b", "wanted"),
            sourceOf({"wanted/SKILL.md": "no frontmatter"}),
        );
        expect(pulse).toMatchObject({status: "absent", skillFiles: 1});
    });
});

describe("readPulse, when GitHub's limit is reached", () => {
    const limited = (texts: Record<string, string>): PulseSource => ({
        listing: async () => "rate_limited",
        file: async (_repo, path) => texts[path] ?? null,
        repository: async () => null,
    });

    it("reads the file alone at a usual path", async () => {
        const pulse = await readPulse(
            result("a/b", "pdf"),
            limited({"pdf/SKILL.md": skillMd("pdf", "Set OPENAI_API_KEY.")}),
        );
        expect(pulse).toMatchObject({
            status: "read_file_only",
            path: "pdf/SKILL.md",
            keys: ["OPENAI_API_KEY"],
        });
    });

    it("tries no path for a name that would leave the repository, or for a file that names another skill", async () => {
        expect((await readPulse(result("a/b", ".."), limited({}))).status).toBe("rate_limited");
        expect((await readPulse(result("a/b", "a b"), limited({}))).status).toBe("rate_limited");
        expect(
            (await readPulse(result("a/b", "pdf"), limited({"SKILL.md": "no name"}))).status,
        ).toBe("rate_limited");
    });
});

describe("githubPulseSource, what it keeps of GitHub's answers", () => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status});

    it("keeps blobs with a path and a sha, sizes them at zero when unsized, and names the root tree", async () => {
        const get = vi.fn(async () =>
            json({
                tree: [
                    {path: "a", type: "tree", sha: "t1"},
                    {path: "a/SKILL.md", type: "blob", sha: "b1", size: 12},
                    {path: "a/link", type: "blob", sha: "b2"},
                    {path: "a/sub", type: "commit", sha: "c1"},
                    {path: 3, type: "blob", sha: "b3"},
                    {type: "blob"},
                ],
                truncated: true,
            }),
        );
        const listing = await githubPulseSource({fetch: get}).listing("a/b");
        expect(listing).toEqual({
            rootTreeId: "",
            files: [
                {path: "a/SKILL.md", sha: "b1", size: 12},
                {path: "a/link", sha: "b2", size: 0},
            ],
            trees: new Map([["a", "t1"]]),
            truncated: true,
        });
    });

    it("reads a tree with no entries as an empty listing", async () => {
        const listing = await githubPulseSource({fetch: async () => json({sha: "root"})}).listing(
            "a/b",
        );
        expect(listing).toEqual({
            rootTreeId: "root",
            files: [],
            trees: new Map(),
            truncated: false,
        });
    });

    it("says unreachable for a listing GitHub refuses, without a limit", async () => {
        expect(await githubPulseSource({fetch: async () => json({}, 404)}).listing("a/b")).toBe(
            "unreachable",
        );
    });

    it("gives no repository figures for a refused read, and defaults the ones it lacks", async () => {
        expect(
            await githubPulseSource({fetch: async () => json({}, 404)}).repository("a/b"),
        ).toBeNull();
        expect(
            await githubPulseSource({
                fetch: async () => json({stargazers_count: "many", archived: "yes"}),
            }).repository("a/b"),
        ).toEqual({
            stars: 0,
            pushedAt: null,
            archived: false,
        });
        expect(
            await githubPulseSource({
                fetch: async () =>
                    json({stargazers_count: 4, pushed_at: "2026-11-01", archived: true}),
            }).repository("a/b"),
        ).toEqual({
            stars: 4,
            pushedAt: "2026-11-01",
            archived: true,
        });
    });

    it("reads over the global fetch when none is given", async () => {
        vi.stubGlobal("fetch", async () => new Response("served", {status: 200}));
        expect(await githubPulseSource().file("a/b", "x/SKILL.md")).toBe("served");
    });

    it("counts a 429 as the limit", async () => {
        const source = githubPulseSource({
            fetch: async () =>
                new Response("", {status: 429, headers: {"x-ratelimit-reset": "nope"}}),
        });
        expect(await source.listing("a/b")).toBe("rate_limited");
        expect(source.quota?.()).toEqual({apiRequests: 1, limited: true, resetsAt: null});
    });
});
