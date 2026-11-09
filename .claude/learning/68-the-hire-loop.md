# 68 — The hire loop, as a concept

**Task:** `docs/tasks/77-the-hire-loop.md`
**Completed:** 2026-11-09
**Commit:** `9dd4fd5`, `2a1e42e`, `b611f54`, `0c4c94c` on `docs/77-hire-loop` (from `391b80b`), not pushed
**Verifier verdict:** PASS (round 2; round 1 FAIL on two scope items and four claims items)

## What shipped

- `docs/33_THE_HIRE_LOOP.md` — what exists (ERC-8004, x402, Bazaar, ERC-8183, MetaMask delegations, a pre-pay checker) and what ARP takes from each, the actors, the actions in order with what exists today, the tiers, the five choices.
- `.claude/choices/0148-the-hire-loop-reuses-and-checks-the-payment.md` — x402 first, 8183 escrow above a threshold, the payment proof in 8004's `proofOfPayment` shape checked at read time, delegation for autonomous agents, mirror observed lines to 8004 feedback, an open read API.
- `CLAUDE.md` directory map, `.claude/STATE.md` row 77, `.claude/choices/INDEX.md`.

## Surprises

- The paying address is neither the line writer nor `tx.from`. Under x402 `tx.from` is the facilitator, and under a delegation it is the redeemer. The payer has to be read from the transfer (the `Transfer` event or the EIP-3009 authorisation) and matched to the holder or the ERC-8004 `agentWallet`. The registry already has that link (`contracts/src/erc8004/IdentityRegistry.sol:29,56,214`, with ERC-1271 for a smart account), and `sponsor/proof.ts:150-164` applies it to receipt signers.
- That correction landed in §5 first. The Observed row and the §4 paragraph kept the old "sender is the line's writer" until round 1 (`claims.md` check 5).
- ERC-8004's optional feedback file has `oasf.domains` and A2A `contextId`/`taskId`. "No context" and "nobody records the domain" were false. What it lacks is closed failure reasons and a payment check at read time.
- The EIP-8183 page does not say it comes from Virtuals, and it does not name bribery or collusion. It says the evaluator is trusted, there is no dispute resolution, and its ruling is final.
- A parenthetical that says "kept out of this repo (X, Y)" publishes X and Y. Round 1 removed it from the ADR and the task file.

## Decisions made

- **The five choices of `docs/33` §5** — the user's, 2026-11-09. ADR: `.claude/choices/0148-the-hire-loop-reuses-and-checks-the-payment.md`.
- **External attestations (8183, 8004 feedback, a checker's index) are shown as dated facts, never scored** — the line `docs/12` draws against scoring other providers' assessments. ADR `0148` §1, §5.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Checks 2, 3 and 5 caught the round-1 items.
- `.claude/rules/workflow.md` — sufficient.

## Suggestions for future tasks

- Before writing "nobody does X" about a standard, read its optional off-chain schema as well as its on-chain function.
- Cite a third party's weak point in the spec's own words, or name the forum post it comes from.
- When the business reading is kept elsewhere, say only that it is kept elsewhere, and do not name it.
- Before building choice 2, check that the paying chain's ERC-8004 registry exposes `agentWallet` as ARP's copy does.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire column, no tier moves: the task defines how a hire line reaches observed (a payment proof read from the transfer and checked at read time against the holder or `agentWallet`), but ships no line, so it moves the plan for the hire column and not ARP's position.
