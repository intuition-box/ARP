# Task 109 — Ask whether a skill worked during the task, not at Stop

**Status:** in progress.
**ADR:** `0179` (amends `0169`).
**Rules:** `code.md`, `claims.md`, `workflow.md`. The hook's gates: `apps/cli` test, `check:node`, `packages --check`.
**Required skills:** `arp-contributing`. No atom or triple is written, so no `intuition-integrator`.

## Why

Task 100's `Stop` hook asked with `decision: "block"`, which starts one more model turn. Task 108's live run
(Claude Code 2.1.318, `claude -p`) showed that turn's answer replacing the session's result: `arp: pdf failed`.
`additionalContext` on `Stop` continues the turn too (code.claude.com/docs/en/hooks, read 2026-11-10), and no
headless marker is documented. The user's decision, 2026-11-10, "option 4": ask during the task.

## Deliverables

1. `apps/hook/src/worked.ts`: `askOnSkill` marks a skill asked and returns the request, once per skill per session,
   not for ARP's own skill; `requestOutput` wraps it as `PostToolUse` `additionalContext`. `stop` records the
   `arp: <skill> worked|failed|unsure` lines for the skills asked and prints nothing. The block path,
   `stop_hook_active`, `MAX_ASKED` and `questionFor` are gone.
2. `apps/hook/src/hook.ts`: after a successful `Skill` call is recorded on `PostToolUse`, the request is printed.
3. `apps/cli/src/install/edits.ts`: `PostToolUse` as two rows, `^(?!Skill$)` in the background and `Skill` waited on
   (5 s); `init`'s summary names the second (`waitedLabel`, `targets.ts`). Packaging regenerated.
4. Tests: `apps/hook/test/worked.test.ts` rewritten (asked once during the task, Stop never prints, a forgotten line
   records nothing, a later answer still read, the request's length); `apps/cli/test/install.test.ts` asserts both rows.
5. ADR `0179`; ADR `0169`'s status marks the amendment. Every description of the Stop question updated: `CLAUDE.md`
   (the router's `apps/hook` line, which describes this feature), `README.md`, `FUTURE.md`, `docs/22`, `docs/28`,
   `docs/31`, `apps/hook/README.md` and `package.json`, `packages/protocol/src/local-outcomes.ts`, the site's
   `local-memory`, `cli` and `uninstall` pages, `apps/cli/CHANGELOG.md` (an Unreleased entry; 0.0.3's entry is the
   published record and stays).
6. A live check in `claude -p` with this worktree's plugin.

## Do not do in this task

Write on chain, sign, deploy, publish or push. Touch `packages/protocol/src/skill-contents.ts` or `apps/cli` share
(task 110).

## Gates

```
cd apps/hook && bun run test && bun run lint
cd apps/cli && bun run test && bun run lint && bun run check:node
bun run --cwd apps/cli packages --check
bun run check && bun run test:scripts
cd apps/web && bun run test        # the docs pages changed
```

## Evidence ladder

Skill column, declared tier: the model's word that a skill did its job (`docs/32`). It does not move ARP up the
ladder; it keeps the declared tier from breaking the session it is written in.
