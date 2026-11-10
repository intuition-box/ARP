# 82 — The x402 feed names the endpoint exactly as it was paid

**Task:** `docs/tasks/93-x402-feed-exact-endpoint.md`
**Completed:** 2026-11-10
**Commit:** `e99215a`, `c83cd55`, `dbb4d6b` on `worktree-agent-a893a47e225b6965e`
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/x402-payment.ts` — `paymentLevelLabel` / `parsePaymentLevelLabel` (`eip155:<chain>/tx/<hash> <exact URL>`), `isExactEndpointUrl` (http(s), host, printable ASCII, max 512), `exactEndpointNamesTool` (both sides through `normaliseToolUrl`).
- `packages/protocol/src/sponsor/line.ts` — line request EIP-712 version 3, signs `endpoint`; required with a payment, `""` without; v2 no longer verifies.
- `apps/sponsor/src/routes/line.ts`, `categories.ts` (`lineToolUrl`) — reads the tool atom's `thing.url`, refuses a mismatch 422 `rule: 'endpoint'` before spending; ledger key stays the bare payment.
- `packages/protocol/src/x402-feed.ts`, `packages/graphql/src/queries/x402-feed.ts` — schema `arp.x402-outcomes/2`: `endpoint` exact or `null`, `endpoint_canonical`, `by_endpoint` by canonical; reads `object.data` (label cut at 256).
- `apps/mcp/src/line.ts`, `desktop/loop.ts`, `apps/cli/src/cli.ts` — `--tool` is the exact URL with `--payment-tx`; `scripts/demo/x402-e2e.ts` step 6 asserts it.
- Docs: `security.md` (signing site, sponsoring row), `docs/28`, `docs/33`, `FUTURE.md`, `apps/web/public/docs/x402-feed.md`; `/feeds/x402-outcomes.json` rebuilt (0 records, 1 skipped: Base Sepolia not read by default).

## Surprises

- The testnet index cuts a text atom's `label` at 256 characters and keeps `data` whole; caught by `intuition-integrator` on the first commit. Read `data` whenever an atom string can grow.
- A Thing's `url` is not guaranteed canonical, so the agreement check normalises both sides.

## Decisions made

- **Exact URL inside the payment atom, not a sixth level** — no extra atom, triple or deposit (~0.004 tTRUST saved per line on 13579, ×100 on 1155). ADR: `.claude/choices/0162-the-x402-feed-names-the-endpoint-exactly-as-it-was-paid.md`.
- **Old lines get `endpoint: null`, never a guess from the canonical form.** Same ADR.

## Rules touched

- `.claude/rules/security.md` — updated in place (line request v3, sponsoring row); site count unchanged.
- `.claude/rules/claims.md` — sufficient; the stale-wording sweep for `x402-outcomes/1` and "version 2" found only historical copies (task 89, ADR 0159, post-mortem 79, STATE.md's task-89 row).

## Suggestions for future tasks

- `atomDataMaxLength` 1,000 is cited from a 2026-11-10 read with no committed script; commit the read before relying on the bound for mainnet.
- `STATE.md`'s task-89 row still says "line request v2" — the caller updates it with this task's row.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire column, observed tier: an x402 record is a payment read on its own chain plus the payer's word, and this makes that observed record matchable by an outside reader (x402 Doctor) on the URL it checks, so it makes the observed tier usable by a third party without moving to corroborated.
