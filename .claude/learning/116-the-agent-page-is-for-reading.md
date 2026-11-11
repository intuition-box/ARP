# 116 — The agent page is for reading

**Task:** `docs/tasks/128-the-agent-page-is-for-reading.md`
**Completed:** 2026-11-11
**Commit:** `110a3de7` (branch `feat/agent-page-for-humans`, on `1da6e481`)
**Verifier verdict:** PASS (round 2)

## What shipped

- `apps/web/src/pages/AgentTrustPanel.tsx` — description before Before you call; `AtomMarket` and the declaration card removed; Relations kept.
- `apps/web/src/components/atom/BeforeParts.tsx` — `folded` prop: rows behind a `<details>` (`Details`), used by the agent only.
- `apps/web/src/components/agent/BeforeYouCall.tsx` — folded; `Speaks` row removed (the summary names the protocols).
- `apps/web/src/components/agent/AgentIdentityPanel.tsx` — Registration file and CAIP-19 removed.
- `apps/web/src/components/agent/AgentClaims.tsx` — `AgentDeclareCard` export removed.
- `apps/web/src/pages/Landing.tsx` — last scene: « Plug in right now and start verifying. »
- Tests: `AgentTrustPanel.test.tsx` (new page test), `AgentIdentityPanel.test.tsx` (new), `BeforeYouCall.test.tsx`, `Landing.test.tsx`.
- `.claude/choices/0193-*.md`; header pointer on ADR `0056`; dated pointer in `docs/16` §7.

Gates, from `apps/web`: tsc -b 0, lint 0, check:tokens clean, vitest 110 files / 906 passed / 2 skipped.

## Surprises

- Round 1 failed on one sentence in ADR 0193. It said the ratings tab "keeps its stake control", but `RatingRow.tsx` lost that control on 2026-10-27. Once `AtomMarket` is gone, the agent page has no stake control at all. The code was right and the ADR described a state from two weeks earlier.
- The narrowed ADR (`0056`) needed a header pointer, as `0039`, `0041` and `0045` carry. Without it a reader of `0056` would still expect a market on the page.

## Decisions made

- **No market and no declaration card on an agent's web page; skills and tools keep both** (the user, 2026-11-11). ADR: `.claude/choices/0193-the-web-page-on-an-agent-offers-no-market.md`.
- **Fold instead of delete** for Before you call's rows: the summary line stays and the detail stays one click away.

## Rules touched

- `.claude/rules/ui.md` — sufficient.
- `.claude/rules/claims.md` — sufficient; check 3/5 caught the stale ADR sentence.
- `.claude/rules/code.md` — sufficient; dead imports and helpers were removed with their call sites.

## Suggestions for future tasks

- Before writing an ADR's "what still exists" bullet, grep for the component it names (`grep -rn StakeControl apps/web/src`). Do not write it from memory of the page.
- When an ADR narrows another, add the "Narrowed by" header to the older ADR in the same commit.
- Removing a UI surface: write the page test that mocks the removed component as a marker and asserts it is absent. Confirm the test fails against the old page.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Column agent, tier declared. The page shows what an agent declares about itself and drops what did not help a person decide. It does not move ARP up a tier.
