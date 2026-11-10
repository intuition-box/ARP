import {Hint} from "../brand/Hint";
import {ClsRow, Panel} from "./AtomPageParts";

import {useOutsideSignals} from "../../hooks/use-outside-signals";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {issueUrl, repoOutsideOf, type RepoOutsideView} from "../../services/outside-signals";
import type {IssueRef, RepoStatus} from "@arp-protocol/core";

/** Issue numbers shown before the rest is left to GitHub's own search. */
const SHOWN = 3;

const STATUS: Record<RepoStatus, string> = {
    active: "not archived",
    archived: "archived",
    gone: "not found",
};

/**
 * What GitHub says about a skill's repository, in the skill page's facts column (task 101): whether its
 * owner archived it or it is gone, and how many issue titles name a failure. GitHub's figures, read on
 * the day shown, never ARP's and never in an order (ADR `0170`).
 */
export function SkillOutside({label}: {label: string | null}) {
    const file = useOutsideSignals();
    const view = file === undefined ? undefined : repoOutsideOf(file, label);
    const day = view?.status?.read ?? view?.issues?.read ?? null;

    return (
        <Panel
            label="On GitHub"
            aside={
                view === undefined ? null : (
                    <>
                        <Hint label="What On GitHub is read from">
                            GitHub&apos;s own answers on the day shown, and issue titles saying error,
                            fail, failed, broken or crash, which a match does not confirm.
                        </Hint>
                        {day === null ? null : (
                            <span className="ml-auto normal-case tracking-[0.04em] text-[color:var(--color-steel)]">
                                {formatDay(day)}
                            </span>
                        )}
                    </>
                )
            }
        >
            {view === undefined ? (
                <span className="font-mono text-[13px] text-[color:var(--color-steel)]">…</span>
            ) : view === null ? (
                <span className="font-mono text-[13px] text-[color:var(--color-steel)]">not read</span>
            ) : (
                <Rows view={view} />
            )}
        </Panel>
    );
}

function Rows({view}: {view: RepoOutsideView}) {
    const {issues} = view;
    return (
        <dl className="m-0">
            {view.status === null ? null : (
                <ClsRow term="State">
                    <a href={view.status.check} target="_blank" rel="noreferrer" className={linkClass}>
                        {STATUS[view.status.value]} ↗
                    </a>
                </ClsRow>
            )}
            {issues === null ? null : (
                <>
                    <ClsRow term="Failure issues">
                        <a href={issues.search} target="_blank" rel="noreferrer" className={linkClass}>
                            {`${issues.total.toLocaleString("en-US")} · ${issues.open.toLocaleString("en-US")} open ↗`}
                        </a>
                    </ClsRow>
                    {issues.named === null ? (
                        issues.recent.length === 0 ? null : (
                            <ClsRow term="Newest">
                                <Issues repo={view.repo} issues={issues.recent} />
                            </ClsRow>
                        )
                    ) : (
                        <ClsRow term="Name this skill">
                            {issues.named.count === 0 ? (
                                <span className="text-[color:var(--color-steel)]">none</span>
                            ) : (
                                <Issues repo={view.repo} issues={issues.named.recent} more={issues.named.count} />
                            )}
                        </ClsRow>
                    )}
                </>
            )}
        </dl>
    );
}

/** Each issue as its number and state, linked to it on GitHub. Its title stays there. */
function Issues({repo, issues, more}: {repo: string; issues: readonly IssueRef[]; more?: number}) {
    const shown = issues.slice(0, SHOWN);
    // Only a count the reading holds: the total is in the row above, and the newest are a sample of it.
    const rest = more === undefined ? 0 : more - shown.length;
    return (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
            {shown.map((issue) => (
                <a
                    key={issue.number}
                    href={issueUrl(repo, issue)}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                >
                    {`#${issue.number}`}
                    <span className="text-[color:var(--color-steel)]">{` ${issue.state}`}</span>
                </a>
            ))}
            {rest > 0 ? <span className="text-[color:var(--color-steel)]">{`+${rest}`}</span> : null}
        </span>
    );
}
