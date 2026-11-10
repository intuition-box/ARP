# 0172 — The sweep: every open task is closed, excluded, or folded into a live one

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** the user, 2026-11-10, after a list of every task never finished: group them by
interest, then close or exclude them (« et comme ça on a plus tout ça »). `docs/tasks/103-the-sweep.md`.

## Context

On 2026-11-10, 28 task files in `docs/tasks/` had a status line, or a row in `STATE.md`'s open table, that did not say done (tasks 98 to 102, started that day, not counted). Read against
`.claude/learning/INDEX.md`, six of them (35, 37c, 43, 44, 48, 50) had a `task-verifier` PASS and a
post-mortem already: only their status line was stale (for 37c, only its row in `STATE.md`'s open
table; `docs/tasks/37` already said closed and is not edited). The rest were plans never started, tasks
stopped by the user, work replaced by later tasks, or waits on the mainnet port. A backlog of that
kind misleads more than it informs: `STATE.md` exists so that one read tells where the project is.

The same day the user approved five new features, run as tasks 98 to 102 by the coordinating
session. Several old tasks are the same idea as one of them.

## Decision

Every open task gets one of four outcomes, written on its own status line with this ADR's number:

| outcome | tasks |
| --- | --- |
| **Done**: verified before, status line was stale | 35, 37c, 43, 44, 48, 50 |
| **Done**: finished by a later task, never verified on its own | 59 (its last 10 filings, task 75: `docs/tasks/75`) |
| **Closed at what was built**: the rest is dropped or moved | 16 (half 1), 24 (step 3 deferred), 28 (first batch; punch list to `FUTURE.md`), 33 (33a–33d, 33i's first half; 33h → 102, 33f after the tester round, 33e and 33g excluded), 61 (A, C, D, E; B to `FUTURE.md`), 68 (phases 1–4; phase 6 done by tasks 70 and 71, phase 5 to `FUTURE.md`) |
| **Folded into a live task** | 86 → 98; 45 and 83 → 102; 54 → 100; 38 and 70 → the tester round (one task, not yet written) |
| **Excluded**: replaced, stopped, or out of today's scope | 04, 05 (Base Sepolia and Vercel, abandoned by the pivot), 19 (replaced by the evidence ladder, `docs/32`), 22 (steps 2–3 judged not justified, 2026-10-27), 34 (replaced page by page by tasks 57, 80, 81, 95, 96), 41 (to the mainnet port, `docs/27`), 64 (stopped by the user 2026-11-05; the score shipped through `arp_pulse`, ADRs `0138`, `0143`), 69's landing scenes (replaced by the galaxy landing, task 81) |

**Task 67 is not decided**: its list is frozen and its runs were never made. The user chooses
between finishing it and excluding it until a demo is needed. Its status line is left as it is.

Task 28's item 2, the mint question, is recorded as ADR `0173`.

## Alternatives considered

- **Delete the stale task files.** Rejected: task files are the record other ADRs and post-mortems
  cite, and git history alone does not tell a reader which ones were abandoned on purpose.
- **Leave them open.** Rejected by the user.
- **Re-run `task-verifier` on 35, 37c, 43, 44, 48, 50.** Not needed: each already has a PASS and a
  post-mortem in `.claude/learning/INDEX.md` (33, 42, 31, 34, 48, and `learning/57` for 37c).

## Consequences

**Positive:**
- `STATE.md`'s open-tasks table loses the rows this closed; the per-task history table further down
  keeps every row, annotated with the outcome.
- New work (98 to 102) does not compete with a half-written plan for the same thing.

**Negative:**
- An excluded task's open questions are not answered, only parked. A reader who needs one finds it
  in the task file, which stays.

**Neutral (worth knowing):**
- An exclusion is reversible: a new task can cite the old file and pick it up.

## References

- Related rule: `.claude/rules/workflow.md` (task close, STATE.md)
- Related doc: `docs/32_THE_EVIDENCE_LADDER.md`, `docs/27_THE_PASSAGE_TO_MAINNET.md`
- Related ADR: `0173` (the mint question), `0147` (the ladder)
