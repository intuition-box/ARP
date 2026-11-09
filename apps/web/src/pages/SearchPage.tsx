import {useState} from "react";
import {Link, useSearchParams} from "react-router-dom";

import {CohortList} from "../components/agent/CohortList";
import {PageLoading} from "../components/brand/PageLoading";
import {ToolCatalogList} from "../components/tool/ToolCatalogList";
import {useAgentSearch} from "../hooks/use-agent-cohort";
import {useSkillFacts} from "../hooks/use-skill-facts";
import {useSkillsIndex} from "../hooks/use-skills-index";
import {useReadsSignals, useToolCatalog} from "../hooks/use-tool-catalog";
import {linkClass} from "../lib/control-class";
import {agentRefOf} from "../services/agent-lookup";
import {labelKeyOf} from "../services/skills-index";
import {livenessOf, rankTools, TOOL_CURVES, toolMatches, type ToolRow} from "../services/tool-catalog";

const QUERY_PARAM = "q";
const LABEL =
    "font-mono text-[length:var(--text-label)] uppercase tracking-[0.1em] text-[color:var(--color-steel)]";

/**
 * `/search` — one field for both indexes (task 48). Agents by name, tools by name, repository or
 * description, and an id typed as `chain/token` opens the agent. Before it, a reader had to pick
 * the right index first and each had its own field.
 *
 * The query is in the URL, so a search is shareable and Back returns to it.
 */
export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get(QUERY_PARAM) ?? "";
    const ref = agentRefOf(query);

    function search(next: string) {
        setSearchParams(next.length === 0 ? {} : {[QUERY_PARAM]: next}, {replace: true});
    }

    return (
        <section>
            <header className="pt-14 pb-8">
                <h1 className="type-display">Search</h1>
            </header>

            {/* Keyed on the query, so the field follows the URL: Back, Forward, and "/" pressed
                on this page (which opens a blank search) remount it with the URL's text and give
                it the focus again. */}
            <SearchField key={query} initial={query} onSearch={search} />

            {query.length === 0 ? null : (
                <>
                    {ref === null ? null : (
                        <p className="mt-8">
                            <Link to={`/agent/${ref.chainId}/${ref.tokenId}`} className={linkClass}>
                                {`Open agent ${ref.chainId}/${ref.tokenId} →`}
                            </Link>
                        </p>
                    )}
                    <AgentResults name={query} />
                    <Results query={query} />
                </>
            )}
        </section>
    );
}

function SearchField({initial, onSearch}: {initial: string; onSearch: (query: string) => void}) {
    const [draft, setDraft] = useState(initial);
    return (
        <form
            role="search"
            onSubmit={(event) => {
                event.preventDefault();
                onSearch(draft.trim());
            }}
            className="flex flex-wrap items-center gap-2 border-y border-[color:var(--color-rule)] py-3.5"
        >
            <input
                type="search"
                // A search page exists to be typed into.
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="An agent, a tool, or 8453/2340"
                aria-label="Search agents and tools"
                className="h-10 w-[min(28rem,100%)] rounded-[var(--radius-control)] border border-[color:var(--color-rule-strong)] bg-[color:var(--color-bg)] px-3 font-mono text-[length:var(--text-body-sm)]"
            />
        </form>
    );
}

function AgentResults({name}: {name: string}) {
    const search = useAgentSearch(name);
    const view = search.data;
    return (
        <section aria-labelledby="search-agents" className="mt-12">
            <h2 id="search-agents" className={LABEL}>
                {view === undefined || view.total === null
                    ? "Agents"
                    : `Agents · ${view.total.toLocaleString("en-US")}`}
            </h2>
            {search.error !== null ? (
                <p className="mt-3 text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    The index did not answer. Try again in a moment.
                </p>
            ) : view === undefined ? (
                <PageLoading label="Searching agents" />
            ) : view.rows.length === 0 ? (
                <p className="mt-3 text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    No agent by that name.{" "}
                    <Link to="/agents" className={linkClass}>
                        Search by what agents can do →
                    </Link>
                </p>
            ) : (
                <CohortList view={view} />
            )}
        </section>
    );
}

