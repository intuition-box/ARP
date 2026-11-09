import type {DocSection} from "./manifest";

/**
 * `/llms.txt` and `/llms-full.txt`, built from the same Markdown files the pages render, so an
 * agent and a person read one text. Pure: the caller supplies each page's Markdown, which is how
 * `vite.config.ts` uses it at build and in dev, and how the test uses it without a disk.
 */
export function buildLlmsIndex(sections: readonly DocSection[]): string {
    const lines = [
        "# ARP",
        "",
        "> The public pulse for tools and autonomous agents. Check before your agent installs or pays.",
        "",
        "Every page below is plain Markdown. `/llms-full.txt` holds all of them in one file.",
        "",
    ];
    for (const section of sections) {
        lines.push(`## ${section.title}`, "");
        for (const entry of section.entries) {
            lines.push(`- [${entry.title}](/docs/${entry.slug}.md): ${entry.summary}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}

export function buildLlmsFull(
    sections: readonly DocSection[],
    readPage: (slug: string) => string,
): string {
    const pages = sections.flatMap((section) =>
        section.entries.map((entry) => `<!-- /docs/${entry.slug}.md -->\n\n${readPage(entry.slug).trim()}\n`),
    );
    return `${buildLlmsIndex(sections)}\n---\n\n${pages.join("\n---\n\n")}`;
}
