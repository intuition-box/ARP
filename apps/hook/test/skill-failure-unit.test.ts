import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { skillDirectoryDigest } from '../../../packages/protocol/src/node/skill-directory.ts';
import { type ToolCall, toolCallOf } from '../src/payload.ts';
import {
  appendFailure,
  arpHome,
  foundBySearch,
  lastUserWords,
  recordSearch,
  recordSkillFailure,
  skillDirectory,
  skillsOfSession,
} from '../src/skill-failure.ts';
import { type Sandbox, sandbox } from './sandbox.ts';

// In-process, beside the spawned walk in `skill-failure.test.ts`. Skill names are ones no real install holds,
// because `homedir()` is the real one; the skill's files sit under ARP_SKILLS_DIR.
let box: Sandbox;
let skills: string;
const SKILL = '---\nname: zq-gadget\n---\nInstall ffmpeg, then run:\n\n```bash\nvidcut --in a.mp4\n```\n';
beforeEach(() => {
  box = sandbox('arp-skill-failure-unit-');
  skills = join(box.dir, 'skills');
  mkdirSync(join(skills, 'zq-gadget'), { recursive: true });
  writeFileSync(join(skills, 'zq-gadget', 'SKILL.md'), SKILL);
  process.env['ARP_SKILLS_DIR'] = skills;
});
afterEach(() => box.restore());

function callOf(payload: Record<string, unknown>): ToolCall {
  const call = toolCallOf({ session_id: 's1', cwd: box.dir, ...payload });
  if (call === null) throw new Error('not a tool call');
  return call;
}
const sessionLog = () => process.env['ARP_SESSION_LOG'] ?? '';
function logSkills(rows: readonly unknown[]): void {
  mkdirSync(join(box.dir, '.arp'), { recursive: true });
  writeFileSync(sessionLog(), rows.map((row) => (typeof row === 'string' ? row : JSON.stringify(row))).join('\n') + '\n');
}
const failures = (): Record<string, unknown>[] => {
  const path = join(box.home, 'failures.jsonl');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Record<string, unknown>); // JSON rows the module wrote
};
const bashFails = (command: string, error: string, extra: Record<string, unknown> = {}) =>
  callOf({ hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: { command }, error, ...extra });

describe('lastUserWords', () => {
  test('reads text blocks of the latest real user message, skipping meta, tags and broken lines', () => {
    const transcript = [
      JSON.stringify({ type: 'user', message: { content: 'first words' } }),
      JSON.stringify({ type: 'user', message: { content: [{ type: 'text', text: 'cut my' }, { type: 'image' }, { type: 'text', text: 'video' }] } }),
      JSON.stringify({ type: 'user', isMeta: true, message: { content: 'meta words' } }),
      JSON.stringify({ type: 'user', message: { content: '<command-name>/clear</command-name>' } }),
      JSON.stringify({ type: 'user', message: { content: { not: 'text' } } }),
      JSON.stringify({ type: 'assistant', message: { content: 'said by "user"' } }),
      '{"user" broken',
    ].join('\n');
    expect(lastUserWords(transcript)).toBe('cut my  video');
  });
});

