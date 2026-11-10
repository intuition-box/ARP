/** What each skill the site shows contains, read from its own files (task 96, ADR `0165`).
 *
 *      GITHUB_TOKEN=… bun run scripts/measure/skill-contents.ts
 *      bun run scripts/build/build-skill-contents.ts data/measurements/skill-contents-<stamp>.json
 *
 *  For every skill in `apps/web/src/data/skill-paths.json` (the paths the skill page reads its
 *  SKILL.md at): one commit request and one tree request per repository on GitHub's API, then every
 *  file of the skill's directory at that commit from `raw.githubusercontent.com`, then
 *  `readSkillContents` (`packages/protocol/src/skill-contents.ts`) over them. Writes one dated file
 *  under `data/measurements/` (ADR `0064`) and prints the counts. Read-only: no credential is needed
 *  beyond the optional token, which raises GitHub's limit of 60 requests an hour; nothing is signed.
 *
 *  A browser cannot do this itself: it needs the directory's file list, which is GitHub's API, and
 *  its quota is 60 an hour per visitor (`apps/web/src/hooks/use-skill-facts.ts`). So the site bundles
 *  this reading, with its date.
 *
 *  Bounds, the reader's own (`CONTENTS_LIMITS`): 200 files a skill, in path order, and a file over
 *  512 KB is named and not fetched. A file whose extension says it is an image, a font, an archive
 *  or a media file is named as binary and not fetched either.
 */
import {writeFileSync} from "node:fs";

import pathsFile from "../../apps/web/src/data/skill-paths.json";
import {CONTENTS_LIMITS, readSkillContents, type ContentsFile, type SkillContents} from "../../packages/protocol/src/skill-contents.ts";

const headers: Record<string, string> = {accept: "application/vnd.github+json", "user-agent": "arp-measure"};
const token = process.env["GITHUB_TOKEN"]?.trim();
if (token !== undefined && token.length > 0) headers["authorization"] = `Bearer ${token}`;

const BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|tiff?|svgz|pdf|zip|gz|tgz|bz2|xz|7z|rar|jar|woff2?|ttf|otf|eot|mp[34]|m4a|wav|ogg|flac|mov|webm|avi|mkv|pptx|docx|xlsx|odt|key|psd|ai|sketch|fig|db|sqlite|bin|exe|dll|so|dylib|wasm|pyc|class)$/i;
const MAX_FETCH_BYTES = CONTENTS_LIMITS.fileChars;

type TreeEntry = {path: string; type: string; size?: number};
type Located = {label: string; repo: string; skill: string; path: string};

const located: Located[] = Object.entries((pathsFile as {paths: Record<string, string>}).paths).flatMap(([label, path]) => {
    const match = /^github\.com\/([^/?]+\/[^/?]+)\?skill=(.+)$/.exec(label);
    return match === null ? [] : [{label, repo: match[1] ?? "", skill: decodeURIComponent(match[2] ?? ""), path}];
});
const repos = [...new Set(located.map((row) => row.repo))].sort();

const commits = new Map<string, {commit: string; files: TreeEntry[]; truncated: boolean}>();
const unreadRepos: string[] = [];
for (const repo of repos) {
    const head = await fetch(`https://api.github.com/repos/${repo}/commits/HEAD`, {headers, signal: AbortSignal.timeout(25_000)});
    if (!head.ok) {
        unreadRepos.push(`${repo} (HTTP ${head.status} on the commit)`);
        if (head.status === 403 || head.status === 429) break;
        continue;
    }
    const commit = ((await head.json()) as {sha?: unknown}).sha; // checked below
    if (typeof commit !== "string") {
        unreadRepos.push(`${repo} (no commit sha)`);
        continue;
    }
    const tree = await fetch(`https://api.github.com/repos/${repo}/git/trees/${commit}?recursive=1`, {headers, signal: AbortSignal.timeout(25_000)});
    if (!tree.ok) {
        unreadRepos.push(`${repo} (HTTP ${tree.status} on the tree)`);
        continue;
    }
    const body = (await tree.json()) as {tree?: TreeEntry[]; truncated?: boolean}; // GitHub's tree shape
    commits.set(repo, {commit, files: (body.tree ?? []).filter((entry) => entry.type === "blob"), truncated: body.truncated === true});
    console.log(`${repo}: ${commit.slice(0, 12)}`);
}

type Row = Located &
    ({status: "read"; commit: string; directory: string; contents: SkillContents} | {status: "unread"; why: string});

