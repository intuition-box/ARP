import {LABEL} from "../../lib/atom-page";

/**
 * The frame "Before you install" (a skill) and "Before you call" (an agent) share (task 112, ADR
 * `0182`): a label with its caveat and its date, a one-line summary, then one row per question. They
 * sit in the content column, under the name and before the description, where a person decides.
 */

export const steel = "text-[color:var(--color-steel)]";

export function BeforeSection({
    id,
    label,
    aside,
    summary,
    children,
}: {
    id: string;
    label: string;
    /** The Hint and the date, after the label. */
    aside?: React.ReactNode;
    /** The answers in one line; `null` while the reading loads, which keeps the line's height. */
    summary: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <section aria-labelledby={id} className="border-t border-[color:var(--color-rule-strong)] pt-3.5">
            <div className="flex flex-wrap items-center gap-2">
                <h2 id={id} className={`${LABEL} m-0 font-normal`}>
                    {label}
                </h2>
                {aside}
            </div>
            <p className="mt-2.5 min-h-[1.5em] font-mono text-[15px] leading-[1.5] text-[color:var(--color-fg)] [overflow-wrap:anywhere]">
                {summary ?? <span className={steel}>…</span>}
            </p>
            {children === undefined ? null : <dl className="m-0 mt-3">{children}</dl>}
        </section>
    );
}

/** One question's answer. The term column is wide enough for "Runs on your machine" at 13px. */
export function QuestionRow({term, children}: {term: string; children: React.ReactNode}) {
    return (
        <div className="grid gap-x-4 gap-y-1 border-t border-[color:var(--color-rule)] py-2 text-[13.5px] sm:grid-cols-[10.5rem_minmax(0,1fr)]">
            <dt className={steel}>{term}</dt>
            <dd className="m-0 font-mono text-[13px] [overflow-wrap:anywhere]">{children}</dd>
        </div>
    );
}

/**
 * The rows every answer has, each holding "…", while the reading loads: the section keeps the height
 * it will have, so what is under it does not jump when the answers arrive.
 */
export function PendingRows({terms}: {terms: readonly string[]}) {
    return (
        <>
            {terms.map((term) => (
                <QuestionRow key={term} term={term}>
                    <span className={steel}>…</span>
                </QuestionRow>
            ))}
        </>
    );
}

/** The date beside a label, pushed to the right edge. */
export function Dated({day}: {day: string}) {
    return <span className={`ml-auto font-mono text-[12px] ${steel}`}>{day}</span>;
}

/**
 * A list read on demand: a count that opens. Native `details`, so the keyboard reaches it and the
 * closed state takes one line whatever the list holds.
 */
export function OnDemand({count, items}: {count: string; items: readonly string[]}) {
    if (items.length === 0) return <span className={steel}>{count}</span>;
    return (
        <details className="group">
            <summary className={`cursor-pointer ${steel} hover:text-[color:var(--color-silver)]`}>{count}</summary>
            <ul className="m-0 mt-1.5 flex list-none flex-col gap-0.5 p-0 text-[color:var(--color-silver)]">
                {items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </details>
    );
}
