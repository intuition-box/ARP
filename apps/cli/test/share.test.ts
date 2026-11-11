import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, test } from 'bun:test';

import { decide, describe as describeShare, logSend, sendShared, setSharing, type ShareEnv, withSendLock } from '../src/share.ts';

let dir: string;
let env: ShareEnv;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arp-share-'));
  env = { arpHome: join(dir, 'arp'), home: dir, cwd: dir };
  mkdirSync(env.arpHome);
  mkdirSync(join(dir, '.agents'));
  writeFileSync(
    join(dir, '.agents', '.skill-lock.json'),
    JSON.stringify({ skills: { clip: { source: 'a/b', sourceType: 'github' } } }),
  );
  writeFileSync(
    join(env.arpHome, 'failures.jsonl'),
    [
      { at: '2026-11-05T10:00:00Z', session: 'SESSION-ID', skill: 'clip', source: null, reason: 'missing-key' },
      { at: '2026-11-05T10:00:00Z', session: 'SESSION-ID', skill: 'my-private-skill', source: null, reason: 'missing-file' },
    ]
      .map((row) => JSON.stringify(row))
      .join('\n'),
  );
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test('by default nothing leaves: the writer is never called and nothing is recorded', async () => {
  let calls = 0;
  const result = await sendShared(env, async () => {
    calls += 1;
  });
  expect(result).toEqual({ sent: 0, failed: 0, firstError: null });
  expect(calls).toBe(0);
  expect(existsSync(join(env.arpHome, 'shared-failures.jsonl'))).toBe(false);
  expect(existsSync(join(env.arpHome, 'sharing.json'))).toBe(false);
  expect(decide(env).lines).toEqual([]);
});

test('turned on, only the public skill goes, in closed words', async () => {
  setSharing(env, true);
  const written: unknown[] = [];
  const result = await sendShared(env, async (line) => {
    written.push(line);
  });
  expect(result).toEqual({ sent: 1, failed: 0, firstError: null });
  expect(written).toEqual([{ toolUrl: 'https://github.com/a/b?skill=clip', outcome: 'failed', reason: 'missing-key' }]);
  expect(JSON.stringify(written)).not.toContain('SESSION-ID');
  expect(JSON.stringify(written)).not.toContain('my-private-skill');
});

test('a line goes once, and one that failed to write is tried again', async () => {
  setSharing(env, true);
  expect(await sendShared(env, () => Promise.reject(new Error('down')))).toEqual({ sent: 0, failed: 1, firstError: 'down' });
  expect(await sendShared(env, async () => {})).toEqual({ sent: 1, failed: 0, firstError: null });
  expect(await sendShared(env, async () => {})).toEqual({ sent: 0, failed: 0, firstError: null });
});

test('a skill fetched through ARP is recognised from its receipt', () => {
  setSharing(env, true);
  writeFileSync(join(env.arpHome, 'receipts.jsonl'), JSON.stringify({ receipt: { url: 'https://github.com/o/r?skill=my-private-skill' } }));
  expect(decide(env).lines.map((line) => line.toolUrl)).toContain('https://github.com/o/r?skill=my-private-skill');
});

test('turned off again, nothing leaves', async () => {
  setSharing(env, true);
  setSharing(env, false);
  expect(await sendShared(env, () => Promise.reject(new Error('must not be called')))).toEqual({ sent: 0, failed: 0, firstError: null });
  expect(readFileSync(join(env.arpHome, 'sharing.json'), 'utf8')).toContain('false');
});

test('the summary says what would be public and what stays', () => {
  const off = describeShare(decide(env));
  expect(off).toContain('sharing is off');
  expect(off).not.toContain('would be public');
  setSharing(env, true);
  const on = describeShare(decide(env));
  expect(on).toContain('https://github.com/a/b?skill=clip  (no domain)  failed  missing-key');
  expect(on).toContain('my-private-skill: no known public source');
});

test('a name the hook kept is sent with the line and shown before it goes (ADR 0166)', async () => {
  writeFileSync(
    join(env.arpHome, 'failures.jsonl'),
    `${JSON.stringify({ at: '2026-11-05T10:00:00Z', session: 'S', skill: 'clip', source: 'a/b', reason: 'missing-program', need: 'ffmpeg' })}\n`,
  );
  setSharing(env, true);
  expect(describeShare(decide(env))).toContain('failed  missing-program  needs ffmpeg');
  const written: unknown[] = [];
  await sendShared(env, async (line) => {
    written.push(line);
  });
  expect(written).toEqual([{ toolUrl: 'https://github.com/a/b?skill=clip', outcome: 'failed', reason: 'missing-program', need: 'ffmpeg' }]);
});

