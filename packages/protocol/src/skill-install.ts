/**
 * A skills install, recognised in a shell command and read before it runs (task 98, ADR `0167`).
 *
 * The user's decision, 2026-11-10: an agent installs skills on its own, so the moment `npx skills add`
 * is about to run is the moment a person should see what the skill contains. The runtime hook calls
 * `skillInstallOf` on the command and, when it is an install, `readSkillInstall` and
 * `skillInstallReport`. **Facts, never a verdict, and nothing blocks** (ADR `0165`).
 *
 * ## What is recognised
 *
 * The `skills` CLI's `add` command and its aliases `a`, `install` and `i` (skills 1.7.4,
 * `dist/cli.mjs`), launched bare or through `npx`, `pnpx`, `bunx`, `pnpm dlx`, `yarn dlx` or `npm exec`, with
 * or without a version (`skills@1.7.4`) and launcher flags (`npx -y`). The source is read the way
 * the CLI's `parseSource` reads it, for the GitHub forms only:
 *
 * ```
 * owner/repo                         every skill, or those --skill names
 * owner/repo@skill                   one skill
 * owner/repo/sub/path                the skills under that path
 * https://github.com/o/r[.git]       as owner/repo
 * https://github.com/o/r/tree/<ref>[/<path>]
 * github:owner/repo                  as owner/repo
 * <any of these>#<ref>[@skill]       the fragment the CLI reads
 * ```
 *
 * GitLab, Azure, `git@` and `ssh://` URLs, local paths and direct download URLs are `elsewhere`:
 * named, and not read. `--list` installs nothing, so it is not an install.
 *
 * ## What is read
 *
 * At most `MAX_SKILLS_READ` skills, through `readPulse`, at the default branch's `HEAD`. A `ref` the
 * command names is reported, not followed: `readPulse` reads `HEAD`, and a reader is told so.
 *
 * Pure apart from the `PulseSource` the caller passes: no clock, no chain, no file.
 */
import {skillFilesIn} from "./content-path.js";
import {contentsLines} from "./before-install.js";
import {frontmatterName, readPulse, type PulseSource, type SkillPulse} from "./pulse.js";

export type SkillInstall =
    | {
          kind: "github";
          /** `owner/repo`. */
          repo: string;
          /** A branch, tag or commit the command names. Reported, not followed. */
          ref: string | null;
          /** A path inside the repository the command narrows to. */
          subpath: string | null;
          /** The names asked for, or `all` for `--all`, `--skill '*'`, or no name at all. */
          skills: string[] | "all";
      }
    | {kind: "elsewhere"; source: string};

/** Beyond this many skills the hook reads none of the rest and says how many it left. */
export const MAX_SKILLS_READ = 3;

const ADD = new Set(["add", "a", "install", "i"]);
const RUNNERS = new Set(["npx", "pnpx", "bunx"]);
/** A package manager's own one-off runner: `pnpm dlx`, `yarn dlx`, `npm exec`, `npm x`. */
const DLX: Record<string, readonly string[]> = {pnpm: ["dlx"], yarn: ["dlx"], npm: ["exec", "x"]};
const SKILLS = /^skills(@[\w.^~<>=*-]+)?$/;
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * Words and operators, the way a POSIX shell splits them: quotes and backslashes are honoured,
 * `&&`, `||`, `;`, `|`, `&` and a newline end a command. Nothing is expanded.
 */
function shellWords(command: string): string[][] {
    const commands: string[][] = [[]];
    let word: string | null = null;
    let quote: "'" | '"' | null = null;
    const end = () => {
        if (word !== null) commands[commands.length - 1]?.push(word);
        word = null;
    };
    for (let at = 0; at < command.length; at += 1) {
        const char = command[at] ?? "";
        if (quote !== null) {
            if (char === quote) quote = null;
            else if (char === "\\" && quote === '"' && at + 1 < command.length)
                word = (word ?? "") + command[(at += 1)];
            else word = (word ?? "") + char;
        } else if (char === "'" || char === '"') {
            quote = char;
            word ??= "";
        } else if (char === "\\" && at + 1 < command.length) {
            word = (word ?? "") + command[(at += 1)];
        } else if (/\s/.test(char) && char !== "\n") {
            end();
        } else if (char === "\n" || char === ";" || char === "&" || char === "|") {
            end();
            commands.push([]);
        } else {
            word = (word ?? "") + char;
        }
    }
    end();
    return commands.filter((words) => words.length > 0);
}

