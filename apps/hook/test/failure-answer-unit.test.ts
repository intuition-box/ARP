import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, test } from 'bun:test';

import { failureOutput, postToolUseFailure, RECORD } from '../src/failure-answer.ts';
import { type Sandbox, sandbox } from './sandbox.ts';

// In-process, beside the spawned walk against a local index in `failure-answer.test.ts`. The live read stays off
// (`setup.ts`), so these cover the route itself: what it hands on, what it records, what it prints.
let box: Sandbox;
beforeEach(() => {
  box = sandbox('arp-answer-unit-');
  const skills = join(box.dir, 'skills');
  mkdirSync(join(skills, 'zq-gadget'), { recursive: true });
  writeFileSync(join(skills, 'zq-gadget', 'SKILL.md'), '---\nname: zq-gadget\n---\nRun this:\n\n```bash\nvidcut --in a.mp4\n```\n');
  process.env['ARP_SKILLS_DIR'] = skills;
  mkdirSync(join(box.dir, '.arp'), { recursive: true });
  writeFileSync(
    process.env['ARP_SESSION_LOG'] ?? '',
    `${JSON.stringify({ kind: 'skill', session: 's1', name: 'zq-gadget', source: 'owner/repo' })}\n`,
  );
});
afterEach(() => box.restore());

const failed = (tool: string, input: Record<string, unknown>, error: string) => ({
  hook_event_name: 'PostToolUseFailure',
  session_id: 's1',
  cwd: box.dir,
  tool_name: tool,
  tool_input: input,
  error,
});

test('anything but a shell command, or no tool call at all, goes on to the recording', async () => {
  expect(await postToolUseFailure(null)).toBe(RECORD);
  expect(await postToolUseFailure({ hook_event_name: 'PostToolUseFailure' })).toBe(RECORD);
  expect(await postToolUseFailure(failed('mcp__github__list', {}, 'HTTP 401'))).toBe(RECORD);
  expect(existsSync(box.home)).toBe(false);
});

test("a skill's failure is recorded, and with the index read off nothing is printed", async () => {
  expect(await postToolUseFailure(failed('Bash', { command: 'vidcut --in a.mp4' }, 'vidcut: command not found'))).toBeNull();
  const row = JSON.parse(readFileSync(join(box.home, 'failures.jsonl'), 'utf8')) as Record<string, unknown>; // one JSON row the module wrote
  expect(row).toMatchObject({ session: 's1', skill: 'zq-gadget', source: 'owner/repo', reason: 'missing-program' });
});

test('a failed command no skill asked for prints nothing and records nothing', async () => {
  expect(await postToolUseFailure(failed('Bash', { command: 'make all' }, 'make: command not found'))).toBeNull();
  expect(existsSync(join(box.home, 'failures.jsonl'))).toBe(false);
});

test("the answer is Claude Code's additionalContext for PostToolUseFailure", () => {
  expect(JSON.parse(failureOutput('2 wallets wrote failed'))).toEqual({
    hookSpecificOutput: { hookEventName: 'PostToolUseFailure', additionalContext: '2 wallets wrote failed' },
  });
});
