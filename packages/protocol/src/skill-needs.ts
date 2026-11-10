/**
 * Two readings of a skill's files that `skill-contents.ts` did not make, for "Before you install"
 * (task 112, ADR `0182`):
 *
 * - **keys**: which of the settings a skill reads are something a person must hand it (a secret by
 *   its name, or a name its SKILL.md tells you to set), each with the first line that names it.
 * - **programs it needs** beyond its interpreter: a program a script runs (`execFileSync("ffmpeg"`),
 *   a package that drives one (`puppeteer-core` drives Chrome), and a line that says one is needed
 *   (`Needs puppeteer-core, ffmpeg, a Chrome`). Each with its file and line.
 *
 * Pure, bounded, sorted, like the reader it extends. Facts from the files, never a verdict.
 */

/** A program found by one of these readings, where it was found, and the package that drives it. */
export type NeededProgram = {
    name: string;
    from: "spawned" | "package" | "named as needed";
    file: string;
    line: number;
    via?: string;
};

export type SkillKey = {name: string; why: "secret" | "set in SKILL.md"; file: string; line: number};

const MARKDOWN = /\.(md|mdx|markdown)$/i;
const SCRIPT = /\.(sh|bash|zsh|py|js|mjs|cjs|ts|rb|pl|ps1|php|lua)$/i;
const COMMENT_LINE = /^\s*(?:#|\/\/|\*|--|;|rem\s)/i;

/** A test's fixture names a key nobody hands the skill: `BAD_TOKEN` in `figma.test.mjs`. */
export function isTestFile(path: string): boolean {
    return /(^|\/)(tests?|__tests__|spec|fixtures?)\/|\.(test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|_test\.(py|go|rb)$/i.test(path);
}

/** A name a person keeps secret: an API key, a token, a password, a credentials file. */
export function isSecretName(name: string): boolean {
    return /(^|_)(API_?KEY|KEY|TOKEN|SECRET|PASSWORD|PASSWD|PASS|CREDENTIALS|CREDS)$/.test(name);
}

/** `export X=`, or `X=value` opening a code line, in SKILL.md: a name the person is told to set. */
const SET_IN_SKILL_MD = /(?:^|\s|`)(?:export\s+|set\s+|\$env:)?([A-Z][A-Z0-9_]{2,})=/g;

type TextFile = {path: string; text: string};

function lineAt(text: string, index: number): number {
    let line = 1;
    for (let at = text.indexOf("\n"); at !== -1 && at < index; at = text.indexOf("\n", at + 1)) line += 1;
    return line;
}

/**
 * The keys among `settings`, each at the first line naming it: SKILL.md first, then the other files
 * in path order, a test file last and never alone.
 */
export function keysIn(files: readonly TextFile[], settings: readonly string[]): SkillKey[] {
    const skillMd = files.find((file) => file.path === "SKILL.md");
    const toSet = new Set<string>();
    if (skillMd !== undefined) for (const match of skillMd.text.matchAll(SET_IN_SKILL_MD)) toSet.add(match[1] ?? "");
    const wanted = new Set(settings.filter((name) => isSecretName(name) || toSet.has(name)));
    const ordered = [
        ...(skillMd === undefined ? [] : [skillMd]),
        ...files.filter((file) => file.path !== "SKILL.md" && !isTestFile(file.path)),
    ];
    const found = new Map<string, SkillKey>();
    for (const file of ordered) {
        for (const [index, line] of file.text.split("\n").entries()) {
            for (const match of line.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) {
                const name = match[0];
                if (!wanted.has(name) || found.has(name)) continue;
                found.set(name, {name, why: isSecretName(name) ? "secret" : "set in SKILL.md", file: file.path, line: index + 1});
            }
        }
    }
    return [...found.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// ------------------------------------------------------------------ programs --

/** On every machine, or the interpreter running the script itself: naming them tells nobody anything. */
const EVERYWHERE = new Set(
    "sh bash zsh dash env cat ls echo printf mkdir rm cp mv ln grep sed awk tr cut head tail sort uniq wc find xargs test true false base64 date sleep chmod touch tee kill ps uname which open xdg-open cmd powershell pwsh taskkill taskkill.exe where where.exe".split(
        " ",
    ),
);

/** One program under the name the other readings give it: `soffice` is LibreOffice. */
const ALIASES: Readonly<Record<string, string>> = {
    soffice: "LibreOffice",
    libreoffice: "LibreOffice",
    "google-chrome": "Chrome",
    chromium: "Chrome",
    "chromium-browser": "Chrome",
    magick: "ImageMagick",
    convert: "ImageMagick",
    pdftoppm: "poppler",
    pdftotext: "poppler",
    python: "python3",
    docker: "Docker",
};

/** A program a script starts, its name a string literal: Node, Bun, Deno, Python, Ruby. */
const SPAWNS: readonly RegExp[] = [
    /\b(?:execFileSync|execFile|spawnSync|spawn|execaSync|execa)\(\s*["'`]([a-z][\w.+-]*)["'`]/g,
    /\b(?:execSync|exec)\(\s*["'`]([a-z][\w.+-]*)[\s"'`]/g,
    /\bBun\.spawn(?:Sync)?\(\s*\[\s*["'`]([a-z][\w.+-]*)["'`]/g,
    /\bnew\s+Deno\.Command\(\s*["'`]([a-z][\w.+-]*)["'`]/g,
    /\bsubprocess\.(?:run|call|check_call|check_output|Popen)\(\s*\[\s*["']([a-z][\w.+-]*)["']/g,
    /\bsubprocess\.(?:run|call|check_call|check_output|Popen)\(\s*["']([a-z][\w.+-]*)[\s"']/g,
    /\bos\.(?:system|popen)\(\s*["']([a-z][\w.+-]*)[\s"']/g,
];

/**
 * A package that drives a program it does not ship. `puppeteer` downloads its own Chrome on install;
 * `puppeteer-core` and the others expect one on the machine, so both name Chrome.
 */
const DRIVES: Readonly<Record<string, string>> = {
    puppeteer: "Chrome",
    "puppeteer-core": "Chrome",
    "chrome-launcher": "Chrome",
    "chrome-remote-interface": "Chrome",
    pyppeteer: "Chrome",
    playwright: "a Playwright browser",
    "playwright-core": "a Playwright browser",
    "@playwright/test": "a Playwright browser",
    "selenium-webdriver": "a browser and its driver",
    selenium: "a browser and its driver",
    "fluent-ffmpeg": "ffmpeg",
    "ffmpeg-python": "ffmpeg",
    ffmpeg: "ffmpeg",
    pydub: "ffmpeg",
    moviepy: "ffmpeg",
    "openai-whisper": "ffmpeg",
    whisper: "ffmpeg",
    pytesseract: "tesseract",
    "node-tesseract-ocr": "tesseract",
    pdf2image: "poppler",
    "pdf-poppler": "poppler",
    wand: "ImageMagick",
    gm: "ImageMagick",
    pypandoc: "pandoc",
    "node-pandoc": "pandoc",
    docker: "Docker",
    dockerode: "Docker",
};

const IMPORTS: readonly RegExp[] = [
    /\bfrom\s+["']([@\w./-]+)["']/g,
    /\bimport\s*\(\s*["']([@\w./-]+)["']\s*\)/g,
    /\bimport\s+["']([@\w./-]+)["']/g,
    /\brequire\(\s*["']([@\w./-]+)["']\s*\)/g,
    /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm,
];

/** `puppeteer-core/lib/x` → `puppeteer-core`; `playwright.sync_api` → `playwright`. */
function packageRoot(specifier: string): string {
    if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
    return specifier.split("/")[0]?.split(".")[0] ?? specifier;
}

/** Programs named where a line says what is needed. Written as people write them, mapped to one name. */
const NAMED_PROGRAMS: readonly {name: string; pattern: RegExp}[] = [
    {name: "ffmpeg", pattern: /\bffmpeg\b/i},
    {name: "ffprobe", pattern: /\bffprobe\b/i},
    // Capitalised only: "label chrome" is a design word, "Chrome" the browser.
    {name: "Chrome", pattern: /\b(?:Google Chrome|Chrome|Chromium|chrome-headless-shell|google-chrome|chromium-browser)\b/},
    {name: "Docker", pattern: /\b[Dd]ocker\b/},
    {name: "git", pattern: /\bgit\b(?!\s*(?:hub|lab))/},
    {name: "jq", pattern: /\bjq\b/},
    {name: "pandoc", pattern: /\bpandoc\b/i},
    {name: "ImageMagick", pattern: /\b(?:ImageMagick|imagemagick|magick)\b/},
    {name: "yt-dlp", pattern: /\byt-dlp\b/},
    {name: "tesseract", pattern: /\btesseract\b/i},
    {name: "poppler", pattern: /\b(?:poppler|pdftoppm|pdftotext)\b/i},
    {name: "LibreOffice", pattern: /\b(?:LibreOffice|libreoffice|soffice)\b/},
    {name: "sox", pattern: /\bsox\b/},
    {name: "exiftool", pattern: /\bexiftool\b/i},
    {name: "ollama", pattern: /\b[Oo]llama\b/},
    {name: "gh", pattern: /\bgh\s+(?:CLI|cli)\b|\bGitHub CLI\b/},
    {name: "python3", pattern: /\b[Pp]ython\s?3?\b(?![-.\w])/},
    {name: "node", pattern: /\b(?:Node\.js|node)\b(?![-.\w])/},
    {name: "Java", pattern: /\b(?:Java|JDK|JRE)\b/},
];

const NEEDED =
    /\b(?:requires?|required|requirements?|needs?|needed|prerequisites?|depends on|must (?:be )?install(?:ed)?|must have|install(?:ed)? first|has to be installed|be installed)\b/i;
const NEEDED_GLOBAL = new RegExp(NEEDED.source, "gi");
const NOT_NEEDED =
    /\b(?:no|not|never|without|doesn't|don't|isn't|aren't|zero)\b[^.;]{0,30}\b(?:requires?|required|needs?|needed|install)/i;
/** Or the program is said not to be needed after the verb: "requires no ffmpeg", "needs nothing". */
const NOT_AFTER = /\b(?:requires?|needs?)\s+(?:no|nothing|neither)\b/i;

/**
 * Where a skill says what it needs: its SKILL.md, a file named for it (`requirements.md`,
 * `prerequisites.md`, `setup.md`, `install.md`, a README) and its scripts' comments. Measured
 * 2026-11-10 over every file: of eight lines sampled, six were prose about something else ("needs care
 * outside Chrome", "nodes + pods"), so the rest of the references are not read for this.
 */
function saysWhatItNeeds(path: string, isScript: boolean): boolean {
    if (isScript) return true;
    if (!MARKDOWN.test(path)) return false;
    const base = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
    return base === "skill.md" || /^(readme|requirements?|prerequisites?|setup|install(ation)?|dependencies|getting-started)\b/.test(base);
}

/** A comment, a docstring or a string in a script: where its author writes what it needs. */
const COMMENT_OR_STRING = /^\s*(?:#|\/\/|\*|\/\*|"""|''')|["'`][^"'`]*\b(?:requires?|needs?|install)/i;

/**
 * The program in the verb's clause, within 40 characters after it ("Needs puppeteer-core, ffmpeg") or
 * 30 before it ("ffmpeg must be installed", "ffmpeg is required").
 */
function namedAfterVerb(line: string, program: RegExp): boolean {
    for (const verb of line.matchAll(NEEDED_GLOBAL)) {
        const at = verb.index;
        const after = line.slice(at + verb[0].length).slice(0, 40).split(/[.;:!?](?:\s|$)/)[0] ?? "";
        const before = line.slice(Math.max(0, at - 30), at).split(/[.;:!?](?:\s|$)/).at(-1) ?? "";
        if (program.test(after) || program.test(before)) return true;
    }
    return false;
}

/**
 * The programs a skill's files show it needs, beyond what `skill-contents.ts` already read: the first
 * place each is found, a test file never read. A package installed by a command line only (`pip
 * install x` with no manifest shipped) is not followed: the reader lists it as a package.
 */
export function programsNeededIn(files: readonly TextFile[]): NeededProgram[] {
    const out = new Map<string, NeededProgram>();
    const add = (program: NeededProgram) => {
        if (!out.has(program.name)) out.set(program.name, program);
    };
    for (const file of files) {
        if (isTestFile(file.path)) continue;
        const lines = file.text.split("\n");
        const isScript = SCRIPT.test(file.path) || lines[0]?.startsWith("#!") === true;
        if (isScript && !/\.(sh|bash|zsh)$/i.test(file.path)) {
            for (const pattern of SPAWNS) {
                for (const match of file.text.matchAll(pattern)) {
                    const name = match[1] ?? "";
                    const line = lineAt(file.text, match.index);
                    if (name === "" || EVERYWHERE.has(name) || COMMENT_LINE.test(lines[line - 1] ?? "")) continue;
                    add({name: ALIASES[name] ?? name, from: "spawned", file: file.path, line});
                }
            }
            for (const pattern of IMPORTS) {
                for (const match of file.text.matchAll(pattern)) {
                    const root = packageRoot(match[1] ?? match[2] ?? "");
                    const driven = DRIVES[root];
                    const line = lineAt(file.text, match.index);
                    if (driven === undefined || COMMENT_LINE.test(lines[line - 1] ?? "")) continue;
                    add({name: driven, from: "package", file: file.path, line, via: root});
                }
            }
        }
        if (/(^|\/)package\.json$/.test(file.path)) {
            for (const [index, line] of lines.entries()) {
                const name = /^\s*"(@?[\w./-]+)"\s*:\s*"/.exec(line)?.[1];
                const driven = name === undefined ? undefined : DRIVES[name];
                if (driven !== undefined) add({name: driven, from: "package", file: file.path, line: index + 1, via: name ?? ""});
            }
        }
        if (/(^|\/)requirements[\w.-]*\.txt$/i.test(file.path)) {
            for (const [index, line] of lines.entries()) {
                const name = /^\s*([A-Za-z0-9][\w.-]*)/.exec(line.replace(/#.*/, ""))?.[1]?.toLowerCase();
                const driven = name === undefined ? undefined : DRIVES[name];
                if (driven !== undefined) add({name: driven, from: "package", file: file.path, line: index + 1, via: name ?? ""});
            }
        }
        if (saysWhatItNeeds(file.path, isScript)) {
            for (const [index, line] of lines.entries()) {
                if (NOT_NEEDED.test(line) || NOT_AFTER.test(line)) continue;
                if (isScript && !COMMENT_OR_STRING.test(line)) continue;
                for (const {name, pattern} of NAMED_PROGRAMS) {
                    if (namedAfterVerb(line, pattern)) add({name, from: "named as needed", file: file.path, line: index + 1});
                }
            }
        }
    }
    return [...out.values()];
}
