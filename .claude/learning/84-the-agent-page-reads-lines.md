# 84 — The agent page reads lines

**Task:** `docs/tasks/95-the-agent-page-reads-lines.md`
**Completed:** 2026-11-10
**Commit:** `0101207`, `53d9a97`, `9cc9fde`, `7b53ef9`, `e70ec6a`, `4f2be74` on `feat/95-agent-lines` (not pushed)
**Verifier verdict:** PASS (second run; the first failed on the task file, a missing ui re-review and untested loupe behaviour)

## What shipped

- `packages/protocol/src/agent-lines.ts` — `getAgentLines`: `(other, uses, agent)` and `(agent, uses, tool)`, both through `getPulseUsage` (ADR `0138`); `truncated` when the subject read hits 250 or any usage read is cut. 6 tests.
- `packages/graphql/src/queries/pulse-usage.ts` — `PULSE_SUBJECT_USES_QUERY`.
- `apps/web/src/services/agent-lines.ts`, `hooks/use-agent-lines.ts` — one row per edge (the sponsor is not a second empty use), contexts by edge count, `fieldGroups` adds lines to incoming `uses` dots and a `direction: "out"` ring.
- `apps/web/src/components/atom/ClaimField.tsx` — `reserveLine`, the card's line, the outgoing accessible name, the « task done » Hint; `__tests__/ClaimField.test.tsx` (4).
- `apps/web/src/pages/AgentTrustPanel.tsx` — contexts row under the name; Ratings last.
- `apps/web/src/lib/outcome-words.ts`, `line-vocabulary.ts` — the one display word for `worked`; the shared line vocabulary (moved out of `use-landing-field`).
- Definition of `worked` in `apps/mcp/src/tools.ts`, `docs/28`, `docs/31`, `apps/web/public/docs/{glossary,lines}.md`, PulsePage Hint; `packaging/` regenerated.

## Surprises

- The Lines tab, built as specified, was removed after the user saw it: it repeated the Relations field as a list. The content moved into the loupe's card.
- `worked` was read as "the result is good"; the fix is a display word plus a definition, not a third on-chain outcome.
- First verification failed on the meta-work, not the code: the task file still asked for the deleted tab, and the reshaped UI had no reviewer pass and no component test.

## Decisions made

- **Lines ride the loupe, not a tab; a ring of what the agent used** — ADR: `.claude/choices/0164-the-agent-page-leads-with-lines.md` (amendment 2026-11-10).
- **`worked` displays as « task done », chain unchanged** — same ADR amendment.
- **No paid mark** — the x402 feed has no `uses` edge to join on; waits on the user.

## Rules touched

- `.claude/rules/ui.md` — sufficient; the `Hint` rule carried the definition on screen.
- `.claude/rules/code.md` — sufficient; the "components tested behaviourally" clause is what caught the untested outgoing accessible name.
- `.claude/rules/claims.md` — check 5 applied to a new definition: the first sweep missed the site's own glossary and `lines.md`.
- `.claude/rules/workflow.md` — sufficient; a design reshaped after review needs the reviewer again.

## Suggestions for future tasks

- When the user reshapes a deliverable mid-task, mark the task file's superseded items in the same commit as the code.
- When a word changes on screen, grep the chain word across `apps/web/public/docs/` and `docs/`, not only the sites named in the ADR.
- Re-run `ui-reviewer` on any UI commit after its pass, before calling the verifier.
- A reformat mixed into a feature commit buries the change; keep it out or split it.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill and agent columns, tier declared: the agent page now shows what agents declared using and being used for, with domain and outcome; it does not move up a tier, since no line shown is corroborated and no payment is shown.
