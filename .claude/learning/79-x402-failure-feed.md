# 79 — The x402 failure feed

**Task:** `docs/tasks/89-x402-failure-feed.md`
**Completed:** 2026-11-09
**Commit:** `d8cc2a0`, `c9c25cb`, `5691932`, `71974e6` on `feat/89-x402-failure-feed` (on `main` `94bfb84`, not pushed)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/x402-payment.ts` — `paymentAtomLabel` / `parsePaymentAtomLabel` (`eip155:<chain>/tx/<hash>`,
  lower case), `checkX402Payment` (payer from the `Transfer` log, never `tx.from`; one transfer of an accepted asset
  from the writer or its `agentWallet`, not to itself, above zero), read-only clients via `x402Reading`.
- `packages/protocol/src/arp/x402-networks.ts` — `X402_DEFAULT_NETWORKS` (Base 8453, native USDC, public RPC);
  the only chain constant added, inside `arp/`.
- `declare/usage-context.ts` — fifth reason `no-delivery`; `T5 = (T3, paid with, payment)`.
- `sponsor/line.ts` — line request EIP-712 version 2, signs `payment`.
- `apps/sponsor/src/routes/line.ts` — network allowlist, payment checked on Base before any spend, an endpoint line
  allowed only with a payment, one payment backs one line (ledger key = payment label).
- `apps/mcp/src/line.ts`, `apps/cli/src/cli.ts` — `--payment-tx` + `--network`, read on Base before any key loads.
- `packages/protocol/src/x402-feed.ts`, `scripts/build/build-x402-feed.ts` → `apps/web/public/feeds/x402-outcomes.json`
  (0 records, 0 skipped, testnet 13579, 2026-11-09). Duplicate-payment drop counted after verification.
- `apps/web/public/docs/x402-feed.md` + manifest entry; `apps/web/nginx.conf` serves `/feeds/` with CORS `*`.
- Tests on a recorded Base settlement (`packages/protocol/test/fixtures/x402-base-usdc-3009.json`), no live network.

## Surprises

- ADR `0144` refused sponsored lines about anything not on GitHub, so an endpoint line needed a new gate: the
  agent's own payment, verified before spending, is what unlocks it.
- `intuition-integrator` caught that de-duplicating payments before verification lets a stranger void a payer's
  record by naming the same transaction; and that the sponsor could be asked to back one payment under many nonces.

## Decisions made

- **Only network + hash on chain; payer, payTo, amount, asset read from the transaction** (storage principle).
  ADR: `.claude/choices/0159-an-x402-line-names-its-payment-and-a-feed-checks-it.md`.
- **The payment hangs on T3, not T1** — T1 is shared by every call to one endpoint.
- **Line request version 2** — v1 stops verifying; CLI, MCP and sponsor ship together.

## Rules touched

- `.claude/rules/security.md` — sufficient; the payment proof was added to the signature-site list and the
  signing-table line row, as the rule demands for a new proof site.
- `.claude/rules/portability.md` — sufficient; Base and USDC live in `packages/protocol/src/arp/` only.
- `.claude/rules/claims.md` — the "four reasons" sweep landed in `concepts.md`, `glossary.md`, `lines.md`,
  `docs/28`, `docs/31`, the MCP enum and ADR `0138`'s status. Left: `lines.md:9` still says "up to four statements"
  (T5 is introduced as "one more" below the table); `scripts/demo/agent-call-wallet.ts:121,128` keeps a four-reason
  enum for a demo that pays nothing; `.claude/STATE.md:66` describes task 66 as built.

## Suggestions for future tasks

- When a closed vocabulary grows, grep the old count and the enum literal, not just the prose ("four", `'not-the-right-tool']`).
- A feed that drops duplicates must count them among verified records only, or any reader can void a writer's record.
- Run each workspace's own `test` script (`vitest run` in `packages/protocol`, `apps/mcp`); bare `bun test` there fails spuriously.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire column, observed tier: a record exists only when a payment the writer made checks on its own chain (the
outcome itself stays the payer's word); it moves ARP up in mechanism only, since no record exists yet.
