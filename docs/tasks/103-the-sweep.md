# Task 103 — The sweep: close or exclude every open task

**Status:** verified 2026-11-10, `task-verifier` PASS (round 2) at `cf6596b`, post-mortem `.claude/learning/92-the-sweep.md`; on `chore/103-the-sweep` (worktree `../ARP-103`), merged after tasks 98 to 102.
**ADR:** `0172` (the sweep), `0173` (ARP mints when it has to).
**Rules:** `workflow.md`, `claims.md`. Docs only: no code, no chain.

## Why

The user, 2026-11-10, after a list of every task never finished: group them by interest and close
or exclude them, « et comme ça on a plus tout ça ». The grouping and the outcome of each were
approved the same day (« ok parfait »).

## Deliverables

1. **A closing line on each open task's status**, citing ADR `0172`, with one of four outcomes:
   done (status was stale), closed at what was built, folded into a live task, or excluded. The table
   is in ADR `0172`.
2. **ADR `0173`**: the mint question of task 28 item 2 and `STATE.md`, decided by the user on
   2026-11-03.
3. **`FUTURE.md`**: what an excluded or closed task leaves that someone may want later (task 28's
   punch list, task 61 deliverable B, task 68 phase 5).
4. **`STATE.md`**: the "ARP mints nothing" sentence corrected, the user's 2026-11-03 item 2 marked
   done, the open-tasks table loses the rows this closes, the history table's rows are annotated, task 103 added.
5. `bun run scripts/build/build-claude-index.ts`.

## Do not do in this task

- Touch tasks 98 to 102 or their files: the coordinating session runs them.
- Decide task 67: it is the user's choice, and its status line is left as it is.
- Delete a task file. An excluded task stays readable.
- Change code.

## Gates

```
git grep -n "ARP mints nothing" -- ':!.claude/learning' ':!.claude/choices'
bun run scripts/build/build-claude-index.ts
```

Once this task is committed, the first prints three lines, each a quote and not the claim:
`docs/tasks/28` line 7, the task's original header, answered by the closing line below it, and two
lines of this file, which quote it in the deliverables and in the command. ADRs are outside its scope
on purpose. Then `task-verifier`.

## Evidence ladder

No column, no tier: this task moves nothing up the ladder. It removes work that competed with the
tasks that do (98 to 102, the skill column's observed and corroborated tiers), which is its only
claim.
