import {Link} from "react-router-dom";

import {hostOf, RUNG_LABELS, type SievedAgent} from "../../services/agents-reachable";

/** The agents that answered, one hairline row each: the name, then how far it got and where. */
export function ReachableList({agents}: {agents: readonly SievedAgent[]}) {
    if (agents.length === 0) {
        return (
            <p className="mt-8 max-w-[64ch] text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                No agent in the index answered the last reading.
            </p>
        );
    }
    return (
        <ul className="mt-8 border-t border-[color:var(--color-rule-strong)]">
            {agents.map((agent) => {
                const host = hostOf(agent.proofUrl);
                const name = agent.name ?? `Agent ${agent.chainId}:${agent.tokenId}`;
                return (
                    <li key={`${agent.chainId}/${agent.tokenId}`} className="border-b border-[color:var(--color-rule)]">
                        <Link
                            to={`/agent/${agent.chainId}/${agent.tokenId}`}
                            className="block py-4 hover:bg-[color:var(--color-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-accent)]"
                        >
                            <span className="block truncate font-medium leading-tight" title={name}>
                                {name}
                            </span>
                            <span className="block font-mono text-[length:var(--text-label)] uppercase tracking-[0.06em] text-[color:var(--color-steel)]">
                                {[RUNG_LABELS[agent.rung], ...agent.kinds.map((kind) => kind.toUpperCase())].join(" · ")}
                                <span className="normal-case tracking-normal">
                                    {host === null ? null : (
                                        <>
                                            <span className="px-1.5 text-[color:var(--color-rule-strong)]">·</span>
                                            {host}
                                        </>
                                    )}
                                    <span className="px-1.5 text-[color:var(--color-rule-strong)]">·</span>
                                    {`${agent.chainId}/${agent.tokenId}`}
                                </span>
                            </span>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
