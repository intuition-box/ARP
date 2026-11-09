import {Link} from "react-router-dom";

/**
 * The footer's links: the docs, the code, and the legal pages, nothing else (the user, 2026-11-09).
 * `/test-identities` stays reachable from every empty state that hides something; `/account` from
 * the wallet menu; `/llms.txt` from the docs.
 */

const LEGAL: readonly {label: string; to: string}[] = [
    {label: "Legal notice", to: "/legal-notice"},
    {label: "Privacy", to: "/privacy"},
    {label: "Cookies", to: "/cookies"},
    {label: "Terms", to: "/terms"},
    {label: "Accessibility", to: "/accessibility"},
    {label: "Contact", to: "/contact"},
];

export function SiteFooterLinks() {
    return (
        <nav aria-label="Site" className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/docs">Docs</Link>
            <a href="https://github.com/intuition-box/ARP" target="_blank" rel="noreferrer">
                GitHub
            </a>
            {LEGAL.map((link) => (
                <Link key={link.to} to={link.to}>
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
