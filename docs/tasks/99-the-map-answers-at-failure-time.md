# Task 99 — The map answers at failure time

**Status:** verified 2026-11-10, `task-verifier` PASS (round 2; round 1 FAIL on privacy wording and the viem claim, fixed in `7c902f6`), commits `f4838cd`..`7c902f6`, post-mortem `.claude/learning/88-the-map-answers-at-failure-time.md`. Not pushed.
**ADR:** `0168`.
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`, `intuition`. **Reviewer:** `intuition-integrator` (no new query: the
read reuses `PULSE_ATOMS_QUERY`, `PULSE_USES_QUERY` and `PULSE_QUALIFIERS_QUERY`).

## Why

Since task 97 (ADR `0166`) a line can say `failed · needs ffmpeg` or `worked · with ffmpeg`. Those lines
reach an agent only when it searches with `arp_pulse`, before an install. The moment they would help most
is when a skill has just failed on this machine for the same reason. The user decided on 2026-11-10 that
the hook answers then, with a **live read** of the index, not a local copy.

## Deliverables

1. When the hook records a skill failure (`missing-program`, `missing-key`, `missing-file`,
   `apps/hook/src/skill-failure.ts`), and only when it writes that line now, it reads that skill's lines
   from the Intuition graph and returns them as `additionalContext` on `PostToolUseFailure`: distinct
   wallets per outcome, the reasons, and the `needs` / `with` names. Facts, no verdict
   (`linesSentence`, `packages/protocol/src/failure-lines.ts`).
2. The read reuses the pulse reader (`findToolAtoms`, `getPulseUsage`), imported **by path**; the packaged
   hook imports no viem, checked by `apps/cli/test/cli.test.ts` ("the packaged hook imports no dependency")
   and `check:node`. Two modules split out for that: `declare/thing-cid.ts` and `declare/usage-words.ts`,
   re-exported where they were. One module it reaches, `declare/tool-thing.ts`, still imports
   `agent-atom.ts` (viem), dropped by tree-shaking because no binding of it is used (ADR `0168` §7).
3. Bounded: 3 s in all (`ANSWER_MS`), silent on any failure; the failure record is written first.
   `ARP_FAILURE_LINES=off` sends nothing.
4. Only the skill's identity leaves: its atom URI and the four predicate words. Tested over HTTP against a
   mock index with the command, its output, a path, the session id and the person's words each carrying a
   marker (`apps/hook/test/failure-answer.test.ts`).
5. `PostToolUseFailure` is synchronous with a 10 s timeout (`CLAUDE_HOOKS`, `apps/cli/src/install/edits.ts`),
   `PostToolUse` stays `async`. Packaging regenerated.
6. ADR `0168`; `apps/hook/README.md`; `docs/22` (the hook's network, its section, the variable);
   `docs/31`, the site's `local-memory`, `testers`, `overview`, `architecture`, `developers` pages and
   `README.md`, wherever they said the hook makes no network call.

## Do not do in this task

Deploy, publish or push. Change the score or `arp_pulse`. Restructure `hook.ts` or `edits.ts` (task 98 owns
that). Answer on `PostToolUse`.

## Gates

`apps/hook` test and lint; `packages/protocol` test and lint; `apps/cli` test, `check:node`,
`packages --check`; root `bun run check`, `bun run test:scripts`.
