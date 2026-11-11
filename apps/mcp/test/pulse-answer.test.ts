import {mkdirSync, mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {DomainTree, readSkillContents, type PulseDeclaration, type PulseUsage, type SkillPulse, type SkillSearchResult} from "@arp-protocol/core";

/**
 * `arp_pulse` from end to end of its answer. The search package is a child process, the public
 * record is the graph and the files are GitHub: those three are stubbed (`runSearch`, the graph
 * readers, `githubPulseSource` and the window that reads through it). Everything that orders, sets
 * aside and writes the answer runs for real.
 */
const home = await vi.hoisted(async () => {
    const {mkdtempSync: makeDir} = await import("node:fs");
    const {tmpdir: temp} = await import("node:os");
    const {join: joinPath} = await import("node:path");
    const dir = makeDir(joinPath(temp(), "arp-pulse-answer-"));
    Object.assign(process.env, {ARP_NO_RECEIPTS: "1", ARP_TARGET: "testnet", ARP_HOME: dir});
    return dir;
});

const mocks = vi.hoisted(() => ({
    runSearch: vi.fn(),
    readWindow: vi.fn(),
    findDeclaredTools: vi.fn(),
    findToolAtoms: vi.fn(),
    getPulseUsage: vi.fn(),
    agentsForDomain: vi.fn(),
    offersForNeed: vi.fn(),
    quota: vi.fn(),
}));
vi.mock("@arp-protocol/core", async (original) => ({
    ...(await original<typeof import("@arp-protocol/core")>()),
    findDeclaredTools: mocks.findDeclaredTools,
    findToolAtoms: mocks.findToolAtoms,
    getPulseUsage: mocks.getPulseUsage,
    githubPulseSource: () => ({listing: async () => "unreachable", file: async () => null, repository: async () => null, quota: mocks.quota}),
}));
vi.mock("../src/search-run.js", async (original) => ({...(await original<typeof import("../src/search-run.js")>()), runSearch: mocks.runSearch}));
vi.mock("../src/pulse-window.js", () => ({readWindow: mocks.readWindow}));
vi.mock("../src/handlers/agents.js", () => ({agentsForDomain: mocks.agentsForDomain, offersForNeed: mocks.offersForNeed}));
vi.mock("../src/domain-tree.js", () => ({
    searchDomainTree: async () =>
        DomainTree.from("tool", [
            {tripleId: "0xd1", child: "design", parent: "tool", positions: 1, shares: 1n},
            {tripleId: "0xd2", child: "presentation authoring", parent: "design", positions: 1, shares: 1n},
            {tripleId: "0xd3", child: "slide themes", parent: "presentation authoring", positions: 1, shares: 1n},
        ]),
}));

const {pulse, PULSE_BUDGET} = await import("../src/handlers/pulse.js");

const facts = {
    files: 3,
    bytes: 900,
    scripts: 0,
    keys: [] as string[],
    paidWords: [] as string[],
    hosts: [] as string[],
    runsAbsentFiles: [] as string[],
    keysInScriptsItRuns: [] as {file: string; keys: string[]}[],
    requires: {cli: [] as string[], runs: [] as string[], login: null as {line: number; text: string} | null, description: null},
    contains: readSkillContents([]),
};
const result = (source: string, skill: string): SkillSearchResult => ({source, skill, installs: 10, installsText: "10", url: `https://skills.sh/${source}/${skill}`});
const read = (source: string, skill: string, extra: Partial<typeof facts> & Record<string, unknown> = {}): SkillPulse =>
    ({
        ...result(source, skill),
        status: "read",
        path: `${skill}/SKILL.md`,
        alsoAt: [],
        differsAt: [],
        contentId: `${source}-${skill}`,
        skillMdSha: "sha",
        repository: null,
        ...facts,
        ...extra,
    }) as SkillPulse; // the read variant, its facts overridden per case

/** `npx skills find` text for these results. */
const findText = (rows: SkillSearchResult[]) => rows.map((row) => `${row.source}@${row.skill} ${row.installs} installs\n└ ${row.url}`).join("\n");

let pulses: Map<string, SkillPulse>;
beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    pulses = new Map();
    mocks.readWindow.mockImplementation(async (results: SkillSearchResult[], _source: unknown, options: {limit: number; setAside: (row: SkillPulse) => boolean}) => {
        const out = results.map((row) => pulses.get(`${row.source}@${row.skill}`) ?? read(row.source, row.skill));
        out.forEach((row) => options.setAside(row));
        return out;
    });
    mocks.findDeclaredTools.mockResolvedValue([]);
    mocks.findToolAtoms.mockResolvedValue(new Map());
    mocks.getPulseUsage.mockResolvedValue(new Map());
    mocks.agentsForDomain.mockResolvedValue({used_here: []});
    mocks.offersForNeed.mockResolvedValue({offers_matching_need: []});
    mocks.quota.mockReturnValue({limited: false});
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    delete process.env["GITHUB_TOKEN"];
    delete process.env["ARP_PULSE_SCORE"];
    delete process.env["ARP_PULSE_SEARCH"];
});
afterEach(() => vi.restoreAllMocks());

