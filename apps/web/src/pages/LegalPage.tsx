import {BackLink} from "../components/brand/BackLink";
import {legalDetails} from "../lib/site-config";
import {legalDocs, type LegalSlug} from "../services/legal";

const LABEL =
    "font-mono text-[length:var(--text-label)] uppercase tracking-[0.08em] text-[color:var(--color-steel)]";

/** One of the legal pages (task 74), in English since 2026-11-09. */
export function LegalPage({slug}: {slug: LegalSlug}) {
    const doc = legalDocs(legalDetails())[slug];
    return (
        <article className="max-w-[72ch]">
            <BackLink to="/" label="home" />
            <h1 className="type-display mt-6">{doc.title}</h1>
            {doc.sections.map((section) => (
                <section key={section.heading} className="mt-10">
                    <h2 className={`${LABEL} mb-3`}>{section.heading}</h2>
                    {section.blocks.map((block, index) =>
                        typeof block === "string" ? (
                            <p
                                key={index}
                                className="mt-3 text-[length:var(--text-body)] text-[color:var(--color-silver)]"
                            >
                                {block}
                            </p>
                        ) : (
                            <ul
                                key={index}
                                className="mt-3 flex flex-col gap-1.5 border-l border-[color:var(--color-rule)] pl-4 text-[length:var(--text-body)] text-[color:var(--color-silver)]"
                            >
                                {block.map((item) => (
                                    <li key={item}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ),
                    )}
                </section>
            ))}
        </article>
    );
}
