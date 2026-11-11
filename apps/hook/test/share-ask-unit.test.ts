import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { offerShare, onStopShare, senderOf, sessionEnd } from '../src/share-ask.ts';
import { type Sandbox, sandbox } from './sandbox.ts';

// In-process, beside the spawned walk in `share-ask.test.ts`: each branch of the question and the sending, read
// from the files a caller observes. Skill names are ones no real install holds, because `homedir()` is the real one.
let box: Sandbox;
beforeEach(() => {
  box = sandbox('arp-share-unit-');
  process.env['ARP_SHARE_AUTO'] = '';
});
afterEach(() => box.restore());

const NOW = new Date('2026-11-11T10:00:00.000Z');
const at = (file: string) => join(box.home, file);
const json = (file: string) => JSON.parse(readFileSync(at(file), 'utf8')) as Record<string, unknown>; // a JSON object the module under test wrote
const putState = (state: Record<string, unknown>) => {
  mkdirSync(box.home, { recursive: true });
  writeFileSync(at('share-question.json'), `${JSON.stringify(state)}\n`);
};

async function waitFor(path: string, ms: number): Promise<boolean> {
  for (let waited = 0; waited < ms; waited += 25) {
    if (existsSync(path)) return true;
    await Bun.sleep(25);
  }
  return existsSync(path);
}

describe('offerShare', () => {
  test('offers once for a public source, and writes the question as offered', () => {
    expect(offerShare('s1', 'zq-gadget', 'owner/repo', box.dir, NOW)).toBe(true);
    expect(json('share-question.json')).toEqual({ at: NOW.toISOString(), session: 's1', skill: 'zq-gadget', state: 'offered' });
    // The same session does not carry it twice.
    expect(offerShare('s1', 'zq-other', 'owner/other', box.dir, NOW)).toBe(false);
  });

  test('an offer another session never put may be made again in this one', () => {
    putState({ at: '', session: 's0', skill: 'zq-gadget', state: 'offered' });
    expect(offerShare('s1', 'zq-next', 'owner/next', box.dir, NOW)).toBe(true);
    expect(json('share-question.json')).toMatchObject({ session: 's1', skill: 'zq-next' });
  });

  test('a question put or answered is never offered again', () => {
    putState({ session: 's0', skill: 'zq-gadget', state: 'put' });
    expect(offerShare('s1', 'zq-next', 'owner/next', box.dir, NOW)).toBe(false);
    putState({ session: 's0', skill: 'zq-gadget', state: 'answered' });
    expect(offerShare('s1', 'zq-next', 'owner/next', box.dir, NOW)).toBe(false);
  });

  test('a broken question file counts as put; one with unknown fields counts as nothing on file', () => {
    putState({ session: 's0' });
    expect(offerShare('s1', 'zq-next', 'owner/next', box.dir, NOW)).toBe(true);
    writeFileSync(at('share-question.json'), '{not json');
    expect(offerShare('s2', 'zq-next', 'owner/next', box.dir, NOW)).toBe(false);
    putState({ session: 's0', skill: 'zq-gadget', state: 'shelved' });
    expect(offerShare('s3', 'zq-next', 'owner/next', box.dir, NOW)).toBe(true);
  });

  test('nothing is offered once sharing is on file, with sharing off, or for a source that is not owner/repo', () => {
    expect(offerShare('s1', 'zq-private', null, box.dir, NOW)).toBe(false);
    expect(offerShare('s1', 'zq-gadget', 'https://example.com/x', box.dir, NOW)).toBe(false);
    process.env['ARP_SHARE_AUTO'] = ' OFF ';
    expect(offerShare('s1', 'zq-gadget', 'owner/repo', box.dir, NOW)).toBe(false);
    process.env['ARP_SHARE_AUTO'] = '';
    mkdirSync(box.home, { recursive: true });
    writeFileSync(at('sharing.json'), '{"failures":false}\n');
    expect(offerShare('s1', 'zq-gadget', 'owner/repo', box.dir, NOW)).toBe(false);
    expect(existsSync(at('share-question.json'))).toBe(false);
  });

  test('a plugin skill with no source is offered when the project lock names where its name came from', () => {
    writeFileSync(join(box.dir, 'skills-lock.json'), JSON.stringify({ skills: { 'zq-locked': { source: 'owner/locked', sourceType: 'github' } } }));
    expect(offerShare('s1', 'plugin:zq-locked', null, box.dir, NOW)).toBe(true);
  });

  test('a home it cannot write is no offer, and never a throw', () => {
    writeFileSync(join(box.dir, 'file'), 'x');
    process.env['ARP_HOME'] = join(box.dir, 'file', 'home');
    expect(offerShare('s1', 'zq-gadget', 'owner/repo', box.dir, NOW)).toBe(false);
  });
});

