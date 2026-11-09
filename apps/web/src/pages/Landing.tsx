import {useCallback, useRef, useState, type CSSProperties, type ReactNode} from "react";
import {Link} from "react-router-dom";
import type {RecentDeclaration} from "@arp-protocol/core";

import {GalaxyField} from "../components/brand/GalaxyField";
import {NoActivityYet} from "../components/brand/NoActivityYet";
import {SceneDeck} from "../components/brand/SceneDeck";
import {
    cameraDuration,
    cameraFor,
    JOIN,
    readingAt,
    WORD_LIGHTS_AFTER,
    WORDS_AT,
} from "../components/brand/galaxy-geometry";
import {useDeck, useSceneTime} from "../components/brand/scene-context";
import {useLandingField, type LandingFieldRead} from "../hooks/use-landing-field";
import {useRecentDeclarations} from "../hooks/use-recent-declarations";
import {useChainChoice} from "../lib/chain-choice";
import {cssVars} from "../lib/css-vars";
import {heroControlClass, linkClass} from "../lib/control-class";
import {parseToolLabel, primaryNameOf} from "../lib/tool-label";
import {SAMPLE_LINES} from "../services/landing-sample";
import {relativeDay, truncateMiddle} from "../services/trust-format";

/**
 * `/` — one camera through the registry, in six scenes (task 81, ADR `0152`).
 *
 * The design is `docs/design/landing-galaxy/LANDING-GALAXY.md` and its reference HTML, the user's
 * decision of 2026-11-09: the registry is a galaxy, every word of the public graph a star in it,
 * and each scene a camera stop over the same world. Scenes 1 to 4 pull a few stars out and set
 * them as the atom page's claim field around one tool. **The copy is the design file's, exactly**;
 * no kicker above a heading and no lede under the hero (the user removed both).
 *
 * The order is the user's: Pulse · Written · Travels · Plug in · No grade · Build.
 *
 * ## Real data, or the sample said to be one
 *
 * The pulse reads the chain's recent lines and the field reads the most declared tool on the
 * chain the reader chose, with ARP's own test identities left out (`services/test-identities.ts`).
 * When the chain **answers with nothing** — on testnet every real line is one of those tests —
 * scenes 0 to 2 show the reference's sample (`services/landing-sample.ts`) and every panel showing
 * it says « Sample » (the user, 2026-11-09). Real data replaces it panel by panel; no panel mixes
 * the two. A failed read says it failed; a sample never stands in for one (`rules/claims.md` §1).
 */

/** How many recent lines the pulse asks for, and how many it shows. */
const RECENT_LIMIT = 8;
const PULSE_ROWS = 4;

type Read<T> = {status: "pending"} | {status: "failed"} | {status: "ok"; data: T};

function readOf<T>(query: {isPending: boolean; isError: boolean; data: T | undefined}): Read<T> {
    if (query.isPending) return {status: "pending"};
    if (query.isError || query.data === undefined) return {status: "failed"};
    return {status: "ok", data: query.data};
}

/** The camera's time between two scenes, at this width. The deck uses it to pace the arrival. */
function durationOf(from: number, to: number, width: number): number {
    return cameraDuration(cameraFor(from, width), cameraFor(to, width));
}

