import {Link, useLocation} from "react-router-dom";

import {linkClass} from "../lib/control-class";

/** An address no route answers (task 74). Says so, and offers the places that exist. */
export function NotFoundPage() {
    const {pathname} = useLocation();
    return (
        <section className="max-w-[60ch] pt-14">
            <p className="font-mono text-[length:var(--text-label)] uppercase tracking-[0.08em] text-[color:var(--color-steel)]">
                404
            </p>
            <h1 className="type-display mt-4">No page here</h1>
            <p className="mt-6 font-mono text-[length:var(--text-body-sm)] text-[color:var(--color-steel)] break-all">
                {pathname}
            </p>
            <nav aria-label="Pages that exist" className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <Link to="/" className={linkClass}>
                    Home
                </Link>
                <Link to="/agents" className={linkClass}>
                    Agents
                </Link>
                <Link to="/tools" className={linkClass}>
                    Tools
                </Link>
                <Link to="/search" className={linkClass}>
                    Search
                </Link>
            </nav>
        </section>
    );
}
