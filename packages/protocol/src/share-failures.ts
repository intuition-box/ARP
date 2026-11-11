import {skillRefFromUrl} from "./content-path.js";
import type {UsageReason} from "./declare/usage-context.js";
import type {LocalFailure} from "./local-failures.js";
import type {LocalOutcome} from "./local-outcomes.js";

/**
 * What may leave a machine from its local failure memory (`docs/tasks/70` item 2).
 *
 * **Off unless the person turned it on**, and only ever a public skill, `failed`, a closed reason, the
 * domain of the search that found the skill when there was one, and the missing program's or variable's
 * name when the skill's own SKILL.md names it (ADR `0166`; the hook kept it only then, and the sponsoring
 * service checks it again). Never a session, a date or a path.
 *
 * **`worked` since task 100** (ADR `0169`): the model's own answer to the hook's closed question at the end of a
 * turn, from `outcomes.jsonl`. Only `worked` is shared: a `failed` answer carries no reason, which is what a
 * failure line is read for, and `unsure` says nothing. On a worked line `need` is the name it worked `with`.
 *
 * **A skill with no known public source stays local.** A hook line usually has no source, and a skill
 * can be private: its name alone must not reach a public graph, and a name resolved by guessing
 * would write a line about somebody else's repository.
 */
export type SharedLine =
    | {toolUrl: string; outcome: "failed"; domain?: string; reason: UsageReason; need?: string; version?: string}
    | {toolUrl: string; outcome: "worked"; domain?: string; need?: string; version?: string};

/** What is known about where an installed skill came from. */
export type InstalledSkill = {skill: string; source: string};

export type ShareDecision = {
    lines: SharedLine[];
    /** Why a failure stays on this machine. Skills only, for the person's own eyes. */
    keptLocal: {skill: string; why: "sharing_off" | "no_public_source" | "several_sources"}[];
};

const GITHUB_REPO = /^[\w.-]+\/[\w.-]+$/;

/** On only for exactly `{"failures": true}`. Anything else, a broken file included, is off. */
export function isSharingOn(settings: string | null): boolean {
    if (settings === null) return false;
    try {
        const parsed: unknown = JSON.parse(settings);
        return typeof parsed === "object" && parsed !== null && (parsed as {failures?: unknown}).failures === true; // checked to be an object on this line
    } catch {
        return false;
    }
}

/** The skills CLI's lock file: `~/.agents/.skill-lock.json` for a global install, `skills-lock.json` beside a project for a project install. Both have `skills.<name>.source`. GitHub entries only. */
export function installedFromSkillLock(lock: string | null): InstalledSkill[] {
    if (lock === null) return [];
    try {
        const parsed = JSON.parse(lock) as {skills?: Record<string, {source?: unknown; sourceType?: unknown}>}; // read field by field
        return Object.entries(parsed.skills ?? {}).flatMap(([skill, entry]) =>
            entry?.sourceType === "github" && typeof entry.source === "string" ? [{skill, source: entry.source}] : [],
        );
    } catch {
        return [];
    }
}

/** What was fetched through ARP (`receipts.jsonl`): the served URL names the repository. A broken line is skipped. */
export function installedFromReceipts(text: string | null): InstalledSkill[] {
    const found: InstalledSkill[] = [];
    for (const line of (text ?? "").split("\n")) {
        if (line.trim() === "") continue;
        try {
            const row = JSON.parse(line) as {url?: unknown; receipt?: {url?: unknown}}; // read field by field
            const url = typeof row.url === "string" ? row.url : row.receipt?.url;
            const ref = typeof url === "string" ? skillRefFromUrl(url) : null;
            if (ref !== null) found.push({skill: ref.skill, source: ref.repo});
        } catch {
            continue;
        }
    }
    return found;
}

/**
 * A key for one sentence: the same skill, domain, reason and need is one line, however often it failed. A
 * line without a need keeps the key it had before task 97, so what was already shared is not offered again. A version
 * (task 127, ADR `0192`) makes a new sentence: the same result on other files is a line of its own.
 */
export function sharedLineKey(line: SharedLine): string {
    // `worked` is no reason word, so a worked line's key never meets a failure's, and a failure keeps its old key.
    const base = `${line.toolUrl}\u0000${line.domain ?? ""}\u0000${line.outcome === "failed" ? line.reason : "worked"}`;
    const withNeed = line.need === undefined ? base : `${base}\u0000${line.need}`;
    return line.version === undefined ? withNeed : `${withNeed}\u0000version:${line.version}`;
}

export function decideShare(params: {
    on: boolean;
    failures: readonly LocalFailure[];
    /** The model's answers (`outcomes.jsonl`). Only `worked` ones become lines. */
    outcomes?: readonly LocalOutcome[];
    installed: readonly InstalledSkill[];
    alreadyShared: ReadonlySet<string>;
}): ShareDecision {
    const lines = new Map<string, SharedLine>();
    const keptLocal = new Map<string, ShareDecision["keptLocal"][number]>();
    /** The skill's public URL, or `null` once why it stays here is noted. */
    const toolUrlOf = (skill: string, given: string | null): string | null => {
        const name = skill.split(":").pop() ?? skill;
        if (!params.on) {
            keptLocal.set(name, {skill: name, why: "sharing_off"});
            return null;
        }
        const sources = new Set(
            given !== null ? [given] : params.installed.filter((entry) => entry.skill === name).map((entry) => entry.source),
        );
        if (sources.size > 1) {
            keptLocal.set(name, {skill: name, why: "several_sources"});
            return null;
        }
        const [source] = [...sources];
        if (source === undefined || !GITHUB_REPO.test(source)) {
            keptLocal.set(name, {skill: name, why: "no_public_source"});
            return null;
        }
        return `https://github.com/${source}?skill=${encodeURIComponent(name)}`;
    };
    const offer = (line: SharedLine) => {
        const key = sharedLineKey(line);
        if (!params.alreadyShared.has(key)) lines.set(key, line);
    };
    for (const failure of params.failures) {
        const toolUrl = toolUrlOf(failure.skill, failure.source);
        if (toolUrl === null) continue;
        offer({
            toolUrl,
            outcome: "failed",
            ...(failure.domain === undefined ? {} : {domain: failure.domain}),
            reason: failure.reason,
            ...(failure.need === undefined ? {} : {need: failure.need}),
            ...(failure.version === undefined ? {} : {version: failure.version}),
        });
    }
    for (const answer of params.outcomes ?? []) {
        if (answer.outcome !== "worked") continue;
        const toolUrl = toolUrlOf(answer.skill, answer.source);
        if (toolUrl === null) continue;
        offer({
            toolUrl,
            outcome: "worked",
            ...(answer.domain === undefined ? {} : {domain: answer.domain}),
            ...(answer.with === undefined ? {} : {need: answer.with}),
            ...(answer.version === undefined ? {} : {version: answer.version}),
        });
    }
    return {lines: [...lines.values()], keptLocal: [...keptLocal.values()]};
}
