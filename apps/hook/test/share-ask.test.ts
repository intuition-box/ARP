import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, test } from 'bun:test';

import { requestFor, requestOutput } from '../src/worked.ts';

const HOOK = join(import.meta.dir, '..', 'src', 'hook.ts');

let dir: string;
let sender: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arp-share-ask-'));
  // A stand-in for `arp share send --auto`: writes what it was called with, after a pause the hook must not wait for.
  sender = join(dir, 'fake-arp.cjs');
  writeFileSync(
    sender,
    "const fs = require('node:fs');\nsetTimeout(() => fs.writeFileSync(process.env.SENT_TO, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() })), Number(process.env.SENDER_PAUSE ?? 0));\n",
  );
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function fire(payload: Record<string, unknown>, env: Record<string, string> = {}): { out: string; ms: number } {
  const started = performance.now();
  const run = Bun.spawnSync(['bun', HOOK], {
    stdin: new TextEncoder().encode(JSON.stringify({ session_id: 's1', cwd: dir, ...payload })),
    env: {
      ...process.env,
      HOME: dir,
      ARP_HOME: join(dir, 'home'),
      ARP_SESSION_LOG: join(dir, 'session.jsonl'),
      ARP_SHARE_AUTO: '',
      ARP_CLI: sender,
      SENT_TO: join(dir, 'sent.json'),
      ...env,
    },
  });
  expect(run.exitCode).toBe(0);
  return { out: run.stdout.toString(), ms: performance.now() - started };
}

const useSkill = (skill: string, source: string | undefined, session = 's1', env: Record<string, string> = {}) =>
  fire(
    {
      session_id: session,
      hook_event_name: 'PostToolUse',
      tool_name: 'Skill',
      tool_input: { skill, ...(source === undefined ? {} : { source }) },
      tool_response: 'loaded',
    },
    env,
  ).out;
const stop = (last: string, session = 's1') =>
  fire({ session_id: session, hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: last }).out;
const home = (file: string) => join(dir, 'home', file);
const json = (file: string) => JSON.parse(readFileSync(home(file), 'utf8')) as Record<string, unknown>;
const asked = (skill: string, share = false) => requestOutput(requestFor(skill, share));

async function waitFor(path: string, ms: number): Promise<boolean> {
  for (let waited = 0; waited < ms; waited += 50) {
    if (existsSync(path)) return true;
    await Bun.sleep(50);
  }
  return existsSync(path);
}

test('undecided, the first skill with a public source carries the question once, and nothing else does', () => {
  expect(useSkill('gadget', 'owner/repo').trim()).toBe(asked('gadget', true));
  expect(requestFor('gadget', true)).toContain('`arp-share: once`, `arp-share: always` or `arp-share: no`');
  expect(requestFor('gadget', true)).toContain('Do not choose for them');
  expect(json('share-question.json')).toMatchObject({ session: 's1', skill: 'gadget', state: 'offered' });
  // Another skill in the same session: its own request, without the question.
  expect(useSkill('other', 'owner/other').trim()).toBe(asked('other'));
  expect(existsSync(home('sharing.json'))).toBe(false);
});

test('a skill with no known public source does not carry it: "once" would send nothing', () => {
  expect(useSkill('my-private-skill', undefined).trim()).toBe(asked('my-private-skill'));
  expect(existsSync(home('share-question.json'))).toBe(false);
});

test('an answer in the same message as the question is the model answering: it is not read', () => {
  useSkill('gadget', 'owner/repo');
  expect(stop('Done.\n\narp: gadget worked\n\nShare it?\n\narp-share: always')).toBe('');
  expect(existsSync(home('sharing.json'))).toBe(false);
  expect(json('share-question.json')).toMatchObject({ state: 'put' });
});

test('"always" in the reply after the question turns sharing on, with the date and how', () => {
  useSkill('gadget', 'owner/repo');
  stop('Done.\n\narp: gadget worked\n\nShare this result? yes, this once / always / no');
  expect(stop('Noted, every result from now on.\n\narp-share: always')).toBe('');
  const choice = json('sharing.json');
  expect(choice).toMatchObject({ failures: true, how: 'asked-always' });
  expect(typeof choice['at']).toBe('string');
  expect(json('share-question.json')).toMatchObject({ state: 'answered', answer: 'always' });
  // The result asked about was kept before the answer: it is named, so "always" includes it and nothing older.
  expect(readFileSync(home('share-once.jsonl'), 'utf8')).toContain('"session":"s1","skill":"gadget"');
  // Answered: a later skill, in this session or the next, is not asked again.
  expect(useSkill('third', 'owner/third', 's2').trim()).toBe(asked('third'));
});

