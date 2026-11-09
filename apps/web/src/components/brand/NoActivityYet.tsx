import {Link} from "react-router-dom";

import {linkClass} from "../../lib/control-class";

/**
 * The empty state of every list of lines (task 74): what would be here, and how to be the first.
 *
 * ARP's own test identities are filtered out (`/test-identities`), so on testnet today this is
 * what a visitor sees. It links the list, so "nothing" can be checked rather than believed.
 */
export function NoActivityYet({what = "No activity yet."}: {what?: string}) {
    return (
        <span className="flex flex-col gap-1">
            <span className="text-[color:var(--color-fg)]">{what}</span>
            <span className="text-[length:var(--text-body-sm)] text-[color:var(--color-steel)]">
                Install ARP and use a skill to write the first line:{" "}
                <Link to="/start/claude" className={linkClass}>
                    get started
                </Link>
                . ARP&apos;s own tests are{" "}
                <Link to="/test-identities" className={linkClass}>
                    hidden
                </Link>
                .
            </span>
        </span>
    );
}
