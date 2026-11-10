# 98 — Ask whether a skill worked during the task, not at Stop

**Task:** `docs/tasks/109-ask-during-the-task.md`
**Completed:** 2026-11-10
**Commit:** `ce31d64` (code, tests, packaging), `d3cb884` (docs)
**Verifier verdict:** PASS

## What shipped

- `apps/hook/src/worked.ts` — `askOnSkill` marks a skill in `~/.arp/asked.jsonl` and returns `requestFor`, once per skill per session, never for ARP's own; `requestOutput` wraps it as `PostToolUse` `additionalContext`; `stop` records `arp: <skill> worked|failed|unsure` and returns `null` always. Block path, `stop_hook_active`, `MAX_ASKED`, `questionFor` removed.
- `apps/hook/src/hook.ts` — after a successful `Skill` call is recorded, prints the request.
- `apps/cli/src/install/edits.ts`, `targets.ts` — `PostToolUse` split: `^(?!Skill$)` async, `Skill` waited on (5 s); `waitedLabel` names it in `init`'s summary. `packaging/` regenerated.
- `apps/hook/test/worked.test.ts` (14 tests), `apps/cli/test/install.test.ts` (both rows, the regex excludes `Skill` only).
- ADR `0179`; ADR `0169` status marks the amendment; docs 22, 28, 31, README, FUTURE, CLAUDE.md router line, hook README/package.json, `local-outcomes.ts`, site pages `cli`, `local-memory`, `uninstall`; CHANGELOG Unreleased entry.

## Surprises

- An async hook's `additionalContext` reaches the model a turn late, so the `Skill` row has to be waited on, and a second matcher (negative lookahead) keeps the skill call from running the hook twice.
- `additionalContext` on `Stop` continues the turn as `decision: "block"` does; there was no cheaper fix at Stop.

## Decisions made

- **Ask on `PostToolUse` of `Skill`, read at `Stop`, never continue the turn** — the line rides in the reply the model writes anyway; a forgotten line records nothing. ADR: `.claude/choices/0179-ask-whether-a-skill-worked-during-the-task.md`.
- **Two `PostToolUse` rows over one waited-on row** — every other tool stays in the background. Same ADR.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Grep for the old Stop wording found no live stale site. Two dated strike notes in append-only ADRs (`0140:15`, `0166:116`) still say "asks the model on `Stop`", true as of ADR `0169` and pointing at it; left as record.
- `.claude/rules/code.md`, `workflow.md` — sufficient.

## Suggestions for future tasks

- A hook change that alters what the model sees needs a live `claude -p` run, not only mocked payloads: task 100 shipped the block on mocks and task 108's live run found the defect.
- Grok Build's handling of a negative-lookahead matcher and of `PostToolUse` `additionalContext` is untested (ADR `0179` Negative).

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: the model's word that a skill did its job; it does not move ARP up the ladder, it keeps that declared record from replacing the session's result under `claude -p`.
