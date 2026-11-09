# 0147 — The evidence ladder is ordered by who produced the signal

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09, after task 75's report; task 76

## Context

Every task closes by naming its tier on `docs/09` §3's ladder: asserted, rated, staked, proven, with
ARP's position "the last two" (ADR `0022`, `0117`). The user read the state and said: tier 4 is an
enforcer only ARP uses and nobody else does, and tiers 1 and 2 are now produced by ARP itself, through
the hook and Intuition. Looking at the code bears that out, and goes one step further:

- `TrustStakeCapEnforcer` on mainnet never fired (0 `StakeCapChecked` logs, `scripts/measure/enforcer-events.ts`,
  2026-10-27), and delegations were set aside on 2026-11-03.
- A sponsored line costs its writer nothing, and the score never reads the deposit (ADR `0138`). By
  `docs/09`'s own definition ("capital that can be lost") ARP's lines are rated, not staked.

So the ladder no longer told a task where it stood.

## Decision

The user's decisions, 2026-11-09:

1. **The ladder is ordered by who stands behind a fact**: declared (the actor says so), observed (a
   record the actor did not write by hand: the runtime, a signed receipt, a contract that checked a
   payment), corroborated (3+ distinct wallets, the threshold of ADR `0143`).
2. **It has three columns that cross it**: skill (installed), agent (reached), and hire (an agent paid
   for a specialised task through ERC-8004).
3. **Every actor of the loop is described in the same nested shape** (form B, ADR `0138`): one triple,
   then `in context of`, `has outcome`, `because`. No second vocabulary for agents; the hire column
   reuses `(client, uses, agent)` as task 65 already writes it.
4. **The enforcer comes back, for the hire column only**: it bounds what the client's agent spends of
   its operator's credits with the agent it hires. This reverses the 2026-11-03 decision for that column.
5. **Reuse audited code, as little custom as possible**: native TRUST through `TrustStakeCapEnforcer`;
   an ERC-20 or x402 credit through MetaMask's `erc20TransferAmount` / `erc20PeriodTransfer` scopes, no
   ARP enforcer.
6. **For now, the docs only.** Building the hire loop under a delegation is a task of its own.

The canonical statement is `docs/32_THE_EVIDENCE_LADDER.md`. `CLAUDE.md`, `workflow.md`,
`task-verifier.md` and the post-mortem template point at it; `docs/09` §3 is kept as the record.

## Alternatives considered

- **Keep the cost ladder and say ARP is "staked"** — false by its own definition once lines are
  sponsored and the deposit is not read.
- **Drop proven and keep three cost tiers** — still orders by cost, which is not what separates ARP's
  signal from a free rating.
- **A separate ladder for agents** — two vocabularies for one loop; the user asked that every actor
  answer to the same nested dynamic.
- **An ARP enforcer for tokens** — custom code where MetaMask's audited scopes already cover it.

## Consequences

**Positive:**

- A task names a column and a tier that match what it ships; "staked" no longer has to be stretched.
- The hire column gives the delegation work a reason that is the product, not ARP's own guard rail.

**Negative:**

- On chain, an observed line and a declared one look the same; tier 2 is checkable by a third party
  only where a receipt or a contract is attached (`docs/32`, "What tier 2 does not prove").
- Tier 3 is a count of wallets, and a fresh key is cheap. It is a threshold, not a Sybil defence.
- Post-mortems and task files before this date name the old tiers. They are append-only and stay so.

**Neutral (worth knowing):**

- Measured 2026-11-09, testnet 13579, `scripts/measure/line-writers.ts`: no independent wallet has
  written a result line, so no column is at tier 3.
- Code comments that cite the old ladder as design history (`SourceMark.tsx`, the brand rings;
  `agent-trust.ts`) are left as they are: they describe why a thing was built, not a tier to claim.
