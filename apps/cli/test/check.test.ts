import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, test } from 'bun:test';

import type { PulseUsage } from '../../../packages/protocol/src/pulse-usage.ts';
import { checkSkill, hereLines, neededNames, skillRefOf, thisMachine, type Machine } from '../src/check.ts';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'arp-check-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

// The shape `readSkillLines` answers with, narrowed to what `neededNames` reads.
const usage = (rows: { writer: string; outcome: 'worked' | 'failed'; needs: string[] }[]): PulseUsage =>
  ({
    declarations: rows.map((row) => ({ writer: row.writer, lines: [{ outcome: row.outcome, reasons: [], needs: row.needs }] })),
  }) as unknown as PulseUsage;

test('skillRefOf takes owner/repo/skill and a github.com ?skill= URL, nothing else', () => {
  expect(skillRefOf('anthropics/skills/pptx')).toEqual({ repo: 'anthropics/skills', skill: 'pptx' });
  expect(skillRefOf('https://github.com/anthropics/skills?skill=pptx')).toEqual({ repo: 'anthropics/skills', skill: 'pptx' });
  expect(skillRefOf('anthropics/skills')).toBeNull();
  expect(skillRefOf('https://example.com/a/b?skill=c')).toBeNull();
  expect(skillRefOf('a/b/c;rm -rf')).toBeNull();
});

test('neededNames counts distinct wallets, failures only', () => {
  const needed = neededNames(
    usage([
      { writer: '0xA', outcome: 'failed', needs: ['ffmpeg'] },
      { writer: '0xa', outcome: 'failed', needs: ['ffmpeg'] },
      { writer: '0xB', outcome: 'failed', needs: ['ffmpeg', 'OPENAI_API_KEY'] },
      { writer: '0xC', outcome: 'worked', needs: ['sox'] },
    ]),
  );
  expect([...needed]).toEqual([
    ['ffmpeg', 2],
    ['OPENAI_API_KEY', 1],
  ]);
  expect(neededNames(null).size).toBe(0);
});

test('a program on a fake PATH is found, one absent is missing, nothing is run', () => {
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'ffmpeg'), '#!/bin/sh\nexit 1\n');
  chmodSync(join(bin, 'ffmpeg'), 0o755);
  mkdirSync(join(bin, 'sox'));
  const machine = thisMachine({ PATH: bin, OPENAI_API_KEY: 'sk-secret', EMPTY_KEY: '' }, 'linux');
  expect(machine.hasProgram('ffmpeg')).toBe(true);
  expect(machine.hasProgram('pandoc')).toBe(false);
  expect(machine.hasProgram('sox')).toBe(false);
  expect(machine.hasVariable('OPENAI_API_KEY')).toBe(true);
  expect(machine.hasVariable('EMPTY_KEY')).toBe(false);
});

test('hereLines says set or missing, and never prints a value', () => {
  const machine: Machine = { hasProgram: (name) => name === 'ffmpeg', hasVariable: (name) => name === 'OPENAI_API_KEY' };
  const text = hereLines(
    new Map([
      ['pandoc', 3],
      ['ffmpeg', 1],
      ['OPENAI_API_KEY', 2],
      ['ANTHROPIC_API_KEY', 1],
    ]),
    ['ffmpeg', 'jq', 'GH_TOKEN'],
    machine,
  ).join('\n');
  expect(text).toContain('pandoc: missing here (needed when it failed, 3 wallets)');
  expect(text).toContain('ffmpeg: found on PATH (needed when it failed, 1 wallet)');
  expect(text).toContain('OPENAI_API_KEY: set (needed when it failed, 2 wallets)');
  expect(text).toContain('ANTHROPIC_API_KEY: not set');
  expect(text).toContain('jq: missing here (named in its files)');
  expect(text).toContain('GH_TOKEN: not set (named in its files)');
  expect(text.match(/ffmpeg/g)?.length).toBe(1);
  expect(text.indexOf('pandoc')).toBeLessThan(text.indexOf('ffmpeg'));
  expect(text).not.toContain('sk-');
  expect(hereLines(new Map(), [], machine)[0]).toContain('nothing named');
});

test('checkSkill says each read that fails, and never throws', async () => {
  // A stub of the one call shape githubPulseSource and readSkillLines make: (url, init) => Response.
  const down = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
  const machine: Machine = { hasProgram: () => false, hasVariable: () => false };
  const text = await checkSkill({ repo: 'a/b', skill: 'c' }, { env: {}, machine, fetch: down, budgetMs: 500 });
  expect(text).toContain('a/b');
  expect(text).toMatch(/Lines: (not read|no agent wrote)/);
});