/** The `skills` subcommand's arguments, when `words` launches the CLI's `add`, or `null`. */
function addArguments(words: readonly string[]): string[] | null {
    let at = 0;
    while (at < words.length && ENV_ASSIGNMENT.test(words[at] ?? "")) at += 1;
    const first = words[at];
    if (first !== undefined && RUNNERS.has(first)) at += 1;
    else if (first !== undefined && DLX[first]?.includes(words[at + 1] ?? "") === true) at += 2;
    // Launcher flags (`npx -y`, `npx --yes`) sit between the launcher and the package.
    while (at < words.length && (words[at] ?? "").startsWith("-")) at += 1;
    if (!SKILLS.test(words[at] ?? "")) return null;
    const subcommand = words[at + 1];
    return subcommand !== undefined && ADD.has(subcommand) ? words.slice(at + 2) : null;
}

/** `--skill` and `-a` take every word up to the next flag, as the CLI's `parseAddOptions` does. */
function parseAdd(args: readonly string[]): {
    source: string | null;
    skills: string[];
    all: boolean;
    list: boolean;
} {
    const skills: string[] = [];
    let source: string | null = null;
    let all = false;
    let list = false;
    for (let at = 0; at < args.length; at += 1) {
        const arg = args[at] ?? "";
        if (arg === "--all") all = true;
        else if (arg === "-l" || arg === "--list") list = true;
        else if (
            arg === "-s" ||
            arg === "--skill" ||
            arg === "-a" ||
            arg === "--agent" ||
            arg === "--subagent"
        ) {
            while (at + 1 < args.length && !(args[at + 1] ?? "").startsWith("-")) {
                at += 1;
                if (arg === "-s" || arg === "--skill") skills.push(args[at] ?? "");
            }
        } else if (arg === "--metadata") at += 1;
        else if (!arg.startsWith("-") && source === null) source = arg;
    }
    return {source, skills, all, list};
}

const NAME = /^[\w.-]+$/;

function github(
    repo: string,
    ref: string | null,
    subpath: string | null,
    named: string[],
    all: boolean,
): SkillInstall {
    const [owner, name] = repo.split("/");
    const clean = `${owner}/${(name ?? "").replace(/\.git$/, "")}`;
    const path = subpath?.replace(/^\/+|\/+$/g, "") ?? "";
    return {
        kind: "github",
        repo: clean,
        ref,
        subpath: path === "" || path.split("/").includes("..") ? null : path,
        skills: all || named.length === 0 || named.includes("*") ? "all" : [...new Set(named)],
    };
}

/** The source as the CLI resolves it, for the GitHub forms; anything else is `elsewhere`. */
function sourceOf(input: string, named: string[], all: boolean): SkillInstall {
    const elsewhere: SkillInstall = {kind: "elsewhere", source: input};
    if (/^(\.{1,2}(\/|$)|\/|~)/.test(input) || /^[A-Za-z]:[\\/]/.test(input)) return elsewhere;

    const hash = input.indexOf("#");
    let rest = hash === -1 ? input : input.slice(0, hash);
    const fragment = hash === -1 ? "" : input.slice(hash + 1);
    const fragmentAt = fragment.indexOf("@");
    let ref: string | null = (fragmentAt === -1 ? fragment : fragment.slice(0, fragmentAt)) || null;
    const fragmentSkill = fragmentAt === -1 ? null : fragment.slice(fragmentAt + 1) || null;
    const withSkill = (names: string[]) => (fragmentSkill === null ? names : [fragmentSkill]);

    const prefixed = /^github:(.+)$/.exec(rest);
    if (prefixed?.[1] !== undefined) rest = prefixed[1];

    const tree =
        /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/.exec(rest);
    if (tree !== null) {
        ref = tree[3] ?? ref;
        return github(`${tree[1]}/${tree[2]}`, ref, tree[4] ?? null, withSkill(named), all);
    }
    const url = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)\/?$/.exec(rest);
    if (url !== null) return github(`${url[1]}/${url[2]}`, ref, null, withSkill(named), all);
    if (rest.includes(":")) return elsewhere;

    const at = /^([^/]+)\/([^/@]+)@(.+)$/.exec(rest);
    if (at !== null)
        return github(`${at[1]}/${at[2]}`, ref, null, [fragmentSkill ?? at[3] ?? ""], false);
    const shorthand = /^([^/]+)\/([^/]+?)(?:\/(.+?))?\/?$/.exec(rest);
    if (shorthand !== null && NAME.test(shorthand[1] ?? "") && NAME.test(shorthand[2] ?? "")) {
        return github(
            `${shorthand[1]}/${shorthand[2]}`,
            ref,
            shorthand[3] ?? null,
            withSkill(named),
            all,
        );
    }
    return elsewhere;
}

