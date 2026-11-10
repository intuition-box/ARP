# 93 — The site's open gaps

**Task:** `docs/tasks/104-the-site-gaps.md`
**Completed:** 2026-11-10
**Commit:** `1e24a53` (range `ce71b1e..1e24a53`), branch `feat/104-the-site-gaps`
**Verifier verdict:** PASS (first pass)

## What shipped

- `apps/web/src/components/agent/AgentContains.tsx` — agent page's Contains panel (endpoints,
  protocols, x402, auth, answers), below the x402 Trust Index in `pages/AgentTrustPanel.tsx`.
- `apps/web/src/services/skill-contents.ts` — `entryOfContains` and `HEAD_REF`; `services/pulse.ts`
  `pulseContentsEntry`; `hooks/use-pulse.ts` returns it; `PulsePage.tsx` reuses `SkillContains`.
- `apps/web/src/services/list-tool.ts` — microcopy for `not-a-tool`, `unreachable`, `private-address`.
- Tests: `components/agent/__tests__/AgentContains.test.tsx`, `PulsePage.test.tsx`, `list-tool.test.ts`.

## Surprises

- GitHub's file list gives a tree, not a commit, so `/pulse` matches link at `HEAD`; the
  `SkillContains` Hint branches on `HEAD_REF` to say so.
- `ui-reviewer` caught a three-sentence Hint that showed while pending; fixed in `1e24a53`.

## Decisions made

- **HEAD link for on-the-spot reads** — recorded in the task file, no ADR.
- **`Names` exported from `SkillContains` with an `empty` label** — reuse over a second list component.

## Rules touched

- `.claude/rules/ui.md` — sufficient (one-sentence Hint, no explanatory copy in the panel).
- `.claude/rules/code.md` — sufficient.
- `.claude/rules/claims.md` — sufficient; gate scope was apps/web/src plus scripts typecheck, and
  no file outside apps/web/src and docs/tasks changed.

## Suggestions for future tasks

- A converter shared between a build script and a service (`entryOfContains` vs
  `scripts/build/build-skill-contents.ts`) is still two copies; scripts may not be imported by
  apps, so keep their field lists in step by hand or move the conversion into the protocol package.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Agent and skill columns, tier declared: the agent page shows what an agent's registration document
declares beside the sieve's one observed reading, and `/pulse` shows what a skill's files contain
before install; it surfaces existing facts to a reader and does not move ARP up a tier.
