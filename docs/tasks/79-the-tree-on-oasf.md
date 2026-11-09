# Task 79 — The domain tree on OASF

**Status:** in progress, 2026-11-09, on `feat/79-oasf-tree` (worktree `../ARP-tree`), not pushed. Nothing
written on chain: the correspondence waits for the user's review.
**ADR:** `0150` (to write once the review is done).
**Rules:** `code.md`, `portability.md`, `claims.md`, `workflow.md`.

## The user's decisions, 2026-11-09

1. Take OASF's skills taxonomy as the top of the tree instead of ARP's own categories; offer it to
   agents as the categories to pick from, so they use a shared registry instead of comparing.
2. Pin OASF 1.1.0. The node is OASF's name; the versioned id sits on a separate edge.
3. OASF's names are kept as they are (they break ADR `0088`'s one-word rule, which stays for the
   sub-domains agents add). A category OASF names with several words is not split word by word: OASF's
   own children are the split, and ARP adds depth only below, as deep as use needs.
4. Testnet is the test bench, and mainnet will start empty: keep only what is essential, remove what
   does not work by withdrawing the attestor's position, and do not carry a migration layer for ARP's
   old categories.

## Done so far

- `data/catalogue/oasf-1.1.0-skills.json`: the 513 skills of OASF 1.1.0 (18 categories), read from
  `github.com/agntcy/oasf` at tag `v1.1.0`, commit `f510be0d`. Apache-2.0. v1.1.1 has the same skills.
- `data/catalogue/oasf-mapping-proposal-13579.json`: ARP's 24 categories against OASF, for review. Of
  662 categorised skills, 493 sit in categories with an OASF equivalent and 169 in categories to split or
  keep as an ARP node.

## Next, after the review

1. Per skill, the finest OASF node (many current categories are mixed).
2. ADR `0150`, `docs/25` §8 rewritten, the alias table for the search (`writing` → [1101]).
3. The testnet rewrite, signed by the attestor key under ADR `0037` with the user's explicit go: the
   OASF nodes that carry something, the re-tags, the withdrawals.
4. A test with real sessions: does an agent choose well among OASF's entries?
5. The NOTICE line for OASF (Apache-2.0), with the session that holds `NOTICE`.

## Do not do in this task

- Write anything on chain before the user has reviewed the mapping.
- Mainnet.
