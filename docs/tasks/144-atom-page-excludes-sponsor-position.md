# Task 144 — a tool's page does not count the sponsor's opening position as a support

**Status:** complete 2026-11-12 on `task-144`, from `dev` `da6b5da8`, code in `b55a1a9f` and `faadbacb`. `ui-reviewer` PASS on round 3, `task-verifier` PASS on round 2 (round 1 failed: `scripts/measure/versioned-queries-valid.ts` did not send the new `$exclude`); post-mortem `.claude/learning/132-atom-page-excludes-sponsor-position.md`. Task 144, post-mortem `132`, allocated by the orchestrator. No ADR: it applies the rule `/tools`' Signals already follow (ADR `0143`) to the atom page's count.
**Rules:** `code.md`, `ui.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

The user, 2026-11-12: « la position d'ouverture du sponsor ne doit pas être comptée ».

When ARP's sponsoring service creates a `uses` edge, it opens the first position on it, a deposit
to itself. The agent's own position is a second deposit, sent to the agent's wallet. The atom page
printed the vault's `position_count` per edge as "N supports", so one sponsored line read
"2 supports" there and 1 Signal on `/tools`, which counts only what the sponsor sent to somebody
else (`listTools`, `sponsoredDeposits`). Task 143 explained the gap with a Hint on `/tools`.

Measured 2026-11-12 on testnet 13579 (`https://testnet.intuition.sh/v1/graphql`, curve 1): each
of the four `uses` edges on `github.com/anthropics/skills?skill=pdf` (`Agent 13579:43` to `:46`)
holds two positions with shares, `0x77939A4c…7ec9` (the sponsor) and the agent's wallet, 990000000000000
shares each, `total_assets` 1980000001000000. Read through `getAtomStanding` with no exclusion:
2 supports per edge, 8 for the group; with the sponsor and the deployer excluded: 1 per edge, 4 for
the group, the assets unchanged at 7920000004000000. (On the page those four edges are hidden
anyway, being ARP's test agents, task 74.)

## What changes

1. `packages/graphql/src/queries/atom-standing.ts`: each incoming edge's side also asks
   `kept: positions_aggregate(where: {account_id: {_nin: $exclude}, shares: {_gt: "0"}})`, on the
   read curve. Over 200 testnet vaults with a redemption, `position_count` equalled the count of
   positions with shares, so with nobody excluded the count does not change.
2. `packages/protocol/src/atom-standing.ts`: `AtomStandingConfig.excludeHolders`, checksummed
   before the query (`account_id` is stored checksummed and `_nin` is case-sensitive). An incoming
   edge's `support.positionCount` and `oppose.positionCount` are the `kept` count; a group's
   `positions` sums them. No exclusion passes the zero address, which nobody holds a position
   from. The package names nobody.
3. `apps/web/src/lib/sponsor.ts`: `arpPayersFor(chainId, configured, recorded)`: on 13579, the
   deployer and the sponsoring address from `data/deployments/13579.json`, plus
   `VITE_ARP_SPONSOR_ADDRESS` when it differs (the address `/tools` reads Signals against); on any
   other chain, none, since the service runs on testnet only.
4. `apps/web/src/hooks/use-atom-standing.ts`: passes those payers as `excludeHolders` and keys the
   query on them. Every page built on it follows: the atom page, a skill's repository read, an
   agent's claims.
5. `apps/web/src/services/agent-lines.ts`: an agent page's rings count an edge's holders minus
   `LINE_VOCABULARY.payers` (the same deployer and sponsor), for the "used by" and the "uses" rings.
6. `apps/web/src/components/tool/ToolCatalogList.tsx`: task 143's Hint on Signals is removed, with
   the gap it explained; the header is `aria-hidden` as a whole again.
7. `packaging/claude/arp/bin/arp.js` and `hook.js` regenerated: the CLI bundles `getAtomStanding`.

### The amount: unchanged while somebody else holds a position

While at least one position other than ARP's own stands behind an edge, the amount beside the
count stays what the edge's vault holds, the sponsor's own deposit included.
That is what `/tools`' Support is: `listTools` sums each edge's curve vault `total_assets` (the
term's when the curve is missing), with no exclusion of any depositor and the `minShare` seed
included. Taking the sponsor's deposit out of the atom page's figure would open a new gap between
the two pages. For the edge above both read 0.00198 tTRUST. One difference remains and is unchanged:
the atom page reads the term's `total_assets` (every curve), `/tools` the curve vault's; they differ
only on an edge with a deposit on another curve.

**An edge only ARP's payers hold now reads as nobody's**, on purpose: the page's rule is that a
figure is shown only when a position stands behind it (ADR `0042`, `backingOf` in
`atom-standing-view.ts`), and the user's rule is that the sponsor's opening position is not one. So
its count is 0, its amount is not printed, and its dot in the claim field is hollow. `/tools`'
Support still sums that vault, so a tool with such an edge reads more there than on its page. Live
on testnet 13579, 2026-11-12 (sponsor and deployer excluded, curve 1, edges with a position there):
2 of 115 `uses` edges have no other holder, a complete read; 6 of 250 `source` and 0 of 250
`has tag` edges, both prefixes, since the indexer stops at 250 rows. The read is
`triples(where: {predicate: {label: {_eq: P}}, term: {vaults: {curve_id: {_eq: "1"},
position_count: {_gt: 0}}}})` with the `kept` aggregate of `EDGE_SIDE`, run once per predicate.

## What still counts a payer's position

- **Web, left as is:** the activity bar's "· N positions" (`use-chain-activity.ts`, from
  `getRecentDeclarations`' `position_count`), true as worded, since it says positions, not
  supports; the atom's own market, "Supporters" (`AtomMarket`, `TermShapePanel`), which counts the
  sponsor's position on an atom it created; outgoing claims on a skill's page (`has tag`, `source`),
  whose amount shows once any position stands behind them, the sponsor's included.
- **`/tools`' Support** sums every edge's vault, a sponsor-only edge included (above).
- **The agent page's payers** are `LINE_VOCABULARY.payers` (deployer and recorded sponsor), the set
  its line reads already use; the atom page adds `VITE_ARP_SPONSOR_ADDRESS` when set and different,
  the address `/tools` reads Signals against. They agree unless that variable names another wallet.
- **MCP, for later:** `arp_tool_reputation` (`support.position_count`, `totals.support_positions`,
  `staked`, from `getToolUsage`); `arp_find_tools`' `priced_edges` (`listTools`' `pricedEdges`, from
  `position_count`).

## Tests

- `packages/protocol/test/atom-standing.test.ts`: agent 46's `uses pdf` edge with 2 positions and
  `kept` 1 reads 1 support, the group 1, the assets whole; `exclude` goes out checksummed; no holder
  given sends the zero address.
- `apps/web/src/hooks/__tests__/use-tool-catalog.test.ts`: one sponsored line through the real
  `listTools` and the real `getAtomStanding` over stub transports, via both query options: the atom
  page's edge reads 1 support, equal to the row's Signals, and the same amount.
- `use-atom-standing.test.ts`: the payers reach the fetcher and the key; an edge with `kept` 0
  and assets above 0 has no amount and 0 supports. `sponsor.test.ts`:
  `arpPayersFor` on 13579, with a configured address, with a malformed one, on 1155.
  `agent-lines.test.ts`: both rings count 1 of a sponsor and an agent. `ToolCatalogList.test.tsx`:
  no Hint on Signals.

## Evidence ladder

Skill column, declared tier (`docs/32`): a declaration's support count now counts only who stood
behind it, not the wallet that paid to write it, so one line reads one on every web page. It does
not move ARP up a tier; it keeps the declared tier's count honest.

## Do not do in this task

- Change the MCP server's counts (listed above for later).
- Take the sponsor's deposit out of the amount on either page.
