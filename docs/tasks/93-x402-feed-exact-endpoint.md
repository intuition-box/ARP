# Task 93 — The x402 feed names the endpoint exactly as it was paid

**Status:** in progress.
**ADR:** `0162`.
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`, `intuition`. **Reviewer:** `intuition-integrator`.

## Why

Task 91 ran the x402 failure loop on Base Sepolia. The seller was called at
`http://127.0.0.1:4021/x402-demo/no-delivery`; the feed record says
`"endpoint": "https://127.0.0.1:4021/x402-demo/no-delivery"`, the tool atom's canonical form
(`normaliseToolUrl`). x402 Doctor matches records by the URL called, so `http`, `www.`, a trailing slash or
query order attach a record to nothing. The user decided on 2026-11-10: keep the atom canonical, carry the
exact URL in the signed line, write it beside the payment, emit it as `endpoint` with the canonical form
beside it.

## Deliverables

1. `paymentLevelLabel` / `parsePaymentLevelLabel` / `isExactEndpointUrl` / `exactEndpointNamesTool` in
   `packages/protocol/src/x402-payment.ts`: the payment level's atom is the payment, one space, the exact
   URL.
2. The line request version 3 signs `endpoint`; v2 no longer verifies.
3. The sponsor's `/line` checks the exact URL against the tool atom's URL from the index and writes it.
4. The feed (`arp.x402-outcomes/2`): `endpoint` exact or `null` for older lines, `endpoint_canonical`,
   `by_endpoint` by canonical; reads the atom's `data` (the index cuts labels at 256).
5. `arp line --payment-tx` signs `--tool` as the exact URL; `scripts/demo/x402-e2e.ts` step 6 asserts it.
6. `security.md`, `docs/28`, `docs/33`, `FUTURE.md`, `apps/web/public/docs/x402-feed.md` updated;
   `/feeds/x402-outcomes.json` rebuilt.

## Do not do in this task

Run the e2e with `--execute`, sign with a real key, deploy, publish or push.

## Gates

`packages/protocol` test and lint; `apps/sponsor` test and lint; `apps/mcp` test and lint; `apps/cli` test,
`packages --check`, `check:node`; root `bun run check`, `bun run test:scripts`.
