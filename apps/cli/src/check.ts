/**
 * `arp check <skill>` (task 112, task 86's deliverable 1 for a skill): will it work here.
 *
 * Read-only: no wallet, no key, nothing written anywhere. Three parts, each a fact and none a verdict:
 *
 * 1. what the skill's own files contain, read from GitHub at `HEAD` (`readSkillInstall`, the same read
 *    the hook runs before a `skills add`);
 * 2. the lines agents wrote about it on Intuition testnet 13579 (`readSkillLines`, what the hook answers
 *    after a failure);
 * 3. **checked on this machine**: what those lines say the skill needed when it failed, and the programs
 *    and variables its own files name — a program on `PATH`, an environment variable set or not. A
 *    variable's value is never read; only whether it is non-empty.
 *
 * What leaves the machine: the repository and skill name, to GitHub (the requests an install makes),
 * and the skill's atom URI and four vocabulary words, to Intuition's index. Nothing about the machine:
 * the `PATH` and environment checks are local and their answers are only printed.
 *
 * Imports are by path, as in the hook: `failure-lines.ts` exports a `skillUrlOf` that the core index
 * already uses for another function.
 */
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { delimiter, join } from 'node:path';

import { linesSentence, readSkillLines, skillAtom } from '../../../packages/protocol/src/failure-lines.ts';
import { KEY_NAME, PROGRAM_NAME } from '../../../packages/protocol/src/declare/line-need.ts';
import { githubPulseSource } from '../../../packages/protocol/src/pulse.ts';
import type { PulseUsage } from '../../../packages/protocol/src/pulse-usage.ts';
import {
  readSkillInstall,
  skillInstallReport,
  type InstallRead,
} from '../../../packages/protocol/src/skill-install.ts';
import testnet from '../../../data/deployments/13579.json';

/** GitHub's and the index's budget, each. */
export const CHECK_BUDGET_MS = 8_000;

const WHERE = 'Intuition testnet 13579';
const IN_CONTEXT_OF = testnet.arp.endpointBinding.inContextOf;
const PAYERS = [testnet.arp.deployer, testnet.arp.sponsor];

export type SkillRef = { repo: string; skill: string };

/**
 * `owner/repo/skill`, or `https://github.com/owner/repo?skill=name`. `null` for anything else.
 */
