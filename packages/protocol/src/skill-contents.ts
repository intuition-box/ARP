/**
 * What a skill contains, read from its own files before anyone installs it (task 96, ADR `0165`).
 *
 * The user's decision, 2026-11-10: agents act on their own, so a person must see what is inside a
 * skill before letting the agent install it. This is that reading. **Facts, never a verdict**: every
 * entry is something the files say, with the file and the line, and nothing here says a skill is safe,
 * suspicious or needs anything (ADR `0046`, ADR `0127`). Nothing blocks an install on it.
 *
 * Six readings:
 *
 * - **programs**: what SKILL.md declares (`metadata.requires.bins`, `allowed-tools: Bash(x)`), what
 *   its shell instructions run (`readRequires`), a shipped script's interpreter (`#!`), and what a
 *   script installs with a system package manager or probes for at a statement's start
 *   (`brew install x`, `command -v x`, `$(which x)`); a comment is not read. Packages a language manager installs
 *   (`pip install`, `requirements.txt`, `npm install -g`) are listed apart as `packages`.
 * - **settings**: names of environment variables the files read or tell you to set
 *   (`process.env.X`, `os.getenv("X")`, `$X` in a script, `export X=` in the instructions, a
 *   `…_API_KEY` named in prose). Names only, never a value.
 * - **scripts**: the files a runtime could execute, and whether SKILL.md names each one.
 * - **fetchAndRun**: a line that fetches code and runs it at once: `curl … | sh`, `bash <(curl …)`,
 *   `iex (irm …)`, `pip install` of a URL, `npx -y`, `uvx`, `deno run https://…`.
 * - **domains**: the hosts named in URLs in the files. Placeholders (`example.com`, `localhost`) are
 *   left out; everything else is a host the files name, not one shown to be contacted.
 * - **hidden**: in Markdown, text a person reading the rendered page would not see or could not read:
 *   invisible or direction-changing characters, a long base64 block, an HTML comment with words in it,
 *   and a sentence telling the agent to ignore its instructions or to keep something from the person.
 *
 * Pure: no network, no clock, no chain. The caller supplies the files; `contentsFileOf` decodes bytes.
 * Every list is bounded and sorted, so the same files always give the same answer.
 */
import {readRequires} from "./skill-requires.js";
import {keysIn, programsNeededIn, type SkillKey} from "./skill-needs.js";

/**
 * One file of a skill's directory, its path relative to it. `text` is `null` for a binary file, or,
 * with `notFetched`, for a file the caller listed and did not read: it is named, never guessed at.
 */
export type ContentsFile = {path: string; text: string | null; notFetched?: true; tooLarge?: true};

/** A line of a file, kept so a person can open it: the file, its 1-based number, the text trimmed. */
export type ContentsLine = {file: string; line: number; text: string};

/** `spawned`, `package` and `named as needed` are `skill-needs.ts`'s (task 112). */
export type ProgramSource = "declared" | "runs" | "interpreter" | "script" | "spawned" | "package" | "named as needed";

/** A program, how it was found, and, for the readings that have one, its line and the package that drives it. */
export type ContentsProgram = {name: string; from: ProgramSource; file?: string; line?: number; via?: string};

export type HiddenKind =
    | "hidden characters"
    | "encoded block"
    | "HTML comment"
    | "says to ignore instructions"
    | "says not to tell the person";

export type FetchAndRunKind =
    | "pipe to a shell"
    | "runs a downloaded script"
    | "installs from a URL"
    | "runs a package fetched at run time";

export type SkippedFile = {path: string; why: "binary" | "too large" | "over the file limit" | "not fetched"};

export type SkillContents = {
    programs: ContentsProgram[];
    packages: {manager: string; name: string}[];
    settings: string[];
    /** The settings a person hands it: a secret by its name, or one SKILL.md says to set (task 112). */
    keys: SkillKey[];
    scripts: {path: string; namedInSkillMd: boolean}[];
    fetchAndRun: (ContentsLine & {kind: FetchAndRunKind})[];
    domains: string[];
    hidden: (ContentsLine & {kind: HiddenKind})[];
    /** What was read, so "none found" and "not read" stay two answers. */
    read: {files: number; bytes: number; skipped: SkippedFile[]};
    /** The lists cut at `CONTENTS_LIMITS.items`, by name, so a reader knows there is more. */
    cut: string[];
};

