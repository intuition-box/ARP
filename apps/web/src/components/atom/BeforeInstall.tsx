import {
    beforeInstall,
    beforeInstallSummary,
    programSourceText,
    type BeforeInstall as BeforeInstallView,
    type ContentsProgram,
} from "@arp-protocol/core";

import {Hint} from "../brand/Hint";
import {BeforeSection, Dated, OnDemand, PendingRows, QuestionRow, steel} from "./BeforeParts";

import type {SkillContentsRead} from "../../hooks/use-skill-contents";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {HEAD_REF, lineUrl, type ContentsMatch, type SkillContentsEntry} from "../../services/skill-contents";

/**
 * "Before you install", under the skill's name (task 112, ADR `0182`): what its files answer to the
 * questions a person asks before letting an agent install it. What it asks for, what it costs, what
 * must be installed, what it runs, where it sends data, and anything hidden, in that order, from
 * `beforeInstall` (`packages/protocol/src/before-install.ts`), the same answers the agent is given.
 * Facts from the files, never a verdict, and nothing here blocks anything. `/pulse` shows it over its
 * own read, made at the repository's head (task 104).
 */
export function BeforeInstall({read, repo}: {read: SkillContentsRead; repo: string | null}) {
    const view = read.status === "read" ? beforeInstall(read.entry) : null;
    return (
        <BeforeSection
            id="before-install"
            label="Before you install"
            aside={
                read.status === "pending" ? null : (
                    <>
                        <Hint label="What Before you install is read from">
                            {read.status === "not-read"
                                ? "This skill's files were not in the last reading."
                                : read.entry.commit === HEAD_REF
                                  ? "Names its files carry, read at the repository's head; a host or a service named is not shown to be called."
                                  : `Names its files carry at commit ${read.entry.commit.slice(0, 7)}; a host or a service named is not shown to be called.`}
                        </Hint>
                        <Dated day={formatDay(read.measuredAt.slice(0, 10))} />
                    </>
                )
            }
            summary={
                read.status === "pending" ? null : view === null ? (
                    <span className={steel}>not read</span>
                ) : (
                    beforeInstallSummary(view)
                )
            }
        >
            {view === null || read.status !== "read" ? (
                <PendingRows terms={ALWAYS} text={read.status === "pending" ? "…" : "not read"} />
            ) : (
                <Rows view={view} entry={read.entry} repo={repo} />
            )}
        </BeforeSection>
    );
}

/** The rows every read skill shows, whatever its files hold. */
const ALWAYS = ["Asks for", "Paid services", "Needs installed", "Runs on your machine", "Sends data to"];

function Rows({view, entry, repo}: {view: BeforeInstallView; entry: SkillContentsEntry; repo: string | null}) {
    const at = (file: string, line: number) => <Where entry={entry} repo={repo} file={file} line={line} />;
    return (
        <>
            {view.fetchAndRun.length === 0 ? null : (
                <QuestionRow term="Fetches and runs code">
                    <Matches matches={view.fetchAndRun} entry={entry} repo={repo} />
                </QuestionRow>
            )}
            <QuestionRow term="Asks for">
                {view.keys.length === 0 ? <span className={steel}>no keys</span> : null}
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                    {view.keys.map((key) => (
                        <li key={key.name}>
                            {key.name}{" "}
                            <span className={steel}>
                                {key.why === "set in SKILL.md" ? "to set, " : ""}
                                {at(key.file, key.line)}
                            </span>
                        </li>
                    ))}
                </ul>
                {view.otherSettings === 0 ? null : (
                    <span className={`mt-0.5 block ${steel}`}>
                        {view.otherSettings === 1 ? "1 other setting" : `${view.otherSettings} other settings`}
                    </span>
                )}
            </QuestionRow>
            <QuestionRow term="Paid services">
                {view.services.length === 0 ? (
                    <span className={steel}>none named</span>
                ) : (
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                        {view.services.map((service) => (
                            <li key={service.name}>
                                {service.name} <span className={steel}>{[...service.keys, ...service.hosts].join(", ")}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </QuestionRow>
            <QuestionRow term="Needs installed">
                {view.programs.length === 0 ? (
                    <span className={steel}>none named</span>
                ) : (
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                        {view.programs.map((program) => (
                            <li key={program.name}>
                                {program.name} <Source program={program} entry={entry} repo={repo} />
                            </li>
                        ))}
                    </ul>
                )}
            </QuestionRow>
            <QuestionRow term="Runs on your machine">
                <OnDemand
                    count={view.scripts.length === 0 ? "no scripts" : view.scripts.length === 1 ? "1 script" : `${view.scripts.length} scripts`}
                    items={view.scripts.map((script) => (script.namedInSkillMd ? `${script.path} · named in SKILL.md` : script.path))}
                />
            </QuestionRow>
            <QuestionRow term="Sends data to">
                {view.apiHosts.length === 0 ? <span className={steel}>no API host named</span> : <span>{view.apiHosts.join(", ")}</span>}
                {view.staticHosts.length === 0 ? null : (
                    <OnDemand count={`fonts, CDNs and map tiles: ${view.staticHosts.length}`} items={view.staticHosts} />
                )}
                {view.otherHosts.length === 0 ? null : (
                    <OnDemand count={`other sites named: ${view.otherHosts.length}`} items={view.otherHosts} />
                )}
            </QuestionRow>
            {view.hidden.length === 0 ? null : (
                <QuestionRow term="Hidden text">
                    <Matches matches={view.hidden} entry={entry} repo={repo} />
                </QuestionRow>
            )}
            {view.notRead.length === 0 ? null : (
                <QuestionRow term="Not read">
                    <OnDemand
                        count={view.notRead.length === 1 ? "1 file" : `${view.notRead.length} files`}
                        items={view.notRead.map((file) => `${file.path} · ${file.why}`)}
                    />
                </QuestionRow>
            )}
        </>
    );
}

/** How a program was found, its line linked when it has one. */
function Source({program, entry, repo}: {program: ContentsProgram; entry: SkillContentsEntry; repo: string | null}) {
    if (program.file === undefined || program.line === undefined) {
        return <span className={steel}>{programSourceText(program)}</span>;
    }
    const lead = program.from === "spawned" ? "run by" : program.from === "package" ? `via ${program.via ?? "a package"},` : "said to be needed,";
    return (
        <span className={steel}>
            {lead} <Where entry={entry} repo={repo} file={program.file} line={program.line} />
        </span>
    );
}

/** `file:line`, linked to that line at the commit that was read. */
function Where({entry, repo, file, line}: {entry: SkillContentsEntry; repo: string | null; file: string; line: number}) {
    const where = `${file}:${line}`;
    if (repo === null) return <>{where}</>;
    return (
        <a href={lineUrl(repo, entry, {file, line})} target="_blank" rel="noreferrer" className={linkClass}>
            {where}
        </a>
    );
}

/** Matches shown before the rest is counted. */
const SHOWN = 6;

/** Each match as its kind and where it is. */
function Matches({matches, entry, repo}: {matches: readonly ContentsMatch<string>[]; entry: SkillContentsEntry; repo: string | null}) {
    return (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {matches.slice(0, SHOWN).map((match, index) => (
                <li key={`${index} ${match.kind} ${match.file}:${match.line}`}>
                    <span>{match.kind}</span>{" "}
                    <span className={steel}>
                        <Where entry={entry} repo={repo} file={match.file} line={match.line} />
                    </span>
                </li>
            ))}
            {matches.length > SHOWN ? <li className={steel}>{`+${matches.length - SHOWN}`}</li> : null}
        </ul>
    );
}
