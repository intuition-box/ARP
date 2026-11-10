import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, test } from 'bun:test';

import { MAX_ASKED, questionFor, stopInputOf } from '../src/worked.ts';

const HOOK = join(import.meta.dir, '..', 'src', 'hook.ts');
const SKILL = '---\nname: gadget\n---\nNeeds ffmpeg and OPENAI_API_KEY.\n\n```bash\nffmpeg -i a.mp4 b.mp4\n```\n';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arp-worked-'));
  mkdirSync(join(dir, '.claude', 'skills', 'gadget'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'skills', 'gadget', 'SKILL.md'), SKILL);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Runs the real hook on one payload and returns what it printed. */
function fire(payload: Record<string, unknown>): string {
  const run = Bun.spawnSync(['bun', HOOK], {
    stdin: new TextEncoder().encode(JSON.stringify({ session_id: 's1', cwd: dir, ...payload })),
    env: { ...process.env, HOME: dir, ARP_HOME: join(dir, 'home'), ARP_SESSION_LOG: join(dir, 'session.jsonl') },
  });
  expect(run.exitCode).toBe(0);
  return run.stdout.toString();
}

const useSkill = (skill: string, source?: string) =>
  fire({ tool_name: 'Skill', tool_input: { skill, ...(source === undefined ? {} : { source }) }, tool_response: 'loaded' });
const stop = (active: boolean, last = 'Done.') =>
  fire({ hook_event_name: 'Stop', stop_hook_active: active, last_assistant_message: last });

function read(file: string): Record<string, unknown>[] {
  const path = join(dir, 'home', file);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test('a Stop with no skill used lets the turn end and writes nothing', () => {
  expect(stop(false)).toBe('');
  expect(read('asked.jsonl')).toEqual([]);
});

test('a skill used is asked about once, with the closed question, and the answer is recorded', () => {
  useSkill('gadget', 'owner/repo');
  const printed = stop(false);
  expect(JSON.parse(printed)).toEqual({ decision: 'block', reason: questionFor(['gadget']) });

  // The model answers; the continuation's Stop carries stop_hook_active.
  expect(stop(true, 'Deck written.\n\narp: gadget worked')).toBe('');
  const [line] = read('outcomes.jsonl');
  expect(line).toMatchObject({ session: 's1', skill: 'gadget', source: 'owner/repo', outcome: 'worked' });
  expect(line?.['with']).toBeUndefined();

  // The next turn's Stop does not ask again.
  expect(stop(false)).toBe('');
  expect(read('asked.jsonl')).toHaveLength(1);
});

test('the loop guard: no block while a Stop hook is already continuing the turn', () => {
  useSkill('gadget');
  expect(stop(true)).toBe('');
  expect(read('asked.jsonl')).toEqual([]);
});

test('a skill is asked once per session even when the model never answers', () => {
  useSkill('gadget');
  expect(stop(false)).not.toBe('');
  expect(stop(true, 'I would rather not say.')).toBe('');
  expect(stop(false)).toBe('');
  expect(stop(false)).toBe('');
  expect(read('outcomes.jsonl')).toEqual([]);
});

test('ten Stops in a row block at most once per skill, far under the cap of eight', () => {
  useSkill('gadget');
  let blocks = 0;
  for (let i = 0; i < 10; i += 1) if (stop(i % 2 === 1) !== '') blocks += 1;
  expect(blocks).toBe(1);
});

test('at most MAX_ASKED skills per question; the rest are asked on a later turn', () => {
  const names = Array.from({ length: MAX_ASKED + 2 }, (_, i) => `skill${i}`);
  for (const name of names) useSkill(name);
  const first = JSON.parse(stop(false)) as { reason: string };
  expect(first.reason.split('Skills: ')[1]?.split(', ')).toHaveLength(MAX_ASKED);
  expect(stop(true)).toBe('');
  const second = JSON.parse(stop(false)) as { reason: string };
  expect(second.reason.split('Skills: ')[1]?.split(', ')).toHaveLength(2);
  expect(stop(false)).toBe('');
});

test("ARP's own skill is never asked about", () => {
  useSkill('arp');
  useSkill('arp:arp');
  expect(stop(false)).toBe('');
});

test('only the asked skills, in the closed form, are recorded: failed and unsure too', () => {
  useSkill('gadget');
  useSkill('other');
  stop(false);
  stop(true, 'arp: gadget failed\narp: other unsure\narp: stranger worked');
  expect(read('outcomes.jsonl').map((row) => [row['skill'], row['outcome']])).toEqual([
    ['gadget', 'failed'],
    ['other', 'unsure'],
  ]);
});

test('a worked answer after a local `needs` record carries `with`, only when the SKILL.md names it', () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  const earlier = (need: string) =>
    JSON.stringify({ at: '2026-11-01T00:00:00.000Z', session: 's0', skill: 'gadget', source: null, reason: 'missing-program', need });
  writeFileSync(join(dir, 'home', 'failures.jsonl'), `${earlier('ffmpeg')}\n`);
  useSkill('gadget');
  stop(false);
  stop(true, 'arp: gadget worked');
  expect(read('outcomes.jsonl')[0]?.['with']).toBe('ffmpeg');
});

test('a `needs` name the SKILL.md does not hold never becomes `with`', () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(
    join(dir, 'home', 'failures.jsonl'),
    `${JSON.stringify({ at: '2026-11-01T00:00:00.000Z', session: 's0', skill: 'gadget', source: null, reason: 'missing-program', need: 'mytool' })}\n`,
  );
  useSkill('gadget');
  stop(false);
  stop(true, 'arp: gadget worked');
  expect(read('outcomes.jsonl')[0]?.['with']).toBeUndefined();
});

test('a failed answer never carries `with`', () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(
    join(dir, 'home', 'failures.jsonl'),
    `${JSON.stringify({ at: '2026-11-01T00:00:00.000Z', session: 's0', skill: 'gadget', source: null, reason: 'missing-program', need: 'ffmpeg' })}\n`,
  );
  useSkill('gadget');
  stop(false);
  stop(true, 'arp: gadget failed');
  expect(read('outcomes.jsonl')[0]?.['with']).toBeUndefined();
});

test('the model message and the person words are not written down', () => {
  useSkill('gadget');
  stop(false);
  stop(true, 'secret-project-name here\narp: gadget worked');
  const text = readFileSync(join(dir, 'home', 'outcomes.jsonl'), 'utf8');
  expect(text).not.toContain('secret-project-name');
});

test('the question is 273 characters, plus each name and its separator (the token cost in ADR 0169)', () => {
  expect(questionFor([]).length).toBe(273);
  expect(questionFor(['cut-silences']).length).toBe(273 + 'cut-silences'.length);
  expect(questionFor(['ab', 'cd']).length).toBe(273 + 2 + 2 + ', '.length);
});

test('stopInputOf reads Claude Code and camelCase payloads, and nothing that is not a Stop', () => {
  expect(stopInputOf({ hook_event_name: 'Stop', session_id: 's', cwd: '/x', stop_hook_active: true, last_assistant_message: 'hi' }))
    .toEqual({ session: 's', cwd: '/x', active: true, last: 'hi', transcript: null });
  expect(stopInputOf({ hookEventName: 'Stop', sessionId: 's', cwd: '/x' })?.active).toBe(false);
  expect(stopInputOf({ hook_event_name: 'PostToolUse', session_id: 's' })).toBeNull();
  expect(stopInputOf({ hook_event_name: 'Stop' })).toBeNull();
  expect(stopInputOf('Stop')).toBeNull();
});
