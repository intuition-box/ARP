/**
 * What a skill contains, as the skill page shows it (task 96, ADR `0165`).
 *
 * Read from the skill's own files by `packages/protocol/src/skill-contents.ts`, through one dated walk
 * (`scripts/measure/skill-contents.ts`, bundled by `scripts/build/build-skill-contents.ts` into
 * `src/data/skill-contents.json`). A browser cannot read a skill's directory itself: its file list is
 * GitHub's API, 60 requests an hour per visitor. So the date and the commit travel with the facts.
 *
 * Facts, never a verdict: a name found in the files, not a requirement and not a judgement.
 */
import type {ContentsProgram, FetchAndRunKind, HiddenKind, SkillContents, SkillKey, SkippedFile} from "@arp-protocol/core";

/** A line of a skill's file, with the kind of match. */
export type ContentsMatch<K extends string> = {kind: K; file: string; line: number; text: string};

/** One skill's entry, as `build-skill-contents.ts` writes it. */
export type SkillContentsEntry = {
    commit: string;
    /** The skill's directory in its repository, `""` at the root. */
    directory: string;
    programs: ContentsProgram[];
    packages: {manager: string; name: string}[];
    settings: string[];
    /** The settings a person hands it (task 112). */
    keys: SkillKey[];
    scripts: {path: string; namedInSkillMd: boolean}[];
    fetchAndRun: ContentsMatch<FetchAndRunKind>[];
    domains: string[];
    hidden: ContentsMatch<HiddenKind>[];
    /** Text files named and not read: too large, past the reader's limit, or not fetched (task 112). */
    skipped: SkippedFile[];
    /** Lists cut at the reader's limit, by name. */
    cut: string[];
};

export type SkillContentsReading = {measuredAt: string; skills: Record<string, SkillContentsEntry>};

/** A skill's entry, or `null` when the dated reading did not read it. */
export function contentsOf(reading: SkillContentsReading, label: string | null): SkillContentsEntry | null {
    if (label === null) return null;
    return reading.skills[label] ?? null;
}

/**
 * The ref of a read made on the spot (`/pulse`): GitHub's file list gives the tree, not a commit, so
 * a matched line links at the repository's head, which is what was read moments before.
 */
export const HEAD_REF = "HEAD";

/**
 * A read of the protocol's `readSkillContents` in the entry shape the panel shows, the conversion
 * `scripts/build/build-skill-contents.ts` makes for the dated reading.
 *
 * @param directory the skill's directory in its repository, `""` at the root.
 * @param commit the commit read, or `HEAD_REF` for a read made on the spot.
 */
export function entryOfContains(contains: SkillContents, directory: string, commit: string): SkillContentsEntry {
    return {
        commit,
        directory,
        programs: contains.programs,
        packages: contains.packages,
        settings: contains.settings,
        keys: contains.keys,
        scripts: contains.scripts,
        fetchAndRun: contains.fetchAndRun,
        domains: contains.domains,
        hidden: contains.hidden,
        skipped: contains.read.skipped,
        cut: contains.cut,
    };
}

/** The line on GitHub, at the commit that was read, so a reader opens exactly what was matched. */
export function lineUrl(repo: string, entry: SkillContentsEntry, match: {file: string; line: number}): string {
    const path = [entry.directory, match.file]
        .filter((part) => part !== "")
        .join("/")
        .split("/")
        .map(encodeURIComponent)
        .join("/");
    return `https://github.com/${repo}/blob/${entry.commit}/${path}#L${match.line}`;
}
