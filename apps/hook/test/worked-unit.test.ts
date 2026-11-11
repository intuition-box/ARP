import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { skillDirectoryDigest } from '../../../packages/protocol/src/node/skill-directory.ts';
import { askOnSkill, onStop, requestFor, stop, withOf } from '../src/worked.ts';
import { type Sandbox, sandbox } from './sandbox.ts';

// In-process, beside the spawned walk in `worked.test.ts`. Skill names are ones no real install holds, because
// `homedir()` is the real one; the skill's files sit under ARP_SKILLS_DIR.
let box: Sandbox;
let skills: string;
const SKILL = '---\nname: zq-gadget\n---\nNeeds ffmpeg and OPENAI_API_KEY.\n';
beforeEach(() => {
  box = sandbox('arp-worked-unit-');
  skills = join(box.dir, 'skills');
  mkdirSync(join(skills, 'zq-gadget'), { recursive: true });
  writeFileSync(join(skills, 'zq-gadget', 'SKILL.md'), SKILL);
  process.env['ARP_SKILLS_DIR'] = skills;
});
afterEach(() => box.restore());

const NOW = new Date('2026-11-11T10:00:00.000Z');
const file = (name: string) => join(box.home, name);
function rowsOf(name: string): Record<string, unknown>[] {
  if (!existsSync(file(name))) return [];
  return readFileSync(file(name), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>); // JSON rows the module wrote
}
const write = (name: string, rows: readonly unknown[]) => {
  mkdirSync(box.home, { recursive: true });
  writeFileSync(file(name), rows.map((row) => (typeof row === 'string' ? row : JSON.stringify(row))).join('\n') + '\n');
};

describe('askOnSkill', () => {
  test('asks once per skill per session, and marks the skill asked before the request goes out', () => {
    expect(askOnSkill('s1', 'zq-gadget', 'owner/repo', box.dir, NOW)).toBe(requestFor('zq-gadget'));
    expect(rowsOf('asked.jsonl')).toEqual([{ at: NOW.toISOString(), session: 's1', skill: 'zq-gadget', source: 'owner/repo' }]);
    expect(askOnSkill('s1', 'zq-gadget', 'owner/repo', box.dir, NOW)).toBeNull();
    expect(askOnSkill('s2', 'zq-gadget', null, box.dir, NOW)).toBe(requestFor('zq-gadget'));
  });

  test("ARP's own skill is never asked, as itself or as a plugin's", () => {
    expect(askOnSkill('s1', 'arp', null, box.dir, NOW)).toBeNull();
    expect(askOnSkill('s1', 'arp-plugin:arp', null, box.dir, NOW)).toBeNull();
    expect(existsSync(file('asked.jsonl'))).toBe(false);
  });

  test('with sharing undecided and allowed, the first public skill carries the question', () => {
    process.env['ARP_SHARE_AUTO'] = '';
    expect(askOnSkill('s1', 'zq-gadget', 'owner/repo', box.dir, NOW)).toBe(requestFor('zq-gadget', true));
  });

  test('a home it cannot write asks nothing', () => {
    writeFileSync(join(box.dir, 'file'), 'x');
    process.env['ARP_HOME'] = join(box.dir, 'file', 'home');
    expect(askOnSkill('s1', 'zq-gadget', null, box.dir, NOW)).toBeNull();
  });
});

