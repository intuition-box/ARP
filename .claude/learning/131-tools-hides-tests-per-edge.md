# 131 — /tools hides ARP's own test identities per edge, as the atom page does

**Task:** `docs/tasks/143-tools-hides-tests-per-edge.md`
**Completed:** 2026-11-12
**Commit:** `6d04d52a` on `task-143-tools-hide-tests`, from `dev` `4882741e` (evidence-ladder section and this post-mortem uncommitted)
**Verifier verdict:** PASS (second pass; the first failed on the evidence-ladder tier, "observed" instead of "declared")

## What shipped

- `packages/protocol/src/tool-listing.ts` — `ToolListingConfig.excludeSubjects`: an edge whose subject is in the set is skipped before anything is summed, its wallets included; a tool with no edge left is not returned. The package names nobody.
- `apps/web/src/hooks/use-tool-catalog.ts` — the listing waits for the hidden atom ids and passes them; the registered read runs alongside.
- `apps/web/src/services/tool-catalog.ts` — `withoutTests` removed; `HiddenTests` is `{testsExcluded: true}`.
- `apps/web/src/components/tool/ToolCatalogList.tsx` — a `Hint` on Signals (the atom page's supports include the sponsor's opening position, ADR `0143`); header words `aria-hidden` one by one so the Hint stays reachable.
- `apps/web/src/pages/ToolCatalog.tsx` — no count on the Skills / Repositories tabs; one link, "Search all of skills.sh", to `/search`.
- Tests: `packages/protocol/test/tool-listing.test.ts` (hidden + visible subject on one tool), `apps/web/src/hooks/__tests__/use-tool-catalog.test.ts` (the pdf shape through the real `listTools`, compared with `visibleStanding`), `ToolCatalogList.test.tsx`, `ToolCatalog.test.tsx`, `AtomPanel.test.tsx`.
- `packaging/claude/arp/bin/arp.js` — regenerated; the CLI bundles `listTools`.

## Surprises

- The old filter dropped a row only when every declarer was hidden and kept the hidden agents' figures otherwise, so one real declarer beside test agents made `/tools` and the atom page disagree (pdf on 13579, 2026-11-12: four `uses` edges, Agent 13579:43 to :46, each vault 2 positions).
- Root `bun run test` failed until `packaging/` was regenerated: any change to a `listTools`-bundled module needs `bun run --cwd apps/cli packages`.

## Decisions made

- **Exclusion in the package, list in the caller** — `excludeSubjects` keeps `packages/protocol` free of ARP's test list (`portability.md`). No ADR: it applies task 74's per-edge rule.
- **Hint, not a changed atom-page count** — counting supports without the sponsor's position would need a per-position read the atom page does not make. No ADR.
- **MCP `arp_find_tools` left unfiltered** — the task's "Do not do".

## Rules touched

- `.claude/rules/ui.md` — sufficient; Hint pattern covers the caveat, no sentence on screen.
- `.claude/rules/portability.md` — sufficient.
- `.claude/rules/claims.md` — sufficient.
- `.claude/agents/task-verifier.md` — sufficient; its tier check caught "observed" for a figure made of `uses` lines.

## Suggestions for future tasks

- A figure summed from `uses` lines and their vaults is the declared tier in `docs/32`, sponsored or not; only a hook record or a receipt makes a fact observed.
- When two pages show one figure, filter at the same grain (per edge) before summing, and test both through the same fixture.
- Touching anything the CLI bundles: run `bun run --cwd apps/cli packages --check` before the root suite.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: `/tools` now sums only what non-test agents declared about a skill, edge by edge, so its figures match the atom page instead of carrying ARP's own test lines; it does not move ARP up a tier, it keeps the declared tier's figures honest.
