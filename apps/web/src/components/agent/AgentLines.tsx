import {Link} from "react-router-dom";

import {linkClass} from "../../lib/control-class";
import type {AgentLineRow, AgentLinesView} from "../../services/agent-lines";

/**
 * What the agent page leads with (task 95): who used this agent and what it used, each as its declarer
 * wrote it — a name, a domain, an outcome. Between two agents that is what an ERC-8004 score does not
 * carry (the user, 2026-11-10).
 *
 * A row is a wallet's word. Nothing here says the use happened, and the page does not say so either
 * (`ui.md`: no explanatory sentence in a panel); `pulse-usage.ts` carries it.
 */
export function AgentLines({
    read,
}: {
    read:
        | {status: "no-atom"}
        | {status: "pending"}
        | {status: "failed"}
        | {status: "ok"; view: AgentLinesView};
}) {
    if (read.status === "pending") {
        return (
            <p className="text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                Reading the lines…
            </p>
        );
    }
    if (read.status === "failed") {
        return (
            <p className="max-w-[64ch] text-[color:var(--color-steel)]">
                The graph did not answer, so the lines could not be read.
            </p>
        );
    }
    const view = read.status === "ok" ? read.view : null;
    if (view === null || (view.usedBy.length === 0 && view.used.length === 0)) {
        return (
            <p className="max-w-[64ch] text-[color:var(--color-steel)]">
                No line names this agent yet. One appears when an agent declares it used this one,
                or when this agent declares what it used.
            </p>
        );
    }
    return (
        <>
            <h2 className="sr-only">Lines</h2>
            <LineGroup title="Used by" rows={view.usedBy} truncated={view.truncated} />
            <LineGroup title="Used" rows={view.used} truncated={view.truncated} />
        </>
    );
}

/** A read cut at its limit gives a floor, so the count says `N+` (as `ClaimField` does). */
function LineGroup({
    title,
    rows,
    truncated,
}: {
    title: string;
    rows: AgentLineRow[];
    truncated: boolean;
}) {
    if (rows.length === 0) return null;
    return (
        <section className="mb-12">
            <div className="flex items-baseline justify-between gap-6 border-b border-[color:var(--color-rule-strong)] pb-2">
                <h3 className="font-medium">{title}</h3>
                <span className="font-mono text-[length:var(--text-body-sm)] tabular-nums text-[color:var(--color-steel)]">
                    {truncated ? `${rows.length}+` : rows.length}
                </span>
            </div>
            <ul>
                {rows.map((row) => (
                    <li
                        key={row.key}
                        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[color:var(--color-rule)] py-3"
                    >
                        <Link
                            to={`/atom/${row.atomId}`}
                            className={`min-w-0 truncate ${row.nameIsId ? "font-mono" : ""} ${linkClass}`}
                        >
                            {row.name}
                        </Link>
                        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[length:var(--text-body-sm)]">
                            {row.parts.length === 0 ? (
                                <span className="text-[color:var(--color-steel)]">no context</span>
                            ) : (
                                row.parts.map((part, index) => (
                                    <span
                                        key={`${index}:${part.domain ?? ""}:${part.outcome ?? ""}`}
                                    >
                                        <span className="text-[color:var(--color-silver)]">
                                            {part.domain ?? "any context"}
                                        </span>
                                        {part.outcome === null ? null : (
                                            <span className="text-[color:var(--color-steel)]">
                                                {" "}
                                                · {part.outcome}
                                            </span>
                                        )}
                                    </span>
                                ))
                            )}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
