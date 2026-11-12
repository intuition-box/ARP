# Task 143 — /tools hides ARP's own test identities per edge, as the atom page does

**Status:** complete 2026-11-12 on `task-143-tools-hide-tests`, from `dev` `4882741e`, code in `6d04d52a`. `task-verifier` PASS on round 2 (round 1 failed on the evidence-ladder tier, fixed); post-mortem `.claude/learning/131-tools-hides-tests-per-edge.md`. Task 143,
post-mortem `131`, allocated by the orchestrator. No ADR: it applies the atom page's
existing rule (task 74, `visibleStanding`) to `/tools`.
**Rules:** `code.md`, `ui.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

For the skill `pdf` on testnet 13579, `/tools` showed Signals 4, Wallets 4, Support 0.00792 tTRUST
while its atom page showed 1 declaration. Re-checked on 2026-11-12 against
`https://testnet.intuition.sh/v1/graphql`: four `uses` edges point at
`github.com/anthropics/skills?skill=pdf`, by `Agent 13579:43` to `:46`. Each edge's support vault
on curve 1 holds `1980000001000000` wei over 2 positions: the sponsor `0x7793…7ec9` and the agent's
wallet.

`listTools` summed Signals (`sponsoredDeposits`), Wallets (`sponsoredWallets`) and Support
(`supportAssetsSum`) per tool. The web removed ARP's test identities afterwards, in `withoutTests`
(`apps/web/src/services/tool-catalog.ts`), which dropped a row only when every declarer was hidden
and otherwise kept the hidden agents' figures in the sums. The atom page filters per edge
(`visibleStanding`, `apps/web/src/services/test-identities.ts`) and recomputes. So one visible
declarer next to hidden ones made the two views disagree.

Added by the user on 2026-11-12, relayed by the orchestrator (« retire les compteurs »): the
counts beside `/tools`' tabs, "Skills 676" and "Repositories 94", read as the size of every skill
there is, while they are only ARP's catalogue.

## What changes

1. `packages/protocol/src/tool-listing.ts`: `ToolListingConfig.excludeSubjects`, a set of subject
   atom ids compared lower-case. An edge whose subject is in it is skipped **before** anything is
   summed, its wallets included; a tool whose every edge is skipped is not returned. The package
   names nobody: the caller passes the set. `edgesRead` and `truncated` still describe the read.
2. `apps/web/src/hooks/use-tool-catalog.ts`: the listing waits for `hiddenAtomIds` and passes it as
   `excludeSubjects`; the registered read runs alongside. `ToolCatalogFetcher` takes the set.
3. `apps/web/src/services/tool-catalog.ts`: `withoutTests` removed. `HiddenTests` is now
   `{testsExcluded: true}`, which keeps the registered fallback already used: a registered tool
   with no declared row on a complete read shows 0 declarations.
4. **Signals and supports, a Hint.** The atom page's "N supports" is the edge vault's position count,
   which includes the position the sponsor opens when it creates the edge; a Signal excludes it
   (ADR `0143`). So a single sponsored line reads "2 supports" there and 1 Signal here. Excluding the
   sponsor's position on the atom page would need a per-position read it does not make, so the
   minimal honest fix is a `Hint` on `/tools`' Signals header ("About: signals"). The header words
   are `aria-hidden` one by one now, not the whole header, so the Hint stays reachable.
   Superseded by task 144: the atom page no longer counts that position, and the Hint is gone.
5. `apps/web/src/pages/ToolCatalog.tsx`: the tabs carry no count; one page-level link, "Search all
   of skills.sh", to `/search`, which asks skills.sh for the same words (task 82).
6. `packaging/claude/arp/bin/arp.js` regenerated (`bun run --cwd apps/cli packages`): the CLI
   bundles `listTools`.

## Tests

- `packages/protocol/test/tool-listing.test.ts`: one tool, a hidden and a visible subject's edges,
  with sponsored wallets: only the visible edge's count, declarer, priced edge, deposits, wallet and
  assets; a tool with only the hidden subject is not returned.
- `apps/web/src/hooks/__tests__/use-tool-catalog.test.ts`: the pdf shape run through the real
  `listTools` over a stub transport, then compared with `visibleStanding` over the same two edges:
  declarations, Signals 1, Wallets 1 and Support equal to the visible edge's.
- `ToolCatalogList.test.tsx`: the Hint opens on focus. `ToolCatalog.test.tsx`: the tabs read
  "Skills" and "Repositories" with no number, and the link goes to `/search`.

## Evidence ladder

Skill column, declared tier (`docs/32`): `/tools` now sums only what non-test agents declared about
a skill, edge by edge, so its figures match the atom page instead of carrying ARP's own test lines.
It does not move ARP up a tier; it keeps the declared tier's figures honest.

## Do not do in this task

- Hide test identities in the MCP server's `arp_find_tools` (it calls `listTools` without the set).
- Change what the atom page counts as a support.
