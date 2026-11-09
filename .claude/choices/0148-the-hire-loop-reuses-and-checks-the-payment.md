# 0148 — The hire loop reuses x402, ERC-8183 and ERC-8004, and checks the payment at read time

**Status:** Accepted (design; nothing built)
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09, on `docs/33` §5; task 77

## Context

`docs/33` describes the hire column of `docs/32`: a client agent pays a provider agent for a task, then
declares the result. It listed five open questions. The user's rule for all five: reuse what others
already built and audited, build as little as possible, and rebuild only what gives ARP an edge.

## Decision

1. **Payment:** x402, paying first, by default; ERC-8183 escrow above a price or duration threshold. ARP
   writes no escrow contract. An 8183 evaluator's attestation is shown as a dated fact with its source,
   never scored (ADR `0093`; `docs/12`'s drift signal against scoring other providers' assessments).
2. **Proof across chains:** the line carries the payment's reference in ERC-8004's `proofOfPayment`
   shape, and the reader checks it on the paying chain: the payer, read from the token transfer and never
   from `tx.from`, is the client agent's holder or its ERC-8004 `agentWallet`; the recipient is the
   provider's payee; the amount is the offer's. The verdict is a dated fact off chain, like the probe (ADR
   `0093`). No bridge, no oracle. A line whose proof does not check stays at the declared tier.
3. **Who signs a payment:** an autonomous agent under a per-period delegation (MetaMask's
   `erc20PeriodTransfer` for tokens, `TrustStakeCapEnforcer` for native TRUST); a person in the loop
   signs each x402 payment. The seller sees an ordinary x402 payment either way.
4. **ERC-8004 feedback:** observed lines are mirrored to `giveFeedback`, signed by the client, with
   `proofOfPayment` and a URI to the ARP line.
5. **Readers:** a dated, signed read API per endpoint and domain, open to any reader; ARP reads other
   sources (a pre-pay checker's index under its licence, 8004 feedback, 8183 attestations) as dated
   facts with the source named.

The one thing ARP rebuilds on purpose is **checking other people's signals against the payment that
backs them**. That is what makes one record worth reading for every checker or directory.

## Alternatives considered

- **An ARP escrow contract** — 8183 exists; a contract of ours is new audit surface for no gain.
- **A bridge or an oracle to carry the proof to Intuition** — trust in a third party, cost on every
  hire, and still one chain at a time. Checking at read time works for any chain.
- **Delegation only** — excludes every buyer who signs x402 payments today.
- **No 8004 mirror** — ARP's record stays where only ARP's readers look.
- **A read API for one reader** — the same data serves every reader; one per reader is maintenance.

## Consequences

**Positive:**

- No new contract, no payment code in ARP; every piece of the payment is someone else's audited code.
- A hire line with a proof that checks is observed, by a check anyone can rerun.

**Negative:**

- An agent paying from a smart account pays from an address that is not the key writing the line. The
  link is ERC-8004's own `agentWallet` (set by the new wallet's EIP-712 / ERC-1271 signature), the rule
  `apps/sponsor` already applies to hire receipts (`proof.ts`). Whether the paying chain's registry
  exposes it the same way is to check before building.
- Choice 4 is one more write per hire, on the registry's chain.
- The node is paid in native tTRUST today; x402 waits for the mainnet port (ADR `0102`), so the loop
  cannot run end to end on testnet as decided.

**Neutral (worth knowing):**

- How many ERC-8004 agents set `x402Support` is not measured.
- A business reading of this is kept out of this public repository (ADR `0142`).
