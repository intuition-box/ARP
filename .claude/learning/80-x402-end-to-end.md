# 80 — The x402 failure loop, end to end on Base Sepolia

**Task:** `docs/tasks/91-x402-end-to-end.md`
**Completed:** 2026-11-09 (built and dry-run; the paid run waits on the user's test USDC)
**Commit:** `290a4ac`, `d564954`, `ececf21` on `feat/91-x402-e2e-sepolia`
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/x402-payment.ts` — `x402NetworksFrom`: `ARP_X402_NETWORKS` adds a paying network, a non-default one needs `ARP_X402_RPC_<id>`, a bad setting throws. Used by `apps/mcp/src/line.ts`, `apps/sponsor/src/main.ts`, `scripts/build/build-x402-feed.ts`. Base stays the only default.
- `packages/protocol/test/fixtures/x402-base-sepolia-usdc-3009.json` — a stranger's recorded Base Sepolia EIP-3009 settlement; tested in `x402-payment.test.ts` (paid once configured, refused otherwise, facilitator as `tx.from` refused as payer).
- `scripts/demo/x402-fake-seller.ts` — 402 with x402 v2 `exact` on `eip155:84532`, 0.001 USDC, settles through x402.org, answers 200 with an empty body. Holds no key.
- `scripts/demo/x402-e2e.ts` — the runbook: config, seller, 402 check, throwaway-key dry run through the facilitator's `verify`, agent balance read; with `--execute`, pay, detect nothing usable, `arp line --reason no-delivery --payment-tx --network eip155:84532`, feed into `~/.arp/x402-e2e/feed.json`, check payer, pay_to, amount.
- `.claude/rules/security.md` — twelfth signing site (the EIP-3009 authorisation), one signing-table row for Base Sepolia 84532. ADR `0160`.

## Surprises

- The local WSL clock ran 321 s (320 s on the verifier's rerun) behind Base Sepolia; x402 computes `validBefore` from the local clock, so a 120 s window was expired at signing. Window now 600 s, runbook stops under two minutes of margin.
- No Base Sepolia ETH is needed: the facilitator submits the transfer, so `tx.from` is the facilitator (the ADR `0148` case).

## Decisions made

- **Networks by environment, not a JSON table; Base Sepolia opt-in, never a default** — a test network as default would let test payments into a feed read as real. ADR: `.claude/choices/0160-a-paying-network-is-added-by-configuration-and-the-demo-pays-on-base-sepolia.md`.
- **Coinbase's `@x402/*` 2.28.0, pinned, root devDependencies only** — the code sellers and facilitators verify against, rather than our own EIP-3009 signer.

## Rules touched

- `.claude/rules/security.md` — updated (twelve sites, one row). Count re-checked at twelve.
- `CLAUDE.md` and `.claude/rules/workflow.md` — still point the evidence-ladder question at `docs/09` §3 (asserted/rated/staked/proven); `docs/32` and ADR `0147` replaced it. The caller's report used "proven" because of this. Pre-existing, out of this task's scope.

## Suggestions for future tasks

- Measure clock skew against the target chain before any signature with a validity window.
- Fix the router and `workflow.md` to cite `docs/32` (ADR `0147`), so completion reports stop naming retired tiers.
- `scripts/demo/x402-fake-seller.ts` header says "the runbook names one the user holds" for `payTo`; the runbook defaults to `0x…dEaD`. One-line comment fix.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire column, observed tier: a no-delivery record tied to a test payment anyone can check on a public RPC
(a record the actor did not write by hand); it does not move ARP up yet, because no payment was made and
no record exists — it moves once the user funds the agent and the paid run lands one.
