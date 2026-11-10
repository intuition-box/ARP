import {describe, expect, it} from "vitest";

import {githubPulseSource, type ListedFile, type PulseSource} from "../src/pulse.js";
import {
    MAX_SKILLS_READ,
    readSkillInstall,
    skillInstallOf,
    skillInstallReport,
} from "../src/skill-install.js";

const skillMd = (name: string, body = "Body") => `---\nname: ${name}\n---\n${body}\n`;

function sourceOf(files: Record<string, string>): PulseSource & {asked: string[]} {
    const asked: string[] = [];
    const listed: ListedFile[] = Object.entries(files).map(([path, text]) => ({
        path,
        sha: `blob:${text}`,
        size: text.length,
    }));
    return {
        asked,
        listing: async (repo) => {
            asked.push(`listing ${repo}`);
            return {rootTreeId: "tree:root", files: listed, trees: new Map(), truncated: false};
        },
        file: async (_repo, path) => files[path] ?? null,
        repository: async () => ({stars: 12, pushedAt: "2026-11-01T00:00:00Z", archived: false}),
    };
}

const never = new Promise<void>(() => undefined);

describe("skillInstallOf", () => {
    it.each([
        ["npx skills add anthropics/skills --skill pptx", "anthropics/skills", ["pptx"]],
        ["npx -y skills add anthropics/skills -s pptx docx", "anthropics/skills", ["pptx", "docx"]],
        ["npx --yes skills@1.7.4 add anthropics/skills", "anthropics/skills", "all"],
        ["bunx skills add anthropics/skills@pptx -g -y", "anthropics/skills", ["pptx"]],
        ["pnpm dlx skills add anthropics/skills --all", "anthropics/skills", "all"],
        ["yarn dlx skills i anthropics/skills --skill '*'", "anthropics/skills", "all"],
        ["npm exec skills install anthropics/skills -s pptx", "anthropics/skills", ["pptx"]],
        ["skills a https://github.com/anthropics/skills.git", "anthropics/skills", "all"],
        [
            'cd /tmp && npx skills add owner/repo --skill "Convex Best Practices" -a claude-code',
            "owner/repo",
            ["Convex Best Practices"],
        ],
        ["CI=1 npx skills add github:owner/repo#main@one", "owner/repo", ["one"]],
    ])("%s", (command, repo, skills) => {
        expect(skillInstallOf(command)).toMatchObject({kind: "github", repo, skills});
    });

    it("reads a tree URL's ref and path", () => {
        expect(
            skillInstallOf(
                "npx skills add https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines",
            ),
        ).toEqual({
            kind: "github",
            repo: "vercel-labs/agent-skills",
            ref: "main",
            subpath: "skills/web-design-guidelines",
            skills: "all",
        });
        expect(skillInstallOf("npx skills add owner/repo/skills/x")).toMatchObject({
            subpath: "skills/x",
            ref: null,
        });
    });

    it("names a source it does not read", () => {
        for (const source of [
            "https://gitlab.com/org/repo",
            "git@github.com:owner/repo.git",
            "./my-local-skills",
            "/abs/path",
            "~/skills",
            "https://example.com/download/my-skill",
            "https://dev.azure.com/org/project/_git/repo",
        ]) {
            expect(skillInstallOf(`npx skills add ${source}`)).toEqual({kind: "elsewhere", source});
        }
    });

    it("is silent on everything that installs nothing", () => {
        for (const command of [
            "npx skills add anthropics/skills --list",
            "npx skills add anthropics/skills -l",
            "npx skills find video",
            "npx skills add",
            "ls ~/.claude/skills",
            "echo npx skills add owner/repo",
            "npx other-tool add owner/repo",
            "grep -r 'skills add' .",
        ]) {
            expect(skillInstallOf(command), command).toBeNull();
        }
    });

    it("a `-a` list swallows what follows, as the CLI's own parser does", () => {
        expect(skillInstallOf("npx skills add -a claude-code owner/repo")).toBeNull();
    });
});