test('"once" keeps sharing off and grants this session\'s result, and "no" is never asked again', () => {
  useSkill('gadget', 'owner/repo');
  stop('arp: gadget failed');
  stop('arp-share: once');
  expect(json('sharing.json')).toMatchObject({ failures: false, how: 'asked-once' });
  expect(readFileSync(home('share-once.jsonl'), 'utf8')).toContain('"session":"s1","skill":"gadget"');

  rmSync(join(dir, 'home'), { recursive: true });
  useSkill('gadget', 'owner/repo', 's3');
  stop('arp: gadget worked', 's3');
  stop('arp-share: no', 's3');
  expect(json('sharing.json')).toMatchObject({ failures: false, how: 'asked-no' });
  expect(existsSync(home('share-once.jsonl'))).toBe(false);
  expect(useSkill('later', 'owner/later', 's4').trim()).toBe(asked('later'));
});

test('an unsure result does not count as asked, and the next session may ask; an answer in another session is not read', () => {
  useSkill('gadget', 'owner/repo');
  stop('arp: gadget unsure');
  expect(json('share-question.json')).toMatchObject({ state: 'offered' });
  expect(useSkill('next', 'owner/next', 's2').trim()).toBe(asked('next', true));
  stop('arp: next worked', 's2');
  expect(stop('arp-share: always', 's9')).toBe('');
  expect(existsSync(home('sharing.json'))).toBe(false);
});

test('a choice made another way stands: nothing is asked, and an answer line changes nothing', () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(home('sharing.json'), '{"failures":false}\n');
  expect(useSkill('gadget', 'owner/repo').trim()).toBe(asked('gadget'));
  expect(stop('arp-share: always')).toBe('');
  expect(json('sharing.json')).toEqual({ failures: false });
});

test('ARP_SHARE_AUTO=off: no question, and SessionEnd starts nothing even with sharing on', async () => {
  const off = { ARP_SHARE_AUTO: 'off' };
  expect(useSkill('gadget', 'owner/repo', 's1', off).trim()).toBe(asked('gadget'));
  writeFileSync(home('sharing.json'), '{"failures":true}\n');
  expect(fire({ hook_event_name: 'SessionEnd', reason: 'other' }, off).out).toBe('');
  await Bun.sleep(500);
  expect(existsSync(join(dir, 'sent.json'))).toBe(false);
});

test('SessionEnd with sharing on starts `share send --auto` detached, in the project, and does not wait for it', async () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(home('sharing.json'), '{"failures":true,"at":"2026-11-11T00:00:00.000Z","how":"asked-always"}\n');
  const ended = fire({ hook_event_name: 'SessionEnd', reason: 'prompt_input_exit' }, { SENDER_PAUSE: '3000' });
  expect(ended.out).toBe('');
  expect(ended.ms).toBeLessThan(3000);
  expect(existsSync(join(dir, 'sent.json'))).toBe(false); // the hook was gone before the sender wrote
  expect(await waitFor(join(dir, 'sent.json'), 8000)).toBe(true);
  const sent = JSON.parse(readFileSync(join(dir, 'sent.json'), 'utf8')) as { argv: string[]; cwd: string };
  expect(sent.argv).toEqual(['share', 'send', '--auto']);
  expect(sent.cwd).toBe(dir);
});

test('SessionEnd starts nothing while undecided, and starts it only for the session that agreed once', async () => {
  expect(fire({ hook_event_name: 'SessionEnd' }).out).toBe('');
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(home('sharing.json'), '{"failures":false,"how":"asked-once"}\n');
  writeFileSync(home('share-once.jsonl'), '{"at":"2026-11-11T00:00:00.000Z","session":"s1","skill":"gadget"}\n');
  fire({ session_id: 'other', hook_event_name: 'SessionEnd' });
  await Bun.sleep(500);
  expect(existsSync(join(dir, 'sent.json'))).toBe(false);
  fire({ hook_event_name: 'SessionEnd' });
  expect(await waitFor(join(dir, 'sent.json'), 5000)).toBe(true);
});

test('with no program to send with, SessionEnd records it locally and says nothing', () => {
  mkdirSync(join(dir, 'home'), { recursive: true });
  writeFileSync(home('sharing.json'), '{"failures":true}\n');
  expect(fire({ hook_event_name: 'SessionEnd' }, { ARP_CLI: '' }).out).toBe('');
  expect(readFileSync(home('share-log.jsonl'), 'utf8')).toContain('no arp program beside the hook');
});
