import {Fragment} from "react";

import {BackLink} from "../components/brand/BackLink";
import {LEGAL, PLACEHOLDER, type LegalSlug} from "../services/legal";

const LABEL =
    "font-mono text-[length:var(--text-label)] uppercase tracking-[0.08em] text-[color:var(--color-steel)]";

const WHOLE_PLACEHOLDER = new RegExp(`^${PLACEHOLDER.source}$`);

/** A placeholder is set in mono, so it reads as a blank to fill and not as filled text. */
function Text({text}: {text: string}) {
    const parts = text.split(new RegExp(`(${PLACEHOLDER.source})`));
    return (
        <>
            {parts.map((part, index) =>
                WHOLE_PLACEHOLDER.test(part) ? (
                    <span key={index} className="font-mono text-[color:var(--color-fg)]">
                        {part}
                    </span>
                ) : (
                    <Fragment key={index}>{part}</Fragment>
                ),
            )}
        </>
    );
}

/** One of the four legal pages (task 74). French, with one English line saying what it is. */
export function LegalPage({slug}: {slug: LegalSlug}) {
    const doc = LEGAL[slug];
    return (
        <article className="max-w-[72ch]" lang="fr">
            <BackLink to="/" label="home" />
            <p className={`${LABEL} mt-6`} lang="en">
                {doc.english}
            </p>
            <h1 className="type-display mt-4">{doc.title}</h1>
            {doc.sections.map((section) => (
                <section key={section.heading} className="mt-10">
                    <h2 className={`${LABEL} mb-3`}>{section.heading}</h2>
                    {section.blocks.map((block, index) =>
                        typeof block === "string" ? (
                            <p
                                key={index}
                                className="mt-3 text-[length:var(--text-body)] text-[color:var(--color-silver)]"
                            >
                                <Text text={block} />
                            </p>
                        ) : (
                            <ul
                                key={index}
                                className="mt-3 flex flex-col gap-1.5 border-l border-[color:var(--color-rule)] pl-4 text-[length:var(--text-body)] text-[color:var(--color-silver)]"
                            >
                                {block.map((item) => (
                                    <li key={item}>
                                        <Text text={item} />
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
