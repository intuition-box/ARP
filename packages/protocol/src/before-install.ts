/**
 * "Before you install": what a skill's contents answer to the questions a person asks before letting
 * an agent install it (task 112, ADR `0182`). The site's panel, the hook's message before
 * `npx skills add`, `arp_pulse` and `arp_get_skill` all say it in this order, from this module.
 *
 * 1. What will it ask me for? Keys: secrets by their name, and names SKILL.md says to set. The other
 *    settings it reads are one count.
 * 2. Does it cost money? The services it names that bill by use, by name (`PAID_SERVICES`).
 * 3. What must I have installed? Its programs, each with how it was found.
 * 4. What does it do on my machine? Its scripts, and code it fetches and runs, first when there is any.
 * 5. Where does it send data? API hosts by name; fonts, CDNs and map tiles counted; other sites counted.
 * 6. Anything hidden? Only when there is.
 *
 * A host or a service here is one the files **name**, not one shown to be contacted; a program is one
 * the files run, probe, drive or say is needed. Facts, never a verdict (ADR `0165`). Pure.
 */
import type {ContentsLine, ContentsProgram, FetchAndRunKind, HiddenKind, SkillContents, SkippedFile} from "./skill-contents.js";
import type {SkillKey} from "./skill-needs.js";

/**
 * Services that bill by use, most with a free allowance, matched on a host the files name (the host
 * or a subdomain of it) or on a secret's prefix (`OPENAI_API_KEY`). Extend it here; a host it does not
 * know still shows under "Sends data to" when it is shaped like an API.
 */
export const PAID_SERVICES: readonly {name: string; hosts: readonly string[]; keyPrefixes: readonly string[]}[] = [
    {name: "Anthropic", hosts: ["api.anthropic.com"], keyPrefixes: ["ANTHROPIC_"]},
    {name: "AssemblyAI", hosts: ["api.assemblyai.com"], keyPrefixes: ["ASSEMBLYAI_"]},
    {name: "Azure OpenAI", hosts: ["openai.azure.com"], keyPrefixes: ["AZURE_OPENAI_"]},
    {name: "Brave Search", hosts: ["api.search.brave.com"], keyPrefixes: ["BRAVE_"]},
    {name: "Browserbase", hosts: ["api.browserbase.com"], keyPrefixes: ["BROWSERBASE_"]},
    {name: "Cohere", hosts: ["api.cohere.ai", "api.cohere.com"], keyPrefixes: ["COHERE_", "CO_API_"]},
    {name: "Deepgram", hosts: ["api.deepgram.com"], keyPrefixes: ["DEEPGRAM_"]},
    {name: "DeepSeek", hosts: ["api.deepseek.com"], keyPrefixes: ["DEEPSEEK_"]},
    {name: "ElevenLabs", hosts: ["api.elevenlabs.io"], keyPrefixes: ["ELEVENLABS_", "ELEVEN_"]},
    {name: "Exa", hosts: ["api.exa.ai"], keyPrefixes: ["EXA_"]},
    {name: "fal", hosts: ["fal.run", "queue.fal.run"], keyPrefixes: ["FAL_"]},
    {name: "Firecrawl", hosts: ["api.firecrawl.dev"], keyPrefixes: ["FIRECRAWL_"]},
    {name: "Fireworks AI", hosts: ["api.fireworks.ai"], keyPrefixes: ["FIREWORKS_"]},
    {name: "Google Gemini", hosts: ["generativelanguage.googleapis.com"], keyPrefixes: ["GEMINI_"]},
    {name: "Google Vertex AI", hosts: ["aiplatform.googleapis.com"], keyPrefixes: ["VERTEX_"]},
    {name: "Groq", hosts: ["api.groq.com"], keyPrefixes: ["GROQ_"]},
    {name: "HeyGen", hosts: ["api.heygen.com"], keyPrefixes: ["HEYGEN_"]},
    {name: "Mistral", hosts: ["api.mistral.ai"], keyPrefixes: ["MISTRAL_"]},
    {name: "OpenAI", hosts: ["api.openai.com"], keyPrefixes: ["OPENAI_"]},
    {name: "OpenRouter", hosts: ["openrouter.ai"], keyPrefixes: ["OPENROUTER_"]},
    {name: "Perplexity", hosts: ["api.perplexity.ai"], keyPrefixes: ["PERPLEXITY_", "PPLX_"]},
    {name: "Replicate", hosts: ["api.replicate.com"], keyPrefixes: ["REPLICATE_"]},
    {name: "Resend", hosts: ["api.resend.com"], keyPrefixes: ["RESEND_"]},
    {name: "Runway", hosts: ["api.dev.runwayml.com", "api.runwayml.com"], keyPrefixes: ["RUNWAY_", "RUNWAYML_"]},
    {name: "SerpApi", hosts: ["serpapi.com"], keyPrefixes: ["SERPAPI_", "SERP_API_"]},
    {name: "Stability AI", hosts: ["api.stability.ai"], keyPrefixes: ["STABILITY_"]},
    {name: "Tavily", hosts: ["api.tavily.com"], keyPrefixes: ["TAVILY_"]},
    {name: "Together AI", hosts: ["api.together.xyz", "api.together.ai"], keyPrefixes: ["TOGETHER_"]},
    {name: "Twilio", hosts: ["api.twilio.com"], keyPrefixes: ["TWILIO_"]},
    {name: "xAI", hosts: ["api.x.ai"], keyPrefixes: ["XAI_"]},
];

