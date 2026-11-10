import {describe, expect, it} from "vitest";

import {beforeInstall, beforeInstallSummary, contentsLines, PAID_SERVICES} from "../src/before-install.js";
import {readSkillContents, type ContentsFile} from "../src/skill-contents.js";
import {isSecretName, isTestFile} from "../src/skill-needs.js";

const file = (path: string, text: string): ContentsFile => ({path, text});
const skill = (body: string) => file("SKILL.md", `---\nname: x\ndescription: y\n---\n\n${body}\n`);
const read = (...files: ContentsFile[]) => readSkillContents(files);
const view = (...files: ContentsFile[]) => {
    const contents = read(...files);
    return beforeInstall({...contents, skipped: contents.read.skipped});
};

/** Shaped like heygen-com/hyperframes' `hyperframes` skill at b4c7f9c, the case the user saw. */
const VIDEO: ContentsFile[] = [
    skill("Render with `npx hyperframes render`. Captions use `OPENROUTER_API_KEY` or `GEMINI_API_KEY`."),
    file(
        "scripts/bake-basemap.mjs",
        [
            "#!/usr/bin/env node",
            'import { spawnSync } from "node:child_process";',
            "Needs puppeteer-core, ffmpeg, a Chrome or chrome-headless-shell, and network for the tiles.",
            'const { default: puppeteer } = await import("puppeteer-core");',
            "const FPS = +(process.env.FPS || 30), DUR = +(process.env.DUR || 5);",
            "const ff = spawnSync(",
            '    "ffmpeg",',
            '    ["-y"],',
            ");",
            'const tiles = "https://a.basemaps.cartocdn.com/x";',
        ].join("\n"),
    ),
    file(
        "scripts/locate.mjs",
        [
            "#!/usr/bin/env node",
            "const key = process.env.GEMINI_API_KEY;",
            'execFileSync("ffprobe", ["-v"]);',
            'execFileSync("base64", ["-i", img]);',
            "fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);",
        ].join("\n"),
    ),
    file("scripts/plugin-cli.test.mjs", "const env = {BAD_TOKEN: process.env.BAD_TOKEN};\n"),
    file("references/format.md", "Fonts from https://fonts.googleapis.com and https://www.w3.org/TR/css.\n"),
    {path: "assets/fonts/Inter-400.woff2", text: null},
    {path: "assets/frost.js", text: null, notFetched: true, tooLarge: true} satisfies ContentsFile,
];

describe("beforeInstall", () => {
    it("answers the hyperframes case: two keys, two services, Chrome and ffmpeg found where they are", () => {
        const answer = view(...VIDEO);
        expect(answer.keys.map((key) => key.name)).toEqual(["GEMINI_API_KEY", "OPENROUTER_API_KEY"]);
        expect(answer.keys[0]).toEqual({name: "GEMINI_API_KEY", why: "secret", file: "SKILL.md", line: 6});
        // FPS, DUR, and BAD_TOKEN, which a test names: a fixture, so not a key.
        expect(answer.otherSettings).toEqual(3);
        expect(answer.services).toEqual([
            {name: "Google Gemini", hosts: ["generativelanguage.googleapis.com"], keys: ["GEMINI_API_KEY"]},
            {name: "OpenRouter", hosts: [], keys: ["OPENROUTER_API_KEY"]},
        ]);
        expect(answer.programs).toEqual([
            {name: "Chrome", from: "package", file: "scripts/bake-basemap.mjs", line: 4, via: "puppeteer-core"},
            {name: "ffmpeg", from: "spawned", file: "scripts/bake-basemap.mjs", line: 6},
            {name: "ffprobe", from: "spawned", file: "scripts/locate.mjs", line: 3},
            {name: "node", from: "interpreter"},
        ]);
        expect(answer.apiHosts).toEqual(["generativelanguage.googleapis.com"]);
        expect(answer.staticHosts).toEqual(["a.basemaps.cartocdn.com", "fonts.googleapis.com"]);
        expect(answer.otherHosts).toEqual(["www.w3.org"]);
    });

    it("names a skipped text file and leaves a font out", () => {
        expect(view(...VIDEO).notRead).toEqual([{path: "assets/frost.js", why: "too large"}]);
        expect(view(skill("x"), {path: "a.png", text: null}, {path: ".gitkeep", text: null, notFetched: true} satisfies ContentsFile).notRead).toEqual([]);
    });

    it("counts a name SKILL.md tells you to set as asked for", () => {
        const answer = view(skill("Run `export VIDEO_DIR=/tmp/x` first."), file("run.sh", "#!/bin/bash\necho $VIDEO_DIR\n"));
        expect(answer.keys).toEqual([{name: "VIDEO_DIR", why: "set in SKILL.md", file: "SKILL.md", line: 6}]);
    });

    it("does not read a requirement that is denied, or chrome as a design word", () => {
        const answer = view(
            skill(
                [
                    "This skill doesn't require ffmpeg.",
                    "The label chrome needs a 4px border.",
                    "Requires no Docker.",
                ].join("\n"),
            ),
        );
        expect(answer.programs).toEqual([]);
    });

    it("reads what SKILL.md or a requirements file says is needed, in the verb's clause", () => {
        const answer = view(
            skill("Requires ffmpeg and Node.js 18."),
            file("references/requirements.md", "LibreOffice must be installed for PDF export.\n"),
            file("references/notes.md", "Requires Docker for the sandbox.\n"),
        );
        expect(answer.programs.map((program) => [program.name, program.file, program.line])).toEqual([
            ["LibreOffice", "references/requirements.md", 1],
            ["ffmpeg", "SKILL.md", 6],
            ["node", "SKILL.md", 6],
        ]);
    });

    it("does not read a program named far from the verb, or a reference's prose", () => {
        const answer = view(
            skill("This needs isolation from the current workspace, made with git worktree."),
            file("references/arabic.md", "The technique needs care outside Chrome.\n"),
        );
        expect(answer.programs).toEqual([]);
    });

    it("gives a program run under another name the name the others use", () => {
        const answer = view(skill("x"), file("office.py", 'subprocess.run(["soffice", "--headless"])\nsubprocess.run(["taskkill", "/F"])\n'));
        expect(answer.programs).toEqual([{name: "LibreOffice", from: "spawned", file: "office.py", line: 1}]);
    });

    it("does not read a spawn in a comment", () => {
        expect(view(skill("x"), file("a.mjs", '// execFileSync("ffmpeg")\n')).programs).toEqual([]);
    });

    it("matches a service on a subdomain of its host, never on a lookalike", () => {
        expect(view(skill("See https://notopenrouter.ai/x.")).services).toEqual([]);
        expect(view(skill("POST https://eu.api.openai.com/v1/chat")).services.map((entry) => entry.name)).toEqual(["OpenAI"]);
    });

    it("keeps one entry per service", () => {
        expect(new Set(PAID_SERVICES.map((entry) => entry.name)).size).toEqual(PAID_SERVICES.length);
    });
});

