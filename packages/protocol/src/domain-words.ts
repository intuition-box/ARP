import {normaliseCategoryLabel} from "./declare/label.js";

/**
 * From a person's or an agent's words to a node of the domain tree (task 84, ADR `0155`). Pure: the
 * tree's labels and the alias table come in as arguments, and the words never leave the caller's
 * machine (the user, 2026-11-09). The one exception is a caller who chooses ARP's hosted read-only
 * endpoint: it runs this on ARP's machine, with the words that caller sent, and keeps none (ADR `0161`).
 *
 * Why it exists: since the tree is OASF's (ADR `0150`) its nodes have names nobody types
 * ("presentation authoring"). Without this, an agent declaring a use "in slides" is refused, and may then
 * add `slides` as a new sub-domain beside the node that already means it, splitting the lines between two
 * nodes so neither reaches three wallets.
 */
export type DomainWords = {
    /** Every node of the tree, normalised. */
    labels: readonly string[];
    /** Word → node label, both normalised. */
    aliases: Readonly<Record<string, string>>;
};

export type DomainResolution =
    | {status: "node"; label: string; via: "label" | "alias"}
    | {status: "unknown"; word: string; suggestions: string[]};

const SUGGESTIONS = 5;

function tokens(text: string): string[] {
    return normaliseCategoryLabel(text)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 1);
}

/** One word or phrase given as a domain: the node it names, or the nodes closest to it. */
export function resolveDomain(raw: string, words: DomainWords): DomainResolution {
    const word = normaliseCategoryLabel(raw);
    if (words.labels.includes(word)) return {status: "node", label: word, via: "label"};
    const alias = words.aliases[word];
    if (alias !== undefined && words.labels.includes(alias)) return {status: "node", label: alias, via: "alias"};
    return {status: "unknown", word, suggestions: suggestNodes(word, words)};
}

/**
 * The nodes closest to `word`: a label or an alias sharing a token with it, then a label containing it.
 * Ordered by shared tokens, then shorter labels first (a broader node before a narrower one).
 */
export function suggestNodes(word: string, words: DomainWords, limit = SUGGESTIONS): string[] {
    const asked = new Set(tokens(word));
    if (asked.size === 0) return [];
    const score = new Map<string, number>();
    const add = (label: string, points: number) => score.set(label, Math.max(score.get(label) ?? 0, points));
    for (const label of words.labels) {
        const shared = tokens(label).filter((t) => asked.has(t)).length;
        if (shared > 0) add(label, shared * 2);
        else if (label.includes(word) || word.includes(label)) add(label, 1);
    }
    for (const [alias, label] of Object.entries(words.aliases)) {
        if (!words.labels.includes(label)) continue;
        const shared = tokens(alias).filter((t) => asked.has(t)).length;
        if (shared > 0) add(label, shared * 2 + 1);
    }
    return [...score.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([label]) => label);
}

/**
 * The node a sentence names, or `null`: the longest node label found whole in it, else an alias found
 * whole in it (a longer alias first). The search uses it on a person's words; the hook on what was asked.
 */
export function domainInText(text: string, words: DomainWords): string | null {
    const padded = ` ${tokens(text).join(" ")} `;
    const hit = (phrase: string) => padded.includes(` ${tokens(phrase).join(" ")} `);
    const label = [...words.labels].filter((l) => tokens(l).length > 0 && hit(l)).sort((a, b) => b.length - a.length)[0];
    if (label !== undefined) return label;
    const alias = Object.keys(words.aliases)
        .filter((a) => words.labels.includes(words.aliases[a] as string) && hit(a))
        .sort((a, b) => b.length - a.length)[0];
    return alias === undefined ? null : (words.aliases[alias] as string);
}
