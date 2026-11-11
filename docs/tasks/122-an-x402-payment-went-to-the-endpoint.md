# Task 122 — An x402 line's payment went to the endpoint, for its price

**Status:** spec, 2026-11-11, written by arp-c1 for the orchestrator. Task 122, ADR `0189`, post-mortem `110`,
allocated by the orchestrator. Nothing built. Sequenced after task 121 (the payer's signature in the feed): if both change the
line request, it gets one version bump, not two.
**ADR:** one (the choice of section 3 and the new fields).
**Rules:** `code.md`, `security.md` (a payment proof read on another chain; the signing list if the line
request changes), `portability.md`, `claims.md`, `workflow.md`. Gates: `packages/protocol` test and lint,
`apps/sponsor` test, `apps/mcp` test and lint, `apps/cli` test, `check:node`, `packages --check`, root
`bun run check` and `bun run test:scripts`.
**Required skills:** `arp-contributing`.

## Why

Today `checkX402Payment` (`packages/protocol/src/x402-payment.ts`) keeps a payment when the transaction
succeeded and holds exactly one transfer of an accepted asset from the line's writer (or its
`agentWallet`), to anyone but the writer, of a non-zero amount. It does **not** check that the transfer
went to the endpoint's payee, or that it covered the endpoint's price. `x402-feed.ts` says so in its own
header: the recipient being the endpoint's payee "only the endpoint's 402 answer says; a reader such as
Doctor checks it".

So a transfer of 0.000001 USDC to the writer's own second wallet backs a `no-delivery` line about any
endpoint. Three such lines, from three wallets, would close
a proposed delivery gate built on three wallets for the price of gas. A pre-payment checker that
reads x402 endpoints already verifies payer, payTo and amount itself; ARP's own record and any gate
built on it need the same.

## The trap this design has to avoid

The case that matters most is "I paid and the endpoint gave nothing back", and an endpoint that took
the money is often an endpoint that no longer answers. A check that fetches the endpoint's 402 answer
when the line is written fails exactly then. And the line no longer carries the URL's values (task 119,
ADR `0186`), so the service cannot always rebuild the exact request whose price the payer saw.

So the payee and price cannot be read from the endpoint at write time alone.

## What to build

### 1. The payer brings the terms it paid against

The x402 client receives the endpoint's payment requirements in the 402 answer before it pays
(`PaymentRequirements` in Coinbase's `@x402` packages 2.28, used by `scripts/demo/x402-fake-seller.ts`:
read the field names from the package, do not guess them; they include the payee, the asset, the network
and the amount). `arp line` and the sponsored `/line` take these terms as part of the payment level:
payee, asset, network, amount, and the time they were received.

They are the payer's word, so step 2 checks them against the chain and step 3 against a source the payer
does not control.

### 2. The transfer must match the terms

In `checkX402Payment`, given the terms:

- the transfer's `payTo` equals the terms' payee;
- the transfer's asset and network equal the terms';
- the transfer's amount is at least the terms' amount.

Any mismatch is `refused`, with the reason, as today's checks are.

### 3. The terms must match a source the payer does not control

Without this, a payer writes terms naming its own second wallet and step 2 passes. The terms' payee is
compared with, in order:

1. **ARP's own dated reading of the endpoint's 402 answer**, if one exists from before the payment. Add
   it to the probe (`apps/probe`, `packages/protocol/src/verify/probe.ts`): for an x402 endpoint it
   already asks, keep the payee, asset, network and amount it answered, with the date. This is what makes
   the check work after the endpoint goes dark.
2. **A live read of the 402 answer**, at write time, when the endpoint still answers and the redacted
   URL is enough to get a 402.
3. **Nothing else.** Third-party listings (CDP Bazaar, Doctor's Trust Index) are not read in this task.

The record keeps which source matched:

```
payee_check: "probe" | "live" | "unchecked"
payee_checked_at: <time of the reading used>
```

`unchecked` is not refused: the line is still written and shown. It is excluded from any count that
claims payments went to the endpoint (`by_endpoint`, the `arp-delivery` component), and the feed says so.
A `payee_check` that disagrees with the terms is `refused`.

### 4. The feed carries the result

`X402FeedRecord` gains `price` (the terms' amount), `payee_check` and `payee_checked_at`. `by_endpoint`
counts only records whose `payee_check` is not `unchecked`, and gives the unchecked count beside it.
The schema version changes (`arp.x402-outcomes/4`: task 119 already took `/3`); the schema page says what changed.

## Decisions for the ADR

- Whether the line request carries the terms (a new request version, a signing-site change in
  `security.md`) or the sponsor receives them beside the signed request. Recommended: in the signed
  request, so the payer stands behind them.
- How long a probe reading stays valid as a reference for a later payment (a payee can rotate).
  Recommended: the most recent reading before `paid_at`, with its age shown, no hard cutoff in this task.
- Whether `amount ≥ price` or `amount = price`. Recommended: `≥`, since a client may overpay.

## Do not do in this task

- Read third-party listings (Bazaar, Doctor's index): a later task, with its own source rules.
- Change how the URL is redacted (task 119).
- Build the `arp-delivery` adapter itself: this task gives it the field it needs.
- Spend: tests use recorded receipts and the demo seller on Base Sepolia only, as task 91 did.

## Verification

- Unit tests over recorded receipts: a transfer to the payee for the price passes; to another address,
  for less, of another asset, are refused; terms naming the payer's own wallet are refused by the probe
  reading; no probe reading and a dead endpoint gives `unchecked`.
- The test feed (`--test`, task 118) rebuilt with the new fields.
- `task-verifier`.

**Evidence ladder:** hire column, observed tier. It makes the observed tier mean what it says for x402:
a payment from this buyer, to this endpoint, for its price. It does not move ARP up a tier; it stops a
record that is not observed from counting as one.
