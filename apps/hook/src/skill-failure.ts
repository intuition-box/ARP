import { appendOwn } from './append.ts';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  installedFromReceipts,
  installedFromSkillLock,
  readRequires,
  type UsageReason,
} from '@arp-protocol/core';

// The pure module, not the package index: the published hook carries no dependency (ADR `0145`).
import { domainInText } from '../../../packages/protocol/src/domain-words.ts';
import { publishableNeed } from '../../../packages/protocol/src/declare/line-need.ts';
import aliasTable from '../../../data/catalogue/domain-aliases.json';
import skillNodes from '../../../data/catalogue/skill-nodes-13579.json';

import { classifyCall, failureText } from './classify.ts';
import type { ToolCall } from './payload.ts';

/** The hook can tell these three from a command's output. `not-the-right-tool` is a judgement. */
export type DetectedReason = Extract<UsageReason, 'missing-key' | 'missing-program' | 'missing-file'>;

const MISSING_KEY =
  /\b(api[ _-]?key|access[ _-]?token|credentials?)\b.{0,40}\b(missing|not set|not found|required|invalid|expired)\b|(?<!\bnot )\b(missing|no|invalid|expired)\b.{0,20}\b(api[ _-]?key|access[ _-]?token|credentials?)\b|\b(HTTP|status)(\/[\d.]+| code)?[ :=]*(401|403)\b|\b(401|403) (unauthori[sz]ed|forbidden)\b|\bunauthori[sz]ed\b|not authenticated|not logged in/i;
/** Case matters: `Unexpected token, missing semicolon` is not about a key. */
const MISSING_KEY_VARIABLE = /\b[A-Z0-9_]*(API_KEY|TOKEN|SECRET)\b.{0,30}\b(not set|missing|required|unset)\b/;
const MISSING_PROGRAM =
  /command not found|executable file not found|\bnot installed\b|No module named|spawn \S+ ENOENT|Cannot find module/i;
const MISSING_FILE =
  /No such file or directory|\bENOENT\b|file not found|\b(file|path|directory|folder)\b(?!\.).{0,80}\bdoes not exist\b/i;

/** Which closed reason a failure's text shows, or `null` when it shows none of them. */
export function failureReason(text: string): DetectedReason | null {
  if (MISSING_PROGRAM.test(text)) return 'missing-program';
  if (MISSING_KEY.test(text) || MISSING_KEY_VARIABLE.test(text)) return 'missing-key';
  if (MISSING_FILE.test(text)) return 'missing-file';
  return null;
}

