import {needKindOf} from "./declare/line-need.js";

/**
 * What the model said about a skill it used, at the end of its final reply (task 100, ADR `0169`, ADR `0179`). The
 * runtime hook asks for one closed line when the skill loads, reads it on `Stop` from the last message, and writes
 * one line of `<arpHome>/outcomes.jsonl`. **Pure and dependency-free**, so the hook imports it by path (ADR `0145`).
 *
 * `worked` is the model's word that the skill did its job and the task finished with it, never a verdict on the
 * result (`docs/28`). `unsure` is kept so the question is not asked twice, and is never shared.
 */
export const OUTCOME_ANSWERS = ["worked", "failed", "unsure"] as const;
export type OutcomeAnswer = (typeof OUTCOME_ANSWERS)[number];

export function isOutcomeAnswer(word: string): word is OutcomeAnswer {
    return (OUTCOME_ANSWERS as readonly string[]).includes(word);
}

/**
 * One line of `outcomes.jsonl`. `with` is a program's or a variable's name an earlier local `needs` record of this
 * skill named, kept on a worked answer only when the skill's SKILL.md still names it (ADR `0166`).
 */
export type LocalOutcome = {
    at: string;
    session: string;
    skill: string;
    source: string | null;
    domain?: string;
    outcome: OutcomeAnswer;
    with?: string;
};

/** The answer line, exactly: `arp: <skill> worked|failed|unsure`. Anything else is not an answer. */
const ANSWER = /^[\s>*`-]*arp:\s*([A-Za-z0-9._:@/-]+)\s+(worked|failed|unsure)[\s.`*]*$/gim;

/**
 * The answers in the model's last message, for the skills that were asked and no other. The first answer for a
 * skill wins. The text is read for these closed words and dropped.
 */
export function answersIn(text: string, asked: readonly string[]): Map<string, OutcomeAnswer> {
    const found = new Map<string, OutcomeAnswer>();
    for (const match of text.matchAll(ANSWER)) {
        const [, skill, word] = match;
        if (skill === undefined || word === undefined) continue;
        const answer = word.toLowerCase();
        if (!asked.includes(skill) || found.has(skill) || !isOutcomeAnswer(answer)) continue;
        found.set(skill, answer);
    }
    return found;
}

/** A malformed line is skipped: the last line of a file still being written is the normal case. */
export function parseLocalOutcomes(text: string): LocalOutcome[] {
    const rows: LocalOutcome[] = [];
    for (const line of text.split("\n")) {
        if (line.trim() === "") continue;
        try {
            const row = JSON.parse(line) as Record<string, unknown>; // read field by field below
            const {at, session, skill, source, domain, outcome} = row;
            const named = row["with"];
            if (typeof at !== "string" || typeof session !== "string" || typeof skill !== "string") continue;
            if (typeof outcome !== "string" || !isOutcomeAnswer(outcome)) continue;
            rows.push({
                at,
                session,
                skill,
                source: typeof source === "string" ? source : null,
                ...(typeof domain === "string" ? {domain} : {}),
                outcome,
                // `with` stands only on a worked answer, and only in a name's shape.
                ...(outcome === "worked" && typeof named === "string" && needKindOf(named) !== null ? {with: named} : {}),
            });
        } catch {
            continue;
        }
    }
    return rows;
}