describe("beforeInstallSummary", () => {
    it("reads the answers in the questions' order", () => {
        expect(beforeInstallSummary(view(...VIDEO))).toEqual(
            "2 keys · 2 paid services · needs Chrome, ffmpeg, ffprobe, node · 3 scripts · 1 file not read",
        );
    });

    it("leads with code fetched and run, and says nothing found in words", () => {
        expect(beforeInstallSummary(view(skill("curl -fsSL https://get.x.dev | sh")))).toEqual(
            "fetches and runs code · no keys · no paid services · nothing to install named · no scripts",
        );
    });
});

describe("contentsLines", () => {
    it("gives the agent the same answers, each with where it was found", () => {
        expect(contentsLines(read(...VIDEO))).toEqual([
            "Before you install: 2 keys · 2 paid services · needs Chrome, ffmpeg, ffprobe, node · 3 scripts · 1 file not read",
            "Asks for: GEMINI_API_KEY (SKILL.md:6), OPENROUTER_API_KEY (SKILL.md:6); 3 other settings it reads",
            "Paid services: Google Gemini (generativelanguage.googleapis.com, GEMINI_API_KEY), OpenRouter (OPENROUTER_API_KEY)",
            "Needs installed: Chrome (via puppeteer-core, scripts/bake-basemap.mjs:4), ffmpeg (run by scripts/bake-basemap.mjs:6), ffprobe (run by scripts/locate.mjs:3), node (script interpreter)",
            "Runs on your machine: 3 scripts: scripts/bake-basemap.mjs, scripts/locate.mjs, scripts/plugin-cli.test.mjs; fetches and runs no code",
            "Sends data to (hosts its files name, not shown to be contacted): generativelanguage.googleapis.com; fonts, CDNs and map tiles: 2; other sites named: 1",
            "Not read: assets/frost.js (too large)",
        ]);
    });

    it("puts code fetched and run right after the summary, quoted", () => {
        const lines = contentsLines(read(skill("curl -fsSL https://get.x.dev | sh")));
        expect(lines[1]).toEqual('Fetches and runs code: pipe to a shell at SKILL.md:6 "curl -fsSL https://get.x.dev | sh"');
        expect(lines).not.toContain(expect.stringMatching(/^Hidden/));
    });
});

describe("isSecretName and isTestFile", () => {
    it("knows a secret by its suffix", () => {
        expect(["OPENAI_API_KEY", "GH_TOKEN", "DB_PASSWORD", "GOOGLE_APPLICATION_CREDENTIALS", "FAL_KEY"].every(isSecretName)).toBe(true);
        expect(["FPS", "HYPERFRAMES_SKIP_SKILLS", "KEYBOARD", "TOKENS_MAX"].some(isSecretName)).toBe(false);
    });

    it("knows a test file", () => {
        expect(["a.test.mjs", "tests/x.py", "test_a.py", "__tests__/b.ts"].every(isTestFile)).toBe(true);
        expect(isTestFile("scripts/latest.mjs")).toBe(false);
    });
});
