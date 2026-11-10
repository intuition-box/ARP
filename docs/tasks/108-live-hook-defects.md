# Task 108 — Two defects the live test found in the hook

**Status:** in progress, 2026-11-10, on `fix/108-live-hook-defects` (worktree `../ARP-108`).
**ADR:** none: both fixes are the obvious answer to a wrong output (`workflow.md`, "Things not worth an ADR").
**Rules:** `code.md`, `claims.md`, `workflow.md`. The hook's gates: `apps/cli` test and `check:node`.

## Why

Tasks 98, 99 and 100 were verified on unit tests. On 2026-11-10 they were run for the first time in a real
Claude Code session (2.1.318, `claude -p` with `--plugin-dir packaging/claude/arp`, `--setting-sources
project` so the user's own older ARP hook does not fire, `ARP_HOME` in a scratch directory). Task 98 worked
as specified. Two defects were live in 99 and 100:

1. **The need was `1`.** In Claude Code a command runs through `eval`, so zsh's error is
   `(eval):1: command not found: qpdf`. `needOf`'s first pattern read the line number `1` as the program,
   and `publishableNeed` kept it, because the pdf skill's SKILL.md writes `1` as a word
   (`pdftotext -f 1 -l 5`). Recorded: `{"skill":"pdf","reason":"missing-program","need":"1"}`. zsh is the
   default shell on macOS.
2. **The source was `null` for a default install.** `npx skills add owner/repo --skill x` without `-g`
   writes `skills-lock.json` beside the project (skills 1.7.4). `installedSource` read only the global
   `~/.agents/.skill-lock.json`. With no source, task 99's answer returns nothing
   (`apps/hook/src/failure-answer.ts`, `failure.source === null`) and a failure or worked answer has no
   public skill to share under.

## Deliverables

1. `apps/hook/src/skill-failure.ts`: `command not found: X` is tried first, and a name with no letter is
   never a program. `installedSource` also reads `<cwd>/skills-lock.json`.
2. Two tests in `apps/hook/test/skill-failure.test.ts`, with the live error text. Both fail without the fix.
3. `packaging/` regenerated.

## The live runs, before and after

Before (main at `ce71b1e`), the pdf skill, `qpdf` missing:
`{"skill":"pdf","source":null,…,"reason":"missing-program","need":"1"}`, and no answer on
`PostToolUseFailure`.

After (this branch), the pptx skill installed in one session and used in the next, `markitdown` missing:

```
failures.jsonl  {"skill":"pptx","source":"anthropics/skills","domain":"presentation authoring","reason":"missing-program","need":"markitdown"}
PostToolUseFailure additionalContext  "ARP, lines agents wrote on github.com/anthropics/skills?skill=pptx (Intuition testnet 13579): 1 wallet wrote worked."
outcomes.jsonl  {"skill":"pptx","source":"anthropics/skills","domain":"presentation authoring","outcome":"failed"}
```

The one `worked` wallet is ARP's own test line on 13579 (`docs/tasks/75`), not a third party.

## Found, not fixed here

- **The Stop question replaces the session's final answer** in `claude -p`: the result becomes
  `arp: pdf failed`. The user's decision; the coordinating session raised it.
- **False programs in task 98's report.** For `pptx` it lists `lorem`, `ipsum` and `prints` as programs it
  runs, read from the skill's example text (`readSkillContents`, task 96).
- **A skill installed in a session is not loaded until the next one.** Claude Code's behaviour, not ARP's;
  a tester following the install with a use in the same session gets `Unknown skill`.

## Gates

```
cd apps/hook && bun run test && bun run lint
cd apps/cli && bun run build && bun run packages && bun run test && bun run check:node
bun run --cwd apps/cli packages --check
```

## Evidence ladder

Skill column, observed tier: the hook's record of a failure is that tier (`docs/32`), and on a default
install it carried no source and a wrong need. It moves ARP up only in that what the hook observes is now
right for the install most people make; the corroborated tier is untouched.
