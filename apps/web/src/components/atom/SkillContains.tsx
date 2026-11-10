import {Hint} from "../brand/Hint";
import {ClsRow, Panel} from "./AtomPageParts";

import type {SkillContentsRead} from "../../hooks/use-skill-contents";
import {formatDay} from "../../lib/atom-page";
import {linkClass} from "../../lib/control-class";
import {lineUrl, type ContentsMatch, type SkillContentsEntry} from "../../services/skill-contents";

/** Names shown in a row before the rest is counted: the panel sits in a 26rem column. */
const SHOWN = 6;

/**
 * What a skill's files contain, in the skill page's facts column (task 96): the programs it runs, the
 * keys it reads, its scripts, code it fetches and runs, the domains it names and text a reader of the
 * rendered page would not see. Facts from the files, never a verdict, and nothing here blocks anything.
 */
export function SkillContains({read, repo}: {read: SkillContentsRead; repo: string | null}) {
    return (
        <Panel
            label="Contains"
            aside={
                read.status === "pending" ? null : (
                    <>
                        <Hint label="What Contains is read from" align="right">
                            {read.status === "read"
                                ? `Names found in the skill's files at commit ${read.entry.commit.slice(0, 7)}, not requirements.`
                                : "This skill's files were not in the last reading."}
                        </Hint>
                        <span className="ml-auto normal-case tracking-[0.04em] text-[color:var(--color-steel)]">
                            {formatDay(read.measuredAt.slice(0, 10))}
                        </span>
                    </>
                )
            }
        >
            {read.status === "pending" ? (
                <span className="font-mono text-[13px] text-[color:var(--color-steel)]">…</span>
            ) : read.status === "not-read" ? (
                <span className="font-mono text-[13px] text-[color:var(--color-steel)]">not read</span>
            ) : (
                <Rows entry={read.entry} repo={repo} />
            )}
        </Panel>
    );
}

function Rows({entry, repo}: {entry: SkillContentsEntry; repo: string | null}) {
    const cut = (name: string) => entry.cut.includes(name);
    return (
        <dl className="m-0">
            <ClsRow term="Programs">
                <Names
                    names={[
                        ...entry.programs.map((program) => program.name),
                        ...entry.packages.map((pkg) => `${pkg.manager} ${pkg.name}`),
                    ]}
                    cut={cut("programs") || cut("packages")}
                />
            </ClsRow>
            <ClsRow term="Keys">
                <Names names={entry.settings} cut={cut("settings")} />
            </ClsRow>
            <ClsRow term="Scripts">
                <Names names={entry.scripts.map((script) => script.path)} cut={cut("scripts")} />
            </ClsRow>
            <ClsRow term="Fetch and run">
                <Matches matches={entry.fetchAndRun} entry={entry} repo={repo} cut={cut("fetchAndRun")} />
            </ClsRow>
            <ClsRow term="Domains">
                <Names names={entry.domains} cut={cut("domains")} />
            </ClsRow>
            <ClsRow term="Hidden text">
                <Matches matches={entry.hidden} entry={entry} repo={repo} cut={cut("hidden")} />
            </ClsRow>
            {entry.notRead === 0 ? null : (
                <ClsRow term="Not read">
                    <span className="text-[color:var(--color-steel)]">
                        {entry.notRead === 1 ? "1 file" : `${entry.notRead} files`}
                    </span>
                </ClsRow>
            )}
        </dl>
    );
}

function None() {
    return <span className="text-[color:var(--color-steel)]">none found</span>;
}

function More({count, cut}: {count: number; cut: boolean}) {
    if (count <= 0 && !cut) return null;
    return <span className="text-[color:var(--color-steel)]">{` +${Math.max(count, 0)}${cut ? "+" : ""}`}</span>;
}

function Names({names, cut}: {names: readonly string[]; cut: boolean}) {
    if (names.length === 0) return <None />;
    return (
        <span className="[overflow-wrap:anywhere]">
            {names.slice(0, SHOWN).join(", ")}
            <More count={names.length - SHOWN} cut={cut} />
        </span>
    );
}

/** Each match as its kind and where it is, linked to the line at the commit that was read. */
function Matches({
    matches,
    entry,
    repo,
    cut,
}: {
    matches: readonly ContentsMatch<string>[];
    entry: SkillContentsEntry;
    repo: string | null;
    cut: boolean;
}) {
    if (matches.length === 0) return <None />;
    return (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {matches.slice(0, SHOWN).map((match) => {
                const where = `${match.file}:${match.line}`;
                return (
                    <li key={`${match.kind} ${where}`} className="[overflow-wrap:anywhere]">
                        <span>{match.kind}</span>{" "}
                        {repo === null ? (
                            <span className="text-[color:var(--color-steel)]">{where}</span>
                        ) : (
                            <a
                                href={lineUrl(repo, entry, match)}
                                target="_blank"
                                rel="noreferrer"
                                className={linkClass}
                            >
                                {where}
                            </a>
                        )}
                    </li>
                );
            })}
            {matches.length > SHOWN || cut ? (
                <li>
                    <More count={matches.length - SHOWN} cut={cut} />
                </li>
            ) : null}
        </ul>
    );
}