describe('onStopShare', () => {
  const none = new Map<string, 'worked' | 'failed' | 'unsure'>();

  test('an offered question becomes put when its skill is answered worked or failed, and not when unsure', () => {
    putState({ at: '', session: 's1', skill: 'zq-gadget', state: 'offered' });
    onStopShare('s1', '', new Map([['zq-gadget', 'unsure']]), NOW);
    expect(json('share-question.json')).toMatchObject({ state: 'offered' });
    onStopShare('s1', '', new Map([['zq-other', 'worked']]), NOW);
    expect(json('share-question.json')).toMatchObject({ state: 'offered' });
    onStopShare('s1', '', new Map([['zq-gadget', 'failed']]), NOW);
    expect(json('share-question.json')).toEqual({ at: NOW.toISOString(), session: 's1', skill: 'zq-gadget', state: 'put' });
  });

  test('"always" on a put question turns sharing on and keeps the result asked about', () => {
    putState({ at: '', session: 's1', skill: 'zq-gadget', state: 'put' });
    onStopShare('s1', 'Every result from now on.\n\narp-share: always', none, NOW);
    expect(json('sharing.json')).toEqual({ failures: true, at: NOW.toISOString(), how: 'asked-always' });
    expect(readFileSync(at('share-once.jsonl'), 'utf8')).toBe(`${JSON.stringify({ at: NOW.toISOString(), session: 's1', skill: 'zq-gadget' })}\n`);
    expect(json('share-question.json')).toMatchObject({ state: 'answered', answer: 'always' });
  });

  test('"no" writes sharing off and keeps no result', () => {
    putState({ at: '', session: 's1', skill: 'zq-gadget', state: 'put' });
    onStopShare('s1', 'arp-share: no', none, NOW);
    expect(json('sharing.json')).toMatchObject({ failures: false, how: 'asked-no' });
    expect(existsSync(at('share-once.jsonl'))).toBe(false);
  });

  test('a put question with no answer line, a choice already on file, another session or an answered state change nothing', () => {
    putState({ at: '', session: 's1', skill: 'zq-gadget', state: 'put' });
    onStopShare('s1', 'Thanks.', none, NOW);
    expect(existsSync(at('sharing.json'))).toBe(false);
    onStopShare('s2', 'arp-share: always', none, NOW);
    expect(existsSync(at('sharing.json'))).toBe(false);

    writeFileSync(at('sharing.json'), '{"failures":false,"how":"command"}\n');
    onStopShare('s1', 'arp-share: always', none, NOW);
    expect(json('sharing.json')).toEqual({ failures: false, how: 'command' });
    expect(json('share-question.json')).toMatchObject({ state: 'put' });

    putState({ at: '', session: 's1', skill: 'zq-gadget', state: 'answered' });
    onStopShare('s1', '', new Map([['zq-gadget', 'worked']]), NOW);
    expect(json('share-question.json')).toMatchObject({ state: 'answered' });
  });

  test('with nothing on file, or sharing off, it writes nothing', () => {
    onStopShare('s1', 'arp-share: always', none, NOW);
    expect(existsSync(box.home)).toBe(false);
    putState({ at: '', session: 's1', skill: 'zq-gadget', state: 'put' });
    process.env['ARP_SHARE_AUTO'] = 'off';
    onStopShare('s1', 'arp-share: always', none, NOW);
    expect(existsSync(at('sharing.json'))).toBe(false);
  });

  test('a file it cannot write is swallowed, never thrown', () => {
    putState({ at: '', session: 's1', skill: 'zq-gadget', state: 'put' });
    mkdirSync(at('sharing.json'));
    expect(() => onStopShare('s1', 'arp-share: always', none, NOW)).not.toThrow();
    expect(json('share-question.json')).toMatchObject({ state: 'put' });
  });
});

