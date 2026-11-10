import { describe, expect, test } from 'vitest';

import { needOf, needProblemInSkill } from '../src/handlers/declare-need.js';

const SKILL = 'https://github.com/acme/skills?skill=video';
const MARKDOWN = '# Video\n\nNeeds FFmpeg on the PATH and OPENAI_API_KEY set.\n';

/** A repository with one skill directory, read from memory. */
function source(markdown: string | null = MARKDOWN) {
  const asked: string[] = [];
  return {
    asked,
    listing: async (repo: string) => {
      asked.push(`listing ${repo}`);
      return { rootTreeId: 't', files: [{ path: 'video/SKILL.md', sha: 'a', size: 1 }], trees: new Map(), truncated: false };
    },
    file: async (repo: string, path: string) => {
      asked.push(`file ${repo} ${path}`);
      return markdown;
    },
  };
}

describe('needOf: the arguments fit together before anything is read', () => {
  test('no name asked is no name', () => {
    expect(needOf({ outcome: 'worked', reason: undefined, needs: undefined, with: undefined })).toEqual({ need: undefined });
  });
  test('needs follows a missing-program failure', () => {
    expect(needOf({ outcome: 'failed', reason: 'missing-program', needs: 'ffmpeg', with: undefined })).toEqual({ need: 'ffmpeg' });
  });
  test('with follows a worked outcome', () => {
    expect(needOf({ outcome: 'worked', reason: undefined, needs: undefined, with: 'OPENAI_API_KEY' })).toEqual({ need: 'OPENAI_API_KEY' });
  });
  test('needs on a worked use is refused', () => {
    expect(needOf({ outcome: 'worked', reason: undefined, needs: 'ffmpeg', with: undefined })).toHaveProperty('problem');
  });
  test('with on a failure is refused', () => {
    expect(needOf({ outcome: 'failed', reason: 'missing-program', needs: undefined, with: 'ffmpeg' })).toHaveProperty('problem');
  });
  test('a key name after missing-program is refused', () => {
    expect(needOf({ outcome: 'failed', reason: 'missing-program', needs: 'OPENAI_API_KEY', with: undefined })).toHaveProperty('problem');
  });
  test('a path or a sentence is never a name', () => {
    expect(needOf({ outcome: 'failed', reason: 'missing-program', needs: '/usr/bin/ffmpeg', with: undefined })).toHaveProperty('problem');
    expect(needOf({ outcome: 'worked', reason: undefined, needs: undefined, with: 'my secret value' })).toHaveProperty('problem');
  });
  test('a name that is not a string is refused', () => {
    expect(needOf({ outcome: 'failed', reason: 'missing-program', needs: 3, with: undefined })).toHaveProperty('problem');
  });
});

describe("needProblemInSkill: the skill's SKILL.md must name it", () => {
  test('a name the file holds passes, case-insensitively for a program', async () => {
    const read = source();
    expect(await needProblemInSkill(SKILL, 'ffmpeg', 'missing-program', read)).toBeNull();
    expect(read.asked).toEqual(['listing acme/skills', 'file acme/skills video/SKILL.md']);
  });
  test('a key name must be written exactly', async () => {
    expect(await needProblemInSkill(SKILL, 'OPENAI_API_KEY', 'missing-key', source())).toBeNull();
    expect(await needProblemInSkill(SKILL, 'ANTHROPIC_API_KEY', 'missing-key', source())).toMatch(/does not name/);
  });
  test('a name the file does not hold is refused', async () => {
    expect(await needProblemInSkill(SKILL, 'yt-dlp', 'missing-program', source())).toMatch(/does not name "yt-dlp"/);
  });
  test('a tool that is not a skill is refused before any read', async () => {
    const read = source();
    expect(await needProblemInSkill('https://mcp.example.org/sse', 'ffmpeg', 'missing-program', read)).toMatch(/skill URL/);
    expect(read.asked).toEqual([]);
  });
  test('an unreadable file refuses the name rather than dropping it', async () => {
    expect(await needProblemInSkill(SKILL, 'ffmpeg', 'missing-program', source(null))).toMatch(/could not be read/);
  });
  test("GitHub's limit is said as such", async () => {
    const limited = { listing: async () => 'rate_limited' as const, file: async () => null };
    expect(await needProblemInSkill(SKILL, 'ffmpeg', 'missing-program', limited)).toMatch(/hourly limit/);
  });
  test('a repository without that skill is refused', async () => {
    expect(await needProblemInSkill('https://github.com/acme/skills?skill=audio', 'ffmpeg', 'missing-program', source())).toMatch(
      /no single SKILL.md/,
    );
  });
});
