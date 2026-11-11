# 121 — The landing's scenes are static: they read nothing

**Task:** `docs/tasks/133-the-landing-scenes-are-static.md`
**Completed:** 2026-11-11
**Commit:** `uncommitted` (branch `worktree-agent-a400dda2c7e5d6abc`)
**Verifier verdict:** PASS

## What shipped

- `apps/web/src/pages/Landing.tsx` — every scene renders `landing-sample.ts`; no hook, no read states; pulse head « Lines ».
- `apps/web/src/services/landing-sample.ts` — split into `SAMPLE_LINES`, `SAMPLE_TOOL`, `SAMPLE_LINE`, `SAMPLE_READINGS`, `SAMPLE_FIELD`, same values; `fieldOrSample` gone.
- `apps/web/src/services/landing-field.ts` — types, `LANDING_DOTS_PER_RING` and `readVocabularyIds` (agent page) only.
- Deleted: `hooks/use-landing-field.ts`, `services/__tests__/landing-field.test.ts`, `useRecentDeclarations`, `.arp-gx-quiet`/`.arp-gx-empty` CSS.
- `apps/web/src/components/brand/GalaxyField.tsx` — `field` non-null, empty-field ring removed.
- `apps/web/src/pages/Landing.test.tsx` — sample on first render; no `fetch`, `getRecentDeclarations`, `listTools`, `getPulseUsage`, `readPulse` or `hiddenAtomIds` call on either chain.
- ADR `0197`; ADR `0152` status line; `rules/ui.md` "How it works" bullet; `LANDING-GALAXY.md` dated note; `STATE.md` header, row 81, row 133.

## Surprises

- The trigger was a hidden-list lag (test agent 43 created before `arp-test-identities.json` was extended), not a code defect: any "show sample while empty" rule is one unhidden test identity away from showing a test line.
- ui-reviewer round 1 failed on `GalaxyField`'s still-nullable `field`: removing a read leaves type-level dead branches that tsc and lint do not flag.

## Decisions made

- **The scenes read nothing** — user decision 2026-11-11; reverses ADR `0152` §5, §6 and its amendment for the landing. ADR: `.claude/choices/0197-the-landing-scenes-are-static.md`.
- **Pulse head drops the chain** — naming a chain would say the sample came from it.
- **Activity bar left reading** — chrome on every page, out of scope; listed for the user.
- **No agent link on the landing** (added the same session, user decision relayed by the orchestrator, « brouille notre proposition initiale ») — the hero and first entry point now open `/tools`; replacing rather than removing is the task's choice, flagged for the user; no ADR (ADR `0139` concerns the search).

## Rules touched

- `.claude/rules/ui.md` — the anti-template "How it works" bullet amended in place (ADR `0197`); the old "reads a figure off the chain" wording survives only in the append-only ADR `0152`, the closed task 81 file and the design handoff, all historical.

## Suggestions for future tasks

- When a read is removed, follow the type it fed (`X | null` props, empty-state branches, CSS for those states) to the end; the gates do not see them.
- A "no network call" test needs both a `fetch` spy and mocks of the core reads: the spy alone misses a read that fails before transport.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: the landing illustrates declared lines with a static sample and stops presenting chain reads, so it does not move ARP up the ladder, and it removes a surface where a test identity's declaration was shown as somebody's use.
