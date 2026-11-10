/**
 * Somebody else's figures, as the skill page and the agent page show them (task 101, ADR `0170`).
 *
 * Read from `data/catalogue/outside-signals.json`, which `scripts/build/build-outside-signals.ts`
 * builds from three dated readings: GitHub's word on whether a repository is archived or gone, GitHub
 * search's count of issue titles naming a failure, and x402 Doctor's Trust Index. Each keeps its source
 * and its day. None of it is ARP's figure, and none of it orders anything (ADR `0143`).
 */
import {
    failureIssueSearchUrl,
    outsideIndex,
    repoLabelOf,
    TRUST_INDEX_LOOKUP,
    type IssueRef,
    type OutsideSignals,
    type RepoStatus,
    type TrustEntry,
    type TrustHost,
} from "@arp-protocol/core";

export type RepoOutsideView = {
    /** `owner/name`, as GitHub's addresses take it. */
    repo: string;
    status: {value: RepoStatus; read: string; check: string} | null;
    issues: {
        total: number;
        open: number;
        read: string;
        search: string;
        /** The newest matching issues of the repository, newest first. */
        recent: IssueRef[];
        /** Issues whose title names this skill, among the newest read; `null` for a repository of one skill. */
        named: {count: number; recent: IssueRef[]} | null;
    } | null;
};

/** A skill's or a repository's outside facts. `null` when the reading did not cover its repository. */
export function repoOutsideOf(file: OutsideSignals, label: string | null): RepoOutsideView | null {
    if (label === null) return null;
    const repoLabel = repoLabelOf(label);
    const index = outsideIndex(file);
    const signals = index.repo(label);
    if (repoLabel === null || signals === null) return null;
    const repo = repoLabel.replace(/^github\.com\//, "");
    const {read, issuesRead} = file.sources.github;
    const named = label.includes("?skill=") ? index.skill(label) : null;
    const view: RepoOutsideView = {
        repo,
        status:
            signals.status === null || read === null
                ? null
                : {value: signals.status, read, check: `https://api.github.com/repos/${repo}`},
        issues:
            signals.issues === null || issuesRead === null
                ? null
                : {
                      total: signals.issues.total,
                      open: signals.issues.open,
                      read: issuesRead,
                      search: failureIssueSearchUrl(repo),
                      recent: signals.issues.recent,
                      named: named === null ? null : {count: named.named, recent: named.recent},
                  },
    };
    return view.status === null && view.issues === null ? null : view;
}

/** One endpoint's row of the Trust Index, or its host's, or neither. */
export type EndpointOutsideView = {
    url: string;
    found: {kind: "endpoint"; entry: TrustEntry} | {kind: "host"; host: TrustHost} | {kind: "not-listed"};
    check: string;
};

/**
 * The Trust Index's word on each of an agent's callable endpoints. Endpoints whose host the reading
 * did not ask about are left out: "not read" is not "not listed".
 */
export function endpointsOutsideOf(file: OutsideSignals, urls: readonly string[]): EndpointOutsideView[] {
    const index = outsideIndex(file);
    return urls.flatMap((url) => {
        const found = index.endpoint(url);
        if (!found.asked) return [];
        return [
            {
                url,
                found:
                    found.entry !== null
                        ? {kind: "endpoint" as const, entry: found.entry}
                        : found.host !== null
                          ? {kind: "host" as const, host: found.host}
                          : {kind: "not-listed" as const},
                check: `${TRUST_INDEX_LOOKUP}${encodeURIComponent(url.trim())}`,
            },
        ];
    });
}

/** GitHub's own address for one issue. */
export const issueUrl = (repo: string, issue: IssueRef) => `https://github.com/${repo}/issues/${issue.number}`;