/** Fonts, CDNs, map tiles and raw file hosts: what a page loads, not where its data goes. */
const STATIC_HOSTS = [
    "fonts.googleapis.com",
    "gstatic.com",
    "cdn.jsdelivr.net",
    "unpkg.com",
    "cdnjs.cloudflare.com",
    "esm.sh",
    "cdn.skypack.dev",
    "ga.jspm.io",
    "githubusercontent.com",
    "cdn.tailwindcss.com",
    "code.jquery.com",
    "use.typekit.net",
    "fonts.bunny.net",
    "rsms.me",
    "cartocdn.com",
    "tile.openstreetmap.org",
    "server.arcgisonline.com",
    "images.unsplash.com",
];
const STATIC_SHAPE = /^(?:cdn|static|fonts?|tiles?|assets|img|images|media)\d*[.-]|(?:^|[.-])cdn(?:[.-]|$)|\.cdn\./;
const API_SHAPE = /^api\d*[.-]|[.-]api\.|^.*\.googleapis\.com$/;

function under(host: string, base: string): boolean {
    return host === base || host.endsWith(`.${base}`);
}

/** What `beforeInstall` reads: a reading's lists, the skipped files beside them. */
export type BeforeInstallInput = Pick<
    SkillContents,
    "programs" | "settings" | "keys" | "scripts" | "fetchAndRun" | "domains" | "hidden" | "cut"
> & {skipped: readonly SkippedFile[]};

export type PaidService = {name: string; hosts: string[]; keys: string[]};

export type BeforeInstall = {
    fetchAndRun: (ContentsLine & {kind: FetchAndRunKind})[];
    keys: SkillKey[];
    /** Settings it reads that are neither a secret nor named in SKILL.md to set. */
    otherSettings: number;
    services: PaidService[];
    programs: ContentsProgram[];
    scripts: {path: string; namedInSkillMd: boolean}[];
    apiHosts: string[];
    staticHosts: string[];
    otherHosts: string[];
    hidden: (ContentsLine & {kind: HiddenKind})[];
    /** Text files the reading skipped. A font, an image or a sound skipped is nobody's question. */
    notRead: SkippedFile[];
    cut: string[];
};

const ASSET =
    /\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|svgz?|ico|bmp|tiff?|avif|heic|hdr|exr|mp[34]|m4a|wav|ogg|flac|aac|mov|webm|avi|mkv|psd|ai|sketch|fig|glb|gltf|fbx|blend|ktx2?|basis|pdf|zip|gz|tgz)$|(^|\/)\.(gitkeep|keep|DS_Store)$/i;

