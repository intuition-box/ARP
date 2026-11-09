# 70 — The domain tree on OASF

**Task:** `docs/tasks/79-the-tree-on-oasf.md`
**Completed:** 2026-11-09
**Commit:** `0eacf67` on `feat/79-oasf-tree` (merge base `8e6f03e`, not pushed)
**Verifier verdict:** PASS (round 2; round 1 failed on six claims items)

## What shipped

- `data/catalogue/oasf-1.1.0-skills.json` — OASF 1.1.0 skills pinned (513 nodes, 18 categories, commit `f510be0d`); `NOTICE.md` and `oasf-LICENSE.txt` satisfy Apache-2.0 §4 (licence byte-identical to upstream, NOTICE verbatim).
- `data/catalogue/oasf-mapping-proposal-13579.json`, `oasf-skill-tags-proposal-13579.json` (662 skills, 68 low rows reviewed: 62 kept, 6 skipped), `skill-originals-13579.json` (31 groups, 161 copies; 26 originals of `inference-sh/skills`, 156 copies).
- `scripts/seed/oasf-tree.ts`, `scripts/seed/list-originals.ts` — planners; sign nothing.
- `data/catalogue/oasf-tree-13579.json` — record of the testnet 13579 write: 1,095 create calls (238 atoms, 843 triples, 14 deposits), 78 originals calls, 628 + 51 redeems.
- `data/measurements/oasf-classifier-2026-11-09.json` + `scripts/measure/oasf-classifier/` — the classifier figures ADR `0150` cites.
- ADR `0150`, `docs/25` §9, MCP tool descriptions and errors, `apps/web/public/docs/*`.

## Surprises

- The record said 1,094 landed with one reverted. The explorer showed all 1,095 create hashes successful. Call 940 had landed in wave 4. Its receipt read failed under the RPC quota, so wave 5 resent it, and the resend reverted at estimation. A failed receipt read under a quota is not a failed transaction.
- The RPC hit its bandwidth limit during verification. Testnet's Blockscout API (`module=account&action=txlist`) gave the attestor's and the treasury's full transaction lists, with `isError` and selectors, in two calls. That is the cheaper way to check a record.
- Call 940's hash is not in the record because no success line was logged for it. It is `0xa04a94060b5aeff7481d2fa5befd65ac985ee793dfbf2bd0c74cf0dbbeba2260`, block 9377485, a successful createTriples call (from the explorer). It can be added to the record.
- Round 1 also caught: `design` 37 (the data says 36), "179 leaf nodes" (only 159 of them are leaves), 290 of 662 cited against a population of 656 (286), the classifier cited from the scratchpad, and `document` left in one of two sites in `lines.md` plus one in `cli.md`.

## Decisions made

- **OASF 1.1.0 is the top of the tree; ARP adds one-word depth below; the OASF id is not on chain; only nodes that carry a skill are written; no migration layer.** ADR: `.claude/choices/0150-the-tree-is-oasf-and-arp-adds-depth.md`.

## Rules touched

- `.claude/rules/claims.md` — sufficient; checks 2 (one population) and 5 (the correction landed at one site of two) each fired.
- `.claude/rules/code.md` — the `as` casts in seed scripts carry no comments, consistent with the other seed scripts; the rule and the scripts disagree repo-wide.

## Suggestions for future tasks

- Check a send record against the explorer's txlist for the signer, not against the sender's success lines.
- Commit a measurement under `data/measurements/` before an ADR cites it, not after.
- When an example vocabulary changes, grep the old word across `apps/web/public/docs` including mermaid blocks.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

This serves the skill column and moves no tier. It replaces the vocabulary that a declared or observed line points into with OASF's shared, finer one, so ERC-8004 readers' `oasf.skills` land in ARP's tree. It adds no line, and corroborated (tier 3) is still none.