/** Where an error names the program it could not run. Each captures the name, as the error wrote it. */
const PROGRAM_IN_ERROR = [
  /(?:^|[\s:])([^\s:'"`]+): (?:command )?not found\b/gim,
  /command not found: ([^\s'"`]+)/gi,
  /\bexec(?:utable)?:? "?([^\s"]+)"?: executable file not found/gi,
  /\bspawn ([^\s'"`]+) ENOENT\b/gi,
  /No module named '?([A-Za-z0-9_.-]+)'?/g,
  /Cannot find module '([^']+)'/g,
  /(?:^|\s)'?([^\s'"`]+)'? is not installed\b/gim,
];
/** Where an error names the variable it wanted. A name only, never what follows an `=`. */
const KEY_IN_ERROR = [
  /\b([A-Z][A-Z0-9_]{2,63})\b[^=\n]{0,30}\b(?:not set|missing|required|unset|is empty)\b/g,
  /\b(?:set|export|provide|missing|define)\s+(?:the\s+)?(?:environment variable\s+)?\$?([A-Z][A-Z0-9_]{2,63})\b/gi,
  /\$?\b([A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|ACCESS_KEY)[A-Z0-9_]*)\b/g,
];

/**
 * The program or variable name a failure's own text names, kept only when the skill's SKILL.md names it too
 * (`publishableNeed`, ADR `0166`). So the name is a word the skill published, never one from the person's
 * command, path or machine, and `null` whenever that cannot be said.
 */
export function needOf(reason: DetectedReason, text: string, markdown: string): string | null {
  const kind = reason === 'missing-program' ? 'program' : reason === 'missing-key' ? 'key' : null;
  if (kind === null) return null;
  for (const pattern of kind === 'program' ? PROGRAM_IN_ERROR : KEY_IN_ERROR) {
    for (const match of text.matchAll(pattern)) {
      const named = match[1] ?? '';
      // A path names its program by its last part: `/usr/bin/ffmpeg` is `ffmpeg`, and the rest is the machine's.
      const name = kind === 'program' ? (named.split('/').pop() ?? '').toLowerCase() : named;
      const kept = publishableNeed(name, markdown, kind);
      if (kept !== null) return kept;
    }
  }
  return null;
}

const RUNNERS = new Set(['bash', 'bun', 'bunx', 'node', 'npx', 'python', 'python3', 'sh', 'uv', 'uvx', 'zsh']);

/** What each part of a shell command runs: the program, or what a runner was given. */
export function programsOf(command: string): string[] {
  const found: string[] = [];
  for (const part of command.split(/&&|\|\||[;|\n]/)) {
    const words = part
      .trim()
      .split(/\s+/)
      .filter((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word));
    const first = words[0];
    if (first === undefined || first === '') continue;
    const program = first.split('/').pop() ?? first;
    if (!RUNNERS.has(program)) {
      found.push(program);
      continue;
    }
    const target = words.slice(1).find((word) => !word.startsWith('-') && word !== 'run');
    if (target !== undefined) found.push(target.split('/').pop() ?? target);
  }
  return found;
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether this command is one the skill's own text asks for, or runs from the skill's directory. */
export function askedBySkill(command: string, markdown: string, directory: string): boolean {
  if (new RegExp(`${escaped(directory)}(?=[/\\s'"]|$)`).test(command)) return true;
  const { cli, runs } = readRequires(markdown);
  const named = new Set([...cli, ...runs]);
  return programsOf(command).some(
    (program) =>
      named.has(program) ||
      (program.includes('.') && new RegExp(`(?:^|[\\s\`'"/(])${escaped(program)}(?=[\\s\`'")]|$)`, 'm').test(markdown)),
  );
}

/**
 * The nodes of the tree as written (task 79), and the alias table: the failure record reads no network, so both
 * ship with it (task 84, ADR `0155`). A domain is one of these nodes, never anything else.
 */
const NODES: readonly string[] = skillNodes.nodes;
const WORDS = { labels: NODES, aliases: aliasTable.aliases as Record<string, string> };
const SKILL_NODE = skillNodes.skills as Record<string, string>;

/** The latest words the person typed in a transcript. Only ever matched against closed words. */
export function lastUserWords(transcript: string): string {
  let words = '';
  for (const line of transcript.split('\n')) {
    if (!line.includes('"user"')) continue;
    try {
      const entry = JSON.parse(line) as { type?: unknown; isMeta?: unknown; message?: { content?: unknown } }; // read field by field
      if (entry.type !== 'user' || entry.isMeta === true) continue;
      const content = entry.message?.content;
      const text = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? (content as { type?: unknown; text?: unknown }[]).map((block) => (block?.type === 'text' && typeof block.text === 'string' ? block.text : '')).join(' ') // a message's blocks, checked here
          : '';
      if (text.trim() !== '' && !text.trimStart().startsWith('<')) words = text;
    } catch {
      continue;
    }
  }
  return words;
}

/**
 * The context of a failure, a node of the tree, or `null`: a node or a word for one found whole in what
 * the person asked for, else the node the skill is filed at. Both read local data only, and the person's
 * words stay here.
 */
export function contextOf(words: string, skill: string): string | null {
  return domainInText(words, WORDS) ?? SKILL_NODE[skill.split(':').pop() ?? skill] ?? null;
}

/** The JSON text of an MCP answer: Claude Code hands the hook a list of blocks (seen 2026-11-05, 2.1.318). */
function answerOf(response: unknown): Record<string, unknown> | null {
  const blocks = Array.isArray(response)
    ? response
    : typeof response === 'object' && response !== null && Array.isArray((response as { content?: unknown }).content) // checked on this line
      ? ((response as { content: unknown[] }).content)
      : [response];
  for (const block of blocks) {
    const text = typeof block === 'string' ? block : (block as { text?: unknown } | null)?.text; // a block's text, or nothing
    if (typeof text !== 'string') continue;
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>; // checked on this line
    } catch {
      continue;
    }
  }
  return null;
}

const searchesPath = (cwd: string) =>
  join(dirname(process.env['ARP_SESSION_LOG'] ?? join(cwd, '.arp', 'session.jsonl')), 'searches.jsonl');

/**
 * Keeps what `arp_pulse` answered in this session: its domain, a closed word, and the skills it
 * found with their source. So a later failure can say in which context the skill was chosen. Never
 * the query, which is the person's words. Nothing leaves here.
 */
export function recordSearch(call: ToolCall, cwd: string): void {
  if (call.session === null) return;
  const answer = answerOf(call.response);
  if (answer === null || !Array.isArray(answer['skills'])) return;
  const domain = typeof answer['domain'] === 'string' && NODES.includes(answer['domain']) ? answer['domain'] : null;
  const skills = (answer['skills'] as { name?: unknown; source?: unknown }[]).flatMap((row) => // read field by field
    typeof row?.name === 'string' && typeof row.source === 'string' ? [{ name: row.name, source: row.source }] : [],
  );
  if (skills.length === 0) return;
  try {
    const path = searchesPath(cwd);
    mkdirSync(dirname(path), { recursive: true });
    appendOwn(path, `${JSON.stringify({ session: call.session, domain, skills })}\n`);
  } catch {
    // A session must not fail because a record could not be kept.
  }
}

/** The latest search of this session that found this skill, or nothing. */
function foundBySearch(cwd: string, session: string, skill: string): { domain: string | null; source: string } | null {
  const path = searchesPath(cwd);
  if (!existsSync(path)) return null;
  const name = skill.split(':').pop() ?? skill;
  let found: { domain: string | null; source: string } | null = null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    try {
      const row = JSON.parse(line) as { session?: unknown; domain?: unknown; skills?: { name: string; source: string }[] }; // our own file
      if (row.session !== session) continue;
      const hit = row.skills?.find((entry) => entry.name === name);
      if (hit !== undefined) found = { domain: typeof row.domain === 'string' ? row.domain : null, source: hit.source };
    } catch {
      continue;
    }
  }
  return found;
}

const readIfThere = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/**
 * Where this skill was installed from, when this machine says so without doubt: the skills CLI's lock
 * file, or a receipt. Without it a failure would land on every skill of that name in a search.
 */
function installedSource(name: string, cwd: string): string | null {
  const known = [
    ...installedFromSkillLock(readIfThere(join(homedir(), '.agents', '.skill-lock.json'))),
    ...installedFromReceipts(readIfThere(join(arpHome(), 'receipts.jsonl'))),
    ...installedFromReceipts(readIfThere(join(cwd, '.arp', 'receipts.jsonl'))),
  ];
  const sources = new Set(known.filter((entry) => entry.skill === name).map((entry) => entry.source));
  return sources.size === 1 ? ([...sources][0] ?? null) : null;
}

/** Skills this session used, the latest first. A missing or half-written log is an empty list. */
function skillsOfSession(log: string, session: string): { name: string; source: string | null }[] {
  if (!existsSync(log)) return [];
  const skills: { name: string; source: string | null }[] = [];
  for (const line of readFileSync(log, 'utf8').split('\n')) {
    try {
      const row = JSON.parse(line) as Record<string, unknown>; // read field by field below
      if (row['kind'] === 'skill' && row['session'] === session && typeof row['name'] === 'string') {
        skills.unshift({
          name: row['name'],
          source: typeof row['source'] === 'string' ? row['source'] : null,
        });
      }
    } catch {
      // The last line of a log still being written is the normal case.
    }
  }
  return skills;
}

/** A plugin's skill, `plugin:name`, is not looked for: where a plugin keeps its files was not tested. */
export function skillDirectory(name: string, cwd: string): string | null {
  const roots = [join(cwd, '.claude', 'skills'), join(homedir(), '.claude', 'skills')];
  const given = process.env['ARP_SKILLS_DIR'];
  if (given !== undefined && given !== '') roots.unshift(given);
  return roots.map((root) => join(root, name)).find((dir) => existsSync(join(dir, 'SKILL.md'))) ?? null;
}

/**
 * `arpHome` of `@arp-protocol/core/node`, restated: that module imports viem, and this file ships in
 * a hook that has to start with no dependency installed.
 */
export function arpHome(): string {
  const given = process.env['ARP_HOME']?.trim();
  return given !== undefined && given !== '' ? given : join(homedir(), '.arp');
}

export type FailureLine = {
  at: string;
  session: string;
  skill: string;
  source: string | null;
  /** The search's domain in this session, else `contextOf`. Absent when neither gives a closed word. */
  domain?: string;
  reason: DetectedReason;
  /** The missing program or variable's name, only when the skill's SKILL.md names it (`needOf`, ADR `0166`). */
  need?: string;
};

/** Appends unless this session, skill and reason are already there. Says whether it wrote. */
export function appendFailure(line: FailureLine): boolean {
  const path = join(arpHome(), 'failures.jsonl');
  const seen = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const key = `"session":${JSON.stringify(line.session)},"skill":${JSON.stringify(line.skill)},`;
  if (seen.split('\n').some((row) => row.includes(key) && row.includes(`"reason":"${line.reason}"`))) return false;
  mkdirSync(dirname(path), { recursive: true });
  appendOwn(path, `${JSON.stringify(line)}\n`);
  return true;
}

/**
 * Writes one line to `<arpHome>/failures.jsonl` when a failed command is one a skill of this session
 * asked for and its output shows a closed reason. At most one line per session, skill and reason.
 *
 * In the home directory and not the project's `.arp/`, because a key or a program missing here is
 * missing in the next project too. The line holds the reason and never the command or its output: at most
 * a program or variable name the skill's own SKILL.md already says (`needOf`).
 *
 * Returns the line when it was written now, so the hook can answer it (`failure-answer.ts`), else `null`.
 */
export function recordSkillFailure(call: ToolCall, cwd: string): FailureLine | null {
  const classified = classifyCall(call);
  if (classified === null || classified.outcome === 'ok' || call.session === null) return null;
  const command = call.input?.['command'];
  if (typeof command !== 'string') return null;
  const reason = failureReason(failureText(call));
  if (reason === null) return null;

  try {
    const log = process.env['ARP_SESSION_LOG'] ?? join(cwd, '.arp', 'session.jsonl');
    for (const skill of skillsOfSession(log, call.session)) {
      const directory = skillDirectory(skill.name, cwd);
      if (directory === null) continue;
      const markdown = readFileSync(join(directory, 'SKILL.md'), 'utf8');
      if (!askedBySkill(command, markdown, directory)) continue;

      const search = foundBySearch(cwd, call.session, skill.name);
      const words = call.transcript !== null && existsSync(call.transcript) ? lastUserWords(readFileSync(call.transcript, 'utf8')) : '';
      const domain = search?.domain ?? contextOf(words, skill.name);
      const need = needOf(reason, failureText(call), markdown);
      const line: FailureLine = {
        at: new Date().toISOString(),
        session: call.session,
        skill: skill.name,
        source: skill.source ?? search?.source ?? installedSource(skill.name.split(':').pop() ?? skill.name, cwd),
        ...(domain === null ? {} : { domain }),
        reason,
        ...(need === null ? {} : { need }),
      };
      return appendFailure(line) ? line : null;
    }
  } catch {
    // A session must not fail because a record could not be kept.
  }
  return null;
}
