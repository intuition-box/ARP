# 67 — The evidence ladder, ordered by who produced the signal

**Task:** `docs/tasks/76-the-ladder.md`
**Completed:** 2026-11-09
**Commit:** `bc96f6a`, `6400f47`, `745160d` on `docs/76-the-ladder` (from `76899a8`), not pushed
**Verifier verdict:** PASS (round 2; round 1 FAIL on six claims items)

## What shipped

- `docs/32_THE_EVIDENCE_LADDER.md` — tiers declared / observed / corroborated × columns skill / agent / hire, where ARP stands, what tier 2 does not prove.
- `.claude/choices/0147-the-evidence-ladder-is-ordered-by-who-produced-the-signal.md` — the user's decisions; delegations back for the hire column only; audited caveats reused.
- `CLAUDE.md`, `.claude/rules/workflow.md`, `.claude/agents/task-verifier.md` (step 7), `.claude/learning/TEMPLATE.md` — the question now asks for a column and a tier.
- `docs/09` header (§3 kept as record), `docs/12` point 5, `docs/01:117`, `docs/30:33`, `docs/27` §5 — amended to the new ladder or the 2026-11-09 reversal.
- `data/measurements/line-writers-2026-11-09T1021.json` — 10 `has outcome` lines on 13579, all by ARP's two wallets.

## Surprises

- Round 1 missed two live copies: `docs/27` §5 still graded proofs by the old rung, and `docs/12` point 5 still said nothing would rely on delegations. A ladder change touches every doc that grades evidence, not only the files that ask the question.
- The measurement only covers result lines, so "no column at tier 3" went past what it measured: the agent column's tier 3 ("3+ wallets reached it") has no on-chain record to count.
- `arp_record_reachable` is a tool-reachability tool, not an agent one; it was cited in the agent column.
- Two ADRs share the number `0143`; cite by slug.

## Decisions made

- **Ladder ordered by who stands behind a fact, not by cost** — ADR `0147`.
- **Delegations back for the hire column only; `TrustStakeCapEnforcer` for native TRUST, MetaMask `erc20TransferAmount` / `erc20PeriodTransfer` for tokens** — ADR `0147`.
- **Past task files, post-mortems, ADRs and design-history code comments keep the old tiers** — append-only; ADR `0147` Neutral.

## Rules touched

- `.claude/rules/workflow.md` — changed: column and tier.
- `.claude/rules/claims.md` — sufficient; checks 4 and 5 caught the round-1 items.

## Suggestions for future tasks

- When a classification changes, grep for every doc that grades evidence with it (`Rung`, tier names), not only the question's wording.
- Scope a "none reaches X" sentence to the populations the script reads; mark the rest "not measured".
- "The only delegations ever signed were ARP's own operator's" rests on what ARP has seen: an unredeemed delegation leaves no on-chain trace. Say "the only ones ARP knows of" if it is restated.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Serves no column directly: it redefines the ladder and records ARP's position on it — skill and agent at observed, hire at observed for receipts with payment under a delegation not built, skill and hire not at corroborated and the agent column's corroborated tier not measured (`line-writers.ts`, 13579, 2026-11-09) — so it moves ARP's description, not its position.
