/** Which form each catalogue repository is admitted under by `POST /list-tool`'s gate (task 94, ADR `0163`).
 *
 *      bun run scripts/measure/tool-forms.ts            print, and write one file in data/measurements/
 *      bun run scripts/measure/tool-forms.ts --no-file  print only
 *
 *  Runs the sponsor's own `admitRepository` over every repository in `data/catalogue/tools.json`: one GitHub tree
 *  read each (`GITHUB_TOKEN` optional; 53 reads fit GitHub's 60 an hour without one), and manifests from
 *  raw.githubusercontent.com where the names show no form. Reads only, sends nothing, holds no key. A file is a
 *  dated measurement (ADR `0064`): one per run, never regenerated.
 */
import {writeFileSync} from "node:fs";
import {join} from "node:path";

import tools from "../../data/catalogue/tools.json";
import {admitRepository, type ToolAdmission} from "../../apps/sponsor/src/admit-tool.ts";

const ROOT = join(import.meta.dir, "..", "..");
const token = process.env["GITHUB_TOKEN"]?.trim();

const rows: {url: string; kind: string; admission: ToolAdmission | {error: string}}[] = [];
for (const tool of tools.tools) {
    const repo = new URL(tool.url).pathname.replace(/^\/+/, "");
    let admission: ToolAdmission | {error: string};
    try {
        admission = await admitRepository(repo, token);
    } catch (error) {
        admission = {error: error instanceof Error ? error.message : String(error)};
    }
    rows.push({url: tool.url, kind: tool.kind, admission});
    const verdict = "error" in admission ? `error: ${admission.error}` : admission.ok ? admission.form : `${admission.rule}: ${admission.reason}`;
    console.log(`${tool.kind.padEnd(10)} ${repo.padEnd(44)} ${verdict}`);
}

const byForm = new Map<string, number>();
for (const {kind, admission} of rows) {
    const key = `${kind} → ${"error" in admission ? "error" : admission.ok ? admission.form : admission.rule}`;
    byForm.set(key, (byForm.get(key) ?? 0) + 1);
}
console.log("");
for (const [key, n] of [...byForm].sort()) console.log(`${String(n).padStart(3)}  ${key}`);
const admitted = rows.filter(({admission}) => !("error" in admission) && admission.ok).length;
console.log(`\n${admitted} of ${rows.length} catalogue repositories admitted (data/catalogue/tools.json, read ${tools.readAt})`);

if (!process.argv.includes("--no-file")) {
    const at = new Date().toISOString().slice(0, 16).replace(":", "");
    const file = join(ROOT, "data", "measurements", `tool-forms-${at}.json`);
    writeFileSync(
        file,
        `${JSON.stringify({measuredAt: new Date().toISOString(), script: "scripts/measure/tool-forms.ts", catalogueReadAt: tools.readAt, admitted, of: rows.length, rows}, null, 2)}\n`,
    );
    console.log(`wrote ${file}`);
}
