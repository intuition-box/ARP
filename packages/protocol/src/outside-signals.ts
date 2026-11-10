/**
 * Somebody else's public figures about a skill's repository or an agent's endpoint, kept as dated,
 * sourced facts (task 101, ADR `0170`).
 *
 * Three sources, each read at build time by a committed script and bundled with its date:
 *
 * ```
 * GitHub, the repository     archived, deleted (404) or neither          scripts/measure/repo-liveness.ts
 * GitHub search, its issues  issues whose title names a failure          scripts/measure/repo-failure-issues.ts
 * x402 Doctor's Trust Index  payable today, and on how many days of 30   scripts/measure/x402-trust-index.ts
 * ```
 *
 * The same treatment as the probe (ADR `0093`): never written on chain, never presented as ARP's
 * figure, and **never an input to a score or an order** (ADR `0143`). Every fact carries who said it,
 * the day it was read, and where a reader can ask again.
 *
 * Pure: no network, no clock. The scripts fetch; this shapes and looks up.
 */

/** The exact credit the Trust Index's licence asks for (its dataset card, "License and citation"). */
export const TRUST_INDEX_CREDIT = "x402 Trust Index by x402 Doctor (fizzl.eu)";
export const TRUST_INDEX_LICENCE = "CC BY 4.0";
export const TRUST_INDEX_DATASET = "huggingface.co/datasets/x402Fizzl/x402-trust-index";
/** Where one endpoint's live record can be asked again, free and without a key. */
export const TRUST_INDEX_LOOKUP = "https://x402-doctor.fizzl.eu/api/trust?url=";

/**
 * The words an issue title must carry. Five words take four `OR`s, and GitHub's search refuses a
 * query with more than five operators. Titles only, because a body quotes an error in passing: the
 * same words in title or body match several times as many issues (ADR `0170` has both queries).
 */
export const FAILURE_WORDS = ["error", "fail", "failed", "broken", "crash"] as const;

/** The search a reader can run again, for one repository given as `owner/name`. */
export function failureIssueQuery(repo: string): string {
    return `repo:${repo} is:issue in:title ${FAILURE_WORDS.join(" OR ")}`;
}

/** The same search on GitHub's own page, without the `repo:` qualifier its address already carries. */
export function failureIssueSearchUrl(repo: string): string {
    const q = `is:issue in:title ${FAILURE_WORDS.join(" OR ")}`;
    return `https://github.com/${repo}/issues?q=${encodeURIComponent(q)}`;
}

/** Whether an issue title names a skill: the name as a whole word, any case. A name under three characters names nothing. */
export function titleNamesSkill(title: string, skill: string): boolean {
    const name = skill.trim().toLowerCase();
    if (name.length < 3) return false;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(title.toLowerCase());
}

export type RepoStatus = "active" | "archived" | "gone";

/** One issue, by number, state and day opened. Its title stays on GitHub. */
export type IssueRef = {number: number; state: "open" | "closed"; opened: string};

export type FailureIssues = {
    /** GitHub search's own count for the query, across both states. */
    total: number;
    open: number;
    /** The most recent, newest first, at most {@link RECENT_ISSUES}. */
    recent: IssueRef[];
};

export const RECENT_ISSUES = 5;

export type RepoSignals = {
    /** `null` when the repository was not read on that run. */
    status: RepoStatus | null;
    /** `null` when the search was not run or did not answer. */
    issues: FailureIssues | null;
    /**
     * Set when the repository holds several skills and each issue title read was matched against
     * their names. A skill of such a repository absent from `skills` was named by none.
     */
    perSkill?: true;
};

/** One skill's share of its repository's issues: those whose title names it, among the newest 100 read. */
export type SkillIssues = {named: number; recent: IssueRef[]};

/** One endpoint's row of the Trust Index, the fields ARP shows. */
export type TrustEntry = {
    /** `error` is not on the dataset card: it is what the file holds for an endpoint that did not answer. */
    verdict: "go" | "caution" | "no_go" | "error";
    reasons: string[];
    priceUsd: number | null;
    daysChecked: number;
    daysPayable: number;
};

/** What the Trust Index lists at one host. */
export type TrustHost = {
    endpoints: number;
    go: number;
    caution: number;
    noGo: number;
    error: number;
};

