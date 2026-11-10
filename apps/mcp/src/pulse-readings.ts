import type { SkillPulse, SkillSearchResult } from '@arp-protocol/core';

import bundled from '../../../data/catalogue/pulse-readings.json';

type Read = Extract<SkillPulse, { status: 'read' }>;
/** What the bundle keeps of a read: everything but the search's own fields. */
export type DatedReading = Omit<Read, keyof SkillSearchResult | 'status' | 'listingReadAt' | 'datedReading'>;
export type PulseReadings = { measuredAt: string; by: string; skills: Record<string, DatedReading> };

// Written by `scripts/build/build-pulse-readings.ts` from `readPulse`'s own output; `test/pulse-readings.test.ts`
// holds its fields to the reader's, which is what a JSON import's widened types cannot do.
const READINGS = bundled as unknown as PulseReadings;

const keyOf = (result: SkillSearchResult) =>
  `github.com/${result.source}?skill=${encodeURIComponent(result.skill)}`.toLowerCase();

/**
 * A catalogued skill from ARP's dated reading instead of GitHub (task 113): no request, and the answer says when it
 * was read and by what. `null` for a skill the reading does not hold, which is then read live.
 */
export function datedPulse(result: SkillSearchResult, readings: PulseReadings = READINGS): SkillPulse | null {
  const entry = readings.skills[keyOf(result)];
  if (entry === undefined) return null;
  return { ...result, ...entry, status: 'read', datedReading: { readAt: readings.measuredAt, by: readings.by } };
}
