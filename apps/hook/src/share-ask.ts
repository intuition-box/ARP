/**
 * The one question about sharing, and the sending it allows (task 126, ADR `0191`).
 *
 * The hook cannot ask the person anything: it can only add to what the model reads. So the question rides on the
 * request for the closing `arp:` line, once per machine while sharing is undecided, and the person's answer comes
 * back the same way the outcome does, as one closed line the model writes at the end of the reply after it:
 *
 * ```
 * PostToolUse on Skill   undecided, never put, a public source  → the request carries the question (state: offered)
 * Stop, same turn        the arp line says worked or failed      → the question is out (state: put)
 * Stop, a later turn     `arp-share: once|always|no`, same session → sharing.json, and share-once.jsonl for once
 * SessionEnd             sharing on, or a once for this session  → `arp share send --auto`, detached; prints nothing
 * ```
 *
 * An answer in the same message as the question is not read: the model would be answering for the person. An
 * answer in another session is not read either. A question put and never answered is not put again; sharing stays
 * off, and `/arp:share-on` is still there. `ARP_SHARE_AUTO=off` stops both the question and the sending.
 *
 * The sending never runs in the hook. It is spawned detached with no output, so neither `Stop` nor `SessionEnd`
 * waits for a network; `arp share send` takes a lock so two sessions ending together send once, and records what
 * happened in `share-log.jsonl`, never on screen.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Pure modules by path, never the package index: the published hook carries no dependency (ADR `0145`).
import type { OutcomeAnswer } from '../../../packages/protocol/src/local-outcomes.ts';
import { choiceForAnswer, shareAnswerIn, sharingChoiceOf, sharingFileText } from '../../../packages/protocol/src/sharing-state.ts';

import { appendOwn } from './append.ts';
import { arpHome, installedSource } from './skill-failure.ts';

type QuestionState = { at: string; session: string; skill: string; state: 'offered' | 'put' | 'answered'; answer?: string };

const isOff = () => process.env['ARP_SHARE_AUTO']?.trim().toLowerCase() === 'off';
const GITHUB_REPO = /^[\w.-]+\/[\w.-]+$/;
const readIfThere = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/** What the model is asked to put to the person, after the closing line: three choices, what would leave, and the line to write back. */
export function shareQuestionFor(): string {
  return (
    ' Sharing is not set on this machine yet. If that line says worked or failed, ask the person once, right after it, ' +
    'in their language: share this result as a public line on Intuition testnet? Three choices: yes, this once; ' +
    'always (this result and every one from now on, sent at the end of each session; earlier ones stay here); no (not asked again). Say what would leave: ' +
    "the skill's public address, its category, worked or failed with a closed reason, signed by this machine's own " +
    'ARP address. Never their prompts, files, paths, code or keys. Do not choose for them. At the end of your reply to ' +
    'their answer, add one line: `arp-share: once`, `arp-share: always` or `arp-share: no`, the one they chose; if ' +
    'they did not answer it, add none.'
  );
}

function stateOf(home: string): QuestionState | null {
  const text = readIfThere(join(home, 'share-question.json'));
  if (text === null) return null;
  try {
    const row = JSON.parse(text) as Partial<QuestionState>; // our own file, read field by field below
    if (typeof row.session !== 'string' || typeof row.skill !== 'string') return null;
    if (row.state !== 'offered' && row.state !== 'put' && row.state !== 'answered') return null;
    return { at: typeof row.at === 'string' ? row.at : '', session: row.session, skill: row.skill, state: row.state };
  } catch {
    // A broken file of ours: treated as put, so a question is never put twice because of it.
    return { at: '', session: '', skill: '', state: 'put' };
  }
}

const writeState = (home: string, state: QuestionState) =>
  writeFileSync(join(home, 'share-question.json'), `${JSON.stringify(state)}\n`);

/**
 * Whether the request for this skill carries the question, and if so marks it offered. Only while nothing is on
 * file, only when the question was never put, only for a skill with a public source (a private one would make
 * "once" send nothing), and only one skill per session.
 */
export function offerShare(session: string, skill: string, source: string | null, cwd: string, now: Date = new Date()): boolean {
  if (isOff()) return false;
  try {
    const home = arpHome();
    if (existsSync(join(home, 'sharing.json'))) return false;
    const state = stateOf(home);
    if (state !== null && (state.state !== 'offered' || state.session === session)) return false;
    const name = skill.split(':').pop() ?? skill;
    const known = source ?? installedSource(name, cwd);
    if (known === null || !GITHUB_REPO.test(known)) return false;
    mkdirSync(home, { recursive: true });
    writeState(home, { at: now.toISOString(), session, skill, state: 'offered' });
    return true;
  } catch {
    return false;
  }
}

