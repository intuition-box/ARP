# 117 — The import after a mint

**Task:** `docs/tasks/129-the-import-after-a-mint.md`
**Completed:** 2026-11-11
**Commit:** `ed8d0b35` (branch `fix/129-import-after-mint`; also `966690cd`, `e4531a6d`, `029780ea`)
**Verifier verdict:** PASS (round 2; round 1 failed on missing tests and an uncited third-party claim)

## What shipped

- `apps/web/src/pages/AgentImport.tsx`: 13579 is the import chain (ARP's registry, `identityRegistryFor`). Base, BSC and Ethereum are disabled, "soon to be released". `?chain=&id=` prefills the form, and a chain not offered clears the id. The atom is taken from the identity plan once nothing is left to send, after a read-back.
- `apps/web/src/hooks/use-agent-import.ts`: `choiceFor(false)` whatever the toggle. A 13579 agent's atom is resolved in the testnet graph.
- `apps/web/src/services/erc8004-connector.ts`: `erc8004GraphClient(graphqlUrl)`, one cached client per URL.
- `apps/web/src/pages/MintIdentity.tsx`: "Now link your agent wallet →" carries the minted agent.
- `skills/arp-listing-test/SKILL.md`: an inert fixture with `metadata.internal: true`.
- `.claude/choices/0194-*.md`: the import ignores the toggle. ADR 0061 has a header pointing to it.
- Tests:
  - `AgentImport.consent.test.tsx`: the prefill, a mint link naming Base, read-back pass and fail, an unpinned record, and the toggle on mainnet.
  - `hooks/__tests__/use-agent-import.test.tsx`: the graph choice, and testnet pricing under a mainnet toggle.
  - The connector test: one client per URL.

## Surprises

- Fixing the chain list exposed two more dead ends on the same path, and running the path found both:
  - the atom was looked up in mainnet's graph for every agent;
  - a record written from the page is not pinned, so the graph, which finds an agent by its record's name, could not find a record the page had just written.
- Making the import testnet-only opened a mainnet-pricing path through ADR 0061's toggle. ui-reviewer caught it, not the author.
- On chain, the link for agent 40 was two transactions: an account atom `0xd77f64…` and the triple `0xba55c1…`.

## Decisions made

- **The import is on testnet 13579, whatever the toggle says.** It narrows ADR 0061 for one page. ADR: `.claude/choices/0194-the-import-is-on-testnet-whatever-the-toggle.md`.
- **Atom from the plan, not the graph, after a write.** The page attaches the atom only when a re-plan has nothing left to send, so a write that reverted does not count.

## Rules touched

- `.claude/rules/portability.md`: sufficient. Rules 3 and 4 are what made the toggle path wrong.
- `.claude/rules/claims.md`: sufficient. Check 3 caught the uncited `skills` CLI claim. It is now cited to `skills` 1.8.1 `dist/_chunks/remove.mjs:2503-2511`.
- `.claude/rules/code.md`: sufficient. The round-1 fail was untested behaviour in the hook, which the page tests mock away.

## Suggestions for future tasks

- When a page test mocks its hook, a decision that lives in the hook, such as which chain or which graph, needs its own hook test. Otherwise the page suite passes after the decision is reverted.
- An exception to the toggle needs a test rendered with `choiceFor(true)`. A suite rendered only on testnet cannot see it.
- Put full transaction hashes in a task file's evidence. A truncated hash cannot be looked up.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

The agent column, declared tier. An agent minted on testnet can now link itself to the wallet that will act for it, an identity it declares itself. That does not move ARP up a tier, but it removes a dead end on the way to the observed tier for agents.
