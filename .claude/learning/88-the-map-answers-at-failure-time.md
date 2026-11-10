# 88 — The map answers at failure time

**Task:** `docs/tasks/99-the-map-answers-at-failure-time.md`
**Completed:** 2026-11-10
**Commit:** `7c902f6` (branch `feat/99-the-map-answers`, `f4838cd..7c902f6` off `bbd1040`)
**Verifier verdict:** PASS (round 2; round 1 failed on two claims errors)

## What shipped

- `packages/protocol/src/failure-lines.ts` — `skillUrlOf`, `skillAtom`, `readSkillLines`, `linesSentence`: one skill's lines through the `arp_pulse` reader, no new query.
- `apps/hook/src/failure-answer.ts` — live read on `PostToolUseFailure` only, 3 s budget (`ANSWER_MS`), silent on failure, `ARP_FAILURE_LINES=off`.
- `apps/hook/src/skill-failure.ts` — `recordSkillFailure` returns the line only when written now (once per session, skill, reason).
- `packages/protocol/src/declare/thing-cid.ts`, `declare/usage-words.ts` — pure splits, re-exported where they were.
- `apps/cli/src/install/edits.ts` — per-event `entry`; `PostToolUseFailure` sync, timeout 10; `PostToolUse` stays async. Packaging regenerated (hook.js 70,535 → 119,416 bytes).
- ADR `0168`; docs/22, docs/31, apps/hook/README, site docs pages, README.

## Surprises

- Removing "no network" was not enough. Five public passages still said "nothing about the failure leaves your machine". The request is made only on a failure, so it tells the index which skill failed. One docs/31 diagram put that Note right after the request it denied.
- "viem-free by construction" was false: `tool-thing.ts` imports `agent-atom.ts` (viem). The bundle is clean only because tree-shaking drops it (`sideEffects: false`).
- `packages/protocol` `test/node-serve.test.ts` "caps the body by default" times out at 5 s here, on main `bbd1040` too. It has nothing to do with this branch.

## Decisions made

- **Live read, not a local copy; PostToolUseFailure synchronous** — the user's choice. Async output arrives on the next turn, too late. ADR: `.claude/choices/0168-the-hook-answers-a-skill-failure-with-its-lines.md`.
- **intuition-integrator skipped** — no new GraphQL query; reuses `PULSE_ATOMS/USES/QUALIFIERS` via `getPulseUsage`. Accepted by the verifier.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Check 5 (grep the old wording) caught the "nothing leaves" copies. Grep for what a sentence implies (the request reveals the failure), not only its exact words.
- `.claude/rules/security.md` — sufficient; no new signature site.

## Suggestions for future tasks

- When a network call is triggered by an event, write in the public docs that the call's timing gives the event away, not only what the request body contains.
- "By construction" claims about the dependency graph: trace the import chain at source level, not only the bundle.
- `CLAUDE.md:186` still says the hook has "no network". Left for the user to decide, since the instruction to edit came from an agent.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier. The task carries declared lines to the agent at the moment a skill fails, when a line can change what the agent does next. That makes more use of the declared tier but does not move ARP up the ladder.
