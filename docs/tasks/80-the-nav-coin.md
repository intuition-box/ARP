# Task 80 — The nav: the coin

**Status:** verified 2026-11-09, `task-verifier` PASS (round 3), post-mortem `learning/71`, on `main`.
**ADR:** `0151`.
**Rules:** `code.md`, `ui.md`, `workflow.md`, `claims.md`.
**Design:** `docs/design/nav-coin/NAV-COIN.md` and `nav-coin-reference.html`. The handoff landed in
`apps/web/public/arp-nav-coin/`, which would have shipped it with the site, so it moved to `docs/design/nav-coin/`.

## The user's decisions, 2026-11-09

1. The coin replaces `NavSplit` and ADR `0057` §3's centred mark.
2. The wallet stays in the nav, after the chain.
3. Get started keeps opening the onboarding panel. It does not become a link.
4. The path line runs on the agent, skill and repo pages.

## Deliverables

1. `apps/web/src/components/brand/NavCoin.tsx`, `nav-coin.ts`, `nav-trail.ts` and the
   `.arp-coin*` block in `index.css`, adapted from the handoff's `code/`.
2. `Layout.tsx` wired to them, inside `NavTrailProvider`.
3. `NavSplit.tsx` and its test deleted. `SECTION_PATHS` moved to `nav-coin.ts`. The removed
   behaviours are ported to `nav-coin.test.tsx`.
4. `NAV_HEIGHT` set to the new header height, so the landing's deck stays aligned.
5. `useNavTrail` on `AgentTrustPanel`, `SkillPage` and `RepoPage`.
6. ADR `0151`.

## Checks

`bunx tsc -b`, `bun run lint`, `bun run test` and `bun run check:tokens` in `apps/web`. Then render at
1280 and 390 px, with the bar expanded and retracted, and the landing deck after one scroll.

## Do not do in this task

- Add a path line to pages beyond the three above.
- Change `ChainToggle` or `WalletConnect`: they still render nothing on a testnet-only build or with
  no wallet connected.
- Restyle the footer.
