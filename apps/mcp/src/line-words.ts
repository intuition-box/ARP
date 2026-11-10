import { BECAUSE_LABEL, findToolAtoms, HAS_OUTCOME_LABEL, NEEDS_LABEL, WITH_LABEL } from '@arp-protocol/core';

/** The predicates a line is written with, looked up by their data in the query that finds the results' atoms. */
export const LINE_WORDS: readonly string[] = [HAS_OUTCOME_LABEL, BECAUSE_LABEL, NEEDS_LABEL, WITH_LABEL];

/** An id no triple can carry: a word with no atom has written no line, and its edges must still find none. */
const NO_ATOM = `0x${'0'.repeat(64)}`;

/**
 * The four predicate ids from what the graph returned. A word absent from the graph gets `NO_ATOM`, so the read
 * still counts `uses` declarations, as it did when the ids came from `calculateAtomId` on the chain.
 */
export function lineWordIds(found: ReadonlyMap<string, string>) {
  const id = (word: string) => found.get(word) ?? NO_ATOM;
  return {
    hasOutcome: id(HAS_OUTCOME_LABEL),
    because: id(BECAUSE_LABEL),
    // What a failure said was missing, and what a worked line said was added (ADR `0166`).
    needs: id(NEEDS_LABEL),
    with: id(WITH_LABEL),
  };
}

type LinePair = { hasOutcome: string; because: string };
let known: Promise<LinePair> | null = null;

/**
 * `has outcome` and `because` on their own, for an agent's lines, which read only those two: one GraphQL request,
 * and none on the chain. Kept for the process once both exist; until then, and after a failure, asked again, so
 * a word written later is seen by a server that keeps running. `needs` is absent on 13579 (2026-11-10), which is
 * why the pair is kept apart from the four.
 */
export function lineWordAtomIds(graphqlUrl: string, find: typeof findToolAtoms = findToolAtoms): Promise<LinePair> {
  known ??= find([HAS_OUTCOME_LABEL, BECAUSE_LABEL], { graphqlUrl }).then(
    (found) => {
      if (!found.has(HAS_OUTCOME_LABEL) || !found.has(BECAUSE_LABEL)) known = null;
      const { hasOutcome, because } = lineWordIds(found);
      return { hasOutcome, because };
    },
    (error: unknown) => {
      known = null;
      throw error;
    },
  );
  return known;
}
