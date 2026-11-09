# Task 89 — The x402 failure feed

**Status:** built 2026-11-09 on `feat/89-x402-failure-feed`, not pushed; verification below.
**ADR:** `0159`.
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `intuition` (the on-chain shape), `arp-contributing`.

## Why

Frits Zwager (Fizzl, x402 Doctor) offered by e-mail on 2026-11-09 to read ARP's failure records inside
Doctor's check before paying, and to show "N paid, M got nothing" beside its verdict, as Doctor does for
nohumans.directory and PayAPI. Doctor verifies each settlement on chain itself. Its own
`POST /api/v1/outcome` takes only reports carrying a preflight Doctor signed, so ARP does not post there:
Doctor reads an ARP feed. Per record he asked for the endpoint URL, the outcome, the settlement
transaction, the network and the date (`FUTURE.md`, x402 section). The user decided to build it now.

The user's frame: Intuition holds the public trace only; payments settle on their own chain. ARP writes
on testnet 13579 only; the payment a line names is a real one made by the user or the agent, never by ARP.
A person's text never leaves their machine.

## Deliverables

1. **An x402 failure line.** A form B line about an endpoint URL, with one more level on its outcome:
   `(T3, paid with, "eip155:<chain>/tx/<hash>")` (`packages/protocol/src/x402-payment.ts`,
   `declare/usage-context.ts`). A fifth closed reason, `no-delivery`. The line request is version 2 and
   signs the payment (`sponsor/line.ts`). `arp line --payment-tx <hash> --network eip155:8453`, and the
   same through `apps/mcp/src/line.ts`, read the transaction on Base before any key is loaded. The
   sponsor's `/line` checks the network against its allowlist and the payment against the agent's holder
   or `agentWallet` before it spends; with such a payment a line may be about an endpoint.
2. **The feed.** `scripts/build/build-x402-feed.ts` → `apps/web/public/feeds/x402-outcomes.json`, built by
   `packages/protocol/src/x402-feed.ts`: records that check at build time, `by_endpoint`, `skipped` by
   reason, `truncated`, `generated_at`, the trace chain and the 3-wallet note. Served at
   `/feeds/x402-outcomes.json` with `Access-Control-Allow-Origin: *` (`apps/web/nginx.conf`).
3. **The docs page** `apps/web/public/docs/x402-feed.md`, in the manifest under "How it works".
4. **No end-to-end run.** A real record needs a real x402 payment on Base, which ARP does not make with
   its own money. The feed ships with zero records; the tests run on a recorded Base settlement
   (`packages/protocol/test/fixtures/x402-base-usdc-3009.json`, a stranger's USDC
   `transferWithAuthorization`, read 2026-11-09, named by no line).

## Do not do in this task

- Post anything to Doctor or any other service.
- Sign, send or spend on Base or any mainnet.
- Mirror records to ERC-8004 feedback (ADR `0148` point 4), or read Fizzl's Trust Index (FUTURE point 2).
- Read Solana or any non-EVM network.

## What Frits needs to do

Fetch `/feeds/x402-outcomes.json` from the site once it is hosted (the site is not yet), match his URL
against `endpoint`, and verify `settlement_tx` on `network` as he already does. The file is a snapshot:
it changes when the build is rerun.