test("the model's worked answer goes as a worked line, with what it worked with; failed and unsure stay (task 100)", async () => {
  writeFileSync(
    join(env.arpHome, 'outcomes.jsonl'),
    [
      { at: '2026-11-10T10:00:00Z', session: 'SESSION-ID', skill: 'clip', source: null, domain: 'video', outcome: 'worked', with: 'ffmpeg' },
      { at: '2026-11-10T10:00:00Z', session: 'SESSION-ID', skill: 'clip', source: null, outcome: 'unsure' },
      { at: '2026-11-10T10:00:00Z', session: 'SESSION-ID', skill: 'clip', source: null, outcome: 'failed' },
    ]
      .map((row) => JSON.stringify(row))
      .join('\n'),
  );
  expect(await sendShared(env, () => Promise.reject(new Error('must not be called')))).toEqual({ sent: 0, failed: 0, firstError: null });
  setSharing(env, true);
  expect(describeShare(decide(env))).toContain('https://github.com/a/b?skill=clip  video  worked  with ffmpeg');
  const written: unknown[] = [];
  await sendShared(env, async (line) => {
    written.push(line);
  });
  expect(written).toContainEqual({ toolUrl: 'https://github.com/a/b?skill=clip', outcome: 'worked', domain: 'video', need: 'ffmpeg' });
  // The failure from beforeEach, and the one worked line.
  expect(written).toHaveLength(2);
  expect(JSON.stringify(written)).not.toContain('SESSION-ID');
  expect(await sendShared(env, async () => {})).toEqual({ sent: 0, failed: 0, firstError: null });
});

test("a project install's skills-lock.json fills a missing source, as the hook reads it (task 110)", () => {
  setSharing(env, true);
  writeFileSync(
    join(env.cwd, 'skills-lock.json'),
    JSON.stringify({ version: 1, skills: { 'my-private-skill': { source: 'o/project', sourceType: 'github' } } }),
  );
  expect(decide(env).lines.map((line) => line.toolUrl)).toContain('https://github.com/o/project?skill=my-private-skill');
});

test('a project lock and the global lock naming two sources keep the line here (task 110)', () => {
  setSharing(env, true);
  writeFileSync(join(env.cwd, 'skills-lock.json'), JSON.stringify({ skills: { clip: { source: 'c/d', sourceType: 'github' } } }));
  const decision = decide(env);
  expect(decision.lines.map((line) => line.toolUrl)).not.toContain('https://github.com/a/b?skill=clip');
  expect(decision.keptLocal).toContainEqual({ skill: 'clip', why: 'several_sources' });
});

test('the file keeps the date and how it was chosen, and `arp share` says both (task 126)', () => {
  setSharing(env, true, 'asked-always', new Date('2026-11-11T09:00:00.000Z'));
  expect(JSON.parse(readFileSync(join(env.arpHome, 'sharing.json'), 'utf8'))).toEqual({
    failures: true,
    at: '2026-11-11T09:00:00.000Z',
    how: 'asked-always',
  });
  expect(describeShare(decide(env)).split('\n')[0]).toBe('sharing is on, chosen 2026-11-11 answering "always"');
  rmSync(join(env.arpHome, 'sharing.json'));
  expect(describeShare(decide(env)).split('\n')[0]).toBe('sharing is off, not decided yet');
  writeFileSync(join(env.arpHome, 'sharing.json'), '{"failures":true}\n');
  expect(describeShare(decide(env)).split('\n')[0]).toBe('sharing is on');
});

