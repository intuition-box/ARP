# Task 142 — The backlog leaves the public repository, and a short README for users

**Status:** built 2026-11-12 on `task-142-future-readme`, from `dev` `314dd77f`. Task 142, ADR `0202`,
post-mortem `130`, allocated by the orchestrator.
**Rules:** `workflow.md`, `claims.md`; `docs/30_THE_POSITIONING.md` for the README.
**Required skills:** `arp-contributing`.

## Why

Two decisions by the user, 2026-11-12: `FUTURE.md` is internal planning and leaves this public
repository; the README is for a user, not a developer, and is short.

## What changes

1. `FUTURE.md` copied as-is to the private business repository and committed there; deleted here.
2. `.claude/rules/workflow.md`: a deferred idea goes to the backlog kept outside this repository
   (ADR `0202`). Also `CLAUDE.md`'s directory map, `.claude/STATE.md`,
   `.claude/skills/arp-contributing/SKILL.md`, `docs/33_THE_HIRE_LOOP.md`, and seven code comments
   (`apps/web/src/App.tsx`, `apps/web/src/services/declare-use.ts`,
   `apps/web/src/services/term-shape-view.ts`, `packages/protocol/src/term-shape.ts`,
   `packages/protocol/src/arp/x402-networks.ts`, `packages/protocol/src/x402-feed.ts`,
   `scripts/measure/emitted-utilities.ts`). Append-only records (ADRs before `0202`, task files,
   post-mortems) keep their text.
3. `README.md` rewritten for a user: the signature and the message from `docs/30`, two sentences on
   what ARP is (Intuition testnet; every result about a skill so far is from ARP's own test agents,
   `scripts/measure/line-writers.ts`), the two plugin commands, one line per other route, what
   happens after, links to the site and its docs, one line for developers, the licence.
4. What the old README held for developers and `apps/web/public/docs/developers.md` did not: the
   table of each piece's README and the `@arp-protocol/core` example, added there. The repository
   tree, the build commands and the contributing rules were already there. The discovery evaluation's
   figures stay in `docs/01_PROJECT_CONTEXT.md`.

## Do not do in this task

- Rewrite git history to remove `FUTURE.md`.
- Name the private repository's path in a public file.

## Checked

- Private repository visibility: `gh repo view --json visibility` answered `PRIVATE`.
- `grep -rn "FUTURE" --exclude-dir=node_modules --exclude-dir=.git .` after the change: hits only in
  append-only records and one `.claude/STATE.md` row that names the old file on purpose.
- The README's "every result written about a skill comes from ARP's own test agents":
  `bun run scripts/measure/line-writers.ts` on 2026-11-12, testnet 13579, `"independent": []`
  (`data/measurements/line-writers-2026-11-12T0845.json`).
- Gates, 2026-11-12: root `bun run check` 0; `apps/web` `tsc -b` 0, `lint` 0, `check:tokens` 0, `test`
  162 files, 1,444 passed, 2 skipped (it bundles `public/docs`); `packages/protocol` `tsc --noEmit` 0
  (three comments changed there); `apps/cli` `packages --check` matches (the README is not packaged).
  `scripts/measure/emitted-utilities.ts` changed only in a comment; `check:scripts` is part of
  `bun run check`.
