# Task 79 — The domain tree on OASF

**Status:** built and written on testnet 13579, 2026-11-09, on `feat/79-oasf-tree` (worktree `../ARP-tree`), not pushed.
**ADR:** `0150`.
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

## The per-skill proposal

`data/catalogue/oasf-skill-tags-proposal-13579.json`: the 662 categorised skills, each at the finest OASF
node, by reading its description, under the rules the user approved on 2026-11-09 (by what it does; `design`
and `card` the only ARP nodes; no sub-domain seeded, a `suggestedWord` kept on low rows). Four batches,
merged and checked: every skill once, every id in the taxonomy, identical copies aligned.

- Confidence: 325 high, 269 medium, 68 low. 290 skills land outside their old category's OASF subtree.
- 179 OASF nodes carry a skill (178 after the review), 242 with their ancestors.
- `design` on 36 skills (33 written, 3 were reviewed out), `card` on none (no categorised skill moves money).
- Recurring gaps in OASF, from the low rows: generic multi-model runners (`inference`, 13), storyboards,
  pricing, diagrams, research reproduction, skill routers.

## Funding the attestor, 2026-11-09

The user asked for it (« envoie-lui-même 2 »), under ADR `0037`'s three conditions: the treasury key
was read from `~/.arp/sponsor.key` by `readKeyFile` and never printed, its address was checked against
`0xE596096F4176b682E300d73963e7B04B383C1AA1` before signing, and this is the record.

- 2 tTRUST from the treasury `0xE596…1AA1` to the attestor `0x906f…f91f`, testnet 13579, block 9376543,
  tx `0x414c97bcb933c59a2d5402c4b3fa9de851c5fcecb8aa3c93606d820f00e617e7`, status success.
- After: attestor 3.0052 tTRUST, treasury 2.2853 tTRUST. The transfer is outside the sponsor's ledger,
  so its daily budget does not count it.

## Written on testnet, 2026-11-09

The user's go: « 1 oui, 2 oui » for the review and the write, « je te fais confiance » for the review of the
68 low rows, and « ok je pense que je suis d'accord avec tout » for the rest (ADR `0150`).

- **The tree:** `scripts/seed/oasf-tree.ts` planned 1,095 calls (238 atoms, 843 triples, 14 deposits,
  2.176 tTRUST), signed by the attestor `0x906f…`. All 1,095 landed. Call 940 landed in the fourth wave,
  but reading its receipt failed under the RPC's bandwidth quota, so the sender did not count it and the fifth
  wave sent it again; that resend reverted at estimation because the tag now existed. The other 155 calls went
  as a new plan. (The planner gained a guard against planning a triple twice; it was not the cause.)
- **The originals:** `scripts/seed/list-originals.ts` listed the 26 skills of `inference-sh/skills` and tagged
  them at their copies' node: 76 calls after a re-plan (the first plan created the repository atom twice; the
  planner now stops before that).
- **The old tree retired:** 628 redeems by the attestor, 51 by the treasury. `maintained` and other tags that
  are not the tree's were kept.
- **Read back** with `readDomainTree`: 243 edges, not truncated, 14 of OASF's 18 categories in use;
  `presentation authoring → office productivity → research, knowledge and productivity → tool`;
  `method`, `collaboration`, `payment`, `card` no longer in the tree.
- **The record:** `data/catalogue/oasf-tree-13579.json`, every transaction hash.
- **Keys:** each signer's address was checked by a dry run before sending (ADR `0037`). The treasury key was
  read from its file into the sender's environment and never printed.
- **Balances after:** attestor 1.2177 tTRUST, treasury 2.3343 tTRUST.

## Not done here, a task of its own

1. **Finding by words:** aliases and a matcher from a person's words to the nearest OASF nodes (ADR `0150`
   point 7). Until then `inferDomain` matches a node's label word for word, which OASF's multi-word names make
   rarer: "presentation authoring" needs both words.
2. **Suggestions when filing:** three candidate nodes for an agent (point 6), from the classifier measured in
   `data/measurements/oasf-classifier-2026-11-09.json` (`scripts/measure/oasf-classifier/run.sh`; bge-small,
   flat, with the design node: 31% exact [28–35], 58% category [54–61], 86% [76–93] on its surest tenth);
   where it runs is open.
3. **Hiding copies in the search** from `data/catalogue/skill-originals-13579.json`.
4. **The test with real sessions:** does an agent choose well among OASF's entries?
5. `packages/protocol/src/skill-domains.ts` (`classifySkill`) still names the old categories; only seeding
   and audit scripts use it.

## Do not do in this task

- Write anything on chain before the user has reviewed the mapping.
- Mainnet.
