# Task 118 — A separate x402 test feed for Base Sepolia

**Status:** in progress, 2026-11-11, on `worktree-agent-a16f8ba98af84b432`. Deadline 2026-11-12.
**ADR:** none (no decision beyond what the orchestrator specified; see "What was decided").
**Rules:** `code.md`, `claims.md`, `portability.md`, `workflow.md`. Gates: root `bun run check` and
`bun run test:scripts`, `packages/protocol` test and lint, `apps/web` `tsc -b`, lint, test, `check:tokens`.
**Required skills:** `arp-contributing`.

## Why

A reader of the x402 feed wants a record in the same schema to build against before the main feed has
any. The main feed (`/feeds/x402-outcomes.json`, `arp.x402-outcomes/2`, ADRs `0159`, `0162`) reads Base
mainnet only and must stay so: no Base Sepolia line may ever enter it. Task 91's end-to-end lines are on
Base Sepolia, so they need a feed of their own.

## Do not do in this task

- Redact query values from endpoint URLs: task 119 changes the same builder for that. The change to
  `buildX402Feed` here is one optional field and one skip, kept apart from the record's shape.
- Run a new payment. The orchestrator relayed the user's authorisation of one more Base Sepolia payment
  (ADR `0160`, as in task 91) against a **hosted** seller, and it waits until the seller is online on
  Coolify (task 117 hosts it). Until then the test feed keeps the two `127.0.0.1` lines.

## Deliverables

1. **One builder, a network parameter.** `x402FeedNetworks("main" | "test", env)` in
   `packages/protocol/src/arp/x402-networks.ts`, beside `X402_TEST_NETWORKS` (Base Sepolia and its USDC).
   It throws when the environment adds a network the feed must not read: `eip155:84532` to the main
   feed, anything but `eip155:84532` to the test feed. `scripts/build/build-x402-feed.ts --test` writes
   `apps/web/public/feeds/x402-outcomes-test.json`: the same `buildX402Feed`, `"test": true` first.
2. **Loopback in the test feed only.** `X402FeedConfig.allowPrivateEndpoints`, set by `--test` alone;
   without it a line whose tool URL is loopback or private (`privateProbeTarget`) is skipped as "the
   endpoint is a loopback or private address".
3. **Tests**, `packages/protocol/test/x402-feed.test.ts`, "the main feed and the test feed (task 118)":
   the main feed refuses 84532 by configuration and skips a Base Sepolia line; the test feed refuses
   8453 by configuration and skips a Base line; a loopback endpoint is kept only with the flag.
4. **Docs.** `apps/web/public/docs/x402-feed.md` "The test feed"; `FUTURE.md` x402 section: the test
   feed, and an open-data directory of x402 purchase outcomes as a possible dated, attributed source,
   never on chain (the directory is not named).
5. **The demo seller, hostable.** `scripts/demo/x402-fake-seller.ts` takes `ARP_SELLER_PUBLIC_URL`,
   `ARP_SELLER_LISTEN`, `PORT`, `ARP_SELLER_PAY_TO` (and flags); its offer is unchanged (84532, its
   USDC, the payee, 1000 units). `scripts/demo/x402-seller.Dockerfile` with an allowlist
   `.dockerignore`. `scripts/demo/x402-e2e.ts --seller <https URL>` uses a hosted seller, held to the
   same offer check; its feed step now builds with `--test`.

## What ran, 2026-11-11

- `bun run scripts/build/build-x402-feed.ts --test` → `2 records, 0 skipped, truncated false`. Both are
  task 91's lines (settlements `0xa08cad0c…7191`, line `0xefdb8232…ca01`; and `0x8e0483db…43c7`,
  line `0x144e04f5…5436`), endpoint `127.0.0.1:4021`, payer `0x56BC…ec42`, 1000 units to `0x…dEaD`.
- The main build with `ARP_X402_NETWORKS=eip155:84532=…` throws `the main x402 feed does not read
  eip155:84532`. Without it, into a scratch file: `0 records, 2 skipped` (`network eip155:84532 is not
  read: 2`). The site's `x402-outcomes.json` was not rebuilt.
- The seller, local, with `ARP_SELLER_PUBLIC_URL=https://seller.arp.intuition.box`, `0.0.0.0:4031`:
  402 with `resource.url` `https://seller.arp.intuition.box/x402-demo/no-delivery`; 404 off its path.
- `x402-e2e.ts` dry run, local seller: steps 1 to 3 as in task 91, nothing settled. `--seller
  http://x/…` stops on the https check.
- Not run: `docker build` (no Docker daemon in this environment). The image is untested.

## What was decided

- The main feed refusing a loopback endpoint follows from "allowed in the test feed only"; before this
  task nothing refused one. On Base no line names a payment, so the new skip affects no record today.
- A network setting the feed must not read **throws** rather than being dropped, like
  `x402NetworksFrom`'s malformed entry: a setting copied between the two builds is never half obeyed.

## The paid run, once the seller is hosted

The hosted seller at `https://seller.arp.intuition.box` (user's host, 2026-11-11), with
`ARP_SELLER_PUBLIC_URL=https://seller.arp.intuition.box` and the image's default payee. A sponsor
reading Base Sepolia (`ARP_X402_NETWORKS`, `ARP_X402_RPC_84532`, `INTUITION_PIN_API_KEY`, as task 91):

```
bun run scripts/demo/x402-e2e.ts --seller https://seller.arp.intuition.box/x402-demo/no-delivery            # dry run
bun run scripts/demo/x402-e2e.ts --seller https://seller.arp.intuition.box/x402-demo/no-delivery \
  --execute --agent 0x56BC52C2A0B863C39dBcBE9aC853f301D79bec42
bun run scripts/build/build-x402-feed.ts --test
```
