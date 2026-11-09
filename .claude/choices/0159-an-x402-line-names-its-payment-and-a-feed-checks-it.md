# 0159 — An x402 line names its payment in one more level, and a feed keeps it only when the payment checks

**Status:** Accepted
**Date:** 2026-11-09
**Amends:** ADR `0138` (point 2, the closed reasons: a fifth), ADR `0144` (a sponsored line about an endpoint), `.claude/rules/security.md` (a payment proof read on another chain)
**Triggered by:** the user, 2026-11-09, building task 89 now, after Frits Zwager (x402 Doctor) offered by e-mail to read ARP's failure records before an agent pays (`FUTURE.md`, x402 section, update of 2026-11-09)

## Context

Doctor's own outcome route takes only reports carrying a preflight it signed, so ARP does not post there.
Doctor reads a feed instead, checks each settlement itself (payer, payTo, amount), and shows "N paid, M got
nothing". Per record it asked for the endpoint, the outcome, the settlement transaction, the network and
the date. ARP's lines had no way to name a payment, no reason meaning "paid, got nothing back", and the
sponsored path refused any tool that is not on GitHub (ADR `0144`), because a fresh key could otherwise lift
an endpoint on ARP's money.

ADR `0148` already fixed the rule: the payer is read from the token transfer, never `tx.from`, and is the
line writer's holder address or its ERC-8004 `agentWallet`; the check runs when the line is read.

## Decision

1. **The payment is one more level on the outcome:** `T5 = (T3, paid with, "eip155:<chain>/tx/<hash>")`.
   Two new terms: the word `paid with`, and one plain-string atom per payment, in lower case so one payment
   is one atom. The line is still valid without it; then the feed does not count it.
2. **Only the network and the hash are written.** The payer, `payTo`, the amount and the asset are in the
   transaction. Writing them again would be a second source for one datum (`docs/02`), and the reader
   reads the transaction anyway.
3. **A fifth closed reason, `no-delivery`**: paid, got nothing back. Nothing the searcher can supply
   excuses it, so `pulse-score.ts` counts it wherever the line's domain counts.
4. **The line request is version 2** and signs `payment` (`""` for none). A version 1 request no longer
   verifies; the CLI, the MCP path and the sponsor ship together.
5. **The sponsor's `/line` reads the payment before it spends**: the network must be one it reads (Base,
   `eip155:8453`, by default), and the transaction must hold exactly one transfer of an accepted asset (USDC
   on Base) from the agent's holder or its `agentWallet`, to someone else, of more than zero. With such a
   payment, a line may be about an endpoint, which ADR `0144` refused: lifting an endpoint now costs a real
   payment by the agent itself. Without one, the refusal stands.
6. **The feed** (`scripts/build/build-x402-feed.ts` → `apps/web/public/feeds/x402-outcomes.json`) is a dated
   static snapshot (ADR `0154`). A record needs: the payment checks as in 5, read again at build time; a
   wallet other than ARP's stands behind every level; the line was written after the payment; no other line
   whose payment also checks names the same payment. The sponsor spends one payment once: its label is
   the line's ledger key, under any nonce. Everything else is counted in `skipped` by reason. If a paying chain does not
   answer, nothing is written.
7. **ARP reads the paying chain and signs nothing there.** Its own writes stay on testnet 13579.

## Alternatives considered

- **The payment in a pinned document** (8004's `proofOfPayment` JSON on IPFS) — needs a pin and an IPFS read
  for every record, and a document anyone can pin says nothing more than the hash it holds.
- **All six fields in the atom's label** — a second copy of what the transaction says, and a mismatch
  between the two would need its own rule.
- **The payment on T1** — T1 is the same triple for every call an agent makes to one endpoint, so a payment
  there could not say which outcome it paid for. On T3 it can, within one agent's line.
- **Posting to Doctor's `/api/v1/outcome`** — refused by Doctor without its own signed preflight.
- **Restricting `payTo` to the endpoint's payee** — only the endpoint's 402 answer says it, and calling the
  endpoint at build time would be a probe of a third party. Doctor checks it; the docs page says ARP does not.

## Consequences

**Positive:**

- A record is tied to a real payment by the writer, checkable by anyone with a public RPC: the one thing
  `docs/33` §1 says nobody else keeps. It is the "observed" tier of `docs/32` for the hire column.
- Two new terms on the graph, no new contract, no new chain written to.

**Negative:**

- **The feed is empty today.** No line with a payment exists, and writing one needs a real x402 payment on
  Base, which ARP will not make with its own money.
- **Within one agent, one outcome triple per domain.** Two payments that both `failed` in the same domain
  sit on the same T3; each is its own T5 and its own record, but they share the reason.
- **A self-payment between two wallets of one person passes.** The check proves a transfer from the writer,
  not that the recipient is an endpoint someone else runs. The docs say so, and the 3-wallet rule of ADR
  `0143` still governs ARP's own ranking.
- **One payment named by two lines drops both**, so a wallet can void its own record by writing a second
  line with the same payment. It cannot void another payer's, whose transfer is not from it.
- The sponsor now reads Base on every line with a payment: one more dependency, with a 503 when Base does
  not answer.

**Neutral (worth knowing):**

- `agentWallet` is read on ARP's registry on 13579, where the agent is. Whether a Base registry exposes the
  same `agentWallet` for the same agent (ADR `0148`) is not answered here.
- `security.md`'s list gains the payment proof, and its signing table's line row gains the payment level.

## References

- Task: `docs/tasks/89-x402-failure-feed.md`
- Code: `packages/protocol/src/x402-payment.ts`, `packages/protocol/src/x402-feed.ts`, `apps/sponsor/src/routes/line.ts`, `apps/mcp/src/line.ts`
- Doc: `apps/web/public/docs/x402-feed.md`, `docs/28_THE_SIGNAL.md`, `docs/33_THE_HIRE_LOOP.md`
- Related ADR: `0138`, `0143`, `0144`, `0148`, `0154`
- Rule: `.claude/rules/security.md`
