# 132 — a tool's page does not count the sponsor's opening position as a support

**Task:** `docs/tasks/144-atom-page-excludes-sponsor-position.md`
**Completed:** 2026-11-12
**Commit:** `b55a1a9f`, `faadbacb`
**Verifier verdict:** PASS (round 2)

## What shipped

- `packages/graphql/src/queries/atom-standing.ts` — `EDGE_SIDE`: each incoming edge's side adds a `kept` positions_aggregate (`account_id _nin $exclude`, shares > 0) on the read curve.
- `packages/protocol/src/atom-standing.ts` — `excludeHolders`, checksummed before the query; the zero address when nobody is excluded; the package names nobody.
- `apps/web/src/lib/sponsor.ts` — `arpPayersFor`: the deployer, the recorded sponsor and a configured sponsor, on 13579 only.
- `apps/web/src/hooks/use-atom-standing.ts` — passes the payers and puts them in the query key.
- `apps/web/src/services/agent-lines.ts` — the agent page's rings drop the same payers.
- `apps/web/src/components/tool/ToolCatalogList.tsx` — task 143's Hint on Signals is removed.
- `packaging/claude/arp/bin/{arp,hook}.js` — regenerated.
- `scripts/measure/versioned-queries-valid.ts` — sends `$exclude` (round 2 fix).

## Surprises

- The brief assumed `/tools`' Support leaves out the sponsor's deposit. It does not: `listTools` sums the vault's `total_assets` (`tool-listing.ts:309,322`). So the amount stays unchanged on both pages.
- Adding a required GraphQL variable broke the committed live check of the query. No gate runs `scripts/` at runtime, so every gate stayed green.

## Decisions made

- **Amount unchanged** — matching `/tools`' Support exactly means the vault's whole, sponsor deposit included. A payer-only edge now reads as nobody's: count 0, no amount printed, hollow dot. No ADR: this applies ADR `0143` and ADR `0042`.
- **Counted per edge with an aggregate, not `position_count`** — `_nin` on `account_id` is case-sensitive, so the addresses are checksummed first.

## Rules touched

- `.claude/rules/claims.md` — check 4 is sufficient. It caught the broken script once the script was run.

## Suggestions for future tasks

- A query that gains a required variable: grep every caller of the query document, `scripts/` included, and run `scripts/measure/versioned-queries-valid.ts`.
- The MCP counts (`arp_tool_reputation`, `arp_find_tools`' `priced_edges`) still count the sponsor. They are listed in the task file for later.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: a declaration's support count now counts only who stood behind it, not the wallet that paid to write it. It does not move ARP up a tier; it keeps the declared tier's count honest.
