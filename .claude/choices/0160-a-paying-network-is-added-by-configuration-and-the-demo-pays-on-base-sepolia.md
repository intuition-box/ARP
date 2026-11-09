# 0160 — A paying network is added by configuration, and the demo agent pays on Base Sepolia

**Status:** Accepted
**Date:** 2026-11-09
**Amends:** ADR `0159` (point 5: Base by default, now plus what the operator configures), ADR `0037` (a raw-key signature on one more test network, for one demo), `.claude/rules/security.md` (a twelfth signing site, one row in the signing table)
**Triggered by:** the user, 2026-11-09 (« oui » to: build a fake x402 seller, our agent pays it on Base Sepolia, gets nothing, writes the line, the feed publishes it), task 91

## Context

Task 89 shipped the x402 failure line and its feed with zero records: a record needs a real x402 payment,
and ARP does not pay on Base with its own money. The loop had never run end to end. Base Sepolia
(`eip155:84532`) has a test USDC, a public facilitator that settles it for free (`https://x402.org/facilitator`,
whose `/supported` listed `exact` on `eip155:84532` on 2026-11-09), and costs nothing real.

`x402-networks.ts` said "an operator adds a network by configuration", but nothing read such a
configuration: `X402_DEFAULT_NETWORKS` was hard-wired at the three readers (`arp line`, the sponsor's
`/line`, the feed build). Only the RPC could be changed (`ARP_X402_RPC_<id>`).

## Decision

1. **`ARP_X402_NETWORKS` adds paying networks** (`x402NetworksFrom` in `packages/protocol/src/x402-payment.ts`):
   comma-separated `eip155:<chain id>=<asset address>`, one accepted asset per entry. A network that is
   not a default has no public RPC in the code, so `ARP_X402_RPC_<chain id>` must name one. A malformed
   entry or a missing RPC **throws**: a typo never leaves a network silently out. The three readers use
   it. Base, with its USDC, stays the only default.
2. **For the demo only, the agent's key signs one EIP-3009 authorisation on Base Sepolia**
   (`scripts/demo/x402-e2e.ts`): 0.001 test USDC to the demo seller. The signing code is Coinbase's
   `@x402/evm` 2.28.0, pinned, a root `devDependency` (never in an app). The script refuses any other
   network, asset, payee or amount, checks the key's address against `--agent` before it signs, never
   prints the key, and appends every effect to `~/.arp/x402-e2e.jsonl`. This is ADR `0037`'s three
   conditions, on one more test network, for this action.
3. **The fake seller holds no key.** The facilitator submits the authorisation and pays the gas, so no
   Base Sepolia ETH is needed by anyone, and `tx.from` is the facilitator — the case ADR `0148` built the
   check for. `payTo` defaults to `0x…dEaD`, so a demo payment cannot look like a real seller's revenue.

## Alternatives considered

- **A network table in a JSON file** — one more file to find and keep; an environment variable is what
  the RPC override already uses, and the three readers already read the environment.
- **Base Sepolia as a second default** — every reader would then accept test payments on a feed that
  Doctor reads as real ones. A test network stays opt-in.
- **Our own EIP-3009 signing code** — smaller, but unaudited. Coinbase's package is what sellers and
  facilitators verify against; its dry run passed the facilitator's own `verify` up to the balance check.
- **A seller that settles itself** — needs a funded Base Sepolia key, and moves `tx.from` to the seller,
  which hides the facilitator case the check was built for.

## Consequences

**Positive:**

- The loop can run end to end with no real money: test USDC from a faucet, tTRUST already held by the
  sponsor on 13579.
- A network an operator adds is read the same way by the CLI, the sponsor and the feed, from one parser.

**Negative:**

- The line names a loopback URL (`https://127.0.0.1:4021/x402-demo/no-delivery`, after `normaliseToolUrl`
  forces https), a permanent test atom on 13579.
- The sponsor and the feed must be started with the same `ARP_X402_NETWORKS`; a sponsor without it
  answers 422 `network` and a feed without it skips the record. The runbook sets it for its children only.
- Root `devDependencies` gain `@x402/core`, `@x402/evm`, `@x402/fetch` (2.1 MB, 4.9 MB, 72 KB unpacked;
  zod 3 was already in the tree).

**Neutral (worth knowing):**

- The x402 client computes `validBefore` from the local clock. A WSL clock measured 321 s behind Base
  Sepolia on 2026-11-09 made a 120 s window expire before signing; the seller asks for 600 s and the
  runbook stops when the clock leaves less than two minutes.

## References

- Task: `docs/tasks/91-x402-end-to-end.md`
- Code: `packages/protocol/src/x402-payment.ts`, `scripts/demo/x402-fake-seller.ts`, `scripts/demo/x402-e2e.ts`
- Related ADR: `0037`, `0144`, `0148`, `0159`
- Rule: `.claude/rules/security.md`
