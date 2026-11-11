# 0197 — The landing's scenes are static: they read nothing

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** the user, 2026-11-11, task 133 (`docs/tasks/133-the-landing-scenes-are-static.md`)

Reverses ADR `0152` §5 and §6, and §6's amendment of 2026-11-10, for the landing. Amends
`.claude/rules/ui.md`'s "How it works" bullet, which carried both.

## Context

Since task 81 the landing's scenes 0 to 2 read the chain: the pulse panel the recent lines, the
claim field the most declared tool with its lines and a paid word from its `SKILL.md` on GitHub.
While the chain answered with nothing they showed the design reference's sample
(`services/landing-sample.ts`), unmarked since 2026-11-10, and real data replaced it panel by panel.

On 2026-11-11 production showed a real line in scene 1, « pdf used by Agent 13579:43 ». Agent 43 is
one of ARP's own test agents, created that day by ARP's tests. The hidden list
(`apps/web/src/data/arp-test-identities.json`) still ended at agent 38 — commit `4aa2c1a9` extended
it to 43 the same evening — so the chain no longer answered with nothing and the sample gave way. The
user had expected the sample to stay. His words, 2026-11-11: « je veux que tu vires ces variables,
le front à cet endroit est static, rien n'est lu ».

## Decision

**The landing's scenes are a static illustration.** Every scene shows `landing-sample.ts`, on
either chain, and nothing on `/` reads the chain, the indexer or any API for them. The hooks and
the reads only the landing used are deleted (`use-landing-field.ts`, `useRecentDeclarations`, the
field's loader, its paid-word read and their tests). So are the states a read needs: "reading…",
"The graph did not answer" and the empty panels. `services/landing-field.ts` keeps the field's
types and the line vocabulary read, which the agent page uses.

The pulse panel's head drops the chain: « Lines », not « Lines · testnet ». It is the same sample
on both chains, and naming a chain would say the rows came from it.

## Alternatives considered

- **Keep reading, and hide the new test agent** — fixes 2026-11-11's instance, not the class: the
  next test identity created before the hidden list is updated shows again, and the user asked for
  the reads to go, not for a better filter.
- **Read, but show the sample always and the real data nowhere** — a read whose result nothing
  shows is a request for nothing. Deleted instead.

## Consequences

**Positive:**

- The front page shows the same thing to every reader, and no test identity can reach it.
- `/` makes no request for its scenes: no indexer, RPC or GitHub call on a visit.

**Negative:**

- The landing no longer shows the product's own figure read from the chain (ADR `0152`'s first
  positive consequence is gone). The index pages (`/agents`, `/tools`, `/activity`) are where the
  chain is read.
- The sample carries no mark (the 2026-11-10 amendment stands on that point), so a first-time reader
  can take its rows for real ones. The defence is unchanged: names with no chain prefix
  (`agent 1` to `agent 5`), no id that resolves.

**Neutral (worth knowing):**

- The app's chrome on `/` still reads in one place: the activity bar (`ActivityLog`,
  `useChainActivity`), only while it is opened. It is not part of the scenes and is on every page.
- `GalaxyField`'s `field` prop is no longer nullable, and its dashed "empty field" ring is gone:
  both existed for a read that had not answered or had found no claim.
- `docs/design/landing-galaxy/LANDING-GALAXY.md`'s "Data" section describes the reads this ADR
  removes; it is the design handoff and keeps its text, with a dated note.

## References

- Related rule: `.claude/rules/ui.md` (the "How it works" bullet)
- Related ADR: `0152` (§5, §6 and the 2026-11-10 amendment, reversed here for the landing)
- Post-mortem: `.claude/learning/121-the-landing-scenes-are-static.md`
