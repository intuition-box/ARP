/**
 * `arp share`: whether this machine's failure memory, and the model's `worked` answers (task 100), may become
 * public lines (`docs/tasks/70` item 2).
 *
 * Off until the person turns it on: `arp share on`, `arp init`'s question, or the answer `always` to the one
 * question the agent puts after the first skill result (task 126, ADR `0191`). The answer `once` sends that
 * session's result and nothing after it (`share-once.jsonl`). The decision and the content are in
 * `@arp-protocol/core` (`share-failures.ts`, `sharing-state.ts`). Writing is injected, so nothing here reaches a
 * network by itself, and with nothing agreed the writer is never called.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  decideShare,
  installedFromReceipts,
  installedFromSkillLock,
  isSharingOn,
  parseLocalFailures,
  parseLocalOutcomes,
  type ShareDecision,
  type SharedLine,
  sharedLineKey,
  type SharingChoice,
  sharingChoiceOf,
  sharingFileText,
  type SharingHow,
} from '@arp-protocol/core';

export type ShareEnv = { arpHome: string; home: string; cwd: string };

const read = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

function shared(env: ShareEnv): Set<string> {
  const keys = new Set<string>();
  for (const row of (read(join(env.arpHome, 'shared-failures.jsonl')) ?? '').split('\n')) {
    if (row.trim() === '') continue;
    try {
      keys.add(sharedLineKey(JSON.parse(row) as SharedLine)); // our own file, written below
    } catch {
      continue; // a half-written last line: at worst one line is offered again, and it is idempotent on chain
    }
  }
  return keys;
}

/**
 * The sessions and skills whose result the person said yes to, in answer to the hook's question
 * (`share-ask.ts` writes one row for "yes, this once" and one for "always").
 */
function onceGrants(env: ShareEnv): { session: string; skill: string }[] {
  const grants: { session: string; skill: string }[] = [];
  for (const row of (read(join(env.arpHome, 'share-once.jsonl')) ?? '').split('\n')) {
    try {
      const { session, skill } = JSON.parse(row) as { session?: unknown; skill?: unknown }; // our own file
      if (typeof session === 'string' && typeof skill === 'string') grants.push({ session, skill });
    } catch {
      continue;
    }
  }
  return grants;
}

const nameOf = (skill: string) => skill.split(':').pop() ?? skill;

/**
 * The rows of a local file the person said yes to: those of a granted session and skill, and with `since`, those
 * kept on or after it. A row that does not parse is dropped.
 */
function granted(text: string, grants: readonly { session: string; skill: string }[], since: string | null = null): string {
  return text
    .split('\n')
    .filter((row) => {
      try {
        const { session, skill, at } = JSON.parse(row) as { session?: unknown; skill?: unknown; at?: unknown }; // read field by field
        if (since !== null && typeof at === 'string' && at >= since) return true;
        return grants.some((grant) => grant.session === session && typeof skill === 'string' && nameOf(skill) === nameOf(grant.skill));
      } catch {
        return false;
      }
    })
    .join('\n');
}

const rowCount = (text: string) => text.split('\n').filter((row) => row.trim() !== '').length;

/**
 * `earlier`: under "always", how many local rows were kept before the choice and stay here. The person was asked
 * about this result and every later one, never shown the history, so the history waits for `arp share on`,
 * which prints it first (ADR `0191`).
 */
export type Decided = ShareDecision & { on: boolean; choice: SharingChoice | null; once: boolean; earlier: number };

export function decide(env: ShareEnv): Decided {
  const choice = sharingChoiceOf(read(join(env.arpHome, 'sharing.json')));
  const on = isSharingOn(read(join(env.arpHome, 'sharing.json')));
  // "Always" answers a question about this result and the ones after it: what was kept before stays here.
  const since = on && choice?.how === 'asked-always' && choice.at !== null ? choice.at : null;
  const grants = on && since === null ? [] : onceGrants(env);
  const failuresAll = read(join(env.arpHome, 'failures.jsonl')) ?? '';
  const outcomesAll = read(join(env.arpHome, 'outcomes.jsonl')) ?? '';
  const failuresText = since === null ? failuresAll : granted(failuresAll, grants, since);
  const outcomesText = since === null ? outcomesAll : granted(outcomesAll, grants, since);
  const earlier = rowCount(failuresAll) + rowCount(outcomesAll) - rowCount(failuresText) - rowCount(outcomesText);
  const installed = [
      ...installedFromSkillLock(read(join(env.home, '.agents', '.skill-lock.json'))),
      // A project install's lock, as the hook reads it (task 108). A failure keeps no cwd, so this is
      // the project `arp share` runs in; two locks naming two sources keep the line here (task 110).
      ...installedFromSkillLock(read(join(env.cwd, 'skills-lock.json'))),
      ...installedFromReceipts(read(join(env.arpHome, 'receipts.jsonl'))),
      ...installedFromReceipts(read(join(env.cwd, '.arp', 'receipts.jsonl'))),
  ];
  const alreadyShared = shared(env);
  const all = decideShare({
    on,
    failures: parseLocalFailures(failuresText),
    // The model's own answers at the end of a turn (task 100, ADR `0169`): only `worked` becomes a line.
    outcomes: parseLocalOutcomes(outcomesText),
    installed,
    alreadyShared,
  });
  if (on || grants.length === 0) return { ...all, on, choice, once: false, earlier };
  // Off, with a yes for one result: that result alone, decided as if on; everything else stays here.
  const once = decideShare({
    on: true,
    failures: parseLocalFailures(granted(failuresText, grants)),
    outcomes: parseLocalOutcomes(granted(outcomesText, grants)),
    installed,
    alreadyShared,
  });
  const onceSkills = new Set(grants.map((grant) => nameOf(grant.skill)));
  const stillOff = all.keptLocal.filter((row) => !onceSkills.has(row.skill));
  return { lines: once.lines, keptLocal: [...once.keptLocal, ...stillOff], on, choice, once: once.lines.length > 0, earlier: 0 };
}