describe('senderOf', () => {
  test('ARP_CLI comes first, as a script the running interpreter starts', () => {
    process.env['ARP_CLI'] = ' /opt/arp/cli.js ';
    expect(senderOf(box.dir)).toEqual({ command: process.execPath, args: ['/opt/arp/cli.js', 'share', 'send', '--auto'] });
  });

  test('then arp.js, then cli.js beside the hook', () => {
    process.env['ARP_CLI'] = '  ';
    writeFileSync(join(box.dir, 'cli.js'), '');
    expect(senderOf(box.dir)).toEqual({ command: process.execPath, args: [join(box.dir, 'cli.js'), 'share', 'send', '--auto'] });
    writeFileSync(join(box.dir, 'arp.js'), '');
    expect(senderOf(box.dir)?.args[0]).toBe(join(box.dir, 'arp.js'));
  });

  test('then send.json, keeping only its string arguments', () => {
    writeFileSync(join(box.dir, 'send.json'), JSON.stringify({ command: '/usr/bin/arp', args: ['share', 7, 'send', '--auto'] }));
    expect(senderOf(box.dir)).toEqual({ command: '/usr/bin/arp', args: ['share', 'send', '--auto'] });
  });

  test('a send.json of the wrong shape, a broken one, or none at all is no sender', () => {
    expect(senderOf(box.dir)).toBeNull();
    writeFileSync(join(box.dir, 'send.json'), JSON.stringify({ command: 1, args: [] }));
    expect(senderOf(box.dir)).toBeNull();
    writeFileSync(join(box.dir, 'send.json'), JSON.stringify({ command: 'arp', args: 'share' }));
    expect(senderOf(box.dir)).toBeNull();
    writeFileSync(join(box.dir, 'send.json'), '{broken');
    expect(senderOf(box.dir)).toBeNull();
  });

  test('by default it looks beside the hook source, which holds no CLI', () => {
    expect(senderOf()).toBeNull();
  });
});

describe('sessionEnd', () => {
  const sharingOn = () => {
    mkdirSync(box.home, { recursive: true });
    writeFileSync(at('sharing.json'), '{"failures":true}\n');
  };

  test('a payload that is no object, or names no session, is null and writes nothing', async () => {
    sharingOn();
    expect(await sessionEnd(null)).toBeNull();
    expect(await sessionEnd('SessionEnd')).toBeNull();
    expect(await sessionEnd({ hook_event_name: 'SessionEnd' })).toBeNull();
    expect(existsSync(at('share-log.jsonl'))).toBe(false);
  });

  test('sharing off and no "once" for this session: nothing starts', async () => {
    mkdirSync(box.home, { recursive: true });
    writeFileSync(at('share-once.jsonl'), '{broken\n{"session":"other"}\n');
    expect(await sessionEnd({ session_id: 's1', cwd: box.dir })).toBeNull();
    expect(existsSync(at('share-log.jsonl'))).toBe(false);
  });

  test('with no program to send with, it logs that locally', async () => {
    sharingOn();
    expect(await sessionEnd({ sessionId: 's1' })).toBeNull();
    const row = JSON.parse(readFileSync(at('share-log.jsonl'), 'utf8')) as Record<string, unknown>; // one JSON row the module wrote
    expect(row).toMatchObject({ sent: 0, failed: 0, error: 'no arp program beside the hook; run arp share send' });
  });

  test('a "once" for this session starts the sender, in the project, with share send --auto', async () => {
    mkdirSync(box.home, { recursive: true });
    writeFileSync(at('share-once.jsonl'), '{"session":"s1","skill":"zq-gadget"}\n');
    const sender = join(box.dir, 'fake-arp.cjs');
    const sent = join(box.dir, 'sent.json');
    writeFileSync(sender, `require('node:fs').writeFileSync(${JSON.stringify(sent)}, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }));\n`);
    process.env['ARP_CLI'] = sender;
    expect(await sessionEnd({ session_id: 's1', cwd: box.dir })).toBeNull();
    expect(await waitFor(sent, 8000)).toBe(true);
    expect(JSON.parse(readFileSync(sent, 'utf8'))).toEqual({ argv: ['share', 'send', '--auto'], cwd: box.dir });
  });

  test('a home it cannot read is swallowed', async () => {
    // `sharing.json` as a directory: the read throws, and the session still ends with nothing logged.
    mkdirSync(at('sharing.json'), { recursive: true });
    expect(await sessionEnd({ session_id: 's1' })).toBeNull();
    expect(existsSync(at('share-log.jsonl'))).toBe(false);
  });

  test('ARP_SHARE_AUTO=off starts nothing even with sharing on', async () => {
    sharingOn();
    process.env['ARP_SHARE_AUTO'] = 'off';
    expect(await sessionEnd({ session_id: 's1' })).toBeNull();
    expect(existsSync(at('share-log.jsonl'))).toBe(false);
  });
});
