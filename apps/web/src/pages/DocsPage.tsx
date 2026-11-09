import {useEffect} from "react";
import {Link, Navigate, NavLink, useLocation, useParams} from "react-router-dom";

import {PageLoading} from "../components/brand/PageLoading";
import {CopyButton} from "../components/docs/CopyButton";
import {DocMarkdown} from "../components/docs/DocMarkdown";
import {DOC_ENTRIES, DOC_SECTIONS, FIRST_DOC, findDoc, type DocEntry} from "../docs/manifest";
import {useDoc} from "../hooks/use-doc";
import {linkClass} from "../lib/control-class";
import {docUrl} from "../services/docs";

/**
 * `/docs/:slug`: one Markdown file per page, the sidebar from `docs/manifest.ts`. The file is the
 * page's only copy, so "Copy as Markdown" and the raw link hand an agent exactly what is shown.
 */
export function DocsPage() {
    const {slug} = useParams();
    const entry = findDoc(slug);

    if (slug === undefined) return <Navigate to={`/docs/${FIRST_DOC}`} replace />;

    return (
        <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
            {/* On a phone the contents fold, so the page's own text is on the first screen. */}
            <details className="doc-nav-fold lg:hidden">
                <summary className="doc-label">Contents</summary>
                <DocsNav />
            </details>
            <div className="hidden lg:block">
                <DocsNav />
            </div>
            {entry === undefined ? <NotFound /> : <DocArticle entry={entry} />}
        </div>
    );
}

function DocsNav() {
    return (
        <nav aria-label="Documentation" className="doc-nav lg:sticky lg:top-6 lg:self-start">
            {DOC_SECTIONS.map((section) => (
                <div key={section.title} className="doc-nav-section">
                    <p className="doc-label">{section.title}</p>
                    <ul>
                        {section.entries.map((entry) => (
                            <li key={entry.slug}>
                                <NavLink to={`/docs/${entry.slug}`} title={entry.summary}>
                                    {entry.title}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            <div className="doc-nav-section">
                <p className="doc-label">For agents</p>
                <ul>
                    <li>
                        <a href="/llms.txt">llms.txt</a>
                    </li>
                    <li>
                        <a href="/llms-full.txt">llms-full.txt</a>
                    </li>
                </ul>
            </div>
        </nav>
    );
}

function DocArticle({entry}: {entry: DocEntry}) {
    const doc = useDoc(entry.slug);
    const {hash} = useLocation();
    const index = DOC_ENTRIES.findIndex((candidate) => candidate.slug === entry.slug);
    const previous = DOC_ENTRIES[index - 1];
    const next = DOC_ENTRIES[index + 1];

    useEffect(() => {
        const previous = document.title;
        document.title = `${entry.title} · ARP docs`;
        return () => {
            document.title = previous;
        };
    }, [entry.title]);

    // A link to a section lands on it once the page's text has arrived.
    useEffect(() => {
        if (doc.status !== "ok" || hash === "") return;
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    }, [doc.status, hash]);

    return (
        <article className="min-w-0 max-w-[60rem]">
            <div className="mb-8 flex flex-wrap items-center gap-3">
                {doc.status === "ok" && (
                    <CopyButton text={doc.markdown} label="Copy as Markdown" className="doc-action" />
                )}
                <a href={docUrl(entry.slug)} className="doc-action">
                    View as Markdown
                </a>
            </div>

            {doc.status === "pending" && <PageLoading label={entry.title} />}
            {doc.status === "failed" && (
                <p className="text-[color:var(--color-silver)]">
                    This page could not be read. <a href={docUrl(entry.slug)}>Open the file</a>.
                </p>
            )}
            {doc.status === "ok" && <DocMarkdown markdown={doc.markdown} />}

            <div className="mt-16 flex justify-between gap-6 border-t border-[color:var(--color-rule)] pt-6">
                {previous === undefined ? <span /> : <PagerLink entry={previous} direction="previous" />}
                {next === undefined ? <span /> : <PagerLink entry={next} direction="next" />}
            </div>
        </article>
    );
}

function PagerLink({entry, direction}: {entry: DocEntry; direction: "previous" | "next"}) {
    return (
        <Link
            to={`/docs/${entry.slug}`}
            className={`doc-pager ${direction === "next" ? "text-right" : ""}`}
        >
            <span className="doc-label">{direction === "next" ? "Next" : "Previous"}</span>
            <span>{direction === "next" ? `${entry.title} →` : `← ${entry.title}`}</span>
        </Link>
    );
}

function NotFound() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="type-face text-[32px]">No page by that name</h1>
            <Link to={`/docs/${FIRST_DOC}`} className={linkClass}>
                Start with the overview →
            </Link>
        </div>
    );
}
