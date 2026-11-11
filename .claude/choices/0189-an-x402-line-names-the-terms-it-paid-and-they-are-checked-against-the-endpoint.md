# 0189 — An x402 line names the terms it paid against, and they are checked against the endpoint

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** `docs/tasks/122-an-x402-payment-went-to-the-endpoint.md` (spec decided by the user), and a
gap found in task 119's review: `verifyLineRequest` accepted `no-delivery` with no payment.

## Context

`checkX402Payment` kept a payment that held one transfer of an accepted asset from the line's writer, to
anyone but the writer, of a non-zero amount. It did not check that the transfer went to the endpoint's
payee or covered its price. So a transfer of 1 unit of USDC to the writer's own second wallet backed a
`no-delivery` line about any endpoint, and three wallets doing it would close a delivery gate built on
three wallets for the price of gas.

The payee and the price are in the endpoint's `402` answer (`PaymentRequirements` in `@x402/core` 2.28:
`network`, `asset`, `amount`, `payTo`, read from `node_modules/@x402/core/dist/cjs/x402Client-C7_OogbK.d.ts`).
An endpoint that took the money and gave nothing back often no longer answers, and the line no longer
carries the URL's values (ADR `0186`), so the `402` cannot be read from the endpoint at write time alone.

Separately, `no-delivery` means "paid, nothing received", and the line request let it stand without a payment.

## Decision

1. **The terms are in the signed request: line request version 5.** `LineRequest` gains `payTo`, `asset`,
   `price` (the `402`'s `amount`, in the asset's smallest unit) and `termsAt` (when the `402` came, unix
   seconds), all empty or `0` without a payment and all required with one. Their network is the payment's:
   a payment label already names it, and a requirement on another network cannot be the one this
   settlement paid. The payer stands behind the terms with its signature. The same version also refuses
   `reason: no-delivery` with `payment: ""`. One bump for both changes, as the orchestrator allowed. A
   version 4 request no longer verifies; no version 4 request was ever kept in production (the store of
   ADR `0188` landed the same day and the hosted sponsor was not redeployed with it, `.claude/STATE.md`
   task 121 row), so nothing is lost to the feed.
2. **The transfer must match the terms** (`checkX402Payment({terms})`): same network, same asset, same
   `payTo`, `amount ≥ price`. `≥`, not `=`: a client may overpay, and refusing it says nothing about the
   endpoint. Checked by the sponsor before it writes, by `arp line` before it signs, and by the feed when
   it is built.
3. **The terms must match a reading the payer does not control** (`checkPayee`, `packages/protocol/src/x402-terms.ts`):
   - ARP's probe's reading of the endpoint's `402`, **the most recent before `paid_at`**, with its date kept
     as `payee_checked_at`, and **no cutoff on its age** in this task. `apps/probe` keeps the offers of a
     `402` answered to its `initialize` as outcome `x402`, and serves `GET /x402?target=&before=`.
   - a live `GET` of the URL signed, at write time, through `/list-tool`'s pinned client (no private address,
     no redirect, a deadline, a capped body). Asked only after the payment has checked on chain and the
     payment is not already spent, so one paid settlement buys at most one read per signed request.
   - nothing else: no third-party listing.

   A reading agrees when one of its offers is on the terms' network, in their asset, to their payee, for
   at most their price. **A probe reading that disagrees is overruled by a live read that agrees**, since a
   payee can rotate between the two; a reading that disagrees with nothing to overrule it refuses (`422`,
   `rule: payee`). Neither readable writes the line with `unchecked`.
4. **The check is kept beside the request**, in `line-requests.jsonl`, and served with it at
   `GET /line-request` as `payee_check` and `payee_checked_at`. The feed is built later, when a live read
   would say nothing about the time of the payment, so it takes the service's answer and re-checks only
   step 2 itself.
5. **The feed is `arp.x402-outcomes/4`.** A record gains `price`, `payee_check` and `payee_checked_at`.
   `by_endpoint` counts only records whose `payee_check` is not `unchecked`, with `unchecked` beside them:
   that changes what an existing field means, so the schema moves.

`packages/protocol/src/verify/probe.ts` is not changed: it is a one-shot prober of strangers' endpoints
that keeps no history, so it cannot be a dated reference. The dated reading is `apps/probe`'s.

## Alternatives considered

- **The sponsor receives the terms beside the signed request, unsigned.** No version bump, but the terms
  would be the service's word about what the payer saw, and the feed could not show a reader that the
  payer named them. Rejected, as the spec recommended.
- **`amount = price`.** Refuses an honest overpayment and gains nothing against the attack, which is a
  transfer to the wrong payee or for less.
- **A probe reading that disagrees always refuses.** Simpler, but a payee that rotated after the probe's
  last reading would refuse every honest line until the probe read again. The live read is a source the
  payer does not control either, so letting it overrule costs nothing against the self-payment attack.
- **Compare the payee only, not the price, against the reading.** Then a payer could sign a price of 1 unit,
  pay 1 unit to the real payee, and pass. The price is part of the disagreement.
- **A hard age limit on the probe reading.** Deferred, as the spec recommended: the age is shown instead.

## Consequences

**Positive:**

- A self-payment to a second wallet no longer backs a counted record: the transfer must match signed terms,
  and the terms must be the endpoint's by a reading ARP made.
- `no-delivery` can no longer be written through the sponsor without a payment.
- The observed tier means what it says for x402: a payment from this buyer, to this endpoint, for its price.

**Negative:**

- **Breaking for the CLI.** A line sent by `@arp-protocol/cli` 0.0.3 is refused by a sponsor built from this
  commit (401). The CLI and the sponsor ship together, as at versions 3 and 4.
- `apps/probe` is not hosted, and reads only the catalogue's endpoints. Until it is, the second check is a
  live read or nothing, and a dark endpoint gives `unchecked`.
- The live read is one more request from the process that holds the treasury key to a host a caller names.
  It goes through the same pinned client as `/list-tool` and costs the caller a verified payment.
- An endpoint whose price depends on the values ADR `0186` removes can be read at a higher price than the
  call paid, and an honest line about it is refused until the probe or a live read sees the same price.

**Neutral (worth knowing):**

- `payee_check` is ARP's word: which of its own readings named the terms. A reader can re-read the probe's
  `GET /x402` for the same target and date once the probe is hosted.
- An endpoint can name any address it likes as its payee. A `probe` or `live` record proves the payment
  went where the endpoint asked, not who the endpoint is.

## References

- Related rule: `.claude/rules/security.md` (signing list, payment proof paragraph)
- Related doc: `apps/web/public/docs/x402-feed.md`, `apps/web/public/docs/cli.md`
- Related ADR: `0159`, `0162`, `0166`, `0186`, `0188`
- Post-mortem: `.claude/learning/110-an-x402-payment-went-to-the-endpoint.md`