/** The catalogue's rows that match the search, ranked. Shared by both result lists, one read. */
function useToolMatches(query: string) {
    const catalog = useToolCatalog("conviction", TOOL_CURVES[0]?.id ?? 1);
    const axis = useReadsSignals() ? "signals" : "installs";
    const {factFor, repoFactFor} = useSkillFacts();
    const view = catalog.data;
    const matches =
        view === undefined
            ? []
            : rankTools(
                  view.rows.filter((row) =>
                      toolMatches(row, query, factFor(row.label)?.description ?? null),
                  ),
                  axis,
                  (row) => ({
                      liveness: livenessOf(
                          repoFactFor(row.source === null ? row.label : `github.com/${row.source}`),
                      ),
                      installs: factFor(row.label)?.installs ?? null,
                      stars:
                          repoFactFor(row.source === null ? row.label : `github.com/${row.source}`)
                              ?.stars ?? null,
                  }),
              );
    return {catalog, view, matches};
}

/** Both lists from one match, so the catalogue is filtered and ranked once per render. */
function Results({query}: {query: string}) {
    const tools = useToolMatches(query);
    return (
        <>
            <ToolResults {...tools} />
            <IndexResults query={query} matches={tools.matches} />
        </>
    );
}

function ToolResults({catalog, view, matches}: ReturnType<typeof useToolMatches>) {
    return (
        <section aria-labelledby="search-tools" className="mt-14">
            <h2 id="search-tools" className={LABEL}>
                {view === undefined ? "In ARP" : `In ARP · ${matches.length.toLocaleString("en-US")}`}
            </h2>
            {catalog.error !== null && view === undefined ? (
                <p className="mt-3 text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    The index did not answer. Try again in a moment.
                </p>
            ) : view === undefined ? (
                <PageLoading label="Searching ARP" />
            ) : matches.length === 0 ? (
                <p className="mt-3 text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    Nothing in ARP by that name.
                </p>
            ) : (
                // Every match: the tool index has no name filter to send the rest to.
                <div className="mt-4">
                    <ToolCatalogList rows={matches} curveId={view.curveId} />
                </div>
            )}
        </section>
    );
}

/**
 * skills.sh's results for the same words, minus what the list above already shows (task 82). ARP's
 * catalogue is 673 skills; this is the index `npx skills add` installs from. Each opens its pulse
 * page, which reads the skill's own file.
 */
function IndexResults({query, matches}: {query: string; matches: readonly ToolRow[]}) {
    const read = useSkillsIndex(query);
    const shown = new Set(matches.flatMap((row) => (row.label === null ? [] : [labelKeyOf(row.label)])));
    const rows =
        read.status === "ok"
            ? read.skills.filter((skill) => skill.url !== null && !shown.has(labelKeyOf(skill.url)))
            : [];
    return (
        <section aria-labelledby="search-index" className="mt-14">
            <h2 id="search-index" className={LABEL}>
                {read.status === "ok" ? `On skills.sh · ${rows.length.toLocaleString("en-US")}` : "On skills.sh"}
            </h2>
            {read.status === "pending" ? (
                <PageLoading label="Searching skills.sh" />
            ) : read.status !== "ok" ? (
                <p className="mt-3 text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    skills.sh did not answer. Try again in a moment.
                </p>
            ) : rows.length === 0 ? (
                <p className="mt-3 text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                    Nothing more on skills.sh for that.
                </p>
            ) : (
                <ul className="mt-4 border-t border-[color:var(--color-rule)]">
                    {rows.map((skill) => (
                        <li key={`${skill.source}@${skill.skill}`} className="border-b border-[color:var(--color-rule)]">
                            <Link
                                to={`/pulse/${skill.source}/${encodeURIComponent(skill.skill)}`}
                                className="block py-4 hover:bg-[color:var(--color-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-accent)]"
                            >
                                <span className="block truncate font-medium leading-tight" title={skill.skill}>
                                    {skill.skill}
                                </span>
                                <span className="block font-mono text-[length:var(--text-label)] text-[color:var(--color-steel)]">
                                    {skill.source}
                                    {skill.installs === null ? null : (
                                        <>
                                            <span className="px-1.5 text-[color:var(--color-rule-strong)]">·</span>
                                            {`${Intl.NumberFormat("en-US", {notation: "compact"}).format(skill.installs)} installs`}
                                        </>
                                    )}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
