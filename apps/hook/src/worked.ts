/**
 * `Stop`: asks the model, once per skill used in the session, whether the skill did its job (task 100, ADR `0169`).
 *
 * The hook cannot tell a worked use from the calls it sees: no error does not show the job was done (ADR `0140`).
 * The model that did the work can say it, so at the end of a turn this asks one closed question and reads the
 * answer on the next `Stop`, from `last_assistant_message`:
 *
 * ```
 * Stop, stop_hook_active false   a skill used and never asked → {"decision":"block","reason":<the question>}
 * Stop, stop_hook_active true    the answer lines `arp: <skill> worked|failed|unsure` → outcomes.jsonl; never blocks
 * ```
 *
 * **Bounded three ways.** It never blocks while `stop_hook_active` is true, so it adds at most one continuation per
 * turn, far under Claude Code's cap of eight. A skill is asked at most once per session (`asked.jsonl`), answered or
 * not. And at most `MAX_ASKED` skills per question.
 *
 * Nothing leaves this machine. The model's message is read for the closed answer line and dropped; the person's
 * words are matched against the tree's closed words for a domain, as for a failure, and never copied.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Pure modules by path, never the package index: the published hook carries no dependency (ADR `0145`).
import { answersIn, type LocalOutcome, type OutcomeAnswer } from '../../../packages/protocol/src/local-outcomes.ts';
import { publishableNeed } from '../../../packages/protocol/src/declare/line-need.ts';

import { appendOwn } from './append.ts';
import {
  arpHome,
  contextOf,
  foundBySearch,
  installedSource,
  lastUserWords,
  skillDirectory,
  skillsOfSession,
} from './skill-failure.ts';

/** At most this many skills in one question. The rest wait for the next turn's `Stop`. */
export const MAX_ASKED = 5;

export type StopInput = {
  session: string;
  cwd: string;
  /** `stop_hook_active`: Claude Code is already continuing because a Stop hook blocked. */
  active: boolean;
  /** `last_assistant_message`: read for the closed answer line only. */
  last: string;
  transcript: string | null;
};

