# Task 97 — A line names what was missing, and what made it work

**Status:** verified 2026-11-10, `task-verifier` PASS (round 1), commits `225dfb1`..`dd99149`, post-mortem `.claude/learning/86-a-line-names-what-was-missing.md`; `intuition-integrator` PASS, its two non-blocking items fixed in `dd99149`. Not pushed.
**ADR:** `0166`.
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`, `intuition`. **Reviewer:** `intuition-integrator`.

## Why

A form B line says `(T3, because, missing-program)` and stops: the next agent does not learn which
program. The hook already sees it locally. The user decided on 2026-11-10 that a line should carry it:
agent A writes failed → missing-program → needs ffmpeg; agent B installs ffmpeg, it works, and B writes
worked → with ffmpeg.

## Deliverables

1. The level: `(T4, needs, <name>)` after `missing-program` or `missing-key`, `(T3, with, <name>)` on a
   worked line (`prepareUsageContext`, `packages/protocol/src/declare/usage-context.ts`).
2. The guard (`packages/protocol/src/declare/line-need.ts`): a program
   `^[a-z0-9][a-z0-9._+-]{0,39}$` or a variable's name `^[A-Z][A-Z0-9_]{2,63}$`, published only when the
   skill's SKILL.md names it whole. Tested with a user path, a user program and a user variable the error
   names and the SKILL.md does not: nothing is published.
3. The hook keeps the name in `failures.jsonl` only when the guard passes (`needOf`); `arp share` shows and
   sends it; `arp line --needs` / `--with`.
4. The line request version 4 signs `need`; v3 no longer verifies; the desktop loop signs it in the same
   commit. The sponsor's `/line` reads the SKILL.md from GitHub at `HEAD` and refuses a name it does not
   hold.
5. `arp_pulse` and the pulse reader show `needs` / `with` on a line and count `by_need` / `by_with`; no
   score change.
6. `docs/28`, `docs/32`, `security.md`, `FUTURE.md`, `apps/web/public/docs/lines.md` and `cli.md`, `STATE`.
   `scripts/measure/need-level-cost.ts` reads the level's cost.

## Do not do in this task

Write on chain, sign with a real key, deploy, publish or push. Site display (task 96 owns the skill page).

## Gates

`packages/protocol` test and lint; `apps/hook` test and lint; `apps/sponsor` test and lint; `apps/mcp`
test and lint; `apps/cli` test, `packages --check`, `check:node`; root `bun run check`, `bun run
test:scripts`.
