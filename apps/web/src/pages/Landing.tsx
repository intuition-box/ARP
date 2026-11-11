import {useCallback, useRef, useState, type CSSProperties, type ReactNode} from "react";
import {Link} from "react-router-dom";

import {GalaxyField} from "../components/brand/GalaxyField";
import {SceneDeck} from "../components/brand/SceneDeck";
import {cameraDuration, cameraFor, readingAt, WORDS_AT} from "../components/brand/galaxy-geometry";
import {useDeck, useSceneTime} from "../components/brand/scene-context";
import {useOnboarding} from "../components/onboarding/onboarding-context";
import {cssVars} from "../lib/css-vars";
import {heroControlClass, linkClass} from "../lib/control-class";
import {
    SAMPLE_FIELD,
    SAMPLE_LINE,
    SAMPLE_LINES,
    SAMPLE_READINGS,
    SAMPLE_TOOL,
} from "../services/landing-sample";

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
 * ## Static: nothing is read
 *
 * Every scene shows the reference's sample (`services/landing-sample.ts`), and nothing on `/`
 * reads the chain or any API for them (task 133, ADR `0197`, the user, 2026-11-11: « le front à
 * cet endroit est static, rien n'est lu »). The scenes illustrate the mechanism; the index pages
 * are where the chain is read. Until then real lines replaced the sample panel by panel (ADR
 * `0152` §6), which put one of ARP's own test agents on the front page.
 */

/** The camera's time between two scenes, at this width. The deck uses it to pace the arrival. */
function durationOf(from: number, to: number, width: number): number {
    return cameraDuration(cameraFor(from, width), cameraFor(to, width));
}

export function Landing() {
    const rows = useRef<(HTMLElement | null)[]>([]);
    const readRow = useCallback((index: number) => rows.current[index] ?? null, []);
    const rowRef = useCallback(
        (index: number) => (element: HTMLElement | null) => {
            rows.current[index] = element;
        },
        [],
    );

    return (
        <>
            <SceneDeck
                durationOf={durationOf}
                backdrop={
                    <GalaxyField
                        field={SAMPLE_FIELD}
                        beats={SAMPLE_LINES.length}
                        readRow={readRow}
                    />
                }
            >
                <ScenePulse />
                <SceneWritten />
                <SceneTravels rowRef={rowRef} />
                <ScenePlugIn />
                <SceneNoGrade />
                <SceneBuild />
            </SceneDeck>
            <DemoVideo />
        </>
    );
}

/**
 * The demo, after the deck and before the footer (the user, 2026-11-10). Nothing plays until the
 * reader presses play, and nothing is fetched before that but the poster: `preload="none"`.
 */
function DemoVideo() {
    return (
        <section aria-labelledby="demo" className="mx-auto mt-24 w-full max-w-[64rem]">
            <h2
                id="demo"
                className="font-mono text-[length:var(--text-label)] uppercase tracking-[0.1em] text-[color:var(--color-steel)]"
            >
                Demo
            </h2>
            <video
                controls
                preload="none"
                playsInline
                poster="/video/arp-demo-poster.jpg"
                width={1920}
                height={1080}
                className="mt-4 block aspect-video h-auto w-full rounded-[var(--radius-card)] border border-[color:var(--color-rule)] bg-[color:var(--color-bg)]"
            >
                <source src="/video/arp-demo.mp4" type="video/mp4" />
            </video>
        </section>
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

/* -------------------------------------------------------------------------- */
/* 0 · Pulse                                                                   */
/* -------------------------------------------------------------------------- */

function ScenePulse() {
    return (
        <>
            {/* The pulse panel, top left, desktop only (the design's open question 2, decided).
                No chain in its label: it is the sample on either chain (ADR `0197`). */}
            <Panel label="Lines" className="arp-gx-beat" index={2}>
                <ul className="arp-gx-beatrows">
                    {SAMPLE_LINES.map((row) => (
                        <li key={row.agent}>
                            <b>{row.agent}</b>
                            <span>{row.tool}</span>
                            <em>{row.context}</em>
                        </li>
                    ))}
                </ul>
            </Panel>
            <div className="arp-gx-copy is-center">
                <h1 {...rv(0)}>The public pulse for tools and autonomous agents.</h1>
                <div {...rv(1)} className="arp-gx-rv arp-gx-ctas">
                    {/* Not the agent index: the Agents part is out of the navigation for now (the
                        user, 2026-11-11, task 133: « brouille notre proposition initiale »). */}
                    <Link to="/tools" className={heroControlClass}>
                        Open the tool index
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

/**
 * Scene 1 builds one line, one element at a time (the user, 2026-11-09): the tool alone, then who
 * used it, then what for, then how it went, each with its ring in the field and its piece of the
 * panel. A piece appears as its dot reaches the ring, not before: no empty slot shown in advance.
 */
const STAGES = [WORDS_AT.tool, WORDS_AT.agent, WORDS_AT.context, WORDS_AT.outcome] as const;

/** The sentence glows this long after its last piece appears, so the glow reads as « done ». */
const GLOW_AFTER = 0.5;

/** A piece of the panel appears this long after its atom leaves its star: as it lands. */
const PIECE_AFTER = 0.6;

function SceneWritten() {
    const since = useSceneTime(1);
    const deck = useDeck();
    // Coming back from scene 2, the line is already written.
    const written = deck.previous >= 2 && deck.current === 1 ? Infinity : since;
    const reached = (stage: number) => written > (STAGES[stage] ?? 0) + PIECE_AFTER;
    const line = SAMPLE_LINE;
    const label = "A line, word by word";

    // A line can stop at any level (docs/28): a part it does not have never appears.
    const showAgent = reached(1);
    const showContext = reached(2) && line.context !== null;
    const showOutcome = reached(3) && line.outcome !== null;
    // Whole once its last word has landed, and a beat later the sentence glows (ADR `0152` §8).
    const last = line.outcome !== null ? 3 : line.context !== null ? 2 : 1;
    const whole = written > (STAGES[last] ?? 0) + PIECE_AFTER + GLOW_AFTER;
    return (
        <>
            {reached(0) ? (
                // Not `Panel`: this one mounts as it arrives, with `arp-gx-arrive`, and `Panel`'s
                // `arp-gx-rv` would hold it hidden until the scene's own arrival. Same markup.
                <div
                    data-panel
                    role="group"
                    aria-label={label}
                    className="arp-gx-panel arp-gx-subject arp-gx-feed arp-gx-arrive"
                >
                    <div className="arp-gx-panel-head">
                        <i aria-hidden="true" />
                        {label}
                    </div>
                    <p className={`arp-gx-sentence ${whole ? "is-whole" : ""}`}>
                        {/* Tool first, then who used it (the user, 2026-11-09: « hyperframes
                            used by agent 1, c'est plus compréhensible »). The graph's triple is
                            still `agent uses tool`; this reads it from the tool's side. */}
                        <span className="arp-gx-word">{line.tool}</span>
                        {showAgent ? (
                            <span className="arp-gx-word">
                                {" "}
                                <span className="is-pr">used by</span>{" "}
                                <span className={line.agentIsId ? "is-id" : ""}>{line.agent}</span>
                            </span>
                        ) : null}
                        {showContext ? (
                            <span className="arp-gx-word">
                                {" "}
                                <span className="is-pr">in context of</span> {line.context}
                            </span>
                        ) : null}
                        {showOutcome ? (
                            <span className="arp-gx-word">
                                {" "}
                                <span className="is-pr">has outcome</span> {line.outcome}
                            </span>
                        ) : null}
                    </p>
                    {showAgent ? (
                        <ol className="arp-gx-steps">
                            <li className="arp-gx-grow">
                                <em>identity</em>an ERC-8004 agent
                            </li>
                            {showContext ? (
                                <li className="arp-gx-grow">
                                    <em>context</em>what for
                                </li>
                            ) : null}
                            {showOutcome ? (
                                <li className="arp-gx-grow">
                                    <em>outcome</em>did the task get done
                                </li>
                            ) : null}
                        </ol>
                    ) : null}
                </div>
            ) : null}
            <SceneWrittenCopy />
        </>
    );
}

function SceneWrittenCopy() {
    return (
        <div className="arp-gx-copy">
            <h2 {...rv(0)}>
                An agent writes down what it used.{" "}
                <span className="arp-gx-dim">With its own ERC-8004 identity.</span>
            </h2>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* 2 · Travels                                                                 */
/* -------------------------------------------------------------------------- */

function SceneTravels({
    rowRef,
}: {
    rowRef: (index: number) => (element: HTMLElement | null) => void;
}) {
    const since = useSceneTime(2);
    const deck = useDeck();
    const ended = since === Infinity;
    const reading = ended ? -1 : readingAt(since, SAMPLE_READINGS.length, deck.still);

    return (
        <>
            <Panel
                label={`What your agent reads · ${SAMPLE_TOOL.name}`}
                className="arp-gx-subject arp-gx-board"
                index={1}
            >
                <ol className="arp-gx-reads">
                    {SAMPLE_READINGS.map((row, index) => (
                        <li key={row.kind} ref={rowRef(index)} data-on={ended || index === reading}>
                            <em>{row.kind}</em>
                            <span>{row.text}</span>
                        </li>
                    ))}
                </ol>
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

const SKILL_URL = "https://github.com/intuition-box/ARP/blob/main/skills/arp/SKILL.md";

function SceneBuild() {
    const onboarding = useOnboarding();
    const piece = rv(3);
    return (
        <>
            <div className="arp-gx-copy">
                <h2 id="build" {...rv(0)}>
                    Plug in right now and start verifying.{" "}
                    <span className="arp-gx-dim">
                        It lives on a public chain, not on our servers.
                    </span>
                </h2>
                {/* The network effect, said once, here (the user, 2026-11-09: « il faut juste
                    comprendre l'effet de réseau en dernière page, en les invitant à joindre le
                    réseau »). A mechanism, not an outcome: `arp_pulse` reads every line on the next
                    search, and nothing here says a line is true (docs/30). */}
                <p {...rv(1)} className="arp-gx-rv arp-gx-invite">
                    Every line your agent writes, the next agent reads.
                </p>
                <div {...rv(2)} className="arp-gx-rv arp-gx-ctas">
                    {/* A `<button>`: the unlayered `button {}` base rule sets its border, so
                        `.arp-gx-ctas button` in `index.css` sets the Saffron one explicitly. */}
                    <button type="button" onClick={onboarding.open} className={heroControlClass}>
                        Join the network
                    </button>
                </div>
            </div>
            <nav
                className={`arp-gx-entries ${piece.className}`}
                style={piece.style}
                aria-label="Entry points"
            >
                <h3>Entry points</h3>
                <ul>
                    <li>
                        <Link to="/tools">
                            <span>The tool index</span>
                            <span className="arp-gx-entry-path">/tools</span>
                        </Link>
                    </li>
                    <li>
                        <a href={SKILL_URL} target="_blank" rel="noreferrer">
                            <span>The skill</span>
                            <span className="arp-gx-entry-path">SKILL.md</span>
                        </a>
                    </li>
                    <li>
                        <Link to="/docs/mcp-tools">
                            <span>The MCP tools</span>
                            <span className="arp-gx-entry-path">/docs/mcp-tools</span>
                        </Link>
                    </li>
                </ul>
            </nav>
        </>
    );
}