/** Beyond these, the reading stops and says so. */
export const CONTENTS_LIMITS = {
    files: 200,
    /** Per file, in characters. A longer file is skipped and named, never half-read. */
    fileChars: 512 * 1024,
    items: 40,
    lineChars: 160,
} as const;

const SCRIPT = /\.(sh|bash|zsh|py|js|mjs|cjs|ts|rb|pl|ps1|php|lua)$/i;
const MARKDOWN = /\.(md|mdx|markdown)$/i;
const FENCE = /^\s*(?:```|~~~)/;

/** Decode one file's bytes; `null` text when it holds a NUL in its first 8 KB (git's own test). */
export function contentsFileOf(path: string, bytes: Uint8Array): ContentsFile {
    if (bytes.subarray(0, 8192).includes(0)) return {path, text: null};
    return {path, text: new TextDecoder("utf-8", {fatal: false}).decode(bytes)};
}

function cap(text: string): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > CONTENTS_LIMITS.lineChars ? `${flat.slice(0, CONTENTS_LIMITS.lineChars - 1)}…` : flat;
}

function compare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

// ------------------------------------------------------------------ programs and packages --

/** On every machine, so naming them as an interpreter tells a reader nothing. */
const BASE_SHELLS = new Set(["sh", "bash", "zsh", "dash"]);

function interpreterOf(firstLine: string): string | null {
    const match = /^#!\s*(\S+)(?:\s+(?:-\S+\s+)*(\S+))?/.exec(firstLine);
    if (match === null) return null;
    const binary = match[1]?.split("/").pop() ?? "";
    const name = binary === "env" ? (match[2] ?? "") : binary;
    return /^[a-z][\w.-]*$/i.test(name) && !BASE_SHELLS.has(name) ? name : null;
}

/** A probe where a statement starts, so "check which is installed" in a string names nothing. */
const SCRIPT_PROBE = /(?:^|[;&|(!{]|\bif|\bthen|\$\()\s*(?:!\s*)?(?:command\s+-v|which|type\s+-p|hash)\s+([a-z][\w.+-]*)/g;
const SYSTEM_INSTALL =
    /\b(?:brew|apt-get|apt|dnf|yum|apk|pacman|choco|winget|scoop|port)\s+(?:install|add|-S)\s+(?:-\S+\s+)*([a-z][\w.+-]*)/g;
const COMMENT_LINE = /^\s*(?:#|\/\/|\*|--|;|rem\s)/i;

/** Python's own probe, the one a non-shell script uses: `shutil.which("ffmpeg")`. */
const PYTHON_PROBE = /\bshutil\.which\(\s*["']([a-z][\w.+-]*)["']/g;

/**
 * What a script line probes for or installs with a system package manager. A shell probe is read only
 * in a shell script: in JavaScript or Python, `which` and `hash` are ordinary variable names.
 */
function programsInScriptLine(line: string, shell: boolean): string[] {
    if (COMMENT_LINE.test(line)) return [];
    const matches = shell ? [...line.matchAll(SCRIPT_PROBE), ...line.matchAll(SYSTEM_INSTALL)] : [...line.matchAll(PYTHON_PROBE)];
    return matches.map((match) => match[1] ?? "").filter((name) => name !== "");
}

const PACKAGE_INSTALL =
    /\b(pip3?|pipx|uv\s+pip|uv\s+add|poetry\s+add|npm|pnpm|yarn|bun|gem|cargo)\s+(?:install|add|i)\b([^\n|;&#`)]*)/gi;