async function readOne(entry: Located): Promise<Row> {
    const repo = commits.get(entry.repo);
    if (repo === undefined) return {...entry, status: "unread", why: "repository not read"};
    const directory = entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "";
    const prefix = directory === "" ? "" : `${directory}/`;
    const inDirectory = repo.files.filter((file) => file.path.startsWith(prefix)).sort((a, b) => (a.path < b.path ? -1 : 1));
    if (!inDirectory.some((file) => file.path === entry.path)) return {...entry, status: "unread", why: "SKILL.md not at its path at this commit"};
    let fetched = 0;
    const plan = inDirectory.map((file) => {
        const path = file.path.slice(prefix.length);
        if (BINARY.test(path)) return {path, fetch: false, binary: true};
        if (fetched >= CONTENTS_LIMITS.files || (file.size ?? 0) > MAX_FETCH_BYTES) return {path, fetch: false, binary: false};
        fetched += 1;
        return {path, fetch: true, binary: false};
    });
    const files: ContentsFile[] = [];
    // Eight at a time: raw.githubusercontent.com is not on the API's quota, and a root skill can hold 200 files.
    for (let at = 0; at < plan.length; at += 8) {
        files.push(
            ...(await Promise.all(
                plan.slice(at, at + 8).map(async (step): Promise<ContentsFile> => {
                    if (step.binary) return {path: step.path, text: null};
                    if (!step.fetch) return {path: step.path, text: null, notFetched: true};
                    const url = `https://raw.githubusercontent.com/${entry.repo}/${repo.commit}/${`${prefix}${step.path}`.split("/").map(encodeURIComponent).join("/")}`;
                    const response = await fetch(url, {signal: AbortSignal.timeout(25_000)}).catch(() => null);
                    return response?.ok === true ? {path: step.path, text: await response.text()} : {path: step.path, text: null, notFetched: true};
                }),
            )),
        );
    }
    return {...entry, status: "read", commit: repo.commit, directory, contents: readSkillContents(files)};
}

const rows: Row[] = [];
for (let at = 0; at < located.length; at += 8) {
    rows.push(...(await Promise.all(located.slice(at, at + 8).map(readOne))));
    if (at % 80 === 0) console.log(`${Math.min(at + 8, located.length)} of ${located.length}`);
}

const read = rows.filter((row): row is Extract<Row, {status: "read"}> => row.status === "read");
const counts = {
    skills: located.length,
    repositories: repos.length,
    repositoriesUnread: unreadRepos.length,
    read: read.length,
    unread: rows.length - read.length,
    withPrograms: read.filter((row) => row.contents.programs.length > 0).length,
    withSettings: read.filter((row) => row.contents.settings.length > 0).length,
    withScripts: read.filter((row) => row.contents.scripts.length > 0).length,
    withFetchAndRun: read.filter((row) => row.contents.fetchAndRun.length > 0).length,
    withDomains: read.filter((row) => row.contents.domains.length > 0).length,
    withHidden: read.filter((row) => row.contents.hidden.length > 0).length,
    hiddenByKind: Object.fromEntries(
        [...new Set(read.flatMap((row) => row.contents.hidden.map((h) => h.kind)))].map((kind) => [
            kind,
            read.filter((row) => row.contents.hidden.some((h) => h.kind === kind)).length,
        ]),
    ),
};

const measuredAt = new Date().toISOString();
const stamp = `${measuredAt.slice(0, 10)}T${measuredAt.slice(11, 13)}${measuredAt.slice(14, 16)}`;
const out = `data/measurements/skill-contents-${stamp}.json`;
writeFileSync(
    out,
    `${JSON.stringify(
        {
            measuredAt,
            source: "api.github.com/repos/{repo}/commits/HEAD, …/git/trees/{commit}?recursive=1, raw.githubusercontent.com/{repo}/{commit}/{path}; paths from apps/web/src/data/skill-paths.json",
            question: "What each skill's files contain: programs, packages, settings, scripts, code fetched and run, domains, hidden or encoded text. Facts from the files, never a verdict.",
            authenticated: token !== undefined && token.length > 0,
            unreadRepos,
            truncatedTrees: [...commits.entries()].filter(([, value]) => value.truncated).map(([repo]) => repo),
            counts,
            rows,
        },
        null,
        1,
    )}\n`,
);
console.log(counts);
console.log(`written to ${out}`);

export {};