export function skillRefOf(arg: string): SkillRef | null {
  const part = /^[\w.-]+$/;
  const fromUrl = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?\?skill=([^&#]+)$/.exec(arg.trim());
  if (fromUrl !== null) {
    const skill = decodeURIComponent(fromUrl[3] ?? '');
    return part.test(skill) ? { repo: `${fromUrl[1]}/${fromUrl[2]}`, skill } : null;
  }
  const pieces = arg.trim().split('/');
  if (pieces.length !== 3 || !pieces.every((piece) => part.test(piece))) return null;
  return { repo: `${pieces[0]}/${pieces[1]}`, skill: pieces[2] ?? '' };
}

/** What the lines say a failure needed: each name, and how many distinct wallets wrote it. */
export function neededNames(usage: PulseUsage | null): Map<string, number> {
  const byName = new Map<string, Set<string>>();
  for (const row of usage?.declarations ?? []) {
    for (const line of row.lines) {
      if (line.outcome !== 'failed') continue;
      for (const name of line.needs ?? []) {
        byName.set(name, (byName.get(name) ?? new Set()).add(row.writer.toLowerCase()));
      }
    }
  }
  return new Map([...byName].map(([name, wallets]) => [name, wallets.size]));
}

export type Machine = {
  /** Whether a program by this name is on `PATH`. */
  hasProgram(name: string): boolean;
  /** Whether this variable is set and non-empty. Its value is never returned. */
  hasVariable(name: string): boolean;
};

/** This machine: `PATH` searched by hand, `PATHEXT` on Windows, nothing executed. */
export function thisMachine(env: NodeJS.ProcessEnv = process.env, platform = process.platform): Machine {
  const dirs = (env['PATH'] ?? '').split(delimiter).filter((dir) => dir !== '');
  const exts = platform === 'win32' ? (env['PATHEXT'] ?? '.EXE;.CMD;.BAT').split(';') : [''];
  return {
    hasProgram: (name) =>
      dirs.some((dir) =>
        exts.some((ext) => {
          const path = join(dir, name + ext);
          try {
            return existsSync(path) && statSync(path).isFile();
          } catch {
            return false;
          }
        }),
      ),
    hasVariable: (name) => (env[name] ?? '') !== '',
  };
}

/** The programs and variables the skill's own files name, from the contents read. Empty when not read. */
export function namedInFiles(read: InstallRead): string[] {
  if (read.kind !== 'github') return [];
  const names = new Set<string>();
  for (const reading of read.readings) {
    const pulse = reading.pulse;
    if (pulse === null || pulse.status !== 'read') continue;
    for (const program of pulse.contains.programs) names.add(program.name);
    for (const setting of pulse.contains.settings) names.add(setting);
  }
  return [...names];
}

const stateOf = (name: string, machine: Machine): string => {
  if (KEY_NAME.test(name)) return machine.hasVariable(name) ? 'set' : 'not set';
  if (PROGRAM_NAME.test(name)) return machine.hasProgram(name) ? 'found on PATH' : 'missing here';
  return 'not checked';
};

/**
 * The "here" block: one line per name, what others needed first, then what the files name. A name of
 * neither shape is shown as not checked rather than guessed at.
 */
export function hereLines(needed: Map<string, number>, named: readonly string[], machine: Machine): string[] {
  const fromFiles = [...new Set(named)].filter((name) => !needed.has(name)).sort((a, b) => a.localeCompare(b));
  if (needed.size === 0 && fromFiles.length === 0) return ['Here: nothing named to check.'];
  const lines = ['Here (checked on this machine, nothing sent):'];
  const wallets = (n: number) => `${n} wallet${n === 1 ? '' : 's'}`;
  for (const [name, n] of [...needed].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))) {
    lines.push(`  ${name}: ${stateOf(name, machine)} (needed when it failed, ${wallets(n)})`);
  }
  for (const name of fromFiles) lines.push(`  ${name}: ${stateOf(name, machine)} (named in its files)`);
  return lines;
}

export type CheckDeps = {
  env: NodeJS.ProcessEnv;
  machine: Machine;
  fetch?: typeof fetch;
  budgetMs?: number;
};

/** The whole report for one skill. Every read that fails says so in its own block. */
export async function checkSkill(ref: SkillRef, deps: CheckDeps): Promise<string> {
  const budgetMs = deps.budgetMs ?? CHECK_BUDGET_MS;
  const token = (deps.env['GITHUB_TOKEN'] ?? deps.env['GH_TOKEN'])?.trim() || undefined;
  const deadline = new Promise<void>((resolve) => setTimeout(resolve, budgetMs).unref?.());
  const source = githubPulseSource({
    ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
    ...(token === undefined ? {} : { token }),
    timeoutMs: budgetMs + 500,
    signal: AbortSignal.timeout(budgetMs + 500),
  });
  const contents = readSkillInstall(
    { kind: 'github', repo: ref.repo, ref: null, subpath: null, skills: [ref.skill] },
    source,
    deadline,
  );

  const url = `https://github.com/${ref.repo}?skill=${encodeURIComponent(ref.skill)}`;
  const { uri, label } = skillAtom(url, (text) => createHash('sha256').update(text, 'utf8').digest());
  const usage = readSkillLines(uri, {
    graphqlUrl: deps.env['INTUITION_GRAPHQL_URL'] ?? testnet.chain.graphqlUrl,
    inContextOf: IN_CONTEXT_OF,
    payers: PAYERS,
    timeoutMs: budgetMs,
    ...(deps.fetch === undefined ? {} : { fetch: deps.fetch }),
  }).then(
    (read) => ({ ok: true as const, read }),
    () => ({ ok: false as const }),
  );

  const [read, lines] = await Promise.all([contents, usage]);
  const blocks = [skillInstallReport(read)];
  blocks.push(
    lines.ok
      ? (linesSentence(lines.read, label, WHERE) ?? `Lines: no agent wrote an outcome on ${label} (${WHERE}).`)
      : `Lines: not read (${WHERE} did not answer).`,
  );
  blocks.push(hereLines(lines.ok ? neededNames(lines.read) : new Map(), namedInFiles(read), deps.machine).join('\n'));
  return `${blocks.join('\n\n')}\n`;
}