export function setSharing(env: ShareEnv, on: boolean, how: SharingHow = 'command', now: Date = new Date()): void {
  mkdirSync(env.arpHome, { recursive: true });
  writeFileSync(join(env.arpHome, 'sharing.json'), sharingFileText(on, how, now));
}

/** A send already running, from another session ending at the same time, holds this file. */
const LOCK = 'share-send.lock';
/**
 * Older than this, a lock is a send that died, and is taken over. Known race, accepted: two sends that both find
 * the same stale lock can both take it (one removes the other's fresh lock), and then both send. It needs a send
 * that died first, and then a line can be sent twice (ADR `0191` §5).
 */
const STALE_MS = 10 * 60 * 1000;

/**
 * Runs `send` holding the lock, or returns `null` when another send holds it. `wx` creates the file or fails, so
 * two processes cannot both take it.
 */
export async function withSendLock<T>(env: ShareEnv, send: () => Promise<T>, now: () => number = Date.now): Promise<T | null> {
  mkdirSync(env.arpHome, { recursive: true });
  const path = join(env.arpHome, LOCK);
  const take = () => {
    try {
      writeFileSync(path, `${JSON.stringify({ pid: process.pid, at: new Date(now()).toISOString() })}\n`, { flag: 'wx' });
      return true;
    } catch {
      return false;
    }
  };
  if (!take()) {
    let at = 0;
    try {
      at = Date.parse((JSON.parse(readFileSync(path, 'utf8')) as { at?: string }).at ?? ''); // our own file
    } catch {
      at = 0;
    }
    if (Number.isFinite(at) && now() - at < STALE_MS) return null;
    rmSync(path, { force: true });
    if (!take()) return null;
  }
  try {
    return await send();
  } finally {
    rmSync(path, { force: true });
  }
}

/** What a send did, kept here: the background send at the end of a session shows nothing on screen. */
export function logSend(env: ShareEnv, result: { sent: number; failed: number; firstError: string | null }, now: Date = new Date()): void {
  mkdirSync(env.arpHome, { recursive: true });
  const row = { at: now.toISOString(), sent: result.sent, failed: result.failed, ...(result.firstError === null ? {} : { error: result.firstError }) };
  appendFileSync(join(env.arpHome, 'share-log.jsonl'), `${JSON.stringify(row)}\n`);
}

/** Sends what the decision allows. A line is recorded only once written, so a failed one is tried again. */
export async function sendShared(
  env: ShareEnv,
  write: (line: SharedLine) => Promise<void>,
): Promise<{ sent: number; failed: number; firstError: string | null }> {
  const { on, once, lines } = decide(env);
  if (!on && !once) return { sent: 0, failed: 0, firstError: null };
  let sent = 0;
  let failed = 0;
  let firstError: string | null = null;
  for (const line of lines) {
    try {
      await write(line);
      appendFileSync(join(env.arpHome, 'shared-failures.jsonl'), `${JSON.stringify(line)}\n`);
      sent += 1;
    } catch (error) {
      failed += 1;
      firstError ??= error instanceof Error ? error.message : String(error);
    }
  }
  return { sent, failed, firstError };
}

const WHY = {
  sharing_off: 'sharing is off',
  no_public_source: 'no known public source',
  several_sources: 'several sources with this name',
} as const;

const HOW: Record<SharingHow, string> = {
  init: 'at install',
  command: 'by command',
  desktop: "in Claude Desktop's settings",
  'asked-once': 'answering "yes, this once"',
  'asked-always': 'answering "always"',
  'asked-no': 'answering "no"',
};

/** `on, chosen 2026-11-11 answering "always"`, or `off, not decided yet`. */
function status(decision: Decided): string {
  const state = decision.on ? 'on' : 'off';
  if (decision.choice === null) return `sharing is ${state}, not decided yet`;
  const when = decision.choice.at === null ? '' : ` ${decision.choice.at.slice(0, 10)}`;
  const how = decision.choice.how === null ? '' : ` ${HOW[decision.choice.how]}`;
  return when === '' && how === '' ? `sharing is ${state}` : `sharing is ${state}, chosen${when}${how}`;
}

/** What a person reads before and after turning it on: exactly what would be public. */
export function describe(decision: Decided): string {
  const out = [status(decision)];
  if (decision.lines.length > 0) {
    out.push('', decision.on ? 'would be public on testnet 13579:' : 'would be public on testnet 13579, agreed once:');
    for (const line of decision.lines) {
      const tail =
        line.outcome === 'failed'
          ? `failed  ${line.reason}${line.need === undefined ? '' : `  needs ${line.need}`}`
          : `worked${line.need === undefined ? '' : `  with ${line.need}`}`;
      out.push(`  ${line.toolUrl}  ${line.domain ?? '(no domain)'}  ${tail}`);
    }
  }
  if (decision.keptLocal.length > 0) {
    out.push('', 'stays on this machine:');
    for (const row of decision.keptLocal) out.push(`  ${row.skill}: ${WHY[row.why]}`);
  }
  if (decision.earlier > 0) {
    out.push('', `kept before "always" was chosen, and staying here: ${decision.earlier} record(s). \`arp share on\` would show and include them`);
  }
  return `${out.join('\n')}\n`;
}
