# 92 — The sweep: close or exclude every open task

**Task:** `docs/tasks/103-the-sweep.md`
**Completed:** 2026-11-10
**Commit:** `cf6596b` (amended), branch `chore/103-the-sweep`, worktree `../ARP-103`
**Verifier verdict:** PASS (second pass; the first returned a six-item punch list)

## What shipped

- `docs/tasks/*.md` — a closing line citing ADR `0172` on 26 task files (task 67 left to the user,
  98–102 untouched).
- `.claude/choices/0172-the-sweep.md` — the outcome of each of 28 open tasks, in five rows.
- `.claude/choices/0173-arp-mints-when-it-has-to.md` — the user's 2026-11-03 mint decision, which
  amends ADR `0033`'s "does not mint one for anybody else".
- `FUTURE.md` — "Left by the sweep": task 28's punch list, 61 B, 68 phase 5, 67.
- `.claude/STATE.md` — the mint sentence corrected, item 2 done, closed rows removed from the
  open-tasks table, the history table annotated, a task 103 row.

## Surprises

- Six "unverified" tasks (35, 37c, 43, 44, 48, 50) already had a PASS. Only their status lines
  were stale. For 37c only the `STATE.md` row was stale: `docs/tasks/37` already said closed.
- Task 59 was finished by task 75 but never verified on its own. The first draft put it in the
  "verified before" row.
- Task 33's sub-tasks 33e to 33h were not runtime installs. The first closing line sent them to
  the tester round anyway.

## Decisions made

- **Four outcomes per task** (done, closed at what was built, folded, excluded), written on each
  status line. ADR: `.claude/choices/0172-the-sweep.md`.
- **ARP mints into the ERC-8004 registry when it has to.** ADR:
  `.claude/choices/0173-arp-mints-when-it-has-to.md`.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Check 5 caught a stale copy: `STATE.md` holds the
  task 61 row twice, and the first pass updated only one.
- `.claude/rules/workflow.md` — sufficient.

## Suggestions for future tasks

- A sweep checks the claimed outcome of each sub-task, not only the task as a whole.
- "Done" is claimed only with a PASS in `learning/INDEX.md`. Work finished by a later task is a
  separate outcome.
- `STATE.md` holds tasks in two tables. Update or remove both copies of a row.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

No column or tier: a docs-only cleanup that removes work competing with tasks 98 to 102, which
target the skill column's observed and corroborated tiers. It changes no signal, so ARP does not
move.

**Amended 2026-11-10, after this post-mortem:** the user excluded task 67 (« 67 on exclu »). Its closing line, ADR `0172`, `FUTURE.md` and `STATE.md` say so; this entry is otherwise unchanged.
