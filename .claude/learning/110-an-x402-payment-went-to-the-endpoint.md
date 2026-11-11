# 110 — An x402 line's payment went to the endpoint, for its price

**Task:** `docs/tasks/122-an-x402-payment-went-to-the-endpoint.md`
**Completed:** 2026-11-11
**Commit:** `98b12bfd` (the work), `4e969b43` (the round-1 fix), on the worktree branch, on `440cfd1f`
**Verifier verdict:** PASS (second round)

## What shipped

- `packages/protocol/src/x402-terms.ts`: the 402's offer and its terms, plus the transfer-vs-terms and terms-vs-reading checks
- `packages/protocol/src/sponsor/line.ts`: line request version 5 carries `payTo`, `asset`, `price` and `termsAt`, and refuses `no-delivery` without a payment
- `packages/protocol/src/x402-payment.ts`, `x402-feed.ts`: payee and price checked against the transfer; the feed carries `price`, `payee_check` and `payee_checked_at`, and `by_endpoint` counts unchecked records apart; `arp.x402-outcomes/4`
- `apps/probe/src/{probe,store,worker}.ts`: a dated reading of each x402 endpoint's offers, and `GET /x402?target=&before=`
- `apps/sponsor/src/x402-terms-read.ts`, `routes/line.ts`, `line-requests.ts`: the probe reading first, then a live 402 read, otherwise `unchecked`; the result is kept with the request
- `apps/mcp/src/line.ts`, `apps/cli/src/cli.ts`, `scripts/demo/x402-e2e.ts`: `--pay-to --asset --price --terms-at`
- Docs: `x402-feed.md`, `cli.md`, `lines.md`, probe README, `DEPLOY.md`, `.env.example`, the `security.md` signing-site entry; both feed snapshots rebuilt

## Surprises

- Round one failed on one item: two uncommented `as` casts in `apps/sponsor/src/x402-terms-read.ts` (the offer guard and the probe body), plus one in `apps/probe/test/probe.test.ts`. Every gate was green, but none of them checks `code.md`'s cast rule. Commit `4e969b43` added a one-line reason above each one.
- Round-one notes that did not block. The probe's label match is latent for catalogue URLs with `www.` or a trailing slash: no reading is found and the line is `unchecked`, not refused. When `x402-e2e` resumes from `--payment-tx`, it sets `--terms-at` to now rather than to when the 402 came.

## Decisions made

- **The terms are in the signed request (v5), one bump that also covers the `no-delivery` payment requirement**, with `amount ≥ price`, and the latest probe reading before the payment is used as the reference, with no cutoff. ADR: `.claude/choices/0189-an-x402-line-names-the-terms-it-paid-and-they-are-checked-against-the-endpoint.md`.
- **`unchecked` is written, not refused**, and kept out of `by_endpoint`'s checked count (ADR `0189`).

## Rules touched

- `.claude/rules/security.md`: signing-site entry amended for version 5; sufficient.
- `.claude/rules/code.md`: sufficient. The cast rule was missed, not missing.

## Suggestions for future tasks

- Before handing off, grep the diff for added ` as ` (leaving out `as const`) and read the line above each hit. No lint enforces the comment.
- Normalise the label (host without `www.`, path without trailing slash) where the probe stores a reading and where the sponsor looks it up, before a real catalogue URL relies on it.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire column, observed tier: an x402 record counts as observed only when its payment went to the endpoint's own payee for its price, so this stops a record that is not observed from counting as one, and does not move ARP up a tier.