async function ask(args: Record<string, unknown>, budget = PULSE_BUDGET): Promise<Record<string, unknown>> {
    const body = (await (await pulse(1, args, budget)).json()) as {result?: {content: {text: string}[]}; error?: {message: string}}; // the JSON-RPC envelope
    if (body.error !== undefined) return {error: body.error.message};
    return JSON.parse(body.result?.content[0]?.text ?? "{}") as Record<string, unknown>; // the handler's own JSON
}
type Skill = Record<string, unknown>;
const skills = (out: Record<string, unknown>) => out["skills"] as Skill[];

describe("arp_pulse over a search's text", () => {
    it("sets aside what the person ruled out, and asks them to check what a word match only suggests", async () => {
        const rows = [result("a/keys", "k"), result("a/scripts", "s"), result("a/cli", "c"), result("a/absent", "x"), result("a/fine", "f"), result("a/script-keys", "sk")];
        pulses.set("a/keys@k", read("a/keys", "k", {keys: ["OPENAI_API_KEY"]}));
        pulses.set("a/scripts@s", read("a/scripts", "s", {scripts: 2}));
        pulses.set("a/cli@c", read("a/cli", "c", {requires: {...facts.requires, cli: ["ffmpeg"]}}));
        pulses.set("a/absent@x", read("a/absent", "x", {runsAbsentFiles: ["run.sh"]}));
        pulses.set("a/script-keys@sk", read("a/script-keys", "sk", {keysInScriptsItRuns: [{file: "scripts/go.py", keys: ["TOKEN"]}]}));
        pulses.set(
            "a/fine@f",
            read("a/fine", "f", {
                paidWords: ["pricing"],
                hosts: ["api.example.com"],
                requires: {...facts.requires, login: {line: 3, text: "sign in"}, runs: ["jq"]},
                repository: {stars: 1},
                differsAt: ["other/f/SKILL.md"],
                listingReadAt: "2026-11-10",
                datedReading: {readAt: "2026-11-09", by: "scripts/build/x.ts"},
            }),
        );
        const out = await ask({
            search_output: findText(rows),
            constraints: {no_keys: true, no_scripts: true, no_login: true, no_paid: true, have_commands: ["git", 4]},
        });
        expect(out["search"]).toBe("search_output");
        expect(out["results_found"]).toBe(6);
        const aside = new Map((out["set_aside"] as {name: string; because: string[]}[]).map((row) => [row.name, row.because]));
        expect(aside.get("k")).toEqual(["mentions OPENAI_API_KEY"]);
        expect(aside.get("s")).toEqual(["ships 2 script(s)"]);
        expect(aside.get("c")).toEqual(["declares ffmpeg"]);
        expect(aside.get("x")).toEqual(["runs run.sh, which its repository does not hold"]);
        expect(aside.get("sk")).toEqual(["runs scripts/go.py, which mentions TOKEN"]);
        const [fine] = skills(out);
        expect(fine).toMatchObject({
            name: "f",
            check_against_constraints: ["login, line 3: sign in", "paid words: pricing", "commands in its instructions: jq"],
            file_list_read_at: "2026-11-10",
            dated_reading: {read_at: "2026-11-09", by: "scripts/build/x.ts"},
            other_files_with_this_name: ["other/f/SKILL.md"],
            repository: {stars: 1},
            usage: {written_by_agents: "nobody yet, so unknown"},
        });
        expect(fine?.["its_file_mentions"]).toMatchObject({login: {line: 3}, paid_words: ["pricing"], hosts: ["api.example.com"]});
        expect(fine?.["score_parts"]).toBeDefined();
    });

    it("reads a file-only result and one it could not read, and shows one line per content", async () => {
        const rows = [result("b/one", "same"), result("b/two", "same"), result("b/file", "fo"), result("b/amb", "am"), result("b/gone", "gn")];
        pulses.set("b/one@same", read("b/one", "same", {contentId: "shared"}));
        pulses.set("b/two@same", read("b/two", "same", {contentId: "shared"}));
        pulses.set("b/file@fo", {...result("b/file", "fo"), status: "read_file_only", path: "fo/SKILL.md", keys: ["K"], paidWords: ["paid"], hosts: ["h"], requires: {...facts.requires, cli: ["x"], login: {line: 1, text: "log in"}}, contains: facts.contains} as SkillPulse);
        pulses.set("b/amb@am", {...result("b/amb", "am"), status: "ambiguous", paths: ["a/SKILL.md", "b/SKILL.md"]} as SkillPulse);
        pulses.set("b/gone@gn", {...result("b/gone", "gn"), status: "rate_limited"} as SkillPulse);
        const out = await ask({search_output: findText(rows), constraints: {no_scripts: true}});
        const byName = skills(out);
        expect(byName.filter((row) => row["name"] === "same")).toHaveLength(1);
        expect(byName.find((row) => row["name"] === "same")?.["same_content_in"]).toEqual([{source: "b/two", installs: "10"}]);
        const fileOnly = byName.find((row) => row["name"] === "fo");
        expect(fileOnly).toMatchObject({status: "read_file_only", check_against_constraints: ["whether it ships scripts is unknown: only its file was read"], declares_cli: ["x"]});
        expect(fileOnly?.["its_file_mentions"]).toMatchObject({keys: ["K"], login: {line: 1}, paid_words: ["paid"], hosts: ["h"]});
        expect(byName.find((row) => row["name"] === "am")).toMatchObject({paths: ["a/SKILL.md", "b/SKILL.md"], read: "not read, so what it needs is unknown"});
        expect(byName.find((row) => row["name"] === "gn")).toMatchObject({read: "not read, so what it needs is unknown"});
    });

    it("sets a file-only result aside on the keys and commands its file names", async () => {
        pulses.set("c/f@x", {...result("c/f", "x"), status: "read_file_only", path: "x/SKILL.md", keys: ["K"], paidWords: [], hosts: [], requires: {...facts.requires, cli: ["x"]}, contains: facts.contains} as SkillPulse);
        const out = await ask({search_output: findText([result("c/f", "x")]), constraints: {no_keys: true, have_commands: []}});
        expect(out["set_aside"]).toEqual([{name: "x", source: "c/f", because: ["mentions K", "declares x"]}]);
    });

    it("says when GitHub's hourly limit cut the reading short", async () => {
        process.env["GITHUB_TOKEN"] = "t";
        mocks.quota.mockReturnValue({limited: true, resetsAt: "2026-11-11T20:00:00Z"});
        pulses.set("d/x@y", {...result("d/x", "y"), status: "rate_limited"} as SkillPulse);
        const out = await ask({search_output: findText([result("d/x", "y")])});
        expect(out["github_limit_reached"]).toMatchObject({resets_at: "2026-11-11T20:00:00Z", read_fully: 0, file_only: 0, not_read: 1});
        expect(mocks.readWindow.mock.calls[0]?.[2]).toMatchObject({hasToken: true});
    });
});