describe('recordSearch and foundBySearch', () => {
  const pulse = (response: unknown, session: string | null = 's1') =>
    callOf({ tool_name: 'mcp__arp__arp_pulse', tool_response: response, ...(session === null ? { session_id: undefined } : { session_id: session }) });
  const answer = (domain: unknown) => JSON.stringify({ domain, skills: [{ name: 'zq-gadget', source: 'owner/repo' }, { name: 7 }] });

  test('keeps the domain when it is a node and the skills found, from a block list, a content object or a string', () => {
    recordSearch(pulse([{ type: 'text', text: 'not json' }, { type: 'text', text: answer('advertising') }]), box.dir);
    expect(foundBySearch(box.dir, 's1', 'plugin:zq-gadget')).toEqual({ domain: 'advertising', source: 'owner/repo' });

    recordSearch(pulse({ content: [{ type: 'text', text: answer('not a node') }] }, 's2'), box.dir);
    expect(foundBySearch(box.dir, 's2', 'zq-gadget')).toEqual({ domain: null, source: 'owner/repo' });

    recordSearch(pulse(answer('advertising'), 's3'), box.dir);
    expect(foundBySearch(box.dir, 's3', 'zq-gadget')).toEqual({ domain: 'advertising', source: 'owner/repo' });
    // Never the query.
    expect(readFileSync(join(box.dir, '.arp', 'searches.jsonl'), 'utf8')).not.toContain('query');
  });

  test('writes nothing without a session, an object answer, a skills list or a usable skill', () => {
    recordSearch(pulse(answer('advertising'), null), box.dir);
    recordSearch(pulse([1, null, { text: 5 }, '"just a string"']), box.dir);
    recordSearch(pulse(JSON.stringify({ skills: 'none' })), box.dir);
    recordSearch(pulse(JSON.stringify({ skills: [{ name: 'zq-gadget' }] })), box.dir);
    expect(existsSync(join(box.dir, '.arp', 'searches.jsonl'))).toBe(false);
    expect(foundBySearch(box.dir, 's1', 'zq-gadget')).toBeNull();
  });

  test('foundBySearch takes the latest search of this session that found the skill, and skips broken lines', () => {
    mkdirSync(join(box.dir, '.arp'), { recursive: true });
    writeFileSync(
      join(box.dir, '.arp', 'searches.jsonl'),
      [
        JSON.stringify({ session: 's1', domain: 'advertising', skills: [{ name: 'zq-gadget', source: 'a/one' }] }),
        JSON.stringify({ session: 's2', domain: 'advertising', skills: [{ name: 'zq-gadget', source: 'b/two' }] }),
        JSON.stringify({ session: 's1', domain: 5, skills: [{ name: 'zq-gadget', source: 'c/three' }] }),
        JSON.stringify({ session: 's1', skills: [{ name: 'zq-other', source: 'd/four' }] }),
        '{broken',
      ].join('\n'),
    );
    expect(foundBySearch(box.dir, 's1', 'zq-gadget')).toEqual({ domain: null, source: 'c/three' });
  });

  test('a session log that is a file under a file loses the record, never the session', () => {
    writeFileSync(join(box.dir, 'file'), 'x');
    process.env['ARP_SESSION_LOG'] = join(box.dir, 'file', 'session.jsonl');
    expect(() => recordSearch(pulse(answer('advertising')), box.dir)).not.toThrow();
  });
});

describe('skillsOfSession', () => {
  test('the skills of this session, latest first, skipping MCP rows, other sessions and broken lines', () => {
    logSkills([
      { kind: 'skill', session: 's1', name: 'zq-a', source: 'owner/a' },
      { kind: 'mcp', session: 's1', name: 'server' },
      { kind: 'skill', session: 's2', name: 'zq-b' },
      { kind: 'skill', session: 's1', name: 'zq-c' },
      '{half',
    ]);
    expect(skillsOfSession(sessionLog(), 's1')).toEqual([
      { name: 'zq-c', source: null },
      { name: 'zq-a', source: 'owner/a' },
    ]);
    expect(skillsOfSession(join(box.dir, 'none.jsonl'), 's1')).toEqual([]);
  });
});

describe('skillDirectory and arpHome', () => {
  test('ARP_SKILLS_DIR is looked in first, and a skill with no SKILL.md has no directory', () => {
    expect(skillDirectory('zq-gadget', box.dir)).toBe(join(skills, 'zq-gadget'));
    mkdirSync(join(box.dir, '.claude', 'skills', 'zq-project'), { recursive: true });
    writeFileSync(join(box.dir, '.claude', 'skills', 'zq-project', 'SKILL.md'), '');
    expect(skillDirectory('zq-project', box.dir)).toBe(join(box.dir, '.claude', 'skills', 'zq-project'));
    expect(skillDirectory('zq-nowhere', box.dir)).toBeNull();
  });

  test('ARP_HOME, trimmed, else ~/.arp', () => {
    process.env['ARP_HOME'] = ' /x/arp ';
    expect(arpHome()).toBe('/x/arp');
    process.env['ARP_HOME'] = ' ';
    expect(arpHome().endsWith('.arp')).toBe(true);
  });
});