/** `onStop` in `worked.ts`, once the outcomes in this message are recorded: reads an answer, or marks the question put. */
export function onStopShare(session: string, last: string, recorded: ReadonlyMap<string, OutcomeAnswer>, now: Date = new Date()): void {
  if (isOff()) return;
  try {
    const home = arpHome();
    const state = stateOf(home);
    if (state === null || state.session !== session) return;
    if (state.state === 'put') {
      if (existsSync(join(home, 'sharing.json'))) return; // decided another way meanwhile: that choice stands
      const answer = shareAnswerIn(last);
      if (answer === null) return;
      const choice = choiceForAnswer(answer);
      writeFileSync(join(home, 'sharing.json'), sharingFileText(choice.on, choice.how, now));
      // The result the question was about, kept before the answer: "once" sends it alone, "always" sends it and
      // what is kept from now on, and nothing older (`decide` in `apps/cli/src/share.ts`).
      if (answer !== 'no') {
        appendOwn(join(home, 'share-once.jsonl'), `${JSON.stringify({ at: now.toISOString(), session, skill: state.skill })}\n`);
      }
      writeState(home, { ...state, state: 'answered', answer, at: now.toISOString() });
      return;
    }
    if (state.state !== 'offered') return;
    const outcome = recorded.get(state.skill);
    if (outcome === 'worked' || outcome === 'failed') writeState(home, { ...state, state: 'put', at: now.toISOString() });
  } catch {
    // A session must not fail because a record could not be kept.
  }
}

/**
 * What runs `arp share send --auto`: `ARP_CLI`, a script path; then the CLI beside this hook (`arp.js` in the
 * plugin, `cli.js` under `arp hook`); then `send.json` beside it, which `arp init` writes with the hook.
 */
export function senderOf(here: string = dirname(fileURLToPath(import.meta.url))): { command: string; args: string[] } | null {
  const send = ['share', 'send', '--auto'];
  const given = process.env['ARP_CLI']?.trim();
  if (given !== undefined && given !== '') return { command: process.execPath, args: [given, ...send] };
  for (const name of ['arp.js', 'cli.js']) {
    if (existsSync(join(here, name))) return { command: process.execPath, args: [join(here, name), ...send] };
  }
  const written = readIfThere(join(here, 'send.json'));
  if (written === null) return null;
  try {
    const parsed = JSON.parse(written) as { command?: unknown; args?: unknown }; // written by `arp init`, checked below
    if (typeof parsed.command !== 'string' || !Array.isArray(parsed.args)) return null;
    const args = parsed.args.filter((arg): arg is string => typeof arg === 'string');
    return { command: parsed.command, args };
  } catch {
    return null;
  }
}

function onceFor(home: string, session: string): boolean {
  for (const line of (readIfThere(join(home, 'share-once.jsonl')) ?? '').split('\n')) {
    try {
      if ((JSON.parse(line) as { session?: unknown }).session === session) return true; // our own file
    } catch {
      continue;
    }
  }
  return false;
}

/** `ROUTES.SessionEnd` in `hook.ts`: starts the sending when there is something it may send, and prints nothing. */
export async function sessionEnd(payload: unknown): Promise<null> {
  if (isOff() || typeof payload !== 'object' || payload === null) return null;
  const raw = payload as Record<string, unknown>; // an object, checked above; read field by field
  const session = raw['session_id'] ?? raw['sessionId'];
  if (typeof session !== 'string') return null;
  const cwd = typeof raw['cwd'] === 'string' ? raw['cwd'] : process.cwd();
  try {
    const home = arpHome();
    const choice = sharingChoiceOf(readIfThere(join(home, 'sharing.json')));
    if (choice?.on !== true && !onceFor(home, session)) return null;
    const sender = senderOf();
    if (sender === null) {
      mkdirSync(home, { recursive: true });
      appendOwn(
        join(home, 'share-log.jsonl'),
        `${JSON.stringify({ at: new Date().toISOString(), sent: 0, failed: 0, error: 'no arp program beside the hook; run arp share send' })}\n`,
      );
      return null;
    }
    const child = spawn(sender.command, sender.args, { cwd, detached: true, stdio: 'ignore', env: process.env });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    // Never in the way of a session ending.
  }
  return null;
}
