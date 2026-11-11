/**
 * Whether this machine shares, when that was chosen, and how (task 126, ADR `0191`). One file,
 * `<arpHome>/sharing.json`, written by every way of choosing: `arp init`, `arp share on|off`, the Desktop
 * setting, and the person's answer to the one question the agent puts after the first skill result. **Pure and
 * dependency-free**, so the hook imports it by path (ADR `0145`).
 *
 * No file means **undecided**: nothing is shared, and the question may still be put, once. A file written before
 * task 126 holds `{"failures": bool}` alone and counts as decided, with no date and no way known.
 *
 * ```
 * {"failures": true,  "at": "2026-11-11T…", "how": "asked-always"}   on: lines go at the end of each session
 * {"failures": false, "at": "2026-11-11T…", "how": "asked-once"}     off, but that one result goes (share-once.jsonl)
 * {"failures": false, "at": "2026-11-11T…", "how": "asked-no"}       off, and the question never comes back
 * ```
 */
export const SHARE_ANSWERS = ["once", "always", "no"] as const;
export type ShareAnswer = (typeof SHARE_ANSWERS)[number];

/** How the choice on file was made. `asked-*` is the person's answer to the agent's one question. */
export const SHARING_HOWS = ["init", "command", "desktop", "asked-once", "asked-always", "asked-no"] as const;
export type SharingHow = (typeof SHARING_HOWS)[number];

export type SharingChoice = {on: boolean; at: string | null; how: SharingHow | null};

/** What is on file, or `null` when nothing is: undecided. A broken file is a decision for off, never a yes. */
export function sharingChoiceOf(text: string | null): SharingChoice | null {
    if (text === null) return null;
    try {
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed !== "object" || parsed === null) return {on: false, at: null, how: null};
        const {failures, at, how} = parsed as Record<string, unknown>; // an object, checked above; read field by field
        return {
            on: failures === true,
            at: typeof at === "string" ? at : null,
            how: typeof how === "string" && (SHARING_HOWS as readonly string[]).includes(how) ? (how as SharingHow) : null, // checked against the list
        };
    } catch {
        return {on: false, at: null, how: null};
    }
}

/** The file's text for a choice. `failures` keeps its name so a reader older than task 126 reads it the same. */
export function sharingFileText(on: boolean, how: SharingHow, at: Date): string {
    return `${JSON.stringify({failures: on, at: at.toISOString(), how})}\n`;
}

/** What each answer writes: only `always` turns sharing on. */
export function choiceForAnswer(answer: ShareAnswer): {on: boolean; how: SharingHow} {
    return {on: answer === "always", how: `asked-${answer}`};
}

/** The answer line, exactly: `arp-share: once|always|no`. Anything else is not an answer. */
const ANSWER = /^[\s>*`-]*arp-share:\s*(once|always|no)[\s.`*]*$/gim;

/**
 * The person's answer, as the model wrote it back on its own line, or `null`. Two different answers in one
 * message are no answer: the question stays open rather than a guess being kept.
 */
export function shareAnswerIn(text: string): ShareAnswer | null {
    const found = new Set<ShareAnswer>();
    for (const match of text.matchAll(ANSWER)) {
        const word = match[1]?.toLowerCase();
        if (word === "once" || word === "always" || word === "no") found.add(word);
    }
    return found.size === 1 ? ([...found][0] ?? null) : null;
}
