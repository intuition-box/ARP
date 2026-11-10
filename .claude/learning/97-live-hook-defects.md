# 97 — Two defects the live test found in the hook

**Task:** `docs/tasks/108-live-hook-defects.md`
**Completed:** 2026-11-10
**Commit:** `ee3ab75`, `7c24c32`, branch `fix/108-live-hook-defects`, worktree `../ARP-108`
**Verifier verdict:** PASS (second pass; the first failed on one stale site, `docs/22:107`)

## What shipped

- `apps/hook/src/skill-failure.ts` — zsh's `command not found: X` is tried before the generic form, a
  name with no letter is never a need, and `installedSource` also reads `<cwd>/skills-lock.json`.
- `apps/hook/test/skill-failure.test.ts` — two tests with the live error text; both fail without the fix.
- `packages/protocol/src/share-failures.ts` — comment names both lock files.
- `docs/22_RUNNING_THE_NODE.md` — the source of a failure, and the hook's read list, name the project lock.
- `packaging/claude/arp/bin/hook.js` — regenerated.

## Surprises

- Tasks 98–100 passed on unit tests. One real Claude Code session (2.1.318, `claude -p --plugin-dir`)
  found two defects: `(eval):1:` made the need `1`, and a default project install left the source `null`.
  With no source, task 99's answer never fired.
- A SKILL.md writes `1` as a word (`pdftotext -f 1`), so `publishableNeed` could not stop it.

## Decisions made

- None needing an ADR; both fixes are the obvious answer to a wrong output.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Check 5 caught `docs/22:107` still naming only the global lock.

## Suggestions for future tasks

- A hook feature is not verified until it has run once in a real runtime session. Unit fixtures carry the
  error text the author expected, not what the shell writes.
- When a reader gains a file, grep `docs/22` and `apps/web/public/docs` for the file it already read.
- `apps/cli/src/share.ts:49` still reads only the global lock (listed in the task as found, not fixed).
- `apps/hook/test/skill-failure.test.ts:313` still says `skills 1.7.4` after the softening to 1.7.x.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, observed tier: the hook's failure record is now right (source and need) for the default
project install, so what ARP observes is accurate; the corroborated tier is untouched.
