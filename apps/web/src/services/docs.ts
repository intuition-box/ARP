/**
 * One docs page's Markdown, read from the site itself: `public/docs/<slug>.md` is served as is, so
 * the page and an agent fetching the URL get the same bytes.
 */
export function docUrl(slug: string): string {
    return `/docs/${slug}.md`;
}

export async function fetchDoc(slug: string, fetcher: typeof fetch = fetch): Promise<string> {
    const response = await fetcher(docUrl(slug));
    if (!response.ok) throw new Error(`${docUrl(slug)} answered ${response.status}`);
    const text = await response.text();
    // A static host with an SPA fallback answers a missing file with index.html and a 200.
    if (text.trimStart().startsWith("<!doctype") || text.trimStart().startsWith("<!DOCTYPE")) {
        throw new Error(`${docUrl(slug)} is not on this site`);
    }
    return text;
}

/** The `id` a heading gets, so a section can be linked to: lower case, words joined by dashes. */
export function headingId(text: string): string {
    return text
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9_\s-]/g, " ")
        .trim()
        .replace(/\s+/g, "-");
}
