import {Link} from "react-router-dom";

/**
 * The footer's links (task 74): the docs, the code, what this site hides, and the legal pages.
 *
 * `/docs` is a route of the app; `/llms.txt` is a file the server sends, so it is a plain link and
 * not a router one. The legal pages are in French and the labels say what each is in English.
 */
const SITE: readonly {label: string; to: string}[] = [
    {label: "Docs", to: "/docs"},
    {label: "Hidden here", to: "/test-identities"},
    {label: "Account", to: "/account"},
];

const LEGAL: readonly {label: string; to: string}[] = [
    {label: "Legal notice", to: "/mentions-legales"},
    {label: "Privacy", to: "/confidentialite"},
    {label: "Terms", to: "/conditions"},
    {label: "Contact", to: "/contact"},
];

export function SiteFooterLinks() {
    return (
        <nav aria-label="Site" className="flex flex-wrap gap-x-4 gap-y-2">
            {SITE.map((link) => (
                <Link key={link.to} to={link.to}>
                    {link.label}
                </Link>
            ))}
            <a href="/llms.txt">llms.txt</a>
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
