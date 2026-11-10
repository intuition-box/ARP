# 99 — Two defects task 108's live run found

**Task:** `docs/tasks/110-two-defects-from-108.md`
**Completed:** 2026-11-10
**Commit:** `fde2f59`..`054bffa`, branch `worktree-agent-af6870f82b8f1c11f`
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/skill-requires.ts` — `shellSegments`: splits on `|`, `;`, `&&`, `||` only outside
  quotes, a `#` at a word's start ends the line, a backslash escapes; quote tracking across lines reads the
  line without its comment.
- `packages/protocol/test/skill-contents.test.ts`, `scripts/test/skill-requires.test.ts` — the pptx lines and
  the splitting rules.
- `apps/cli/src/share.ts` — reads `<cwd>/skills-lock.json` beside the global lock and the receipts; two tests
  in `apps/cli/test/share.test.ts`.
- `data/measurements/skill-contents-2026-11-10T1325.json` (new; `0938` kept), `apps/web/src/data/skill-contents.json`
  rebuilt, `packaging/` regenerated, `docs/22` amended.

## Surprises

- The false programs came from `readRequires`, not `readSkillContents`: a quoted grep pattern (`lorem|ipsum`)
  and a trailing comment (`; prints`). The comment's apostrophe (`slide's`) also opened a quote that hid the
  fence's following lines.
- Ten entries in six skills, not three in one. Diffing the two measurements per skill reproduces exactly the
  task file's table: 382 to 372 entries, 292 to 291 skills, nothing added.

## Decisions made

- **`arp share` uses its own cwd** — a failure line records no cwd, so the project lock is the one `arp share`
  runs in; recording the cwd would change `failures.jsonl` and is left out. No ADR (obvious fix).

## Rules touched

- `.claude/rules/code.md`, `claims.md`, `workflow.md` — sufficient. ADR `0064` (new dated measurement, old one
  kept) followed.

## Suggestions for future tasks

- `data/catalogue/skill-requires.json` still carries `lorem` and `ipsum` from the 2026-11-04 measurement; a new
  `scripts/measure/skill-requires.ts` run refreshes it (listed in the task as found, not fixed).
- When a parser changes, diff the old and new measurement per row, not only the totals; that is what proved
  every removed name was the fix's.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier for the parser fix (the declared reading becomes accurate, no move up) and observed
tier for the share fix (a failure on a project install can carry its source when shared); neither moves ARP
to a higher tier.
