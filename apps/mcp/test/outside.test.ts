import { describe, expect, it } from 'vitest';

import { endpointOutside, labelOutside, skillOutside } from '../src/outside.js';

// Against the committed `data/catalogue/outside-signals.json` (task 101), read 2026-11-10.
describe('outside facts, as an agent receives them', () => {
  it("gives a catalogued repository GitHub's word on its state, with the day and the request", () => {
    const facts = labelOutside('github.com/browserbase/mcp-server-browserbase').outside ?? [];
    expect(facts[0]).toMatchObject({
      says: 'repository archived by its owner',
      per: 'GitHub',
      check: 'https://api.github.com/repos/browserbase/mcp-server-browserbase',
    });
    expect(facts[0]?.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("names the failure-issue search a reader can run again, and a skill's own share of it", () => {
    const facts = skillOutside('mattpocock/skills', 'grill-me').outside ?? [];
    const issues = facts.find((fact) => fact.per === 'GitHub search');
    expect(issues?.says).toMatch(/issue titles? names? a failure \(\d+ open\); \d+ among the newest read name this skill$/);
    expect(issues?.check).toContain('https://github.com/mattpocock/skills/issues?q=');
  });

  it('credits the Trust Index on an endpoint whose host it read, and says nothing of one it did not', () => {
    const facts = endpointOutside('https://centralcity.ai/a2a').outside ?? [];
    expect(facts[0]?.per).toBe('x402 Trust Index by x402 Doctor (fizzl.eu)');
    expect(facts[0]?.licence).toBe('CC BY 4.0');
    expect(endpointOutside('https://never-read.example/mcp')).toEqual({});
    expect(endpointOutside(null)).toEqual({});
  });

  it('says nothing about a repository nobody read, which is not "nothing found"', () => {
    expect(skillOutside('someone/elsewhere', 'x')).toEqual({});
    expect(skillOutside('not a source', 'x')).toEqual({});
    expect(labelOutside(null)).toEqual({});
  });
});
