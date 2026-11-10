import {
  endpointFacts,
  repoFacts,
  type OutsideFact,
  type OutsideSignals,
} from '@arp-protocol/core';

import outsideFile from '../../../data/catalogue/outside-signals.json';

/**
 * Somebody else's figures, dated and sourced (task 101, ADR `0170`): whether GitHub says a repository
 * is archived or gone, how many of its issue titles name a failure, and what x402 Doctor's Trust Index
 * says about an endpoint. Bundled from `data/catalogue/outside-signals.json`
 * (`scripts/build/build-outside-signals.ts`), so no call reaches a third party.
 *
 * Shown, never scored: nothing here is read by `pulse-score.ts` or by any order (ADR `0143`).
 * Absent, not empty, when nothing was read about the thing: silence is not "nothing found".
 */
// The shape `build-outside-signals.ts` writes, typed by the same module that reads it.
const OUTSIDE = outsideFile as OutsideSignals;

const present = (facts: OutsideFact[]): { outside?: OutsideFact[] } =>
  facts.length === 0 ? {} : { outside: facts };

/** A skill's repository facts, its source given as `owner/name`. */
export function skillOutside(source: string, skill: string): { outside?: OutsideFact[] } {
  if (!/^[\w.-]+\/[\w.-]+$/.test(source)) return {};
  return present(
    repoFacts(OUTSIDE, `github.com/${source}?skill=${encodeURIComponent(skill)}`, skill),
  );
}

/** A tool's or skill's facts, from its atom label. */
export function labelOutside(label: string | null): { outside?: OutsideFact[] } {
  if (label === null) return {};
  const skill = /\?skill=([^&#]+)/.exec(label)?.[1];
  return present(
    repoFacts(OUTSIDE, label, skill === undefined ? undefined : decodeURIComponent(skill)),
  );
}

/** An endpoint's facts from the Trust Index, credited as its licence asks. */
export function endpointOutside(url: string | null): { outside?: OutsideFact[] } {
  return url === null ? {} : present(endpointFacts(OUTSIDE, url));
}

/** What `outside` is, said once per answer that carries it. */
export const OUTSIDE_NOTE =
  "`outside` is somebody else's figure, with who said it (`per`), the day it was read (`on`) and where to ask again (`check`). It is not ARP's figure and never moves an order.";
