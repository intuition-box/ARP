import {INTUITION_USES_TERM_ID} from "@arp-protocol/core";

import {useAgentLines} from "../../hooks/use-agent-lines";
import {useAtomStanding} from "../../hooks/use-atom-standing";
import {useDeclaredModules} from "../../hooks/use-declared-modules";
import {fieldGroups} from "../../services/agent-lines";
import {ClaimField} from "../atom/ClaimField";
import {Empty, Group} from "../atom/ClaimList";

/**
 * What is claimed about an agent — the atom page's own view, here.
 *
 * **The same components, not a copy.** An agent *is* an atom on this graph, so the question "who
 * points at this and what did they put behind saying so" is the same question with the same answer
 * shape. The user asked for it directly: _« je veux les mêmes choses et même front end pour la page
 * agent »_.
 *
 * It replaces `DeclaredUses`, which answered a narrower version of the same thing — `uses` edges
 * only, where `getAtomStanding` does not presume the predicate. An agent can be the object of
 * `has tag`, `same as` and anything else somebody chose, and the narrower reader rendered those
 * nowhere.
 */
export function AgentClaims({atomId, name}: {atomId: string; name: string}) {
    const query = useAtomStanding(atomId);
    const view = query.data;
    const subjectIds = (view?.groups ?? []).flatMap((group) =>
        group.rows.map((row) => row.subjectAtomId),
    );
    const modules = useDeclaredModules(subjectIds);
    // The same query key the page's header reads, so one request serves both.
    const lines = useAgentLines(atomId).data;
    const field =
        view === undefined
            ? []
            : fieldGroups(view.groups, view.claims, lines, INTUITION_USES_TERM_ID);
    const usedCount = field.reduce(
        (sum, group) => sum + (group.direction === "out" ? group.rows.length : 0),
        0,
    );

    return (
        <>
            {query.isPending ? (
                <p className="text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    Reading the graph…
                </p>
            ) : view === undefined || !view.exists ? (
                <p className="max-w-[64ch] text-[color:var(--color-steel)]">
                    This agent is not on the graph yet, so nothing can point at it.
                </p>
            ) : field.length === 0 ? (
                <Empty atomId={view.atomId} />
            ) : (
                <>
                    {/* The lines ride the loupe: what a use was for and how it went, and a ring
                        of what this agent used (task 95, the user, 2026-11-10). */}
                    <div className="mb-10">
                        <ClaimField
                            groups={field}
                            subject={name}
                            edgeCount={view.edgeCount + usedCount}
                            truncated={view.truncated || (lines?.truncated ?? false)}
                            reserveLine
                        />
                    </div>
                    {/* The list keeps the graph's own groups: its rows spell the whole sentence
                        ("X uses this agent"), so "uses" here is the incoming edge, unlike the
                        field's outgoing ring. Relabelled groups would switch it to member mode. */}
                    {view.groups.map((group) => (
                        <Group
                            key={group.predicateAtomId}
                            group={group}
                            subject={name}
                            modules={modules.data ?? {}}
                        />
                    ))}
                </>
            )}
        </>
    );
}
