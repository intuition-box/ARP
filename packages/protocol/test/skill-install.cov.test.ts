import {describe, expect, it} from "vitest";

import type {ListedFile, PulseSource, SkillPulse} from "../src/pulse.js";
import {
    readSkillInstall,
    skillInstallOf,
    skillInstallReport,
    type InstallRead,
    type SkillInstall,
} from "../src/skill-install.js";

const never = new Promise<void>(() => undefined);

const searched = {source: "o/r", skill: "s", installs: null, installsText: null, url: null};

function sourceOf(files: Record<string, string | null>): PulseSource {
    const listed: ListedFile[] = Object.keys(files).map((path) => ({
        path,
        sha: `blob:${path}`,
        size: 1,
    }));
    return {
        listing: async () => ({
            rootTreeId: "tree:root",
            files: listed,
            trees: new Map(),
            truncated: false,
        }),
        file: async (_repo, path) => files[path] ?? null,
        repository: async () => null,
    };
}

function githubInstall(command: string): Extract<SkillInstall, {kind: "github"}> {
    const install = skillInstallOf(command);
    if (install?.kind !== "github") throw new Error(`not a GitHub install: ${command}`);
    return install;
}

describe("skillInstallOf, the shell words", () => {
    it("honours a backslash inside double quotes and outside quotes", () => {
        expect(skillInstallOf('npx skills add o/r --skill "a\\"b" -s c\\ d')).toMatchObject({
            skills: ['a"b', "c d"],
        });
    });

    it("keeps a single-quoted backslash as written, and an empty quoted word", () => {
        expect(skillInstallOf("npx skills add o/r -s 'a\\b' ''")).toMatchObject({
            skills: ["a\\b", ""],
        });
    });

    it("splits commands on a pipe, a semicolon and a newline, and reads the first install", () => {
        expect(skillInstallOf("echo hi | cat; ls\nnpx skills add o/r")).toMatchObject({
            repo: "o/r",
        });
        expect(skillInstallOf("echo done &")).toBeNull();
    });

    it("reads a trailing backslash as a plain character", () => {
        expect(skillInstallOf("npx skills add o/r\\")).toEqual({
            kind: "elsewhere",
            source: "o/r\\",
        });
    });

    it("is not an install for another CLI, another subcommand, a list, or no source", () => {
        expect(skillInstallOf("npx other add o/r")).toBeNull();
        expect(skillInstallOf("npx skills remove o/r")).toBeNull();
        expect(skillInstallOf("npx skills")).toBeNull();
        expect(skillInstallOf("npx skills add o/r --list")).toBeNull();
        expect(skillInstallOf("npx skills add -l o/r")).toBeNull();
        expect(skillInstallOf("npx skills add --all")).toBeNull();
        expect(skillInstallOf("npm run skills add o/r")).toBeNull();
    });

    it("skips --metadata's value and the agent list, and keeps the first source", () => {
        expect(
            skillInstallOf(
                "npx skills add --metadata x.json o/r other/repo --agent claude cursor --subagent a",
            ),
        ).toEqual({kind: "github", repo: "o/r", ref: null, subpath: null, skills: "all"});
    });
});

describe("skillInstallOf, the source forms", () => {
    it.each([
        ["./local"],
        ["../up"],
        ["/abs/path"],
        ["~/home"],
        ["C:\\skills"],
        ["git@github.com:o/r.git"],
        ["https://example.com/skill.zip"],
        ["a b/c"],
        ["just-a-name"],
    ])("reads %s as elsewhere", (source) => {
        expect(skillInstallOf(`npx skills add '${source}'`)).toEqual({kind: "elsewhere", source});
    });

    it("reads a fragment's ref alone, and its skill alone", () => {
        expect(skillInstallOf("npx skills add o/r#v1")).toMatchObject({ref: "v1", skills: "all"});
        expect(skillInstallOf("npx skills add o/r#@one")).toMatchObject({
            ref: null,
            skills: ["one"],
        });
        expect(skillInstallOf("npx skills add o/r#v1@")).toMatchObject({ref: "v1", skills: "all"});
    });

    it("reads a repository URL with a trailing slash, and a fragment's skill on it", () => {
        expect(skillInstallOf("npx skills add https://www.github.com/o/r/#main@x")).toEqual({
            kind: "github",
            repo: "o/r",
            ref: "main",
            subpath: null,
            skills: ["x"],
        });
    });

    it("reads a tree URL with no path, and keeps a fragment's skill over --skill", () => {
        expect(
            skillInstallOf("npx skills add https://github.com/o/r/tree/dev#@only -s other"),
        ).toEqual({
            kind: "github",
            repo: "o/r",
            ref: "dev",
            subpath: null,
            skills: ["only"],
        });
    });

    it("reads owner/repo@skill with a fragment's skill winning", () => {
        expect(skillInstallOf("npx skills add o/r@one#main@two")).toMatchObject({
            ref: "main",
            skills: ["two"],
        });
    });

    it("reads a shorthand's path, refuses one that climbs, and dedupes the names", () => {
        expect(skillInstallOf("npx skills add o/r/skills/x/ -s a -s a")).toMatchObject({
            subpath: "skills/x",
            skills: ["a"],
        });
        expect(skillInstallOf("npx skills add o/r/../etc")).toMatchObject({subpath: null});
    });
});

