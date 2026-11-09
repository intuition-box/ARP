import {BackLink} from "../components/brand/BackLink";
import {linkClass} from "../lib/control-class";
import {TEST_IDENTITIES} from "../services/test-identities";

const LABEL =
    "font-mono text-[length:var(--text-label)] uppercase tracking-[0.08em] text-[color:var(--color-steel)]";

const SOURCE =
    "https://github.com/intuition-box/ARP/blob/main/apps/web/src/data/arp-test-identities.json";

/**
 * The public list this site filters by (task 74), printed from the same file the filter reads, so
 * what a visitor is told is hidden and what is hidden cannot drift apart.
 */
export function TestIdentitiesPage() {
    const list = TEST_IDENTITIES;
    return (
        <article className="max-w-[72ch]">
            <BackLink to="/" label="home" />
            <h1 className="type-display mt-6">Hidden here</h1>
            <p className="mt-6 text-[length:var(--text-body)] text-[color:var(--color-silver)]">
                {list.why}
            </p>

            <h2 className={`${LABEL} mt-12 mb-3`}>Agents</h2>
            <p className="border-t border-[color:var(--color-rule)] py-3 font-mono text-[length:var(--text-body-sm)]">
                {`${list.chainId}:${list.agents.from} to ${list.chainId}:${list.agents.to}`}
                <span className="block text-[color:var(--color-steel)] break-all">
                    {`registry ${list.registry}`}
                </span>
            </p>

            <h2 className={`${LABEL} mt-10 mb-3`}>Wallets</h2>
            <ul>
                {list.addresses.map((entry) => (
                    <li
                        key={entry.address}
                        className="flex flex-col gap-1 border-t border-[color:var(--color-rule)] py-3"
                    >
                        <span className="font-mono text-[length:var(--text-body-sm)] break-all">
                            {entry.address}
                        </span>
                        <span className="text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                            {entry.role}
                        </span>
                    </li>
                ))}
            </ul>

            <p className="mt-10 font-mono text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                {`Measured ${list.measured}. `}
                <a href={SOURCE} target="_blank" rel="noreferrer" className={linkClass}>
                    The file
                </a>
            </p>
        </article>
    );
}
