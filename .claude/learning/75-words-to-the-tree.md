# 75 — Words to the tree

**Task:** `docs/tasks/84-words-to-the-tree.md`
**Completed:** 2026-11-09
**Commit:** `49f186d` on `feat/84-domain-aliases` (not pushed)
**Verifier verdict:** PASS (round 2)

## What shipped

- `data/catalogue/domain-aliases.json` — 106 words → OASF nodes; 85 reach a node written on 13579.
- `packages/protocol/src/domain-words.ts` — `resolveDomain`, `suggestNodes`, `domainInText`: pure, local.
- `apps/mcp/src/domain-words.ts` — the tree's labels + alias table; wired into `arp_declare_used`,
  `arp line`, `arp_file_category` (sponsored), `arp_pulse`.
- `apps/hook/src/skill-failure.ts` — failure domain = node from the person's words, else the skill's
  filed node; `recordSearch` accepts only a node.
- `data/catalogue/skill-nodes-13579.json` + `scripts/build/build-skill-nodes.ts --check` — 243 nodes,
  510 skills, from task 79's proposal minus `reviewed: skip` rows.
- `inferDomain` removed (superseded by `domainInText`).

## Surprises

- 21 of 106 aliases target OASF nodes task 79 never wrote (`payment`, `tts`, `translate`, `solidity`…):
  in production they resolve to nothing and get no suggestion. The test checked the OASF pin (513), not
  the written tree (243). Now counted by a test.
- The generated hook table had no generator; re-derivation matched exactly, but nobody could regenerate it.
- The model footprint figures (700 / 133 / 536 / 360 MB) were placed beside the accuracy measurement file,
  which holds none of them.

## Decisions made

- **Alias table, local, no model** — user's call; words never sent to ARP or a matcher. ADR: `.claude/choices/0155-words-to-the-tree-stay-local.md`.
- **Footprint figures kept as a dated hand measurement**, named model and version, explicitly not committed.

## Rules touched

- `.claude/rules/claims.md` — sufficient; checks 1 (reachability) and "commit the script" caught both round-1 items.
- `.claude/rules/code.md` — sufficient; `void param` to silence an unused parameter is the pattern to reject.

## Suggestions for future tasks

- When a table targets a taxonomy, test its targets against what is written on chain, not only the pin.
- A data file the runtime ships with needs its generator and `--check` in the same commit.
- "The words never leave the machine" is wider than true while `arp_pulse` hands phrases to `skills find`;
  say "no word is sent to ARP or to a matcher".

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, corroborated tier: it keeps declared lines from splitting across duplicate nodes, which three
wallets on one node needs, but adds no line, so ARP does not move up.
