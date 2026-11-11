# 106 — A separate x402 test feed for Base Sepolia

**Task:** `docs/tasks/118-x402-test-feed.md`
**Completed:** 2026-11-11
**Commit:** `0b49663d`
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/arp/x402-networks.ts` — `X402_TEST_NETWORKS` (Base Sepolia, its USDC) and `x402FeedNetworks("main" | "test", env)`, which throws on a network that feed must not read.
- `packages/protocol/src/x402-feed.ts` — `allowPrivateEndpoints`; without it a loopback or private endpoint (`privateProbeTarget`) is skipped.
- `scripts/build/build-x402-feed.ts` — `--test` writes `apps/web/public/feeds/x402-outcomes-test.json` with `"test": true` first; same `buildX402Feed`.
- `apps/web/public/feeds/x402-outcomes-test.json` — 2 records, both task 91's lines (settlement `0xa08cad0c…7191`, line `0xefdb8232…ca01`; and `0x8e0483db…43c7`).
- `packages/protocol/test/x402-feed.test.ts` — five tests: network tables, both refusals, Sepolia line out of main, Base line out of test, loopback kept only with the flag.
- `apps/web/public/docs/x402-feed.md` "The test feed"; `FUTURE.md` x402 section, the unnamed open-data directory as a dated, attributed source, never on chain.
- `scripts/demo/x402-fake-seller.ts` — public origin, listen address, `PORT`, payee by env; `remoteFakeSeller`. `scripts/demo/x402-seller.Dockerfile` with an allowlist `.dockerignore`. `scripts/demo/x402-e2e.ts --seller <https URL>`, held to the same offer check; feed step builds `--test`.

## Surprises

- The main feed had no loopback refusal before this task; "loopback in the test feed only" made it one. On Base no line names a payment, so the new skip is latent: zero records affected today.
- Adding Base to the test feed by env first trips `x402NetworksFrom`'s "set ARP_X402_RPC_8453" check; the feed refusal only shows once an RPC is set. The unit test sets one, so both paths are covered.

## Decisions made

- **Refuse, do not drop** — a network the feed must not read throws, like a malformed `ARP_X402_NETWORKS` entry, so a setting copied between builds is never half obeyed. No ADR.

## Rules touched

- `.claude/rules/code.md` — sufficient. One nit found: the Dockerfile's HEALTHCHECK comment says "any answer at all is alive: the seller answers 404 off its one path", while the command requires a 402 on the path. Fix the comment.
- `.claude/rules/claims.md` — sufficient; the task file names what was not run (`docker build`, no daemon).
- `.claude/rules/portability.md` — sufficient; the chain constants sit in `src/arp/`.

## Suggestions for future tasks

- Task 117/119: run `docker build -f scripts/demo/x402-seller.Dockerfile .` once a daemon exists; the image is untested. Task 119 edits the same `buildX402Feed`; the loopback skip sits after the canonical-URL check.
- The rerun against the hosted seller is in the task file's "The paid run" section.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire, observed: the test feed publishes payments ARP read on their own chain, but as test data on Base Sepolia, so it does not move ARP up the ladder; it lets an outside reader be wired before the first mainnet record.