test('"yes, this once" sends that session\'s result and nothing else, and shows it first (task 126)', async () => {
  writeFileSync(
    join(env.arpHome, 'outcomes.jsonl'),
    [
      { at: '2026-11-11T10:00:00Z', session: 'ONCE', skill: 'clip', source: 'a/b', outcome: 'worked' },
      { at: '2026-11-11T10:00:00Z', session: 'OTHER', skill: 'gadget', source: 'c/d', outcome: 'worked' },
    ]
      .map((row) => JSON.stringify(row))
      .join('\n'),
  );
  setSharing(env, false, 'asked-once', new Date('2026-11-11T10:00:00.000Z'));
  writeFileSync(join(env.arpHome, 'share-once.jsonl'), `${JSON.stringify({ at: '2026-11-11T10:00:00Z', session: 'ONCE', skill: 'clip' })}\n`);
  const shown = describeShare(decide(env));
  expect(shown).toContain('sharing is off, chosen 2026-11-11 answering "yes, this once"');
  expect(shown).toContain('would be public on testnet 13579, agreed once:');
  expect(shown).toContain('https://github.com/a/b?skill=clip  (no domain)  worked');
  expect(shown).not.toContain('c/d');
  // The failure of beforeEach was in another session: it stays.
  expect(shown).not.toContain('missing-key');
  const written: unknown[] = [];
  expect(
    await sendShared(env, async (line) => {
      written.push(line);
    }),
  ).toEqual({ sent: 1, failed: 0, firstError: null });
  expect(written).toEqual([{ toolUrl: 'https://github.com/a/b?skill=clip', outcome: 'worked' }]);
  expect(await sendShared(env, () => Promise.reject(new Error('must not be called')))).toEqual({ sent: 0, failed: 0, firstError: null });
});

test('"always" sends the result it was asked about and what comes after, never what was kept before (task 126)', async () => {
  writeFileSync(
    join(env.arpHome, 'outcomes.jsonl'),
    [
      { at: '2026-11-01T10:00:00.000Z', session: 'OLD', skill: 'gadget', source: 'c/d', outcome: 'worked' },
      { at: '2026-11-11T09:59:00.000Z', session: 'ASKED', skill: 'clip', source: 'a/b', outcome: 'worked' },
      { at: '2026-11-11T11:00:00.000Z', session: 'LATER', skill: 'later', source: 'e/f', outcome: 'worked' },
    ]
      .map((row) => JSON.stringify(row))
      .join('\n'),
  );
  setSharing(env, true, 'asked-always', new Date('2026-11-11T10:00:00.000Z'));
  writeFileSync(join(env.arpHome, 'share-once.jsonl'), `${JSON.stringify({ at: '2026-11-11T10:00:00.000Z', session: 'ASKED', skill: 'clip' })}\n`);
  const decision = decide(env);
  expect(decision.lines.map((line) => line.toolUrl).sort()).toEqual([
    'https://github.com/a/b?skill=clip',
    'https://github.com/e/f?skill=later',
  ]);
  // The old worked answer, and beforeEach's two failures of 2026-11-05, stay here, counted.
  expect(decision.earlier).toBe(3);
  expect(describeShare(decision)).toContain('kept before "always" was chosen, and staying here: 3 record(s)');
  const written: unknown[] = [];
  await sendShared(env, async (line) => {
    written.push(line);
  });
  expect(JSON.stringify(written)).not.toContain('c/d');
  expect(JSON.stringify(written)).not.toContain('missing-key');
  // `arp share on` prints everything first, and includes the history.
  setSharing(env, true);
  expect(decide(env).lines.map((line) => line.toolUrl)).toContain('https://github.com/c/d?skill=gadget');
  expect(decide(env).earlier).toBe(0);
});

test('one send at a time: a second sends nothing; a stale lock is taken over (task 126)', async () => {
  let inside = 0;
  const first = withSendLock(env, async () => {
    inside += 1;
    await Bun.sleep(100);
    return 'first';
  });
  expect(await withSendLock(env, async () => 'second')).toBeNull();
  expect(await first).toBe('first');
  expect(inside).toBe(1);
  expect(existsSync(join(env.arpHome, 'share-send.lock'))).toBe(false);
  writeFileSync(join(env.arpHome, 'share-send.lock'), JSON.stringify({ pid: 1, at: '2026-11-11T00:00:00.000Z' }));
  expect(await withSendLock(env, async () => 'taken', () => Date.parse('2026-11-11T01:00:00.000Z'))).toBe('taken');
  writeFileSync(join(env.arpHome, 'share-send.lock'), JSON.stringify({ pid: 1, at: '2026-11-11T00:59:00.000Z' }));
  expect(await withSendLock(env, async () => 'taken', () => Date.parse('2026-11-11T01:00:00.000Z'))).toBeNull();
});

test('what a background send did is kept here, never shown (task 126)', () => {
  logSend(env, { sent: 1, failed: 1, firstError: 'sponsor down' }, new Date('2026-11-11T10:00:00.000Z'));
  expect(JSON.parse(readFileSync(join(env.arpHome, 'share-log.jsonl'), 'utf8'))).toEqual({
    at: '2026-11-11T10:00:00.000Z',
    sent: 1,
    failed: 1,
    error: 'sponsor down',
  });
});
