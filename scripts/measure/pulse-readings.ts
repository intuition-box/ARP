/** What `arp_pulse` reads for every catalogued skill, read once and dated, so a search reads it from the bundle (task 113).
 *
 *      bun run scripts/measure/pulse-readings.ts
 *      bun run scripts/build/build-pulse-readings.ts data/measurements/pulse-readings-<stamp>.json
 *
 *  For every skill in `apps/web/src/data/skill-paths.json`: `readPulse` (`packages/protocol/src/pulse.ts`), the
 *  same reader a live search runs, through `githubPulseSource` at `HEAD`. One tree request per repository on
 *  GitHub's API (about 30, within the 60 an hour an address has without a token), then `SKILL.md` and the scripts
 *  it runs from `raw.githubusercontent.com`. With `GITHUB_TOKEN` it also reads each repository's figures, as a live
 *  search with a token does. Writes one dated file under `data/measurements/` (ADR `0064`) and prints the counts.
 *  Read-only: nothing is signed, and no word of anybody's search is sent.
 */
import {writeFileSync} from "node:fs";

import pathsFile from "../../apps/web/src/data/skill-paths.json";
import {githubPulseSource, readPulse, type SkillPulse} from "../../packages/protocol/src/pulse.ts";

const token = process.env["GITHUB_TOKEN"]?.trim();
const source = githubPulseSource(token === undefined || token === "" ? {withRepository: false} : {token});

const skills = Object.keys((pathsFile as {paths: Record<string, string>}).paths).flatMap((label) => {
    const match = /^github\.com\/([^/?]+\/[^/?]+)\?skill=(.+)$/.exec(label);
    return match === null ? [] : [{label, repo: match[1] ?? "", skill: decodeURIComponent(match[2] ?? "")}];
});

const measuredAt = new Date().toISOString();
const rows: ({label: string} & SkillPulse)[] = [];
const BATCH = 8;
for (let at = 0; at < skills.length; at += BATCH) {
    const batch = skills.slice(at, at + BATCH);
    rows.push(
        ...(await Promise.all(
            batch.map(async ({label, repo, skill}) => ({
                label,
                ...(await readPulse({source: repo, skill, installs: null, installsText: null, url: null}, source).catch(
                    (): SkillPulse => ({source: repo, skill, installs: null, installsText: null, url: null, status: "repository_unreachable"}),
                )),
            })),
        )),
    );
}

const counts: Record<string, number> = {};
for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
const quota = source.quota?.();
const file = `data/measurements/pulse-readings-${measuredAt.slice(0, 16).replace(/:/g, "")}.json`;
writeFileSync(
    file,
    `${JSON.stringify(
        {
            measuredAt,
            script: "scripts/measure/pulse-readings.ts",
            source: "api.github.com/repos/{repo}/git/trees/HEAD?recursive=1, raw.githubusercontent.com/{repo}/HEAD/{path}; skills from apps/web/src/data/skill-paths.json",
            question: "What arp_pulse's reader returns for each catalogued skill, read at HEAD on this date.",
            authenticated: token !== undefined && token !== "",
            githubApiRequests: quota?.apiRequests ?? null,
            githubLimited: quota?.limited ?? null,
            counts: {skills: rows.length, ...counts},
            rows,
        },
        null,
        1,
    )}\n`,
);
console.log(JSON.stringify({skills: rows.length, counts, apiRequests: quota?.apiRequests, limited: quota?.limited}));
console.log(`wrote ${file}`);
