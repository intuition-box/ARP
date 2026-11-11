import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, test } from 'bun:test';

import { requestFor, requestOutput, stopInputOf } from '../src/worked.ts';

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

const useSkill = (skill: string, source?: string, extra: Record<string, unknown> = {}) =>
  fire({
    hook_event_name: 'PostToolUse',
    tool_name: 'Skill',
    tool_input: { skill, ...(source === undefined ? {} : { source }) },
    tool_response: 'loaded',
    ...extra,
  });
const stop = (last = 'Done.') => fire({ hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: last });

function read(file: string): Record<string, unknown>[] {
  const path = join(dir, 'home', file);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test('a skill that loads is asked about once, during the task, as additionalContext', () => {
  const printed = useSkill('gadget', 'owner/repo');
  expect(JSON.parse(printed)).toEqual({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: requestFor('gadget') },
  });
  expect(printed.trim()).toBe(requestOutput(requestFor('gadget')));
  // Recorded as before, too.
  expect(readFileSync(join(dir, 'session.jsonl'), 'utf8')).toContain('"name":"gadget"');
  // The same skill again in the session: nothing more.
  expect(useSkill('gadget', 'owner/repo')).toBe('');
  expect(read('asked.jsonl')).toHaveLength(1);
});

test('the request names the closed line, and the answer at the end of the reply is recorded on Stop', () => {
  expect(requestFor('gadget')).toContain('`arp: gadget worked`, `arp: gadget failed` or `arp: gadget unsure`');
  useSkill('gadget', 'owner/repo');
  expect(stop('Deck written.\n\narp: gadget worked')).toBe('');
  const [line] = read('outcomes.jsonl');
  expect(line).toMatchObject({ session: 's1', skill: 'gadget', source: 'owner/repo', outcome: 'worked' });
  expect(line?.['with']).toBeUndefined();
  // The version of the files that ran (task 127, ADR 0192): the digest of the skill's directory, as bundleManifest has it.
  const manifest = `${new Bun.CryptoHasher('sha256').update(SKILL).digest('hex')}  SKILL.md\n`;
  expect(line?.['version']).toBe(`0x${new Bun.CryptoHasher('sha256').update(manifest).digest('hex')}`);
});

test('Stop never prints, so it never continues the turn, with or without skills', () => {
  expect(stop()).toBe('');
  useSkill('gadget');
  expect(stop('No answer line here.')).toBe('');
  expect(stop('arp: gadget worked')).toBe('');
  for (let i = 0; i < 5; i += 1) expect(stop()).toBe('');
});

test('a model that forgets the line records nothing', () => {
  useSkill('gadget');
  expect(stop('Deck written.')).toBe('');
  expect(read('outcomes.jsonl')).toEqual([]);
});

test('an answer given on a later turn is still recorded, once', () => {
  useSkill('gadget');
  stop('First turn, no line.');
  stop('arp: gadget failed');
  stop('arp: gadget worked');
  expect(read('outcomes.jsonl').map((row) => row['outcome'])).toEqual(['failed']);
});

test('a skill call that did not succeed, or carries no PostToolUse event, is not asked about', () => {
  expect(useSkill('gadget', undefined, { hook_event_name: undefined })).toBe('');
  expect(useSkill('gadget', undefined, { hook_event_name: 'PostToolUseFailure', error: 'Unknown skill: gadget' })).toBe('');
  expect(read('asked.jsonl')).toEqual([]);
});

test("ARP's own skill is never asked about", () => {
  expect(useSkill('arp')).toBe('');
  expect(useSkill('arp:arp')).toBe('');
});

test('only the asked skills, in the closed form, are recorded: failed and unsure too', () => {
  useSkill('gadget');
  useSkill('other');
  stop('arp: gadget failed\narp: other unsure\narp: stranger worked');
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
  stop('arp: gadget worked');
  expect(read('outcomes.jsonl')[0]?.['with']).toBe('ffmpeg');
});

test('a `needs` name the SKILL.md does not hold never becomes `with`', () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(
    join(dir, 'home', 'failures.jsonl'),
    `${JSON.stringify({ at: '2026-11-01T00:00:00.000Z', session: 's0', skill: 'gadget', source: null, reason: 'missing-program', need: 'mytool' })}\n`,
  );
  useSkill('gadget');
  stop('arp: gadget worked');
  expect(read('outcomes.jsonl')[0]?.['with']).toBeUndefined();
});

test('a failed answer never carries `with`', () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(
    join(dir, 'home', 'failures.jsonl'),
    `${JSON.stringify({ at: '2026-11-01T00:00:00.000Z', session: 's0', skill: 'gadget', source: null, reason: 'missing-program', need: 'ffmpeg' })}\n`,
  );
  useSkill('gadget');
  stop('arp: gadget failed');
  expect(read('outcomes.jsonl')[0]?.['with']).toBeUndefined();
});

test('the model message and the person words are not written down', () => {
  useSkill('gadget');
  stop('secret-project-name here\narp: gadget worked');
  const text = readFileSync(join(dir, 'home', 'outcomes.jsonl'), 'utf8');
  expect(text).not.toContain('secret-project-name');
});

test('the request is 185 characters plus four times the name (the token cost in ADR 0179)', () => {
  expect(requestFor('').length).toBe(185);
  expect(requestFor('cut-silences').length).toBe(185 + 4 * 'cut-silences'.length);
});

test('stopInputOf reads Claude Code and camelCase payloads, and nothing that is not a Stop', () => {
  expect(stopInputOf({ hook_event_name: 'Stop', session_id: 's', cwd: '/x', stop_hook_active: true, last_assistant_message: 'hi' }))
    .toEqual({ session: 's', cwd: '/x', last: 'hi', transcript: null });
  expect(stopInputOf({ hookEventName: 'Stop', sessionId: 's', cwd: '/x' })?.last).toBe('');
  expect(stopInputOf({ hook_event_name: 'PostToolUse', session_id: 's' })).toBeNull();
  expect(stopInputOf({ hook_event_name: 'Stop' })).toBeNull();
  expect(stopInputOf('Stop')).toBeNull();
});
