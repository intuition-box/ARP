# Task 129 — The import after a mint

**Status:** done 2026-11-11, branch `fix/129-import-after-mint`, written by arp-97. Task 129,
post-mortem `117`, ADR `0194`, allocated by the orchestrator. ADR `0194` narrows ADR `0061`: the
import writes on 13579 whatever the toggle says. ADR `0062` is about the mint, which already
follows the toggle.
**Rules:** `ui.md`, `code.md`, `portability.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`. Agent `ui-reviewer` before `task-verifier`.

## Why

Walked on 2026-11-11 against https://arp.intuition.box with a throwaway wallet on testnet 13579: the
mint works (agent `13579:40`, tx `0x863481…1928`), then "Now link your agent wallet →" opens the
import, which offered Base, BSC and Ethereum only. The agent just minted could not be named there.
The user: fix the link after the mint; the import of an agent from another chain is "soon".

Fixing the chain list exposed two more stops on the same path, both found by running it:

1. The atom was looked up in **mainnet's** graph whatever the agent's chain
   (`ERC8004_GRAPHQL_URL`), so a testnet agent never had one.
2. A record written from this page is **not pinned**, and the graph finds an agent by its record's
   name, so even on the right graph the page could not find the record it had just written, and
   "Price the link" never appeared.

## What changes

1. `AgentImport`: Intuition testnet 13579 is the import chain, read in ARP's own registry
   (`identityRegistryFor`). Base, BSC and Ethereum stay listed, disabled, "soon to be released".
2. The mint's "Now link your agent wallet →" carries `?chain=&id=`, and the import opens on that agent.
3. A testnet agent's atom is looked up in the testnet graph (`erc8004GraphClient(graphqlUrl)`).
4. Once the identity record is on chain, the page takes the atom id from the identity plan, which is
   the id resolution would return, and offers the link. After a write it re-plans first and attaches
   only when nothing is left to send, so a write that reverted after simulating does not count.
5. Every read and write of the import is on 13579 whatever the site's chain toggle says, so a testnet
   agent's record is never priced or written on mainnet (ui-reviewer, round 1). A mint link naming a
   chain the import does not offer opens an empty form, never a token id read on the wrong chain.
6. `skills/arp-listing-test/`: a skill that does nothing, with `metadata.internal: true` so
   `npx skills add intuition-box/ARP` does not offer it. It exists to test adding a skill to the
   index without listing somebody else's work (the user, same day). It needs to be on `main` before
   that test can run.
7. `apps/web/public/docs/web-app.md` says which chain the import takes.

## Checked

- Gates from `apps/web`: `tsc -b`, `lint`, `test`, `check:tokens`; root `bun run check`;
  `bun run --cwd apps/cli packages --check`.
- The whole path on testnet 13579, against this branch's dev server, with the test wallet
  `0xeB959a6B87D77A6AD77f8cf0C4ffC5e650CCCcB3`: ownership of `13579:40` proved, statement signed,
  identity record written (5 txs, 0.01 tTRUST), link published (`0xba55c1…a380`, 0.004 tTRUST).
- After the round-1 fixes, a fresh agent end to end in one pass: mint `13579:41` (`0x41f512…196f`),
  record written (5 txs), read back, link published (`0xd667e0…91b4`).

## Do not do in this task

- Release the import from Base, BSC or Ethereum.
- Pin the record from the page (pinning is server-side, ADR `0016`).
