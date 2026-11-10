# 101 — Before you install: the contents panel answers the questions a person asks

**Task:** `docs/tasks/112-before-you-install.md`
**Completed:** 2026-11-10
**Commit:** uncommitted (branch `worktree-agent-af0ef7116e2ddff59`, `fdf2c8a3..22e09f42` on `main` `452e90e`)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/skill-needs.ts` — keys with their line, programs a script runs, packages that drive a program, lines that say a program is needed.
- `packages/protocol/src/before-install.ts` — paid-service table, the question view, the summary, `contentsLines` (moved from `skill-contents.ts`).
- `packages/protocol/src/pulse.ts` — `PulseDepth`: before an install, up to 80 text files of the skill's directory, stopped 1.5 s before the hook's 6 s (`apps/hook/src/pre-install.ts`).
- `apps/web` — `BeforeInstall` (skill page content column, `/pulse`), `BeforeYouCall` (agent page content column), `TrustIndexVerdicts` inside its Payment row, Identity alone on the right; `SkillContains`, `AgentContains`, `AgentTrustIndex` removed.
- `scripts/measure/skill-contents.ts --commits-from`; `data/measurements/skill-contents-2026-11-10T1647.json` read at the 13:25 run's commits; bundle and `packaging/` regenerated; `docs/22` hook section amended.

## Surprises

- The hook read SKILL.md alone, so hyperframes answered "no keys · nothing to install named" at install time while the site found three keys; reading the directory was added mid-task (deliverable 6).
- "Not read" counts depend on the asset filter, not on `why: binary` alone: 9 skills skip a non-binary file, 8 show the row, because `.gitkeep` is filtered as an asset. Re-derive through `beforeInstall`, not the raw `skipped` list.
- A first "named as needed" pass over every reference file gave 94; prose matches dominate unless the pattern is anchored to a needs-verb line.

## Decisions made

- **Questions, not lists** — the panel orders rows by what a person asks (asks for, paid, needs, runs, sends to, hidden, not read), and only secrets and SKILL.md-set names are shown as keys. ADR: `.claude/choices/0182-before-you-install-answers-the-questions-a-person-asks.md`.
- **Before you call / Before you install in the content column** — decision inputs are content, identity is facts (ui.md layout). ADR `0182`.
- **Pin a re-measurement to an earlier run's commits** — so before/after compares the reader, not the repositories. ADR `0182`.

## Rules touched

- `.claude/rules/ui.md` — sufficient; the layout-shift FAIL (round 1) was the "every row from first paint" rule in the task spec, caught by `ui-reviewer`.
- `.claude/rules/code.md` — sufficient; `scripts/measure/skill-contents.ts:55` carries an uncommented `JSON.parse(...) as` cast, as 41 other `scripts/` sites do. The rule is not enforced in `scripts/`; either enforce it or say so.
- `.claude/rules/claims.md` — sufficient; every figure in the task's "What came out" table re-derived exactly from the two committed files.

## Suggestions for future tasks

- Compare readers on the same commits (`--commits-from`) whenever a measurement's code changes; otherwise the delta mixes code and upstream edits.
- Tighten the "named as needed" patterns (task file "Not settled") with another dated run before any figure from it is quoted outside the repo.
- `data/catalogue/skill-requires.json` is still from 2026-11-04; rebuild it before `arp_find_tools` is shown to testers.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: Before you install shows what a skill's own files say about themselves before the install, which does not move ARP up the ladder by itself but sits at the moment the hook that records observed use is present.