describe("arp_pulse and the public record", () => {
    const ATOM = `0x${"aa".repeat(32)}`;
    const line = (writer: string, outcome: "worked" | "failed", domain: string): PulseDeclaration => ({
        tripleId: `0x${writer}`,
        agent: {atomId: "0xagent", label: "Agent 13579:6"},
        writer,
        declaredAt: null,
        domains: [domain],
        outcomes: [outcome],
        lines: [{domain, outcome, reasons: outcome === "failed" ? ["missing-key"] : [], form: "nested"}],
    });
    const usage = (declarations: PulseDeclaration[]): PulseUsage => ({
        declarations,
        agents: 1,
        wallets: declarations.length,
        byDomain: {"presentation authoring": declarations.length},
        byOutcome: {worked: declarations.length},
        byReason: {"missing-key": 1},
        byNeed: {OPENAI_API_KEY: 1},
        byWith: {ffmpeg: 1},
        byOthers: [{tripleId: "0x1", writer: "0xo", predicate: "context", value: "design"}],
        truncated: true,
    });

    it("reads the lines on the domain a word names, and adds a declared skill the search missed", async () => {
        mocks.findDeclaredTools.mockResolvedValue([{url: "https://github.com/e/declared?skill=deck"}, {url: "https://example.com/not-a-skill"}, {url: "https://github.com/e/found?skill=s"}]);
        mocks.findToolAtoms.mockImplementation(async (uris: string[]) => new Map(uris.filter((uri) => uri.startsWith("ipfs://")).slice(0, 1).map((uri) => [uri, ATOM])));
        mocks.getPulseUsage.mockResolvedValue(new Map([[ATOM, usage([line("0xw1", "worked", "presentation authoring"), line("0xw2", "worked", "presentation authoring"), line("0xw3", "failed", "slide themes")])]]));
        const out = await ask({search_output: findText([result("e/found", "s")]), domain: " Slides ", limit: 50});
        expect(out["domain"]).toBe("presentation authoring");
        expect(mocks.findDeclaredTools.mock.calls[0]?.[0]).toEqual(expect.arrayContaining(["presentation authoring", "slide themes"]));
        const [first] = skills(out);
        expect(first).toMatchObject({atom_id: ATOM});
        expect(first?.["usage"]).toMatchObject({
            declarations: 3,
            in_this_domain: 3,
            by_reason: {"missing-key": 1},
            by_need: {OPENAI_API_KEY: 1},
            by_with: {ffmpeg: 1},
            written_by_others: [expect.objectContaining({value: "design"})],
            truncated: true,
        });
        expect(mocks.agentsForDomain).toHaveBeenCalledWith("presentation authoring");
    });

    it("finds the domain in the words when none is given", async () => {
        await ask({queries: ["make slides", "", 4], search_output: findText([result("f/x", "y")])});
        expect(mocks.findDeclaredTools).toHaveBeenCalled();
        expect(mocks.offersForNeed).toHaveBeenCalledWith(["make slides"]);
    });

    it("keeps the search's order when the score is off, by worked lines in the domain first", async () => {
        process.env["ARP_PULSE_SCORE"] = "off";
        const plain = await ask({search_output: findText([result("g/x", "y")])});
        expect(plain["order"]).toBe("the search's own");
        expect(skills(plain)[0]).not.toHaveProperty("score");
        const inDomain = await ask({search_output: findText([result("g/x", "y")]), domain: "design"});
        expect(String(inDomain["order"])).toContain('in "design"');
    });

    it("still answers with the files when the public record does not", async () => {
        mocks.getPulseUsage.mockRejectedValue(new Error("graph down"));
        const out = await ask({search_output: findText([result("h/x", "y")])});
        expect(skills(out)[0]?.["usage"]).toEqual({unknown: "the public record did not answer"});
    });

    it("says what this machine already hit with a skill", async () => {
        writeFileSync(join(home, "failures.jsonl"), `${JSON.stringify({at: "2026-11-10T00:00:00Z", skill: "y", source: "i/x", reason: "missing-key"})}\n`);
        const out = await ask({search_output: findText([result("i/x", "y")])});
        expect(skills(out)[0]?.["failed_on_this_machine"]).toMatchObject({reasons: {"missing-key": 1}});
        writeFileSync(join(home, "failures.jsonl"), "");
    });
});

