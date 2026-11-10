/** Turn the dated contents measurement into the file the skill page bundles (task 96).
 *
 *      bun run scripts/build/build-skill-contents.ts data/measurements/skill-contents-<stamp>.json
 *
 *  Reads one run of `scripts/measure/skill-contents.ts` and writes `apps/web/src/data/skill-contents.json`,
 *  keyed by the skill atom's label like `skill-paths.json`. A skill whose files were not read gets no
 *  entry, so the page says "not read" rather than "none found". Each quoted line is cut to 120
 *  characters for the bundle; the page links every match to its line at the commit instead.
 */
import {readFileSync, writeFileSync} from "node:fs";

import type {SkillContents} from "../../packages/protocol/src/skill-contents.ts";

const path = process.argv[2];
if (path === undefined) {
    console.error("pass the measurement: data/measurements/skill-contents-<stamp>.json");
    process.exit(1);
}

type Row = {label: string; status: "read" | "unread"; commit?: string; directory?: string; contents?: SkillContents};
const measured = JSON.parse(readFileSync(path, "utf8")) as {measuredAt: string; rows: Row[]}; // a file the measurement wrote

const QUOTE = 120;
const cut = (text: string) => (text.length > QUOTE ? `${text.slice(0, QUOTE - 1)}…` : text);

const skills: Record<string, unknown> = {};
for (const row of measured.rows) {
    if (row.status !== "read" || row.contents === undefined || row.commit === undefined) continue;
    const c = row.contents;
    skills[row.label] = {
        commit: row.commit,
        directory: row.directory ?? "",
        programs: c.programs,
        packages: c.packages,
        settings: c.settings,
        scripts: c.scripts,
        fetchAndRun: c.fetchAndRun.map((m) => ({...m, text: cut(m.text)})),
        domains: c.domains,
        hidden: c.hidden.map((m) => ({...m, text: cut(m.text)})),
        notRead: c.read.skipped.length,
        cut: c.cut,
    };
}

const out = {
    _note:
        "What each skill's files contain: facts from the files, never a verdict (task 96, ADR 0165). " +
        `Built by scripts/build/build-skill-contents.ts from ${path}; do not edit by hand. Keyed by the skill atom's label.`,
    measuredAt: measured.measuredAt,
    skills,
};
writeFileSync("apps/web/src/data/skill-contents.json", `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(skills).length} skills written to apps/web/src/data/skill-contents.json`);