describe('appendFailure', () => {
  test('writes a session, skill and reason once', () => {
    const line = { at: '2026-11-11T00:00:00.000Z', session: 's1', skill: 'zq-gadget', source: null, reason: 'missing-file' as const };
    expect(appendFailure(line)).toBe(true);
    expect(appendFailure({ ...line, at: '2026-11-11T01:00:00.000Z' })).toBe(false);
    expect(appendFailure({ ...line, reason: 'missing-key' })).toBe(true);
    expect(failures()).toHaveLength(2);
  });
});

describe('recordSkillFailure', () => {
  test('a failure of a command the session\'s skill asked for is written with its reason, need, domain and version', () => {
    logSkills([{ kind: 'skill', session: 's1', name: 'zq-gadget', source: 'owner/repo' }]);
    const transcript = join(box.dir, 't.jsonl');
    writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { content: 'an advertising video' } })}\n`);
    const line = recordSkillFailure(bashFails('vidcut --in /home/me/a.mp4', 'vidcut: spawn ffmpeg ENOENT', { transcript_path: transcript }), box.dir);
    expect(line).toMatchObject({
      session: 's1',
      skill: 'zq-gadget',
      source: 'owner/repo',
      domain: 'advertising',
      reason: 'missing-program',
      need: 'ffmpeg',
      version: skillDirectoryDigest(join(skills, 'zq-gadget')),
    });
    expect(failures()).toHaveLength(1);
    expect(JSON.stringify(failures())).not.toContain('/home/me');
    // The same session, skill and reason again: not written, so not answered twice.
    expect(recordSkillFailure(bashFails('vidcut --in b.mp4', 'spawn ffmpeg ENOENT'), box.dir)).toBeNull();
  });

  test('the source falls back to the search that found the skill', () => {
    logSkills([{ kind: 'skill', session: 's1', name: 'zq-gadget' }]);
    mkdirSync(join(box.dir, '.arp'), { recursive: true });
    writeFileSync(
      join(box.dir, '.arp', 'searches.jsonl'),
      `${JSON.stringify({ session: 's1', domain: 'advertising', skills: [{ name: 'zq-gadget', source: 'owner/found' }] })}\n`,
    );
    expect(recordSkillFailure(bashFails('vidcut a', 'cat: a: No such file or directory'), box.dir)).toMatchObject({
      source: 'owner/found',
      domain: 'advertising',
      reason: 'missing-file',
    });
  });

  test('a skill with no files here, or one that did not ask for the command, is passed over', () => {
    logSkills([
      { kind: 'skill', session: 's1', name: 'zq-gadget' },
      { kind: 'skill', session: 's1', name: 'zq-nofiles' },
    ]);
    expect(recordSkillFailure(bashFails('unrelated --x', 'unrelated: command not found'), box.dir)).toBeNull();
    expect(failures()).toEqual([]);
  });

  test('a success, a reason it cannot tell, no command or no session records nothing', () => {
    logSkills([{ kind: 'skill', session: 's1', name: 'zq-gadget' }]);
    expect(recordSkillFailure(callOf({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'vidcut' }, tool_response: 'ok' }), box.dir)).toBeNull();
    expect(recordSkillFailure(bashFails('vidcut', 'tests failed: 3 of 10'), box.dir)).toBeNull();
    expect(recordSkillFailure(callOf({ hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: {}, error: 'command not found' }), box.dir)).toBeNull();
    expect(recordSkillFailure(bashFails('vidcut', 'vidcut: command not found', { session_id: undefined }), box.dir)).toBeNull();
    expect(failures()).toEqual([]);
  });

  test('a home it cannot write loses the record, never the session', () => {
    logSkills([{ kind: 'skill', session: 's1', name: 'zq-gadget' }]);
    writeFileSync(join(box.dir, 'file'), 'x');
    process.env['ARP_HOME'] = join(box.dir, 'file', 'home');
    expect(recordSkillFailure(bashFails('vidcut', 'vidcut: command not found'), box.dir)).toBeNull();
  });
});