/**
 * The install a shell command runs, or `null` when it runs none. The first install in a compound
 * command is the one read: a second is rare enough that saying nothing of it is the honest cost.
 */
export function skillInstallOf(command: string): SkillInstall | null {
    for (const words of shellWords(command)) {
        const args = addArguments(words);
        if (args === null) continue;
        const add = parseAdd(args);
        if (add.list || add.source === null) continue;
        return sourceOf(add.source, add.skills, add.all);
    }
    return null;
}

/** One skill's reading, or why there is none. */
export type InstallReading =
    | {skill: string; pulse: SkillPulse}
    | {skill: string; pulse: null; why: "no answer in time" | "read failed"};

export type InstallRead =
    | {kind: "elsewhere"; source: string}
    | {
          kind: "github";
          install: Extract<SkillInstall, {kind: "github"}>;
          readings: InstallReading[];
          /** Skills the install takes that were not read, past `MAX_SKILLS_READ`. */
          notRead: number;
          /** The listing failed, so the skills were never counted. */
          listing: "rate_limited" | "unreachable" | "no answer in time" | null;
      };

/** Skill files under the install's path, shallowest first, so a repository's own skill leads. */
async function namesUnder(
    install: Extract<SkillInstall, {kind: "github"}>,
    source: PulseSource,
): Promise<{names: string[]; total: number} | "rate_limited" | "unreachable"> {
    const listing = await source.listing(install.repo);
    if (listing === "rate_limited" || listing === "unreachable") return listing;
    const prefix = install.subpath === null ? "" : `${install.subpath}/`;
    const files = skillFilesIn(listing.files)
        .filter((file) => file.path.startsWith(prefix))
        .sort(
            (a, b) =>
                a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path),
        );
    const names = await Promise.all(
        files.slice(0, MAX_SKILLS_READ).map(async (file) => {
            const markdown = await source.file(install.repo, file.path);
            const parts = file.path.split("/");
            return (
                (markdown === null ? null : frontmatterName(markdown)) ??
                parts.at(-2) ??
                install.repo.split("/")[1] ??
                ""
            );
        }),
    );
    return {names, total: files.length};
}

/**
 * Read what the install would take, within `deadline`: a promise that settles when time is up. A
 * reading still running then is reported as `no answer in time`, never waited for.
 */
