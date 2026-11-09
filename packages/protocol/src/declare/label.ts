/**
 * Lowercase, accents stripped, inner whitespace collapsed to one space. Applied before anything is
 * hashed: `Design` and `design` would be two nodes for ever on a graph that deletes nothing.
 *
 * Its own module, with no import, because the hook bundles it and the published package has no dependency
 * (ADR `0145`, task 84): `category.ts` pulls viem.
 */
export function normaliseCategoryLabel(raw: string): string {
    // NFKC first, so compatibility forms (full-width letters, ligatures) fold before accents go.
    return raw
        .normalize("NFKC")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}