describe("arp_pulse with nothing to show", () => {
    it("says a search_output it cannot read is not an empty answer", async () => {
        const out = await ask({search_output: "<html>nope</html>"});
        expect(out).toMatchObject({search: "search_output", results: [], detail: "no line of `search_output` reads as a result of `npx skills find`"});
        expect(out).not.toHaveProperty("nothing_found");
    });

    it("answers the agents beside an empty list, and says which part of them failed", async () => {
        mocks.agentsForDomain.mockRejectedValue(new Error("lines down"));
        mocks.offersForNeed.mockRejectedValue("offers down");
        const out = await ask({search_output: "No skills found", domain: "design", query: "decks"});
        expect(out["agents"]).toEqual({used_here_not_read: "lines down", offers_not_read: "offers down"});
    });

    it("says the agents could not be read in time rather than wait for them", async () => {
        mocks.agentsForDomain.mockImplementation(() => new Promise(() => undefined));
        const out = await ask({search_output: "No skills found", domain: "design"}, {...PULSE_BUDGET, agentsMs: 5});
        expect(out).toMatchObject({agents: null, agents_note: "the agents could not be read in time"});
    });
});

describe("arp_pulse running the search itself", () => {
    beforeEach(() => {
        mkdirSync(join(home, "skills-cli", ".npm", "_npx"), {recursive: true});
    });

    it("runs one search per phrase and fuses them, naming a phrase that failed", async () => {
        mocks.runSearch.mockImplementation(async (invocation: {args: string[]}) => {
            const phrase = invocation.args.at(-1);
            if (phrase === "broken") throw new Error(`npx failed at ${home}/x\nmore`);
            if (phrase === "garbled") return "<html>";
            return findText([result("j/x", String(phrase))]);
        });
        const out = await ask({queries: ["one", "broken", "garbled"], query: "two"});
        expect(out["phrases"]).toEqual(["one", "broken", "garbled", "two"]);
        expect((out["phrases_failed"] as {phrase: string; detail: string}[]).map((row) => row.phrase)).toEqual(["broken", "garbled"]);
        expect(String((out["phrases_failed"] as {detail: string}[])[0]?.detail)).not.toContain(home);
        expect(skills(out).map((row) => row["name"]).sort()).toEqual(["one", "two"]);
    });

    it("says the search did not run when no phrase got an answer", async () => {
        mocks.runSearch.mockRejectedValue(new Error("npx: not found"));
        const out = await ask({queries: ["a", "b"]});
        expect(out).toMatchObject({search: "unavailable", detail: "npx: not found"});
        expect(out["phrases_failed"]).toHaveLength(2);
        expect(String(out["next"])).toContain("arp_find_tools");
    });

    it("runs no search package when the operator turned it off", async () => {
        process.env["ARP_PULSE_SEARCH"] = "off";
        const out = await ask({query: "a"});
        expect(out).toMatchObject({search: "unavailable", detail: "this server does not run the search package"});
        expect(out).not.toHaveProperty("phrases_failed");
        expect(mocks.runSearch).not.toHaveBeenCalled();
    });

    it("downloads the package once, alone, before the other phrases run", async () => {
        const fresh = mkdtempSync(join(tmpdir(), "arp-pulse-fresh-"));
        process.env["ARP_HOME"] = fresh;
        const order: string[] = [];
        mocks.runSearch.mockImplementation(async (invocation: {args: string[]}) => {
            order.push(String(invocation.args.at(-1)));
            return "No skills found";
        });
        vi.stubGlobal("fetch", vi.fn(async () => Response.json({skills: []})));
        const out = await ask({queries: ["first", "second"]});
        process.env["ARP_HOME"] = home;
        vi.unstubAllGlobals();
        expect(order).toEqual(["first", "second"]);
        expect(mocks.runSearch.mock.calls[0]?.[0].args).not.toContain("--fetch-timeout=5000");
        expect(mocks.runSearch.mock.calls[1]?.[0].args).toContain("--fetch-timeout=5000");
        expect(out["nothing_found"]).toBe("skills.sh answered and lists nothing for these words");
    });
});