describe("readSkillInstall", () => {
    it("reads named skills through readPulse and reports their contents", async () => {
        const source = sourceOf({
            "skills/pptx/SKILL.md": skillMd(
                "pptx",
                "Run `python3 scripts/make.py`. Needs `OPENAI_API_KEY`. See https://api.openai.com/v1.",
            ),
            "skills/pptx/scripts/make.py": "import os\nos.environ['OPENAI_API_KEY']\n",
        });
        const install = skillInstallOf("npx skills add anthropics/skills --skill pptx");
        if (install === null) throw new Error("not recognised");
        const read = await readSkillInstall(install, source, never);
        const text = skillInstallReport(read);
        expect(text).toContain(
            "anthropics/skills · pptx (skills/pptx/SKILL.md, 2 files, 12 stars, last push 2026-11-01)",
        );
        expect(text).toContain("OPENAI_API_KEY");
        expect(text).toContain("api.openai.com");
        expect(text).not.toMatch(/safe|suspicious|verdict:/i);
    });

    it("reads the skill's other text files too, before an install, and never a font (task 112)", async () => {
        const source = sourceOf({
            "skills/video/SKILL.md": skillMd("video", "Render a video."),
            "skills/video/scripts/bake.mjs":
                '#!/usr/bin/env node\nconst {default: p} = await import("puppeteer-core");\nexecFileSync("ffmpeg", []);\n',
            "skills/video/references/film.md": "Captions need `GEMINI_API_KEY`.\n",
            "skills/video/assets/Inter.woff2": "\u0000binary",
        });
        const asked: string[] = [];
        const file = source.file;
        source.file = async (repo, path) => {
            asked.push(path);
            return file(repo, path);
        };
        const install = skillInstallOf("npx skills add o/r --skill video");
        if (install === null) throw new Error("not recognised");
        const text = skillInstallReport(await readSkillInstall(install, source, never));
        expect(text).toContain("Before you install: 1 key · 1 paid service · needs Chrome, ffmpeg, node · 1 script");
        expect(text).toContain("GEMINI_API_KEY (references/film.md:1)");
        expect(asked).not.toContain("skills/video/assets/Inter.woff2");
        expect(text).not.toContain("Not read");
    });

    it("stops reading other files when told, and names them not fetched", async () => {
        const source = sourceOf({
            "skills/video/SKILL.md": skillMd("video"),
            "skills/video/references/film.md": "Captions need `GEMINI_API_KEY`.\n",
        });
        const install = skillInstallOf("npx skills add o/r --skill video");
        if (install === null) throw new Error("not recognised");
        const text = skillInstallReport(await readSkillInstall(install, source, never, Promise.resolve()));
        expect(text).toContain("Not read: references/film.md (not fetched)");
        expect(text).toContain("1 file not read");
    });

    it(`reads at most ${MAX_SKILLS_READ} skills and says how many it left`, async () => {
        const files = Object.fromEntries(
            ["a", "b", "c", "d", "e"].map((name) => [`skills/${name}/SKILL.md`, skillMd(name)]),
        );
        const install = skillInstallOf("npx skills add o/r --all");
        if (install === null) throw new Error("not recognised");
        const read = await readSkillInstall(install, sourceOf(files), never);
        expect(read.kind === "github" && read.readings.map((r) => r.skill)).toEqual([
            "a",
            "b",
            "c",
        ]);
        expect(skillInstallReport(read)).toContain(
            "2 more skills in this install not read (ARP reads 3)",
        );
    });

    it("keeps to the path a tree URL names, and says the ref is not followed", async () => {
        const source = sourceOf({
            "skills/x/SKILL.md": skillMd("x"),
            "skills/y/SKILL.md": skillMd("y"),
        });
        const install = skillInstallOf("npx skills add https://github.com/o/r/tree/v2/skills/y");
        if (install === null) throw new Error("not recognised");
        const read = await readSkillInstall(install, source, never);
        expect(read.kind === "github" && read.readings.map((r) => r.skill)).toEqual(["y"]);
        expect(skillInstallReport(read)).toContain("the command names v2");
    });

    it("stops at the deadline and says what it did not read", async () => {
        const slow: PulseSource = {...sourceOf({}), listing: () => new Promise(() => undefined)};
        const install = skillInstallOf("npx skills add o/r --skill one");
        if (install === null) throw new Error("not recognised");
        const read = await readSkillInstall(install, slow, Promise.resolve());
        expect(skillInstallReport(read)).toContain(
            "o/r · one: not read (GitHub did not answer in time)",
        );
    });

    it("names a source elsewhere without asking anything", async () => {
        const source = sourceOf({});
        const install = skillInstallOf("npx skills add https://gitlab.com/org/repo");
        if (install === null) throw new Error("not recognised");
        const read = await readSkillInstall(install, source, never);
        expect(source.asked).toEqual([]);
        expect(skillInstallReport(read)).toContain(
            "https://gitlab.com/org/repo: not read (ARP reads GitHub sources only)",
        );
    });

    it("through githubPulseSource, says the hourly limit when GitHub refuses the list and the usual paths", async () => {
        const fetch = async () =>
            new Response("", {status: 403, headers: {"x-ratelimit-remaining": "0"}});
        const install = skillInstallOf("npx skills add o/r");
        if (install === null) throw new Error("not recognised");
        const read = await readSkillInstall(install, githubPulseSource({fetch}), never);
        expect(skillInstallReport(read)).toContain(
            "o/r: not read (GitHub's hourly limit; GITHUB_TOKEN raises it)",
        );
    });
});