export type OutsideSignals = {
    _note: string;
    sources: {
        github: {read: string | null; issuesRead: string | null; query: string};
        trustIndex: {
            read: string | null;
            /** The day of Doctor's scan the dataset holds. */
            scan: string | null;
            /** The dataset's commit, so the same bytes can be fetched again. */
            revision: string | null;
            credit: string;
            licence: string;
            dataset: string;
        };
    };
    /** Keyed by the repository atom's label, `github.com/owner/name`. */
    repos: Record<string, RepoSignals>;
    /** Keyed by the skill atom's label; only skills some issue title names, in a `perSkill` repository. */
    skills: Record<string, SkillIssues>;
    x402: {
        /** Exact URLs found in the index, keyed as the agent wrote them. */
        urls: Record<string, TrustEntry>;
        /** Hosts asked about, found or not: a host absent from `hosts` was looked for and not listed. */
        hostsAsked: string[];
        hosts: Record<string, TrustHost>;
    };
};

/** One fact as an agent receives it: what it says, who said it, when, and where to ask again. */
export type OutsideFact = {says: string; per: string; on: string; check?: string; licence?: string};

const keyOf = (label: string) =>
    label
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .toLowerCase();

/** The repository a skill or repository label points at, `github.com/owner/name`, or `null`. */
export function repoLabelOf(label: string): string | null {
    const match = /^(?:https?:\/\/)?github\.com\/([^/?#]+)\/([^/?#]+)/i.exec(label.trim());
    return match === null ? null : `github.com/${match[1]}/${match[2]}`.toLowerCase();
}

function lowerKeys<T>(record: Record<string, T>): Map<string, T> {
    return new Map(Object.entries(record).map(([key, value]) => [keyOf(key), value]));
}

/** Build the lookups once per file. */
export function outsideIndex(file: OutsideSignals) {
    const repos = lowerKeys(file.repos);
    const skills = lowerKeys(file.skills);
    const hostsAsked = new Set(file.x402.hostsAsked.map((host) => host.toLowerCase()));
    const hosts = new Map(
        Object.entries(file.x402.hosts).map(([host, row]) => [host.toLowerCase(), row]),
    );
    return {
        repo: (label: string): RepoSignals | null => {
            const repo = repoLabelOf(label);
            return repo === null ? null : (repos.get(repo) ?? null);
        },
        /** `null` when titles were not matched per skill for its repository: one skill, or not read. */
        skill: (label: string): SkillIssues | null => {
            const repo = repoLabelOf(label);
            const matched = repo === null ? false : repos.get(repo)?.perSkill === true;
            if (!matched || !label.includes("?skill=")) return null;
            return skills.get(keyOf(label)) ?? {named: 0, recent: []};
        },
        /** `asked: false` when this endpoint's host was not in the reading, which is not "not listed". */
        endpoint: (
            url: string,
        ): {asked: boolean; entry: TrustEntry | null; host: TrustHost | null} => {
            let host: string;
            try {
                host = new URL(url.trim()).hostname.toLowerCase();
            } catch {
                return {asked: false, entry: null, host: null};
            }
            return {
                asked: hostsAsked.has(host),
                entry: file.x402.urls[url.trim()] ?? null,
                host: hosts.get(host) ?? null,
            };
        },
    };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * A skill's or a repository's outside facts, as an agent reads them. Empty when nothing was read about
 * it, so silence never reads as "nothing found".
 */
export function repoFacts(file: OutsideSignals, label: string, skill?: string): OutsideFact[] {
    const index = outsideIndex(file);
    const repoLabel = repoLabelOf(label);
    const signals = index.repo(label);
    if (repoLabel === null || signals === null) return [];
    const repo = repoLabel.replace(/^github\.com\//, "");
    const facts: OutsideFact[] = [];
    const {read, issuesRead} = file.sources.github;
    if (signals.status !== null && read !== null) {
        facts.push({
            says:
                signals.status === "gone"
                    ? "repository not found (deleted, renamed or private)"
                    : signals.status === "archived"
                      ? "repository archived by its owner"
                      : "repository neither archived nor deleted",
            per: "GitHub",
            on: read,
            check: `https://api.github.com/repos/${repo}`,
        });
    }
    if (signals.issues !== null && issuesRead !== null) {
        const {total, open} = signals.issues;
        const named = skill === undefined ? null : index.skill(label);
        facts.push({
            says:
                `${plural(total, "issue title names", "issue titles name")} a failure (${open} open)` +
                (named === null ? "" : `; ${named.named} among the newest read name this skill`),
            per: "GitHub search",
            on: issuesRead,
            check: failureIssueSearchUrl(repo),
        });
    }
    return facts;
}

/** An endpoint's Trust Index facts, credited as its licence asks. Empty when its host was not looked up. */
export function endpointFacts(file: OutsideSignals, url: string): OutsideFact[] {
    const {read, scan, credit, licence} = file.sources.trustIndex;
    const found = outsideIndex(file).endpoint(url);
    if (!found.asked || read === null) return [];
    const on = scan ?? read;
    const check = `${TRUST_INDEX_LOOKUP}${encodeURIComponent(url.trim())}`;
    const facts: OutsideFact[] = [];
    if (found.entry !== null) {
        const {verdict, daysChecked, daysPayable, reasons} = found.entry;
        facts.push({
            says:
                `${verdict}, payable on ${daysPayable} of ${plural(daysChecked, "day", "days")} checked` +
                (reasons.length === 0 ? "" : ` (${reasons.join(", ")})`),
            per: credit,
            on,
            check,
            licence,
        });
    } else if (found.host !== null) {
        const {endpoints, go, caution, noGo, error} = found.host;
        facts.push({
            says: `this address is not listed; its host has ${plural(endpoints, "listed endpoint", "listed endpoints")}: ${go} go, ${caution} caution, ${noGo} no_go${error === 0 ? "" : `, ${error} unreachable`}`,
            per: credit,
            on,
            check,
            licence,
        });
    } else {
        facts.push({says: "not listed", per: credit, on, licence});
    }
    return facts;
}

/** The Trust Index row shape the dataset card documents (`data/endpoints.jsonl`). */
export type TrustIndexRow = {
    url?: unknown;
    host?: unknown;
    verdict?: unknown;
    reasons?: unknown;
    price_usd?: unknown;
    days_checked?: unknown;
    days_payable?: unknown;
};

const VERDICTS = new Set(["go", "caution", "no_go", "error"]);

/**
 * Keep the rows for the URLs and hosts ARP asked about, and count the rest of each host. A row that
 * does not carry the documented fields is skipped and counted, never guessed at.
 */
export function summariseTrustIndex(
    rows: Iterable<TrustIndexRow>,
    wanted: {urls: ReadonlySet<string>; hosts: ReadonlySet<string>},
): {
    urls: Record<string, TrustEntry>;
    hosts: Record<string, TrustHost>;
    rows: number;
    malformed: number;
} {
    const urls: Record<string, TrustEntry> = {};
    const hosts: Record<string, TrustHost> = {};
    let count = 0;
    let malformed = 0;
    for (const row of rows) {
        count += 1;
        if (
            typeof row.url !== "string" ||
            typeof row.verdict !== "string" ||
            !VERDICTS.has(row.verdict)
        ) {
            malformed += 1;
            continue;
        }
        const verdict = row.verdict as TrustEntry["verdict"]; // checked against VERDICTS above
        let host: string;
        try {
            host = new URL(row.url).hostname.toLowerCase();
        } catch {
            malformed += 1;
            continue;
        }
        if (wanted.hosts.has(host)) {
            const at = (hosts[host] ??= {
                endpoints: 0,
                go: 0,
                caution: 0,
                noGo: 0,
                error: 0,
            });
            at.endpoints += 1;
            if (verdict === "go") at.go += 1;
            else if (verdict === "caution") at.caution += 1;
            else if (verdict === "no_go") at.noGo += 1;
            else at.error += 1;
        }
        if (wanted.urls.has(row.url)) {
            urls[row.url] = {
                verdict,
                reasons: Array.isArray(row.reasons)
                    ? row.reasons.filter((r): r is string => typeof r === "string").slice(0, 10)
                    : [],
                priceUsd: typeof row.price_usd === "number" ? row.price_usd : null,
                daysChecked: typeof row.days_checked === "number" ? row.days_checked : 0,
                daysPayable: typeof row.days_payable === "number" ? row.days_payable : 0,
            };
        }
    }
    return {urls, hosts, rows: count, malformed};
}