export async function readSkillInstall(
    install: SkillInstall,
    source: PulseSource,
    deadline: Promise<void>,
    /** Stop reading the skills' other files then, so the reading lands before `deadline` (task 112). */
    directoryBy: Promise<void> = deadline,
): Promise<InstallRead> {
    if (install.kind === "elsewhere") return install;
    const late = deadline.then(() => "late" as const);

    let names: string[];
    let total: number;
    if (install.skills === "all") {
        const found = await Promise.race([
            namesUnder(install, source).catch(() => "unreachable" as const),
            late,
        ]);
        if (found === "late")
            return {
                kind: "github",
                install,
                readings: [],
                notRead: 0,
                listing: "no answer in time",
            };
        if (found === "rate_limited" || found === "unreachable") {
            return {kind: "github", install, readings: [], notRead: 0, listing: found};
        }
        ({names, total} = found);
    } else {
        names = install.skills.slice(0, MAX_SKILLS_READ);
        total = install.skills.length;
    }

    const readings = await Promise.all(
        names.map(async (skill): Promise<InstallReading> => {
            const pulse = readPulse(
                {source: install.repo, skill, installs: null, installsText: null, url: null},
                source,
                {directory: {by: directoryBy}},
            )
                .then((read) => ({skill, pulse: read}))
                .catch((): InstallReading => ({skill, pulse: null, why: "read failed"}));
            const settled = await Promise.race([pulse, late]);
            return settled === "late" ? {skill, pulse: null, why: "no answer in time"} : settled;
        }),
    );
    return {
        kind: "github",
        install,
        readings,
        notRead: Math.max(0, total - names.length),
        listing: null,
    };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** One skill's block: a heading, then `contentsLines` or the reason nothing was read. */
function readingLines(repo: string, reading: InstallReading): string[] {
    const head = `${repo} · ${reading.skill}`;
    const {pulse} = reading;
    if (pulse === null)
        return [
            `${head}: not read (${reading.why === "no answer in time" ? "GitHub did not answer in time" : "the read failed"})`,
        ];
    switch (pulse.status) {
        case "read": {
            const facts = [
                `${pulse.path}`,
                plural(pulse.files, "file"),
                ...(pulse.repository === null
                    ? []
                    : [
                          plural(pulse.repository.stars, "star"),
                          ...(pulse.repository.pushedAt === null
                              ? []
                              : [`last push ${pulse.repository.pushedAt.slice(0, 10)}`]),
                          ...(pulse.repository.archived ? ["archived"] : []),
                      ]),
            ];
            return [
                `${head} (${facts.join(", ")})`,
                ...contentsLines(pulse.contains).map((line) => `  ${line}`),
                ...(pulse.differsAt.length === 0
                    ? []
                    : [`  Other files carry this name and differ: ${pulse.differsAt.join(", ")}`]),
            ];
        }
        case "read_file_only":
            return [
                `${head} (${pulse.path}; GitHub's hourly limit was reached, so SKILL.md alone was read, not its scripts)`,
                ...contentsLines(pulse.contains).map((line) => `  ${line}`),
            ];
        case "absent":
            return [
                `${head}: no SKILL.md in the repository names it (${plural(pulse.skillFiles, "skill file")} read)`,
            ];
        case "ambiguous":
            return [
                `${head}: several files carry this name and differ, and which one installs is not knowable here: ${pulse.paths.join(", ")}`,
            ];
        case "incomplete":
            return [
                `${head}: not read (${pulse.reason === "truncated_listing" ? "GitHub cut the repository's file list" : "too many skill files to search"})`,
            ];
        case "rate_limited":
            return [`${head}: not read (GitHub's hourly limit; GITHUB_TOKEN raises it)`];
        case "repository_unreachable":
            return [`${head}: not read (the repository did not answer)`];
        case "not_github":
            return [`${head}: not read (not a GitHub repository)`];
    }
}

/**
 * The text shown to the person and given to the agent. Every line is something the files say or something that could not be read; none is a judgement.
 */
export function skillInstallReport(read: InstallRead): string {
    const title =
        "ARP read this skill before the install (what its own files contain; facts, not a verdict):";
    if (read.kind === "elsewhere") {
        return `${title}\n${read.source}: not read (ARP reads GitHub sources only)`;
    }
    const {install} = read;
    const lines = [title];
    if (read.listing !== null) {
        const why =
            read.listing === "rate_limited"
                ? "GitHub's hourly limit; GITHUB_TOKEN raises it"
                : read.listing === "no answer in time"
                  ? "GitHub did not answer in time"
                  : "the repository did not answer";
        lines.push(
            `${install.repo}${install.subpath === null ? "" : `/${install.subpath}`}: not read (${why})`,
        );
    } else if (read.readings.length === 0) {
        lines.push(
            `${install.repo}${install.subpath === null ? "" : `/${install.subpath}`}: no SKILL.md found`,
        );
    }
    for (const reading of read.readings) lines.push(...readingLines(install.repo, reading));
    if (read.notRead > 0)
        lines.push(
            `${plural(read.notRead, "more skill")} in this install not read (ARP reads ${MAX_SKILLS_READ})`,
        );
    if (install.ref !== null)
        lines.push(`Read at the default branch's HEAD; the command names ${install.ref}.`);
    return lines.join("\n");
}