describe("readSkillInstall", () => {
    it("returns a source elsewhere as it is", async () => {
        const install: SkillInstall = {kind: "elsewhere", source: "./x"};
        expect(await readSkillInstall(install, sourceOf({}), never)).toEqual(install);
    });

    it("says the listing did not answer in time when the deadline passes first", async () => {
        const slow: PulseSource = {...sourceOf({}), listing: () => new Promise(() => undefined)};
        const read = await readSkillInstall(
            githubInstall("npx skills add o/r"),
            slow,
            Promise.resolve(),
        );
        expect(read).toMatchObject({listing: "no answer in time", readings: []});
        expect(skillInstallReport(read)).toContain("o/r: not read (GitHub did not answer in time)");
    });

    it("says the repository did not answer when the listing throws", async () => {
        const broken: PulseSource = {
            ...sourceOf({}),
            listing: async () => {
                throw new Error("socket closed");
            },
        };
        const read = await readSkillInstall(
            githubInstall("npx skills add o/r/skills"),
            broken,
            never,
        );
        expect(read).toMatchObject({listing: "unreachable"});
        expect(skillInstallReport(read)).toContain(
            "o/r/skills: not read (the repository did not answer)",
        );
    });

    it("names a skill by its folder when its file cannot be read, and by the repository at the root", async () => {
        const read = await readSkillInstall(
            githubInstall("npx skills add o/r"),
            sourceOf({"SKILL.md": null, "skills/folder/SKILL.md": null}),
            never,
        );
        expect(read.kind === "github" && read.readings.map((reading) => reading.skill)).toEqual([
            "r",
            "folder",
        ]);
    });

    it("says no SKILL.md was found under a path that holds none", async () => {
        const read = await readSkillInstall(
            githubInstall("npx skills add o/r/empty"),
            sourceOf({"skills/x/SKILL.md": "---\nname: x\n---\n"}),
            never,
        );
        expect(skillInstallReport(read)).toContain("o/r/empty: no SKILL.md found");
    });

    it("reports a skill whose read failed", async () => {
        const failing: PulseSource = {
            ...sourceOf({}),
            listing: async () => {
                throw new Error("down");
            },
        };
        const read = await readSkillInstall(
            githubInstall("npx skills add o/r -s one"),
            failing,
            never,
        );
        expect(read.kind === "github" && read.readings).toEqual([
            {skill: "one", pulse: null, why: "read failed"},
        ]);
        expect(skillInstallReport(read)).toContain("o/r · one: not read (the read failed)");
    });
});

describe("skillInstallReport, each reading", () => {
    const report = (
        pulse: SkillPulse,
        install = githubInstall("npx skills add o/r -s s"),
    ): string => {
        const read: InstallRead = {
            kind: "github",
            install,
            readings: [{skill: "s", pulse}],
            notRead: 1,
            listing: null,
        };
        return skillInstallReport(read);
    };

    it.each<[SkillPulse, string]>([
        [
            {...searched, status: "absent", skillFiles: 1},
            "o/r · s: no SKILL.md in the repository names it (1 skill file read)",
        ],
        [
            {...searched, status: "ambiguous", paths: ["a/SKILL.md", "b/SKILL.md"]},
            "several files carry this name and differ, and which one installs is not knowable here: a/SKILL.md, b/SKILL.md",
        ],
        [
            {...searched, status: "incomplete", reason: "truncated_listing"},
            "not read (GitHub cut the repository's file list)",
        ],
        [
            {...searched, status: "incomplete", reason: "too_many_skill_files"},
            "not read (too many skill files to search)",
        ],
        [
            {...searched, status: "rate_limited"},
            "not read (GitHub's hourly limit; GITHUB_TOKEN raises it)",
        ],
        [
            {...searched, status: "repository_unreachable"},
            "not read (the repository did not answer)",
        ],
        [{...searched, status: "not_github"}, "not read (not a GitHub repository)"],
    ])("%#: says what was not read", (pulse, line) => {
        expect(report(pulse)).toContain(line);
    });

    it("says how many more skills were left, in the singular", () => {
        expect(report({...searched, status: "not_github"})).toContain(
            "1 more skill in this install not read",
        );
    });

    it("names a ref the command gives with the singular file count", async () => {
        const read = await readSkillInstall(
            githubInstall("npx skills add o/r#v9 -s s"),
            sourceOf({"skills/s/SKILL.md": "---\nname: s\n---\nBody\n"}),
            never,
        );
        const text = skillInstallReport(read);
        expect(text).toContain("o/r · s (skills/s/SKILL.md, 1 file)");
        expect(text).toContain("v9");
    });
});
