/** Build the `arp-usage` feed (task 112) from the skill lines feed. Holds no key, reads no network.
 *
 *      bun run scripts/build/build-arp-usage-feed.ts [--in apps/web/public/feeds/skill-lines.json]
 *                                                     [--out apps/web/public/feeds/arp-usage.json]
 *
 *  One record per skill, in the shape of the adapter sheet proposed to HOL for HCS-28 skill trust: the
 *  rule is in `packages/protocol/src/arp-usage.ts`. Run `build-skill-lines-feed.ts` first to refresh the
 *  input; this file is computed from whatever snapshot that one holds, and names its date.
 */
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname} from "node:path";

import {buildArpUsageFeed} from "../../packages/protocol/src/arp-usage.ts";
import {SKILL_LINES_SCHEMA, type SkillLinesFeed} from "../../packages/protocol/src/skill-lines-feed.ts";

const arg = (flag: string, fallback: string): string => {
    const at = process.argv.indexOf(flag);
    if (at === -1) return fallback;
    const value = process.argv[at + 1] ?? "";
    if (value === "") {
        console.error(`${flag} takes a path`);
        process.exit(1);
    }
    return value;
};

const input = arg("--in", "apps/web/public/feeds/skill-lines.json");
const out = arg("--out", "apps/web/public/feeds/arp-usage.json");

const parsed: unknown = JSON.parse(readFileSync(input, "utf8"));
if (typeof parsed !== "object" || parsed === null || !("schema" in parsed) || parsed.schema !== SKILL_LINES_SCHEMA || !("skills" in parsed) || !Array.isArray(parsed.skills)) {
    console.error(`${input} is not an ${SKILL_LINES_SCHEMA} feed`);
    process.exit(1);
}
// The file is the output of build-skill-lines-feed.ts, checked above by its schema name.
const lines = parsed as SkillLinesFeed;

const feed = buildArpUsageFeed(lines, new Date().toISOString());
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, `${JSON.stringify(feed, null, 1)}\n`);

const scored = feed.skills.filter((skill) => skill.score !== null).length;
console.log(`${feed.skills.length} skills, ${scored} with a score (from lines of ${lines.generated_at}): ${out}`);
