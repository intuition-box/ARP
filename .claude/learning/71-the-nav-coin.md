# 71 — The nav: the coin

**Task:** `docs/tasks/80-the-nav-coin.md`
**Completed:** 2026-11-09
**Commit:** `uncommitted` (working tree on `main`)
**Verifier verdict:** PASS (round 3; round 1 FAIL on unported tests, a stale README status, a duplicate CSS rule; round 2 FAIL on a numbering clash)

## What shipped

- `apps/web/src/components/brand/NavCoin.tsx`, `nav-coin.ts`, `nav-trail.ts` — the coin nav, `SECTION_PATHS`, the retract-on-scroll hook, the path-line context.
- `apps/web/src/index.css` — the `.arp-coin*` block, with a container query at 860px for the phone sheet.
- `apps/web/src/components/Layout.tsx` — wired inside `NavTrailProvider`; `NavSplit.tsx` and its test deleted.
- `apps/web/src/components/brand/__tests__/nav-coin.test.tsx` — 12 tests, every `NavSplit` behaviour ported.
- `apps/web/src/components/brand/nav-height.ts` — `NAV_HEIGHT` 64 → 92.
- `useNavTrail` on `AgentTrustPanel`, `SkillPage`, `RepoPage`; `apps/web/src/lib/chain-name.ts` + test.
- `docs/design/nav-coin/` (moved out of `apps/web/public/`), row in `docs/design/README.md`.
- `.claude/choices/0151-the-nav-is-a-coin-the-mark-leaves-the-centre.md`; ADR `0057` header notes §3 superseded.

## Surprises

- The task was opened as 77 with ADR 0148 while a parallel session closed the hire loop under the same two numbers on `main`. Caught only at verification and renumbered to 78 / 0149, then again to 80 / 0151 / post-mortem 71 by the session orchestrator, because 78 and 79 were taken by other sessions not yet on `main`. Check the numbers with the orchestrator, not only on local branches.
- The handoff landed in `apps/web/public/`, which would have shipped it with the site.
- A `tsc -b` run failed mid-verification on `legal.test.ts` from a concurrent commit (`8e6f03e`); a re-run passed. A gate run against a tree another session is committing into can fail for reasons unrelated to the task.

## Decisions made

- **Get started stays a button, wallet stays after the chain, path line on agent/skill/repo** — user, 2026-11-09. ADR `0151`.
- **Skill path line's middle step is the repository, not the domain** — the repo has a page; a skill may have no domain. ADR `0151`.
- **Bar's left margin written out, not `auto`** — `auto` made the coin jump on retract. ADR `0151`.
- **ChainToggle/WalletConnect 28px vs 40px, and double Escape left as is** — out of scope (task forbids touching them). ADR `0151`.

## Rules touched

- `.claude/rules/ui.md` — sufficient. Retract is scroll-driven, so the "scroll yes, pointer no" line held; grey kept off read text.
- `.claude/rules/claims.md` — §5 applied twice: "behaviours are ported" and "not built" were both stale one site away from the change.
- `.claude/rules/workflow.md` — missing: nothing makes a task check that its task and ADR numbers are still free on `main` before it closes.

## Suggestions for future tasks

- Before closing, `ls docs/tasks | grep ^NN-` and `ls .claude/choices | grep ^NNNN-` against current `main`, especially when another session is active.
- When a task says "port the removed behaviours", diff the `it(` titles of the deleted test against the new one.
- A design handoff goes to `docs/design/<name>/`, never under `public/`.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Navigation only: it serves reading the skill and agent columns at the declared tier and does not move ARP up the ladder, because it adds no signal.
