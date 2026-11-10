import { readSkillContents, readSkillFacts } from '@arp-protocol/core';
import { describe, expect, it } from 'vitest';

import bundled from '../../../data/catalogue/pulse-readings.json';
import { datedPulse, type PulseReadings } from '../src/pulse-readings.js';
import { readWindow } from '../src/pulse-window.js';

const readings = bundled as unknown as PulseReadings; // the file under test, checked field by field below
const entries = Object.values(readings.skills);
const sorted = (value: object) => Object.keys(value).sort();

describe('the dated pulse reading (task 113)', () => {
  it('holds the fields the reader returns, so a change to the reader fails here until the reading is redone', () => {
    const facts = sorted(readSkillFacts('', []));
    const contents = sorted(readSkillContents([{ path: 'SKILL.md', text: '' }]));
    expect(entries.length).toBeGreaterThan(400);
    for (const entry of entries) {
      for (const field of facts) expect(entry).toHaveProperty(field);
      expect(sorted(entry.contains)).toEqual(contents);
      expect(typeof entry.path).toBe('string');
      expect(typeof entry.contentId).toBe('string');
    }
  });

  it('answers a catalogued skill as read, with the date and the script, and keeps the search fields', () => {
    const result = { source: 'vercel-labs/skills', skill: 'find-skills', installs: 7, installsText: '7', url: 'https://skills.sh/x' };
    const pulse = datedPulse(result);
    expect(pulse).toMatchObject({ ...result, status: 'read', datedReading: { readAt: readings.measuredAt, by: 'scripts/measure/pulse-readings.ts' } });
  });

  it('leaves a skill it does not hold to the live read', () => {
    expect(datedPulse({ source: 'nobody/none', skill: 'nothing', installs: null, installsText: null, url: null })).toBeNull();
  });

  it('costs no request for a catalogued skill in the window', async () => {
    let asked = 0;
    const source = {
      listing: async () => ((asked += 1), 'unreachable' as const),
      file: async () => ((asked += 1), null),
      repository: async () => ((asked += 1), null),
    };
    const pulses = await readWindow(
      [{ source: 'vercel-labs/skills', skill: 'find-skills', installs: null, installsText: null, url: null }],
      source,
      { limit: 1, hasToken: false, setAside: () => false, dated: (row) => datedPulse(row) },
    );
    expect(pulses[0]?.status).toBe('read');
    expect(asked).toBe(0);
  });
});
