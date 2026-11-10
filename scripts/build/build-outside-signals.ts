/** Turn three dated readings of somebody else's figures into the one file the MCP server and the site bundle (task 101).
 *
 *      bun run scripts/build/build-outside-signals.ts
 *      bun run scripts/build/build-outside-signals.ts --liveness <file> --issues <file> --trust <file>
 *
 *  Reads, by default the newest of each in `data/measurements/`:
 *
 *    repo-liveness-*.json        `scripts/measure/repo-liveness.ts`        archived, deleted
 *    repo-failure-issues-*.json  `scripts/measure/repo-failure-issues.ts`  issues whose title names a failure
 *    x402-trust-index-*.json     `scripts/measure/x402-trust-index.ts`     x402 Doctor's Trust Index, CC BY 4.0
 *
 *  Writes `data/catalogue/outside-signals.json` in the shape `OutsideSignals`
 *  (`packages/protocol/src/outside-signals.ts`). No network. Each source keeps its own date: they are
 *  never merged into one figure, and none of them is an input to a score or an order (ADR `0170`).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

import {
  failureIssueQuery,
  RECENT_ISSUES,
  TRUST_INDEX_CREDIT,
  TRUST_INDEX_DATASET,
  TRUST_INDEX_LICENCE,
  type IssueRef,
  type OutsideSignals,
  type RepoSignals,
  type SkillIssues,
  type TrustEntry,
  type TrustHost,
} from '../../packages/protocol/src/outside-signals.ts';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}
function newest(prefix: string): string {
  const found = readdirSync('data/measurements')
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
    .at(-1);
  if (found === undefined) throw new Error(`no data/measurements/${prefix}*.json`);
  return `data/measurements/${found}`;
}
const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T; // files the measurements wrote

const livenessPath = arg('liveness') ?? newest('repo-liveness-');
const issuesPath = arg('issues') ?? newest('repo-failure-issues-');
const trustPath = arg('trust') ?? newest('x402-trust-index-');

const liveness = read<{
  measuredAt: string;
  rows: { slug: string; archived: boolean; gone: boolean }[];
}>(livenessPath);
const issues = read<{
  measuredAt: string;
  rows: (
    | {
        repo: string;
        status: 'read';
        total: number;
        open: number;
        read: IssueRef[];
        skillsNamed: Record<string, number[]>;
      }
    | { repo: string; status: 'unread' }
  )[];
}>(issuesPath);
const trust = read<{
  measuredAt: string;
  revision: string;
  scan: string | null;
  licence: string;
  asked: { hosts: string[] };
  urls: Record<string, TrustEntry>;
  hosts: Record<string, TrustHost>;
}>(trustPath);
if (trust.licence !== TRUST_INDEX_LICENCE)
  throw new Error(`${trustPath} was read under ${trust.licence}`);

const repos: Record<string, RepoSignals> = {};
const at = (slug: string) =>
  (repos[`github.com/${slug.toLowerCase()}`] ??= { status: null, issues: null });
for (const row of liveness.rows)
  at(row.slug).status = row.gone ? 'gone' : row.archived ? 'archived' : 'active';

const skills: Record<string, SkillIssues> = {};
for (const row of issues.rows) {
  if (row.status !== 'read') continue;
  at(row.repo).issues = {
    total: row.total,
    open: row.open,
    recent: row.read.slice(0, RECENT_ISSUES),
  };
  const byNumber = new Map(row.read.map((issue) => [issue.number, issue]));
  if (Object.keys(row.skillsNamed).length > 0) at(row.repo).perSkill = true;
  for (const [label, numbers] of Object.entries(row.skillsNamed)) {
    // Absent means named by none, under a `perSkill` repository: 466 entries of zero were most of the file.
    if (numbers.length === 0) continue;
    skills[label] = {
      named: numbers.length,
      recent: numbers.slice(0, RECENT_ISSUES).flatMap((number) => {
        const issue = byNumber.get(number);
        return issue === undefined ? [] : [issue];
      }),
    };
  }
}

const day = (iso: string) => iso.slice(0, 10);
const out: OutsideSignals = {
  _note:
    "Somebody else's public figures, each with its source and the day it was read (task 101, ADR 0170). Never on " +
    "chain, never ARP's figure, never an input to a score or an order. Built by scripts/build/build-outside-signals.ts " +
    `from ${livenessPath}, ${issuesPath} and ${trustPath}; do not edit by hand. The x402 part is from the ` +
    `${TRUST_INDEX_CREDIT}, ${TRUST_INDEX_LICENCE}.`,
  sources: {
    github: {
      read: day(liveness.measuredAt),
      issuesRead: day(issues.measuredAt),
      query: failureIssueQuery('<owner/name>'),
    },
    trustIndex: {
      read: day(trust.measuredAt),
      scan: trust.scan,
      revision: trust.revision,
      credit: TRUST_INDEX_CREDIT,
      licence: TRUST_INDEX_LICENCE,
      dataset: TRUST_INDEX_DATASET,
    },
  },
  repos,
  skills,
  x402: { urls: trust.urls, hostsAsked: trust.asked.hosts, hosts: trust.hosts },
};
writeFileSync('data/catalogue/outside-signals.json', `${JSON.stringify(out)}\n`);
console.log(
  `${Object.keys(repos).length} repositories, ${Object.keys(skills).length} skills, ` +
    `${Object.keys(trust.urls).length} x402 URLs and ${Object.keys(trust.hosts).length} of ${trust.asked.hosts.length} hosts ` +
    'written to data/catalogue/outside-signals.json',
);
