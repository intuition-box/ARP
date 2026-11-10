/**
 * What a line may say was missing, or was added (task 97, ADR `0166`): one more level after the reason,
 * `(T4, needs, ffmpeg)` on a failure, or after a worked outcome, `(T3, with, ffmpeg)`.
 *
 * **Pure and dependency-free**, so the runtime hook imports it by path (ADR `0145`), and the CLI and the
 * sponsoring service apply the same guard.
 *
 * **The guard is the point** (ADR `0155`, "never collect user text"). A name is published only when
 *
 * 1. it has the shape of a program (`ffmpeg`, `yt-dlp`) or of an environment variable's **name**
 *    (`OPENAI_API_KEY`) — never a value, a path or a sentence; and
 * 2. the skill's own SKILL.md already says it. So the word is one its author published, never one taken
 *    from the person's command, their output or their machine.
 *
 * Otherwise the level is left out and the line stops at the reason. A missing word costs a reader a
 * detail; a wrong one would publish somebody's path for ever, on a graph that deletes nothing.
 */

/** The predicate of the level on a failure's reason. A plain string, so its id is the same on every chain. */
export const NEEDS_LABEL = "needs";
/** The predicate of the level on a worked outcome. The plain string `with`, already an atom on 13579. */
export const WITH_LABEL = "with";

/** A program as a shell names it: lower case, no space, no slash. */
export const PROGRAM_NAME = /^[a-z0-9][a-z0-9._+-]{0,39}$/;
/** An environment variable's name. Never its value, which nothing here ever reads. */
export const KEY_NAME = /^[A-Z][A-Z0-9_]{2,63}$/;

export type NeedKind = "program" | "key";

/** Which shape a name has, or `null`. The two shapes cannot overlap: one is lower case, the other upper. */
export function needKindOf(name: string): NeedKind | null {
    if (PROGRAM_NAME.test(name)) return "program";
    if (KEY_NAME.test(name)) return "key";
    return null;
}

/** The kind a failure's reason can name. Only these two reasons take the level. */
export function needKindOfReason(reason: string): NeedKind | null {
    if (reason === "missing-program") return "program";
    if (reason === "missing-key") return "key";
    return null;
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whether the skill's text names this word, whole. A program is matched in any case (`FFmpeg` in prose
 * names `ffmpeg`); a variable's name exactly, because `openai_api_key` is not `OPENAI_API_KEY`.
 */
export function namedInSkill(name: string, markdown: string): boolean {
    const kind = needKindOf(name);
    if (kind === null) return false;
    // A word character, `-` or `+` on either side means the name is part of a longer one; so does a `.`
    // followed by more of a name (`ffmpeg.wasm` does not name `ffmpeg`). A sentence's full stop does not.
    const pattern = new RegExp(`(?<![A-Za-z0-9_+.-])${escaped(name)}(?![A-Za-z0-9_+-])(?!\\.[A-Za-z0-9])`, kind === "program" ? "i" : "");
    return pattern.test(markdown);
}

/**
 * The name a line may carry, or `null` when it may not. `kind` is what the line's reason calls for, or
 * absent on a worked line, where either shape may stand.
 */
export function publishableNeed(name: string, markdown: string, kind?: NeedKind): string | null {
    const shape = needKindOf(name);
    if (shape === null || (kind !== undefined && shape !== kind)) return null;
    return namedInSkill(name, markdown) ? name : null;
}

/**
 * Whether a line's fields fit together, before any SKILL.md is read: a name only on a worked line, or on a
 * failure whose reason is a missing program or key, and of the shape that reason calls for. `null` when they
 * fit, else why not.
 */
export function needShapeProblem(params: {need: string; outcome: string; reason: string}): string | null {
    const {need, outcome, reason} = params;
    if (need === "") return null;
    const shape = needKindOf(need);
    if (shape === null) return "a need is a program name (ffmpeg) or an environment variable's name (OPENAI_API_KEY)";
    if (outcome === "worked") return reason === "" ? null : "a worked line has no reason";
    const wanted = needKindOfReason(reason);
    if (wanted === null) return "a need follows a missing-program or missing-key failure";
    return shape === wanted ? null : `${reason} names ${wanted === "program" ? "a program" : "an environment variable"}`;
}
