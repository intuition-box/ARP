/** How many issues of each catalogued repository name a failure in their title (task 101, ADR `0170`).
 *
 *      bun run scripts/measure/repo-failure-issues.ts --json data/measurements/repo-failure-issues-<stamp>.json
 *      bun run scripts/build/build-outside-signals.ts
 *
 *  Read-only. Signs nothing. For every repository in `data/catalogue/tools.json` and every repository a
 *  skill page reads (`apps/web/src/data/skill-paths.json`): one GitHub search, `failureIssueQuery`
 *  (`packages/protocol/src/outside-signals.ts`), newest first, 100 results; and a second one for the
 *  open count when there are more than 100. Search has its own limit, 10 a minute without a token, so
 *  the run waits between requests; a token raises it to 30 and is read from `GITHUB_TOKEN`, never printed.
 *
 *  **Kept: counts, numbers, states and dates. Not kept: any title or body.** A title is read here only
 *  to say whether it names a skill of a repository that holds several; it is not written anywhere. The
 *  page links to GitHub's own search, which holds the text.
 */
import { writeFileSync } from 'node:fs';

import catalogue from '../../data/catalogue/tools.json';
import skillPaths from '../../apps/web/src/data/skill-paths.json';
import {
  failureIssueQuery,
  titleNamesSkill,
  type IssueRef,
} from '../../packages/protocol/src/outside-signals.ts';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const headers: Record<string, string> = {
  accept: 'application/vnd.github+json',
  'user-agent': 'arp-measure',
};
const token = process.env['GITHUB_TOKEN']?.trim();
const authenticated = token !== undefined && token.length > 0;
if (authenticated) headers['authorization'] = `Bearer ${token}`;
// 10 searches a minute without a token, 30 with one; a little under each.
const PAUSE_MS = authenticated ? 2_200 : 6_500;
const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

const skillsByRepo = new Map<string, { label: string; skill: string }[]>();
for (const label of Object.keys((skillPaths as { paths: Record<string, string> }).paths)) {
  const match = /^github\.com\/([^/?]+\/[^/?]+)\?skill=(.+)$/.exec(label);
  if (match === null) continue;
  const repo = (match[1] ?? '').toLowerCase();
  const list = skillsByRepo.get(repo) ?? [];
  list.push({ label, skill: decodeURIComponent(match[2] ?? '') });
  skillsByRepo.set(repo, list);
}
const repos = [
  ...new Set([
    ...(catalogue as { tools: { url: string }[] }).tools.map((tool) =>
      tool.url.replace(/^https:\/\/github\.com\//, '').toLowerCase(),
    ),
    ...skillsByRepo.keys(),
  ]),
].sort();

type SearchItem = { number?: unknown; state?: unknown; created_at?: unknown; title?: unknown };
type Search = { total_count?: unknown; incomplete_results?: unknown; items?: SearchItem[] };

async function search(
  q: string,
  perPage: number,
): Promise<{ status: number; body: Search | null }> {
  const url = `https://api.github.com/search/issues?per_page=${perPage}&sort=created&order=desc&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) }).catch(
    () => null,
  );
  if (response === null) return { status: 0, body: null };
  if (!response.ok) return { status: response.status, body: null };
  return { status: response.status, body: (await response.json()) as Search }; // GitHub's search shape, read field by field
}

type Row =
  | {
      repo: string;
      status: 'read';
      total: number;
      open: number;
      incomplete: boolean;
      read: IssueRef[];
      /** Skill label to the numbers, among `read`, whose title names it. Repositories of one skill have none. */
      skillsNamed: Record<string, number[]>;
    }
  | { repo: string; status: 'unread'; why: string };

const rows: Row[] = [];
for (const repo of repos) {
  const first = await search(failureIssueQuery(repo), 100);
  await sleep(PAUSE_MS);
  if (first.body === null) {
    rows.push({ repo, status: 'unread', why: `HTTP ${first.status}` });
    console.log(`${repo}: HTTP ${first.status}`);
    if (first.status === 403 || first.status === 429) break;
    continue;
  }
  const items = first.body.items ?? [];
  const read: IssueRef[] = [];
  const titles: string[] = [];
  for (const item of items) {
    if (typeof item.number !== 'number' || typeof item.created_at !== 'string') continue;
    read.push({
      number: item.number,
      state: item.state === 'open' ? 'open' : 'closed',
      opened: item.created_at.slice(0, 10),
    });
    titles.push(typeof item.title === 'string' ? item.title : '');
  }
  const total = typeof first.body.total_count === 'number' ? first.body.total_count : read.length;
  let open = read.filter((issue) => issue.state === 'open').length;
  if (total > read.length) {
    const opened = await search(`${failureIssueQuery(repo)} is:open`, 1);
    await sleep(PAUSE_MS);
    open = typeof opened.body?.total_count === 'number' ? opened.body.total_count : open;
  }
  const skillsNamed: Record<string, number[]> = {};
  const skills = skillsByRepo.get(repo) ?? [];
  if (skills.length > 1) {
    for (const { label, skill } of skills) {
      skillsNamed[label] = read
        .filter((_, at) => titleNamesSkill(titles[at] ?? '', skill))
        .map((issue) => issue.number);
    }
  }
  rows.push({
    repo,
    status: 'read',
    total,
    open,
    incomplete: first.body.incomplete_results === true,
    read,
    skillsNamed,
  });
  console.log(`${repo}: ${total} (${open} open)`);
}

const done = rows.filter((row): row is Extract<Row, { status: 'read' }> => row.status === 'read');
console.log(
  `\nrepositories ${repos.length}, read ${done.length}, unread ${rows.length - done.length}, not reached ${repos.length - rows.length}`,
);
console.log(`with at least one matching issue: ${done.filter((row) => row.total > 0).length}`);
console.log(`with at least one open: ${done.filter((row) => row.open > 0).length}`);

// Third-party figures that change, so the run is kept: ADR `0064`, one file per run.
const jsonPath = arg('json');
if (jsonPath !== undefined) {
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        source: 'api.github.com/search/issues',
        query: failureIssueQuery('<owner/name>'),
        authenticated,
        repositories: repos.length,
        rows,
      },
      null,
      1,
    )}\n`,
  );
  console.log(`written to ${jsonPath}`);
}

export {};