export type StopDecision = { decision: 'block'; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const field = (raw: Record<string, unknown>, snake: string, camel: string): unknown => raw[snake] ?? raw[camel];
const text = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

/** A `Stop` payload, or `null` for any other event. Grok Build writes the same keys in camelCase (`payload.ts`). */
export function stopInputOf(raw: unknown): StopInput | null {
  if (!isRecord(raw) || field(raw, 'hook_event_name', 'hookEventName') !== 'Stop') return null;
  const session = text(field(raw, 'session_id', 'sessionId'));
  if (session === null) return null;
  return {
    session,
    cwd: text(raw['cwd']) ?? process.cwd(),
    active: field(raw, 'stop_hook_active', 'stopHookActive') === true,
    last: text(field(raw, 'last_assistant_message', 'lastAssistantMessage')) ?? '',
    transcript: text(field(raw, 'transcript_path', 'transcriptPath')),
  };
}

/** The question, closed: three words, one line per skill. */
export function questionFor(skills: readonly string[]): string {
  return (
    'ARP asks once per skill: did each skill you used here do its job, and did the task finish with it? ' +
    'Reply with one line per skill and nothing else: `arp: <skill> worked`, `arp: <skill> failed` or `arp: <skill> unsure`. ' +
    `Kept on this machine unless \`arp share\` is on. Skills: ${skills.join(', ')}`
  );
}

/** ARP's own skill is not asked about: it would rate itself in every session it is used. */
const isArpsOwn = (name: string) => name === 'arp' || name.endsWith(':arp');

type Asked = { at: string; session: string; skill: string; source: string | null };

function rows(path: string): Record<string, unknown>[] {
  if (!existsSync(path)) return [];
  const found: Record<string, unknown>[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    try {
      const row: unknown = JSON.parse(line);
      if (isRecord(row)) found.push(row);
    } catch {
      // The last line of a file still being written is the normal case.
    }
  }
  return found;
}

/**
 * The name an earlier local `needs` record of this skill gave, when the skill's SKILL.md names it still
 * (`publishableNeed`, ADR `0166`): what a worked use was worked `with`. `null` when there is none, or no SKILL.md
 * to check it against, which keeps the name off.
 */
export function withOf(skill: string, source: string | null, cwd: string, before: string): string | null {
  const name = skill.split(':').pop() ?? skill;
  let need: string | null = null;
  let latest = '';
  for (const row of rows(join(arpHome(), 'failures.jsonl'))) {
    const { skill: rowSkill, source: rowSource, need: rowNeed, at } = row;
    if (typeof rowSkill !== 'string' || typeof rowNeed !== 'string' || typeof at !== 'string') continue;
    if (rowSkill !== skill && rowSkill !== name && !rowSkill.endsWith(`:${name}`)) continue;
    if (typeof rowSource === 'string' && source !== null && rowSource !== source) continue;
    if (at > before || at < latest) continue;
    need = rowNeed;
    latest = at;
  }
  if (need === null) return null;
  const directory = skillDirectory(name, cwd);
  if (directory === null) return null;
  return publishableNeed(need, readFileSync(join(directory, 'SKILL.md'), 'utf8'));
}

function record(input: StopInput, asked: Asked, outcome: OutcomeAnswer, at: string): void {
  const search = foundBySearch(input.cwd, input.session, asked.skill);
  const words =
    input.transcript !== null && existsSync(input.transcript) ? lastUserWords(readFileSync(input.transcript, 'utf8')) : '';
  const domain = search?.domain ?? contextOf(words, asked.skill);
  const source =
    asked.source ?? search?.source ?? installedSource(asked.skill.split(':').pop() ?? asked.skill, input.cwd);
  const named = outcome === 'worked' ? withOf(asked.skill, source, input.cwd, at) : null;
  const line: LocalOutcome = {
    at,
    session: input.session,
    skill: asked.skill,
    source,
    ...(domain === null ? {} : { domain }),
    outcome,
    ...(named === null ? {} : { with: named }),
  };
  appendOwn(join(arpHome(), 'outcomes.jsonl'), `${JSON.stringify(line)}\n`);
}

/** `ROUTES.Stop` in `hook.ts`: the decision as stdout, or `null` to let the turn end. Never `RECORD`: a Stop is no call. */
export async function stop(payload: unknown): Promise<string | null> {
  const input = stopInputOf(payload);
  if (input === null) return null;
  const ask = onStop(input);
  return ask === null ? null : JSON.stringify(ask);
}

/**
 * Records the answers in this message, then asks about the skills not yet asked, unless a Stop hook is already
 * continuing the turn. Returns what to print, or `null` to let the turn end.
 */
export function onStop(input: StopInput, now: Date = new Date()): StopDecision | null {
  try {
    const home = arpHome();
    mkdirSync(home, { recursive: true });
    const askedPath = join(home, 'asked.jsonl');
    const asked = rows(askedPath).flatMap((row): Asked[] =>
      row['session'] === input.session && typeof row['skill'] === 'string'
        ? [{
            at: typeof row['at'] === 'string' ? row['at'] : '',
            session: input.session,
            skill: row['skill'],
            source: typeof row['source'] === 'string' ? row['source'] : null,
          }]
        : [],
    );
    const answered = new Set(
      rows(join(home, 'outcomes.jsonl')).flatMap((row) =>
        row['session'] === input.session && typeof row['skill'] === 'string' ? [row['skill']] : [],
      ),
    );

    const pending = asked.filter((row) => !answered.has(row.skill));
    const at = now.toISOString();
    for (const [skill, answer] of answersIn(input.last, pending.map((row) => row.skill))) {
      const row = pending.find((entry) => entry.skill === skill);
      if (row !== undefined) record(input, row, answer, at);
    }

    // The loop guard: never block a turn a Stop hook is already continuing.
    if (input.active) return null;

    const known = new Set(asked.map((row) => row.skill));
    const log = process.env['ARP_SESSION_LOG'] ?? join(input.cwd, '.arp', 'session.jsonl');
    const fresh: Asked[] = [];
    for (const skill of skillsOfSession(log, input.session)) {
      if (known.has(skill.name) || isArpsOwn(skill.name)) continue;
      known.add(skill.name);
      fresh.push({ at, session: input.session, skill: skill.name, source: skill.source });
    }
    const ask = fresh.slice(0, MAX_ASKED);
    if (ask.length === 0) return null;
    // Marked asked before the question goes out: if it cannot be marked, it is not asked, so it is never asked twice.
    mkdirSync(dirname(askedPath), { recursive: true });
    appendOwn(askedPath, ask.map((row) => `${JSON.stringify(row)}\n`).join(''));
    return { decision: 'block', reason: questionFor(ask.map((row) => row.skill)) };
  } catch {
    // A session must not fail, or loop, because a record could not be kept.
    return null;
  }
}