/** `pip install a "b>=1"` gives `a`, `b`; a flag, a URL, a path and a placeholder give nothing. */
function packagesIn(line: string): {manager: string; name: string}[] {
    const out: {manager: string; name: string}[] = [];
    for (const match of line.matchAll(PACKAGE_INSTALL)) {
        const manager = (match[1] ?? "").replace(/\s+/g, " ").toLowerCase();
        for (const raw of (match[2] ?? "").trim().split(/\s+/)) {
            const word = raw.replace(/^["']|["']$/g, "");
            if (word === "" || word.startsWith("-") || word.startsWith(".") || /[:\\<>{}$]/.test(word)) continue;
            // `pip install -r requirements.txt` names a file, read on its own when the skill ships it.
            if (/\.(txt|toml|json|cfg|lock|whl|tgz|tar\.gz|zip)$/i.test(word)) continue;
            const name = word.replace(/[=<>!~[].*$/, "");
            if (/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(@[\w.^~-]+)?$/i.test(name)) out.push({manager, name});
        }
    }
    return out;
}

/** `requirements.txt`: one package per line, before its version or its marker. */
function requirementsIn(text: string): string[] {
    return text
        .split("\n")
        .map((line) => line.replace(/#.*/, "").trim())
        .filter((line) => line !== "" && !line.startsWith("-") && !/^(https?|git\+)/.test(line))
        .map((line) => /^[A-Za-z0-9][\w.-]*/.exec(line)?.[0] ?? "")
        .filter((name) => name !== "");
}

// ------------------------------------------------------------------ settings --

/** Set by the shell itself or by every login, so a script reading them reads nothing of yours. */
const SHELL_VARIABLES = new Set(
    (
        "HOME PATH PWD OLDPWD USER LOGNAME SHELL TERM LANG LC_ALL TMPDIR TMP TEMP HOSTNAME IFS PS1 PS2 " +
        "RANDOM SECONDS LINENO BASH_SOURCE BASH_VERSION FUNCNAME PIPESTATUS OPTARG OPTIND EUID UID PPID " +
        "REPLY EDITOR VISUAL PAGER DISPLAY XDG_CONFIG_HOME XDG_DATA_HOME XDG_CACHE_HOME CI NODE_ENV DEBUG"
    ).split(" "),
);

const READS_IN_CODE = [
    /\bprocess\.env\.([A-Z][A-Z0-9_]+)/g,
    /\bprocess\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g,
    /\bBun\.env\.([A-Z][A-Z0-9_]+)/g,
    /\bDeno\.env\.get\(\s*["']([A-Z][A-Z0-9_]+)["']/g,
    /\bimport\.meta\.env\.([A-Z][A-Z0-9_]+)/g,
    /\bos\.environ\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g,
    /\b(?:os\.environ\.get|os\.getenv|getenv|environ\.get)\(\s*["']([A-Z][A-Z0-9_]+)["']/g,
    /\bENV(?:\.fetch\(|\[)\s*["']([A-Z][A-Z0-9_]+)["']/g,
    /\$env:([A-Za-z][A-Za-z0-9_]+)/g,
];
/** `$NAME`, `${NAME}`, `${NAME:-x}`: names shell code reads, unless it assigned them itself. */
const SHELL_READ = /\$\{?([A-Z][A-Z0-9_]{2,})\b/g;
const SHELL_ASSIGN = /^\s*(?:export\s+|local\s+|readonly\s+|declare\s+(?:-\w+\s+)?)?([A-Z][A-Z0-9_]*)=/;
const SHELL_LOOP = /\b(?:for|read(?:\s+-\w+)*)\s+([A-Z][A-Z0-9_]*)\b/g;
/** In instructions: what a person is told to set, and a key named in prose. */
const EXPORT_IN_PROSE = /\bexport\s+([A-Z][A-Z0-9_]{2,})=/g;
const KEY_NAMED = /\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:API_KEY|APIKEY|KEY|TOKEN|SECRET|PASSWORD))\b/g;

function shellReads(lines: readonly string[]): string[] {
    const assigned = new Set<string>();
    for (const line of lines) {
        const name = SHELL_ASSIGN.exec(line)?.[1];
        if (name !== undefined) assigned.add(name);
        for (const loop of line.matchAll(SHELL_LOOP)) assigned.add(loop[1] ?? "");
    }
    return lines.flatMap((line) => [...line.matchAll(SHELL_READ)].map((match) => match[1] ?? "")).filter(
        (name) => !assigned.has(name),
    );
}

function isShell(path: string, text: string): boolean {
    return /\.(sh|bash|zsh)$/i.test(path) || /^#!\s*\S*\/(?:env\s+)?(?:ba|z|da)?sh\b/.test(text);
}

function settingsIn(path: string, text: string, code: readonly string[]): string[] {
    const found = new Set<string>();
    for (const pattern of READS_IN_CODE) {
        for (const match of text.matchAll(pattern)) found.add((match[1] ?? "").toUpperCase());
    }
    if (MARKDOWN.test(path)) {
        for (const match of text.matchAll(EXPORT_IN_PROSE)) found.add(match[1] ?? "");
        // A key named in prose is a setting; in code the same shape is as often a constant's name. A
        // `$NAME` in an example block is as often the example's own variable, so it is not read here.
        for (const match of text.matchAll(KEY_NAMED)) found.add(match[1] ?? "");
    } else if (isShell(path, text)) {
        for (const name of shellReads(code)) found.add(name);
    }
    return [...found].filter((name) => name.length > 0 && !SHELL_VARIABLES.has(name));
}

/**
 * The lines a runtime could run: a script whole, and in Markdown the fenced blocks and the inline
 * code. Prose is left out, because "pip install the package" names no package.
 */
function codeOf(path: string, text: string, isScript: boolean): string[] {
    const lines = text.split("\n");
    if (isScript) return lines;
    if (!MARKDOWN.test(path)) return [];
    const out: string[] = [];
    let fenced = false;
    for (const line of lines) {
        if (FENCE.test(line)) {
            fenced = !fenced;
            continue;
        }
        if (fenced) out.push(line);
        else for (const inline of line.matchAll(/`([^`]+)`/g)) out.push(inline[1] ?? "");
    }
    return out;
}

// ------------------------------------------------------------------ fetch and run --

const FETCH_AND_RUN: readonly {kind: FetchAndRunKind; pattern: RegExp}[] = [
    {
        kind: "pipe to a shell",
        pattern:
            /\b(?:curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^|\n]*\|\s*(?:sudo\s+(?:-\S+\s+)*)?(?:sh|bash|zsh|dash|python3?|node|perl|ruby|iex|Invoke-Expression)\b/i,
    },
    {
        kind: "runs a downloaded script",
        pattern:
            /\b(?:sh|bash|zsh|source)\s+<\(\s*(?:curl|wget)\b|\b(?:sh|bash|zsh)\s+-c\s+["']?\$\(\s*(?:curl|wget)\b|\b(?:iex|Invoke-Expression)\b[^\n]*\b(?:irm|iwr|Invoke-WebRequest|Invoke-RestMethod|DownloadString)\b|\bdeno\s+run\b[^\n]*\bhttps?:\/\//i,
    },
    {
        kind: "installs from a URL",
        pattern: /\b(?:pip3?|pipx|uv\s+pip|npm|pnpm|yarn|bun|gem)\s+(?:install|add|i)\b[^\n|;&]*\s(?:https?:\/\/|git\+|github:)/i,
    },
    {
        kind: "runs a package fetched at run time",
        // Not `bunx` or a plain `npx`: both run a project's own installed binary first.
        pattern: /\bnpx\s+(?:-y|--yes)\b|\b(?:pnpm|yarn)\s+dlx\s+\S|\buvx\s+[a-z]|\bpipx\s+run\s+[a-z]/i,
    },
];

// ------------------------------------------------------------------ domains --

const URL_HOST = /\bhttps?:\/\/([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)/gi;
const PLACEHOLDER_HOST =
    /(^|\.)(example\.(com|org|net)|localhost|local|test|invalid|example|internal)$|^(127\.\d+\.\d+\.\d+|0\.0\.0\.0)$|^(www\.)?(your|my)-?(domain|site|server|host|app|api|company|website)\./;
const FILE_LIKE_HOST = /\.(jpe?g|png|gif|webp|svg|mp[34]|wav|mov|webm|pdf|md|json|txt|html?|js|ts|py|sh)$/;

function domainsIn(text: string): string[] {
    const out: string[] = [];
    for (const match of text.matchAll(URL_HOST)) {
        const host = (match[1] ?? "").toLowerCase();
        if (!/\.[a-z]{2,}$/.test(host) && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) continue;
        if (PLACEHOLDER_HOST.test(host) || FILE_LIKE_HOST.test(host)) continue;
        out.push(host);
    }
    return out;
}

// ------------------------------------------------------------------ hidden --

/**
 * Characters that print as nothing or that reorder what is printed: zero-width spaces and joiners,
 * word joiners and invisible operators, a byte-order mark past the start, the Mongolian vowel
 * separator, bidirectional embeddings, overrides and isolates, Unicode tags (which carry ASCII nobody
 * sees) and the supplementary variation selectors (U+E0000 to U+E01EF, written as their surrogates).
 * A zero-width joiner between two pictographs is how an emoji is built, so it is not counted there.
 */
const INVISIBLE = /[​-‍⁠-⁤﻿᠎‪-‮⁦-⁩]|\uDB40[\uDC00-\uDDEF]/g;
const PICTOGRAPH = /\p{Extended_Pictographic}/u;

function codePoint(point: number): string {
    return `U+${point.toString(16).toUpperCase().padStart(4, "0")}`;
}

function invisibleIn(line: string, lineIndex: number): string | null {
    const counts = new Map<string, number>();
    const spelled: string[] = [];
    for (const match of line.matchAll(INVISIBLE)) {
        const char = match[0];
        const at = match.index;
        if (lineIndex === 0 && at === 0 && char === "﻿") continue;
        if (char === "‍") {
            const before = [...line.slice(0, at)].at(-1) ?? "";
            const after = [...line.slice(at + 1)][0] ?? "";
            if (PICTOGRAPH.test(before) && PICTOGRAPH.test(after)) continue;
        }
        const point = char.codePointAt(0) ?? 0;
        // A Unicode tag mirrors ASCII 0x20–0x7E at 0xE0020–0xE007E: what it says, spelled out.
        if (point >= 0xe0020 && point <= 0xe007e) spelled.push(String.fromCharCode(point - 0xe0000));
        const name = point >= 0xe0000 && point <= 0xe007f ? "Unicode tag" : codePoint(point);
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    if (counts.size === 0) return null;
    const listed = [...counts.entries()].map(([name, n]) => `${n} × ${name}`).join(", ");
    return spelled.length === 0 ? listed : `${listed}, spelling "${cap(spelled.join(""))}"`;
}

/** A run of base64 this long, with all three character classes, is not a word, a path or a hex hash. */
const BASE64_RUN = /[A-Za-z0-9+/]{100,}={0,2}/g;
const DATA_URI = /data:([\w.+-]+\/[\w.+-]+)?(?:;[\w=-]+)*;base64,([A-Za-z0-9+/]{100,}={0,2})/g;
const URL_TEXT = /\bhttps?:\/\/\S+/g;

function encodedIn(line: string): string[] {
    const out: string[] = [];
    const withoutUris = line.replace(DATA_URI, (_whole, type: string | undefined, body: string) => {
        out.push(`data URI${type === undefined ? "" : ` ${type}`}, ${body.length} characters of base64`);
        return " ";
    });
    for (const match of withoutUris.replace(URL_TEXT, " ").matchAll(BASE64_RUN)) {
        const run = match[0];
        if (/[A-Z]/.test(run) && /[a-z]/.test(run) && /[0-9]/.test(run)) out.push(`${run.length} characters of base64`);
    }
    return out;
}

const IGNORE_INSTRUCTIONS =
    /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}?\b(?:previous|prior|above|earlier|preceding|all|any|other|system|your)\b[^.\n]{0,25}?\b(?:instructions?|prompts?|rules|guidelines|directions)\b/i;
const KEEP_FROM_PERSON =
    /\b(?:do not|don't|never)\s+(?:tell|inform|notify|alert|(?:mention|reveal)(?:\s+(?:this|it))?\s+to)\s+(?:the\s+)?(?:user|human|person|operator)\b|\bwithout\s+(?:telling|informing|notifying|alerting)\s+(?:the\s+)?(?:user|human|person|operator)\b/i;

/**
 * The line without its quoted spans: a skill that warns "ignore previous instructions" may be in a
 * fetched page is quoting the attack, not making it. Double quotes, curly quotes, corner brackets and
 * inline code; single quotes are too often apostrophes.
 */
function unquoted(line: string): string {
    return line.replace(/"[^"]*"|\u201C[^\u201D]*\u201D|\u300C[^\u300D]*\u300D|`[^`]*`/g, " ");
}

/** An HTML comment with fewer words than this is a marker (`<!-- TOC -->`), not text. */
const COMMENT_WORDS = 4;

function hiddenInMarkdown(path: string, text: string): (ContentsLine & {kind: HiddenKind})[] {
    const out: (ContentsLine & {kind: HiddenKind})[] = [];
    const push = (kind: HiddenKind, line: number, value: string) => out.push({kind, file: path, line, text: value});
    let fenced = false;
    let comment: {start: number; text: string[]} | null = null;
    for (const [index, line] of text.split("\n").entries()) {
        const invisible = invisibleIn(line, index);
        if (invisible !== null) push("hidden characters", index + 1, invisible);
        for (const encoded of encodedIn(line)) push("encoded block", index + 1, encoded);
        const visible = line.replace(INVISIBLE, "");
        if (IGNORE_INSTRUCTIONS.test(unquoted(visible))) push("says to ignore instructions", index + 1, cap(visible));
        if (KEEP_FROM_PERSON.test(unquoted(visible))) push("says not to tell the person", index + 1, cap(visible));

        // An HTML comment inside a code block is an example of one, so it is not read as hidden.
        if (comment === null && FENCE.test(line)) {
            fenced = !fenced;
            continue;
        }
        if (fenced) continue;
        let rest = visible;
        while (rest.length > 0) {
            if (comment === null) {
                const open = rest.indexOf("<!--");
                if (open === -1) break;
                comment = {start: index + 1, text: []};
                rest = rest.slice(open + 4);
            }
            const close = rest.indexOf("-->");
            if (close === -1) {
                comment.text.push(rest);
                break;
            }
            comment.text.push(rest.slice(0, close));
            const inner = comment.text.join(" ").replace(/\s+/g, " ").trim();
            if (inner.split(" ").filter((word) => /[\p{L}\p{N}]/u.test(word)).length >= COMMENT_WORDS) {
                push("HTML comment", comment.start, cap(inner));
            }
            comment = null;
            rest = rest.slice(close + 3);
        }
    }
    if (comment !== null) push("HTML comment", comment.start, cap(`(never closed) ${comment.text.join(" ")}`));
    return out;
}

// ------------------------------------------------------------------ the reading --

function bounded<T>(name: string, items: readonly T[], cut: string[]): T[] {
    if (items.length <= CONTENTS_LIMITS.items) return [...items];
    cut.push(name);
    return items.slice(0, CONTENTS_LIMITS.items);
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** SKILL.md names a script by its path, or by its file name standing alone. */
function namesFile(markdown: string, path: string): boolean {
    const base = path.slice(path.lastIndexOf("/") + 1);
    return markdown.includes(path) || new RegExp(`(^|[\\s/\`'"(])${escapeRegExp(base)}($|[\\s\`'")]|[.,:;](\\s|$))`, "m").test(markdown);
}

/** The facts, from a skill's files. `SKILL.md` is the file of that name at the directory's root. */
export function readSkillContents(input: readonly ContentsFile[]): SkillContents {
    const sorted = [...input].sort((a, b) => compare(a.path, b.path));
    const skipped: SkippedFile[] = [];
    const files: {path: string; text: string}[] = [];
    for (const file of sorted) {
        if (files.length >= CONTENTS_LIMITS.files) skipped.push({path: file.path, why: "over the file limit"});
        else if (file.text === null)
            skipped.push({path: file.path, why: file.tooLarge === true ? "too large" : file.notFetched === true ? "not fetched" : "binary"});
        else if (file.text.length > CONTENTS_LIMITS.fileChars) skipped.push({path: file.path, why: "too large"});
        else files.push({path: file.path, text: file.text.replace(/\r\n?/g, "\n")});
    }
    const skillMd = files.find((file) => file.path === "SKILL.md")?.text ?? "";

    const programs = new Map<string, ContentsProgram>();
    const add = (name: string, from: ProgramSource) => {
        if (!programs.has(name)) programs.set(name, {name, from});
    };
    const requires = readRequires(skillMd);
    for (const name of requires.cli) add(name, "declared");
    for (const name of requires.runs) add(name, "runs");

    const packages = new Map<string, {manager: string; name: string}>();
    const settings = new Set<string>();
    const domains = new Set<string>();
    const fetchAndRun: SkillContents["fetchAndRun"] = [];
    const hidden: SkillContents["hidden"] = [];
    // A script listed and not read is still a script the skill ships; that much is known.
    const scripts: SkillContents["scripts"] = skipped
        .filter((file) => file.why === "not fetched" && SCRIPT.test(file.path))
        .map((file) => ({path: file.path, namedInSkillMd: namesFile(skillMd, file.path)}));

    for (const file of files) {
        const lines = file.text.split("\n");
        const isScript = SCRIPT.test(file.path) || lines[0]?.startsWith("#!") === true;
        const code = codeOf(file.path, file.text, isScript);
        const shell = isShell(file.path, file.text);
        for (const line of code) {
            const installed = packagesIn(line);
            for (const pkg of installed) packages.set(`${pkg.manager} ${pkg.name}`, pkg);
            if (!isScript) continue;
            for (const name of programsInScriptLine(line, shell)) {
                if (!installed.some((pkg) => pkg.name === name)) add(name, "script");
            }
        }
        if (isScript) {
            scripts.push({path: file.path, namedInSkillMd: namesFile(skillMd, file.path)});
            const interpreter = interpreterOf(lines[0] ?? "");
            if (interpreter !== null) add(interpreter, "interpreter");
        }
        if (/(^|\/)requirements[\w.-]*\.txt$/i.test(file.path)) {
            for (const name of requirementsIn(file.text)) packages.set(`pip ${name}`, {manager: "pip", name});
        }
        for (const setting of settingsIn(file.path, file.text, code)) settings.add(setting);
        for (const host of domainsIn(file.text)) domains.add(host);
        for (const [index, line] of lines.entries()) {
            const run = FETCH_AND_RUN.find(({pattern}) => pattern.test(line));
            if (run !== undefined) fetchAndRun.push({kind: run.kind, file: file.path, line: index + 1, text: cap(line)});
        }
        if (MARKDOWN.test(file.path)) hidden.push(...hiddenInMarkdown(file.path, file.text));
    }
    // `pip install x` in the instructions is also read as running `x`; it is a package, said once.
    const packageNames = new Set([...packages.values()].map((pkg) => pkg.name));
    for (const [name, program] of programs) if (program.from !== "declared" && packageNames.has(name)) programs.delete(name);
    // What a script runs, a package drives or a line says is needed (task 112): after the rest, so a
    // program already found keeps how it was found first.
    for (const needed of programsNeededIn(files)) if (!programs.has(needed.name)) programs.set(needed.name, needed);

    const cut: string[] = [];
    return {
        programs: bounded(
            "programs",
            [...programs.values()].sort((a, b) => compare(a.name, b.name)),
            cut,
        ),
        packages: bounded(
            "packages",
            [...packages.values()].sort((a, b) => compare(`${a.manager} ${a.name}`, `${b.manager} ${b.name}`)),
            cut,
        ),
        settings: bounded("settings", [...settings].sort(compare), cut),
        keys: bounded("keys", keysIn(files, [...settings]), cut),
        scripts: bounded("scripts", scripts.sort((a, b) => compare(a.path, b.path)), cut),
        fetchAndRun: bounded("fetchAndRun", fetchAndRun, cut),
        domains: bounded("domains", [...domains].sort(compare), cut),
        hidden: bounded("hidden", hidden, cut),
        read: {
            files: files.length,
            bytes: files.reduce((sum, file) => sum + new TextEncoder().encode(file.text).byteLength, 0),
            skipped,
        },
        cut,
    };
}
