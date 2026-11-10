/** Turn the dated pulse reading into the file `arp_pulse` bundles (task 113).
 *
 *      bun run scripts/build/build-pulse-readings.ts data/measurements/pulse-readings-<stamp>.json
 *
 *  Reads one run of `scripts/measure/pulse-readings.ts` and writes `data/catalogue/pulse-readings.json`, keyed by
 *  the skill atom's label (lower case). Only `read` rows enter, so a skill the reading missed is read live. The
 *  search's own fields (installs, the link) are left out, and so is `requires.description`, which no answer prints. Rerun both after a change to what `readPulse` or `readSkillContents`
 *  returns: `apps/mcp/test/pulse-readings.test.ts` fails on a bundle whose fields no longer match the reader's.
 */
import {readFileSync, writeFileSync} from "node:fs";

import type {SkillPulse} from "../../packages/protocol/src/pulse.ts";

const path = process.argv[2];
if (path === undefined) {
    console.error("pass the measurement: data/measurements/pulse-readings-<stamp>.json");
    process.exit(1);
}

type Row = {label: string} & SkillPulse;
const measured = JSON.parse(readFileSync(path, "utf8")) as {measuredAt: string; rows: Row[]}; // a file the measurement wrote

const skills: Record<string, unknown> = {};
for (const row of measured.rows) {
    if (row.status !== "read") continue;
    const {label, source: _source, skill: _skill, installs: _installs, installsText: _text, url: _url, status: _status, listingReadAt: _at, ...kept} = row;
    // The description is the longest field and no answer prints it.
    skills[label.toLowerCase()] = {...kept, requires: {...kept.requires, description: null}};
}

const out = {
    _note:
        "What arp_pulse's reader returned for each catalogued skill, read at HEAD on one date (task 113). " +
        `Built by scripts/build/build-pulse-readings.ts from ${path}; do not edit by hand. Keyed by the skill atom's label, lower case.`,
    measuredAt: measured.measuredAt,
    by: "scripts/measure/pulse-readings.ts",
    skills,
};
writeFileSync("data/catalogue/pulse-readings.json", `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(skills).length} skills written to data/catalogue/pulse-readings.json`);