describe('onStop', () => {
  const input = (last: string, extra: Partial<Parameters<typeof onStop>[0]> = {}) => ({
    session: 's1',
    cwd: box.dir,
    last,
    transcript: null,
    ...extra,
  });

  test('records each asked skill answered in the message, once, with the version of its files', () => {
    write('asked.jsonl', [
      { at: '2026-11-11T09:00:00.000Z', session: 's1', skill: 'zq-gadget', source: 'owner/repo' },
      { at: '2026-11-11T09:00:00.000Z', session: 's1', skill: 'zq-other' },
      { session: 's2', skill: 'zq-elsewhere' },
      { session: 's1', skill: 7 },
      '[1]',
      '{half',
    ]);
    onStop(input('Done.\n\narp: zq-gadget worked\narp: zq-other unsure\narp: zq-elsewhere failed'), NOW);
    expect(rowsOf('outcomes.jsonl')).toEqual([
      {
        at: NOW.toISOString(),
        session: 's1',
        skill: 'zq-gadget',
        source: 'owner/repo',
        outcome: 'worked',
        version: skillDirectoryDigest(join(skills, 'zq-gadget')),
      },
      { at: NOW.toISOString(), session: 's1', skill: 'zq-other', source: null, outcome: 'unsure' },
    ]);
    // Already answered: a second message changes nothing.
    onStop(input('arp: zq-gadget failed'), NOW);
    expect(rowsOf('outcomes.jsonl')).toHaveLength(2);
  });

  test('the domain and source come from this session\'s search when there was one', () => {
    write('asked.jsonl', [{ at: '', session: 's1', skill: 'zq-found' }]);
    mkdirSync(join(box.dir, '.arp'), { recursive: true });
    writeFileSync(
      join(box.dir, '.arp', 'searches.jsonl'),
      `${JSON.stringify({ session: 's1', domain: 'advertising', skills: [{ name: 'zq-found', source: 'owner/found' }] })}\n`,
    );
    onStop(input('arp: zq-found failed'), NOW);
    expect(rowsOf('outcomes.jsonl')[0]).toMatchObject({ skill: 'zq-found', source: 'owner/found', domain: 'advertising', outcome: 'failed' });
  });

  test('else the domain is read from the person\'s last words in the transcript, matched against closed words only', () => {
    write('asked.jsonl', [{ at: '', session: 's1', skill: 'zq-words' }]);
    const transcript = join(box.dir, 't.jsonl');
    writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { content: 'help me with advertising please' } })}\n`);
    onStop(input('arp: zq-words worked', { transcript }), NOW);
    const [row] = rowsOf('outcomes.jsonl');
    expect(row).toMatchObject({ domain: 'advertising', outcome: 'worked' });
    expect(JSON.stringify(row)).not.toContain('please');
  });

  test('a transcript that is not there gives no domain', () => {
    write('asked.jsonl', [{ at: '', session: 's1', skill: 'zq-words' }]);
    onStop(input('arp: zq-words worked', { transcript: join(box.dir, 'gone.jsonl') }), NOW);
    expect(rowsOf('outcomes.jsonl')[0]).not.toHaveProperty('domain');
  });

  test('a message with no answer line records nothing; with nothing asked, nothing either', () => {
    onStop(input('arp: zq-gadget worked'), NOW);
    expect(existsSync(file('outcomes.jsonl'))).toBe(false);
    write('asked.jsonl', [{ at: '', session: 's1', skill: 'zq-gadget' }]);
    onStop(input('All done.'), NOW);
    expect(existsSync(file('outcomes.jsonl'))).toBe(false);
  });

  test('an outcomes file it cannot write is swallowed', () => {
    write('asked.jsonl', [{ at: '', session: 's1', skill: 'zq-gadget' }]);
    mkdirSync(file('outcomes.jsonl'));
    expect(() => onStop(input('arp: zq-gadget worked'), NOW)).not.toThrow();
  });

  test('the Stop route reads a Stop payload, records it, and prints nothing', async () => {
    write('asked.jsonl', [{ at: '', session: 's1', skill: 'zq-gadget' }]);
    expect(await stop({ hook_event_name: 'PostToolUse', session_id: 's1', last_assistant_message: 'arp: zq-gadget worked' })).toBeNull();
    expect(existsSync(file('outcomes.jsonl'))).toBe(false);
    expect(await stop({ hook_event_name: 'Stop', session_id: 's1', cwd: box.dir, last_assistant_message: 'arp: zq-gadget worked' })).toBeNull();
    expect(rowsOf('outcomes.jsonl')[0]).toMatchObject({ skill: 'zq-gadget', outcome: 'worked' });
  });
});

describe('withOf', () => {
  const BEFORE = '2026-11-11T12:00:00.000Z';

  test('the latest earlier need of this skill, when its SKILL.md names it', () => {
    write('failures.jsonl', [
      { at: '2026-11-11T08:00:00.000Z', session: 's0', skill: 'zq-gadget', source: 'owner/repo', need: 'OPENAI_API_KEY' },
      { at: '2026-11-11T09:00:00.000Z', session: 's0', skill: 'plugin:zq-gadget', need: 'ffmpeg' },
      { at: '2026-11-11T07:00:00.000Z', session: 's0', skill: 'zq-gadget', need: 'older' },
    ]);
    expect(withOf('zq-gadget', 'owner/repo', box.dir, BEFORE)).toBe('ffmpeg');
  });

  test('rows of another skill, another source, a later time or the wrong shape are passed over', () => {
    write('failures.jsonl', [
      { at: '2026-11-11T08:00:00.000Z', skill: 'zq-else', need: 'ffmpeg' },
      { at: '2026-11-11T08:00:00.000Z', skill: 'zq-gadget', source: 'other/repo', need: 'ffmpeg' },
      { at: '2026-11-11T13:00:00.000Z', skill: 'zq-gadget', need: 'ffmpeg' },
      { at: 5, skill: 'zq-gadget', need: 'ffmpeg' },
    ]);
    expect(withOf('zq-gadget', 'owner/repo', box.dir, BEFORE)).toBeNull();
  });

  test('a need the SKILL.md does not name, or a skill with no files here, is no name', () => {
    write('failures.jsonl', [{ at: '2026-11-11T08:00:00.000Z', skill: 'zq-gadget', need: 'qpdf' }]);
    expect(withOf('zq-gadget', null, box.dir, BEFORE)).toBeNull();
    write('failures.jsonl', [{ at: '2026-11-11T08:00:00.000Z', skill: 'zq-nofiles', need: 'ffmpeg' }]);
    expect(withOf('zq-nofiles', null, box.dir, BEFORE)).toBeNull();
  });

  test('a worked answer carries it as `with`; a failed one never does', () => {
    write('failures.jsonl', [{ at: '2026-11-11T08:00:00.000Z', session: 's0', skill: 'zq-gadget', need: 'ffmpeg' }]);
    write('asked.jsonl', [{ at: '', session: 's1', skill: 'zq-gadget' }]);
    onStop({ session: 's1', cwd: box.dir, last: 'arp: zq-gadget worked', transcript: null }, new Date(BEFORE));
    expect(rowsOf('outcomes.jsonl')[0]).toMatchObject({ outcome: 'worked', with: 'ffmpeg' });
    write('asked.jsonl', [{ at: '', session: 's2', skill: 'zq-gadget' }]);
    onStop({ session: 's2', cwd: box.dir, last: 'arp: zq-gadget failed', transcript: null }, new Date(BEFORE));
    expect(rowsOf('outcomes.jsonl')[1]).not.toHaveProperty('with');
  });
});