/** The question view of one reading. */
export function beforeInstall(input: BeforeInstallInput): BeforeInstall {
    const services = new Map<string, PaidService>();
    const service = (name: string) => {
        const found = services.get(name) ?? {name, hosts: [], keys: []};
        services.set(name, found);
        return found;
    };
    const apiHosts: string[] = [];
    const staticHosts: string[] = [];
    const otherHosts: string[] = [];
    for (const host of input.domains) {
        const known = PAID_SERVICES.find((entry) => entry.hosts.some((base) => under(host, base)));
        if (known !== undefined) {
            service(known.name).hosts.push(host);
            apiHosts.push(host);
        } else if (STATIC_HOSTS.some((base) => under(host, base)) || STATIC_SHAPE.test(host)) staticHosts.push(host);
        else if (API_SHAPE.test(host)) apiHosts.push(host);
        else otherHosts.push(host);
    }
    for (const key of input.keys) {
        if (key.why !== "secret") continue;
        const known = PAID_SERVICES.find((entry) => entry.keyPrefixes.some((prefix) => key.name.startsWith(prefix)));
        if (known !== undefined) service(known.name).keys.push(key.name);
    }
    const asked = new Set(input.keys.map((key) => key.name));
    return {
        fetchAndRun: [...input.fetchAndRun],
        keys: [...input.keys],
        otherSettings: input.settings.filter((name) => !asked.has(name)).length,
        services: [...services.values()].sort((a, b) => (a.name < b.name ? -1 : 1)),
        programs: [...input.programs],
        scripts: [...input.scripts],
        apiHosts,
        staticHosts,
        otherHosts,
        hidden: [...input.hidden],
        notRead: input.skipped.filter((file) => file.why !== "binary" && !ASSET.test(file.path)),
        cut: [...input.cut],
    };
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** Programs as a short list: the first four by name, the rest counted. */
function programNames(programs: readonly ContentsProgram[], shown = 4): string {
    const names = programs.map((program) => program.name);
    return names.length <= shown ? names.join(", ") : `${names.slice(0, shown).join(", ")} +${names.length - shown}`;
}

/** One line, the answers in the questions' order: "3 keys · 2 paid services · needs Chrome, ffmpeg · 6 scripts". */
export function beforeInstallSummary(view: BeforeInstall): string {
    const secrets = view.keys.filter((key) => key.why === "secret").length;
    const toSet = view.keys.length - secrets;
    const asks =
        secrets + toSet === 0
            ? "no keys"
            : [secrets === 0 ? null : plural(secrets, "key"), toSet === 0 ? null : plural(toSet, "setting")]
                  .filter((part) => part !== null)
                  .join(", ");
    return [
        ...(view.fetchAndRun.length === 0 ? [] : ["fetches and runs code"]),
        asks,
        view.services.length === 0 ? "no paid services" : plural(view.services.length, "paid service"),
        view.programs.length === 0 ? "nothing to install named" : `needs ${programNames(view.programs)}`,
        view.scripts.length === 0 ? "no scripts" : plural(view.scripts.length, "script"),
        ...(view.hidden.length === 0 ? [] : [plural(view.hidden.length, "hidden text", "hidden texts")]),
        // "no keys" over files nobody read is not "no keys": the line says what it did not cover.
        ...(view.notRead.length === 0 ? [] : [`${plural(view.notRead.length, "file")} not read`]),
    ].join(" · ");
}

/** How a program was found, in words: "run by scripts/locate.mjs:35", "via puppeteer-core". */
export function programSourceText(program: ContentsProgram): string {
    const at = program.file === undefined ? "" : `${program.file}${program.line === undefined ? "" : `:${program.line}`}`;
    switch (program.from) {
        case "declared":
            return "declared in SKILL.md";
        case "runs":
            return "run in SKILL.md";
        case "interpreter":
            return "script interpreter";
        case "script":
            return "a script checks for it or installs it";
        case "spawned":
            return `run by ${at}`;
        case "package":
            return `via ${program.via ?? "a package"}, ${at}`;
        case "named as needed":
            return `said to be needed, ${at}`;
    }
}

/**
 * The block an agent shows the person before it installs: the summary, then one line per question.
 * A matched line's text is the files' own, so it is quoted.
 */
export function contentsLines(contents: SkillContents, perList = 6): string[] {
    const view = beforeInstall({...contents, skipped: contents.read.skipped});
    const list = (items: readonly string[], cut: boolean) =>
        `${items.slice(0, perList).join(", ")}${
            items.length > perList || cut ? `, and ${Math.max(0, items.length - perList)}${cut ? "+" : ""} more` : ""
        }`;
    const cut = (name: string) => view.cut.includes(name);
    const at = (rows: readonly (ContentsLine & {kind: string})[], name: string) =>
        list(
            rows.map((row) => `${row.kind} at ${row.file}:${row.line} "${row.text}"`),
            cut(name),
        );
    const others = view.otherSettings === 0 ? "" : `; ${plural(view.otherSettings, "other setting")} it reads`;
    const hostParts = [
        view.apiHosts.length === 0 ? "no API host" : list(view.apiHosts, false),
        ...(view.staticHosts.length === 0 ? [] : [`fonts, CDNs and map tiles: ${view.staticHosts.length}`]),
        ...(view.otherHosts.length === 0 ? [] : [`other sites named: ${view.otherHosts.length}`]),
    ];
    return [
        `Before you install: ${beforeInstallSummary(view)}`,
        ...(view.fetchAndRun.length === 0 ? [] : [`Fetches and runs code: ${at(view.fetchAndRun, "fetchAndRun")}`]),
        `Asks for: ${
            view.keys.length === 0
                ? `no keys${others}`
                : `${list(
                      view.keys.map((key) => `${key.name} (${key.why === "secret" ? "" : "set in SKILL.md, "}${key.file}:${key.line})`),
                      cut("keys"),
                  )}${others}`
        }`,
        `Paid services: ${
            view.services.length === 0
                ? "none named"
                : list(
                      view.services.map((entry) => `${entry.name} (${[...entry.hosts, ...entry.keys].join(", ")})`),
                      false,
                  )
        }`,
        `Needs installed: ${
            view.programs.length === 0
                ? "none named"
                : list(
                      view.programs.map((program) => `${program.name} (${programSourceText(program)})`),
                      cut("programs"),
                  )
        }`,
        `Runs on your machine: ${
            view.scripts.length === 0
                ? "no scripts"
                : `${plural(view.scripts.length, "script")}: ${list(
                      view.scripts.map((script) => (script.namedInSkillMd ? `${script.path} (named in SKILL.md)` : script.path)),
                      cut("scripts"),
                  )}`
        }${view.fetchAndRun.length === 0 ? "; fetches and runs no code" : ""}`,
        `Sends data to (hosts its files name, not shown to be contacted): ${hostParts.join("; ")}`,
        ...(view.hidden.length === 0 ? [] : [`Hidden or encoded text: ${at(view.hidden, "hidden")}`]),
        ...(view.notRead.length === 0
            ? []
            : [`Not read: ${list(view.notRead.map((file) => `${file.path} (${file.why})`), false)}`]),
    ];
}
