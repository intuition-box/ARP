/**
 * A search of skills.sh's whole index, the one `npx skills find` reads (task 82).
 *
 * ARP's own catalogue is 673 skills from 41 repositories, frozen on 2026-11-05 (`docs/tasks/63`). On
 * twenty needs fixed in advance it met 10, and the same queries through skills.sh met 18
 * (`scripts/measure/readiness-bench.ts`, testnet 13579, 2026-11-09). So a search by need reads this
 * index for coverage, and ARP's lines are laid over what comes back.
 *
 * This is the endpoint the official CLI calls, anonymously (`skills@1.7.6`, `searchSkillsAPI`).
 * skills.sh's `robots.txt` disallows `/api/`; reading it anyway, for a person's own search, is the
 * user's decision of 2026-11-09. It returns a name, a repository and an install count, never a
 * description: what a skill needs is read from its file by `arp_pulse`.
 *
 * Holds no key and writes nothing. A failure returns `unavailable`, never an empty list that would
 * read as "nothing exists for this need".
 */

/** One result, with the address ARP gives a skill (`github.com/<owner>/<repo>?skill=<name>`, ADR `0077`). */
export type IndexedSkill = {
    /** `owner/repo`, as skills.sh prints it. */
    source: string;
    skill: string;
    installs: number | null;
    /** `https://github.com/<source>?skill=<skill>` when `source` is a GitHub `owner/repo`; else `null`. */
    url: string | null;
};

export type SkillsIndexAnswer = {status: "ok"; skills: IndexedSkill[]} | {status: "unavailable"; reason: string};

export type SkillsIndexOptions = {
    fetch?: typeof fetch;
    /** `https://skills.sh` by default. The web app passes its own same-origin proxy. */
    baseUrl?: string;
    /** 1 to 50; 20 by default, the CLI's own. */
    limit?: number;
    timeoutMs?: number;
};

export const SKILLS_INDEX_URL = "https://skills.sh";

const OWNER_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SKILL_NAME = /^[A-Za-z0-9_.:-]+$/;

/** ARP's address for a skill, or `null` when the repository is not a GitHub `owner/repo`. */
export function skillUrlOf(source: string, skill: string): string | null {
    if (!OWNER_REPO.test(source) || !SKILL_NAME.test(skill)) return null;
    return `https://github.com/${source}?skill=${skill}`;
}

/** Parses skills.sh's answer. Rows that are not well formed are dropped, not repaired. */
export function parseSkillsIndex(body: unknown): IndexedSkill[] {
    // Safe: `body` is a non-null object here, and `skills` is read as `unknown` and checked below.
    const rows = body !== null && typeof body === "object" ? (body as {skills?: unknown}).skills : undefined;
    if (!Array.isArray(rows)) return [];
    const out: IndexedSkill[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
        if (row === null || typeof row !== "object") continue;
        // Safe: `row` is a non-null object, and every field is read as `unknown` and narrowed.
        const record = row as Record<string, unknown>;
        const source = typeof record["source"] === "string" ? record["source"].trim() : "";
        const skill =
            typeof record["skillId"] === "string"
                ? record["skillId"].trim()
                : typeof record["name"] === "string"
                  ? record["name"].trim()
                  : "";
        if (source === "" || skill === "") continue;
        const key = `${source.toLowerCase()}@${skill.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const installs = typeof record["installs"] === "number" && Number.isFinite(record["installs"]) ? record["installs"] : null;
        out.push({source, skill, installs, url: skillUrlOf(source, skill)});
    }
    return out;
}

/** Searches skills.sh's index for `query`, in its own order. */
export async function searchSkillsIndex(query: string, options: SkillsIndexOptions = {}): Promise<SkillsIndexAnswer> {
    const words = query.trim();
    if (words === "") return {status: "ok", skills: []};
    const limit = Math.min(50, Math.max(1, Math.floor(options.limit ?? 20)));
    const base = (options.baseUrl ?? SKILLS_INDEX_URL).replace(/\/+$/, "");
    const fetchLike = options.fetch ?? fetch;
    const params = new URLSearchParams({q: words.slice(0, 200), limit: String(limit)});
    try {
        const response = await fetchLike(`${base}/api/search?${params.toString()}`, {
            headers: {accept: "application/json"},
            signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
        });
        if (!response.ok) return {status: "unavailable", reason: `skills.sh answered ${response.status}`};
        return {status: "ok", skills: parseSkillsIndex(await response.json())};
    } catch (error) {
        return {status: "unavailable", reason: error instanceof Error ? error.message : String(error)};
    }
}
