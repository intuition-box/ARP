/**
 * Whether a skill did its job, in the model's word (task 100, ADR `0169`; asked during the task since task 109, ADR `0179`).
 *
 * The hook cannot tell a worked use from the calls it sees: no error does not show the job was done (ADR `0140`).
 * The model that did the work can say it. So when a skill is loaded, the hook asks, once per skill per session, for
 * one closed line at the end of the final reply, and on `Stop` it reads that line from `last_assistant_message`:
 *
 * ```
 * PostToolUse on Skill   a skill not yet asked this session → additionalContext: add `arp: <skill> worked|failed|unsure`
 * Stop                   the answer lines for the skills asked → outcomes.jsonl; prints nothing, never continues the turn
 * ```
 *
 * Until task 109 the question went out on `Stop` with `decision: "block"`, which starts one more model turn; under
 * `claude -p` that turn's answer became the session's result (task 108). Asked during the task, the line rides in the
 * reply the model writes anyway. If the model leaves it out, nothing is recorded.
 *
 * Nothing leaves this machine. The model's message is read for the closed answer line and dropped; the person's
 * words are matched against the tree's closed words for a domain, as for a failure, and never copied.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Pure modules by path, never the package index: the published hook carries no dependency (ADR `0145`).
import { answersIn, type LocalOutcome, type OutcomeAnswer } from '../../../packages/protocol/src/local-outcomes.ts';
import { publishableNeed } from '../../../packages/protocol/src/declare/line-need.ts';
import { skillDirectoryDigest } from '../../../packages/protocol/src/node/skill-directory.ts';

import { appendOwn } from './append.ts';
import { offerShare, onStopShare, shareQuestionFor } from './share-ask.ts';
import { arpHome, contextOf, foundBySearch, installedSource, lastUserWords, skillDirectory } from './skill-failure.ts';

export type StopInput = {
  session: string;
  cwd: string;
  /** `last_assistant_message`: read for the closed answer line only. */
  last: string;
  transcript: string | null;
};

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
    last: text(field(raw, 'last_assistant_message', 'lastAssistantMessage')) ?? '',
    transcript: text(field(raw, 'transcript_path', 'transcriptPath')),
  };
}

/**
 * The request, closed: one line, three words to choose from, at the end of a reply the model writes anyway. With
 * `share`, the one question about sharing follows it (`share-ask.ts`, task 126).
 */
export function requestFor(skill: string, share = false): string {
  return (
    `ARP: at the end of your final reply, add one line saying whether the skill ${skill} did its job: ` +
    `\`arp: ${skill} worked\`, \`arp: ${skill} failed\` or \`arp: ${skill} unsure\`. ` +
    'Kept on this machine unless `arp share` is on.' +
    (share ? shareQuestionFor() : '')
  );
}

/** The runtime's answer to a skill's call: Claude Code's `hookSpecificOutput` for `PostToolUse`. */
export function requestOutput(context: string): string {
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } });
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
  // The version a shared line names (task 127, ADR `0192`): the digest of the files that ran, when they are here.
  const directory = skillDirectory(asked.skill.split(':').pop() ?? asked.skill, input.cwd);
  const version = directory === null ? null : skillDirectoryDigest(directory);
  const line: LocalOutcome = {
    at,
    session: input.session,
    skill: asked.skill,
    source,
    ...(domain === null ? {} : { domain }),
    outcome,
    ...(named === null ? {} : { with: named }),
    ...(version === null ? {} : { version }),
  };
  appendOwn(join(arpHome(), 'outcomes.jsonl'), `${JSON.stringify(line)}\n`);
}

/**
 * Called by the recording in `hook.ts` once a skill's call succeeded on `PostToolUse`: the request for that skill,
 * or `null` when it was already asked this session, is ARP's own, or cannot be marked asked. It is marked before it
 * goes out, so a skill is asked once per session even when the model never answers.
 */
export function askOnSkill(
  session: string,
  skill: string,
  source: string | null,
  cwd: string = process.cwd(),
  now: Date = new Date(),
): string | null {
  if (isArpsOwn(skill)) return null;
  try {
    const home = arpHome();
    mkdirSync(home, { recursive: true });
    const askedPath = join(home, 'asked.jsonl');
    if (rows(askedPath).some((row) => row['session'] === session && row['skill'] === skill)) return null;
    const row: Asked = { at: now.toISOString(), session, skill, source };
    appendOwn(askedPath, `${JSON.stringify(row)}\n`);
    return requestFor(skill, offerShare(session, skill, source, cwd, now));
  } catch {
    // Not marked, not asked: a request that could not be remembered would go out on every call.
    return null;
  }
}

/** `ROUTES.Stop` in `hook.ts`: records the answers and prints nothing, so the turn always ends. Never `RECORD`. */
export async function stop(payload: unknown): Promise<null> {
  const input = stopInputOf(payload);
  if (input !== null) onStop(input);
  return null;
}

/** Records the answers in the last message, for the skills asked this session and not answered yet. */
export function onStop(input: StopInput, now: Date = new Date()): void {
  try {
    const home = arpHome();
    const asked = rows(join(home, 'asked.jsonl')).flatMap((row): Asked[] =>
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
    const answers = answersIn(input.last, pending.map((row) => row.skill));
    for (const [skill, answer] of answers) {
      const row = pending.find((entry) => entry.skill === skill);
      if (row !== undefined) record(input, row, answer, at);
    }
    // After the outcomes, so an answer to the sharing question is read only in a later message than the question.
    onStopShare(input.session, input.last, answers, now);
  } catch {
    // A session must not fail because a record could not be kept.
  }
}