export function Landing() {
    const recent = readOf(useRecentDeclarations(RECENT_LIMIT));
    const field = useLandingField();
    const rows = useRef<(HTMLElement | null)[]>([]);
    const readRow = useCallback((index: number) => rows.current[index] ?? null, []);
    const rowRef = useCallback(
        (index: number) => (element: HTMLElement | null) => {
            rows.current[index] = element;
        },
        [],
    );

    return (
        <SceneDeck
            durationOf={durationOf}
            backdrop={
                <GalaxyField
                    field={field.status === "ok" ? field.field : null}
                    beats={recent.status === "ok" ? recent.data.length || SAMPLE_LINES.length : 0}
                    readRow={readRow}
                />
            }
        >
            <ScenePulse read={recent} />
            <SceneWritten read={field} />
            <SceneTravels read={field} rowRef={rowRef} />
            <ScenePlugIn />
            <SceneNoGrade />
            <SceneBuild />
        </SceneDeck>
    );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

/** One piece of a scene's arrival: it comes in `index`-th, 75 ms after the one before. */
function rv(index: number): {className: string; style: CSSProperties} {
    return {className: "arp-gx-rv", style: cssVars({"--gx-i": index})};
}

function Panel({
    label,
    className,
    index,
    children,
}: {
    label: string;
    className: string;
    index: number;
    children: ReactNode;
}) {
    const piece = rv(index);
    return (
        <div
            data-panel
            className={`arp-gx-panel ${className} ${piece.className}`}
            style={piece.style}
            aria-label={label}
            role="group"
        >
            <div className="arp-gx-panel-head">
                <i aria-hidden="true" />
                {label}
            </div>
            {children}
        </div>
    );
}

/** What a panel says when its read is not an answer, or the answer is empty. */
function NotYet({read, empty}: {read: {status: "pending" | "failed" | "ok"}; empty: ReactNode}) {
    if (read.status === "pending") return <p className="arp-gx-quiet">reading…</p>;
    if (read.status === "failed") {
        return (
            <p className="arp-gx-quiet">
                The graph did not answer. This is a read that failed, not an empty chain.
            </p>
        );
    }
    return <div className="arp-gx-empty">{empty}</div>;
}

/**
 * The field's read as the lines see it: the tool can be found while its lines did not answer, and
 * then the line panels say the read failed rather than that nobody wrote one.
 */
function linesOf(read: LandingFieldRead): {status: "pending" | "failed" | "ok"} {
    return read.status === "ok" && read.field.linesFailed ? {status: "failed"} : read;
}

/** Names only: a tool's label is its URL, and a skill is named by its skill. */
function nameOf(end: {atomId: string; label: string | null}): string {
    return end.label === null
        ? truncateMiddle(end.atomId, 6, 4)
        : primaryNameOf(parseToolLabel(end.label));
}

/* -------------------------------------------------------------------------- */
/* 0 · Pulse                                                                   */
/* -------------------------------------------------------------------------- */

function ScenePulse({read}: {read: Read<RecentDeclaration[]>}) {
    const chain = useChainChoice();
    const rows = read.status === "ok" ? read.data.slice(0, PULSE_ROWS) : [];
    // The chain answered with nothing: the sample, said to be one (the user, 2026-11-09).
    const sample = read.status === "ok" && rows.length === 0;
    return (
        <>
            {/* The pulse panel, top left, desktop only (the design's open question 2, decided). */}
            <Panel
                label={`Lines · ${chain.label.toLowerCase()}${sample ? " · sample" : ""}`}
                className="arp-gx-beat"
                index={2}
            >
                {sample ? (
                    <>
                        <ul className="arp-gx-beatrows">
                            {SAMPLE_LINES.map((row) => (
                                <li key={row.agent}>
                                    <b>{row.agent}</b>
                                    <span>{row.tool}</span>
                                    <em>{row.context}</em>
                                </li>
                            ))}
                        </ul>
                        <p className="arp-gx-foot">Sample.</p>
                    </>
                ) : rows.length === 0 ? (
                    <NotYet read={read} empty={<NoActivityYet />} />
                ) : (
                    <ul className="arp-gx-beatrows">
                        {rows.map((row) => (
                            <li key={row.tripleId}>
                                <b>{nameOf(row.subject)}</b>
                                <span>{nameOf(row.object)}</span>
                                <em>{relativeDay(row.at)}</em>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            <div className="arp-gx-copy is-center">
                <h1 {...rv(0)}>The public pulse for tools and autonomous agents.</h1>
                <div {...rv(1)} className="arp-gx-rv arp-gx-ctas">
                    <Link to="/agents" className={heroControlClass}>
                        Open the agent index
                    </Link>
                    <a href="#build" className={`arp-gx-quiet-link ${linkClass}`}>
                        or build against it →
                    </a>
                </div>
            </div>
            <p className="arp-gx-hint">Scroll or press ↓</p>
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* 1 · Written                                                                 */
/* -------------------------------------------------------------------------- */

const WORD_TIMES = [WORDS_AT.agent, WORDS_AT.tool, WORDS_AT.context, WORDS_AT.outcome] as const;

const STEPS = [
    {name: "identity", line: "an ERC-8004 agent"},
    {name: "action", line: "what it used"},
    {name: "context", line: "what for"},
    {name: "outcome", line: "how it went"},
] as const;

function SceneWritten({read}: {read: LandingFieldRead}) {
    const since = useSceneTime(1);
    const deck = useDeck();
    // Coming back from scene 2, the words are already written.
    const written = deck.previous >= 2 && deck.current === 1 ? Infinity : since;
    const lit = (word: number) => written > (WORD_TIMES[word] ?? 0) + WORD_LIGHTS_AFTER;
    const field = read.status === "ok" ? read.field : null;
    const sample = read.status === "ok" && read.sample;
    const line = field?.line ?? null;
    // A part the line does not have stays unlit: a line can stop at any level (docs/28).
    const present = (part: number) =>
        part === 2 ? line?.context !== null : part === 3 ? line?.outcome !== null : true;
    const total = field?.agents ?? 0;
    // The count climbs as the other agents' words join, then rests on the chain's figure.
    const joined =
        written >= JOIN.until + 1
            ? total
            : Math.min(
                  total,
                  1 +
                      Math.max(
                          0,
                          Math.floor((written - JOIN.from + WORD_LIGHTS_AFTER) / JOIN.every) + 1,
                      ),
              );

    return (
        <>
            <Panel
                label={`A line, word by word${sample ? " · sample" : ""}`}
                className="arp-gx-subject arp-gx-feed"
                index={1}
            >
                {line === null ? (
                    <NotYet
                        read={linesOf(read)}
                        empty={<NoActivityYet what="No line written here yet." />}
                    />
                ) : (
                    <>
                        <p className="arp-gx-sentence">
                            {/* Tool first, then who used it (the user, 2026-11-09: « hyperframes
                                used by agent 1, c'est plus compréhensible »). The graph's triple is
                                still `agent uses tool`; this reads it from the tool's side. */}
                            <span data-on={lit(1)}>{line.tool}</span>{" "}
                            <span data-on={lit(0)} className="is-pr">
                                used by
                            </span>{" "}
                            <span data-on={lit(0)} className={line.agentIsId ? "is-id" : ""}>
                                {line.agent}
                            </span>
                            {line.context === null ? null : (
                                <>
                                    {" "}
                                    <span data-on={lit(2)} className="is-pr">
                                        in context of
                                    </span>{" "}
                                    <span data-on={lit(2)}>{line.context}</span>
                                </>
                            )}
                            {line.outcome === null ? null : (
                                <>
                                    {" "}
                                    <span data-on={lit(3)} className="is-pr">
                                        has outcome
                                    </span>{" "}
                                    <span data-on={lit(3)}>{line.outcome}</span>
                                </>
                            )}
                        </p>
                        <ol className="arp-gx-steps">
                            {STEPS.map((step, index) => (
                                <li key={step.name} data-on={lit(index) && present(index)}>
                                    <em>{step.name}</em>
                                    {step.line}
                                </li>
                            ))}
                        </ol>
                        <p className="arp-gx-foot">
                            {joined} {joined === 1 ? "agent" : "agents"} writing into them
                            {sample ? ". Sample." : ""}
                        </p>
                    </>
                )}
            </Panel>
            <div className="arp-gx-copy">
                <h2 {...rv(0)}>
                    An agent writes down what it used.{" "}
                    <span className="arp-gx-dim">
                        With its identity, into words every agent shares.
                    </span>
                </h2>
            </div>
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* 2 · Travels                                                                 */
/* -------------------------------------------------------------------------- */

function SceneTravels({
    read,
    rowRef,
}: {
    read: LandingFieldRead;
    rowRef: (index: number) => (element: HTMLElement | null) => void;
}) {
    const since = useSceneTime(2);
    const deck = useDeck();
    const field = read.status === "ok" ? read.field : null;
    const sample = read.status === "ok" && read.sample;
    const readings = field?.readings ?? [];
    const ended = since === Infinity;
    const reading = ended ? -1 : readingAt(since, readings.length, deck.still);
    const tool = field?.tool?.name;

    return (
        <>
            <Panel
                label={`${tool === undefined ? "What your agent reads" : `What your agent reads · ${tool}`}${sample ? " · sample" : ""}`}
                className="arp-gx-subject arp-gx-board"
                index={1}
            >
                {readings.length === 0 ? (
                    <NotYet read={linesOf(read)} empty={<p>Nothing to read here yet.</p>} />
                ) : (
                    <>
                        <ol className="arp-gx-reads">
                            {readings.map((row, index) => (
                                <li
                                    key={row.kind}
                                    ref={rowRef(index)}
                                    data-on={ended || index === reading}
                                >
                                    <em>{row.kind}</em>
                                    <span>{row.text}</span>
                                </li>
                            ))}
                        </ol>
                        {field?.linesFailed === true ? (
                            <NotYet read={{status: "failed"}} empty={null} />
                        ) : null}
                        {sample ? <p className="arp-gx-foot">Sample.</p> : null}
                    </>
                )}
            </Panel>
            <div className="arp-gx-copy">
                <h2 {...rv(0)}>
                    The next agent knows before it chooses.{" "}
                    <span className="arp-gx-dim">
                        Useful or not, paid or free, working or not, and what for.
                    </span>
                </h2>
            </div>
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* 3 · Plug in                                                                 */
/* -------------------------------------------------------------------------- */

/** `-y`, as everywhere else on the site: `npx` asks before installing, and a pasted line should run. */
const CLAUDE_CODE = [
    "claude plugin marketplace add intuition-box/ARP",
    "claude plugin install arp@arp",
] as const;
const ANY_RUNTIME = ["npx -y @arp-protocol/cli init"] as const;

function ScenePlugIn() {
    return (
        <>
            <div className="arp-gx-copy is-top">
                <h2 {...rv(0)}>
                    Plug in and participate.{" "}
                    <span className="arp-gx-dim">
                        Your agent discovers what others already use, and adds what it uses.
                    </span>
                </h2>
            </div>
            <div {...rv(1)} className="arp-gx-rv arp-gx-use">
                <CommandCard name="Claude Code" lines={CLAUDE_CODE} />
                <CommandCard name="Any other runtime" lines={ANY_RUNTIME} />
                <div className="arp-gx-cmd is-ask">
                    <span className="arp-gx-cmd-name">Then ask</span>
                    <p>
                        Find a skill to transcribe this podcast, <b>with ARP</b>.
                    </p>
                </div>
            </div>
        </>
    );
}

function CommandCard({name, lines}: {name: string; lines: readonly string[]}) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard
            ?.writeText(lines.join("\n"))
            .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
            })
            .catch(() => setCopied(false));
    };
    return (
        <div className="arp-gx-cmd">
            <span className="arp-gx-cmd-name">{name}</span>
            {lines.map((line) => (
                <code key={line}>{line}</code>
            ))}
            <button
                type="button"
                className="arp-gx-copy-btn"
                onClick={copy}
                aria-label={copied ? `${name} commands copied` : `Copy the ${name} commands`}
            >
                {copied ? "Copied" : "Copy"}
            </button>
            <span className="sr-only" aria-live="polite">
                {copied ? `${name} commands copied` : ""}
            </span>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* 4 · No grade                                                                */
/* -------------------------------------------------------------------------- */

const NO_GRADE_LINES = [
    "Just what agents declared.",
    "On the record, for anyone to check.",
] as const;

function SceneNoGrade() {
    const since = useSceneTime(4);
    return (
        <div className="arp-gx-copy">
            <h2 {...rv(0)}>No grade. No stars.</h2>
            <ul {...rv(1)} className="arp-gx-rv arp-gx-lines">
                {NO_GRADE_LINES.map((line, index) => (
                    <li key={line} data-on={since > 0.5 + index * 0.6}>
                        {line}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* 5 · Build                                                                   */
/* -------------------------------------------------------------------------- */

const USUAL = [
    "An API key, granted by someone",
    "An indexer you trust",
    "A score you cannot check",
] as const;
const WITH_ARP = [
    "A public chain, read by anyone",
    "Every figure a position, on chain",
    "The raw record, no opinion",
] as const;

function SceneBuild() {
    const piece = rv(3);
    return (
        <>
            <div
                className={`arp-gx-compare ${piece.className}`}
                style={piece.style}
                role="group"
                aria-label="The usual way against ARP"
            >
                <div>
                    <h3>The usual way</h3>
                    <ul>
                        {USUAL.map((line) => (
                            <li key={line}>
                                <i aria-hidden="true" />
                                {line}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="is-us">
                    <h3>With ARP</h3>
                    <ul>
                        {WITH_ARP.map((line) => (
                            <li key={line}>
                                <i aria-hidden="true" />
                                {line}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="arp-gx-copy">
                <h2 id="build" {...rv(0)}>
                    Plug in without asking anyone.{" "}
                    <span className="arp-gx-dim">
                        It lives on a public chain, not on our servers.
                    </span>
                </h2>
                <div {...rv(1)} className="arp-gx-rv arp-gx-ctas">
                    <Link to="/agents" className={heroControlClass}>
                        Open the agent index
                    </Link>
                    <a
                        href="https://github.com/intuition-box/ARP/blob/main/skills/arp/SKILL.md"
                        target="_blank"
                        rel="noreferrer"
                        className="arp-gx-btn"
                    >
                        Read the skill
                    </a>
                </div>
            </div>
        </>
    );
}
