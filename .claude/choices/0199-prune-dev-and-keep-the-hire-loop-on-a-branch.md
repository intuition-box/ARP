# 0199 — Prune what production does not need from `dev`; keep the hire loop on `future/hire-loop`

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** the user's decisions of 2026-11-11, relayed by the orchestrator; task 139
(`docs/tasks/139-prune-dev-keep-the-hire-loop.md`)

## Context

An inventory made on 2026-11-11 sorted what `dev` carries that production does not use into four
groups: A tooling, B "for later" (the web delegation flow, the delegation register, the hire node,
`ReceiptEnforcer`, the hire demos), C dead code, D unclear (`docs/design/cli-v0`, one-off demos). The
user's words: « on supprime [cli-v0 et les démos ponctuelles] sauf si les démos sont essentielles »;
« B, pour plus tard : le sortir de main sur une branche future/hire-loop ». For C the orchestrator
recommended deletion and the user is of the same mind.

`apps/node` ships in `@arp-protocol/cli` 0.0.6 as `arp node` and `arp init --node`, so removing it is
a user-visible change to the next CLI release, not a refactor.

## Decision

1. **`future/hire-loop`** is `origin/dev` at `72a62f1c`, pushed as is, with nothing added. Every file
   this task removes is on it.
2. **On `dev`, B, C and the non-essential D are removed.** `arp node` and `arp init --node` leave the
   CLI after 0.0.6, recorded as a removal in `apps/cli/CHANGELOG.md` under "Unreleased".
3. **The sponsor's `POST /publish` is B and goes**, with `delegation/register.ts`, `state.ts`,
   `checkPublishLimits` and the `publicationsPerDelegatorPerDay` limit
   (`SPONSOR_PUBLICATIONS_PER_DELEGATOR_PER_DAY`). Its only client was the web delegation flow. The
   ledger keeps the `publish` record kind, so a ledger written before still reads and its
   publications still count against the daily budget.
4. **The sponsor's hire-receipt proof stays.** `sponsor/proof.ts` checks both proof kinds, the
   content receipt and the hire receipt, and `hire-receipt.ts` is also read by the agent pulse
   (`agent-pulse.ts`) and by the sponsor request (`sponsor/request.ts`, `hireDigest`). Removing the
   hire kind would change the deposit route's input and a module production reads, for no gain.
5. **A deployed contract's source stays.** `TrustStakeCapEnforcer` and `IdentityRegistry` are in
   `data/deployments/*.json`; `ReceiptEnforcer` is in none and goes. (`DomainScopeEnforcer`'s source
   was already removed in `59ac83a`.)
6. **A demo is essential when a current document tells a reader to run it, a test runs it, or
   production runs it.** Kept: `x402-e2e.ts`, `x402-fake-seller.ts` and its Dockerfile (the hosted
   seller), `terminal-demo.ts` (`docs/26` §6, `docs/31` line 3), `demo-loop.ts` and `demo-adopt.ts`,
   which it runs (`docs/21`), `scripts/sandbox/versioned-line-fork.ts` (the script behind
   `data/measurements/versioned-line-fork-2026-11-11.json`, cited in `docs/28`), and
   `scripts/agent/agent-declare-used.ts` (direct mode only: it names `toDelegatedCalls` in a comment
   and never imports it).
7. **Two inventory items are kept against the inventory**: `demo-adopt.ts` (B in the inventory, but
   direct mode and run by `demo-loop.ts`) and `components/brand/nav-height.ts` (C in the inventory,
   but imported by `scripts/measure/landing-fit.ts`).

## Alternatives considered

- **Keep `apps/node` in the CLI and move only the web flow.** Not what the user asked: B goes to the
  branch, and the node is B.
- **Remove the hire proof from the sponsor too.** See decision 4: shared code that production reads.
- **Delete `terminal-demo.ts` and `demo-loop.ts` as one-off demos.** Both are the procedure a current
  document gives, so they are essential by the user's own exception.

## Consequences

**Positive:**
- 109 files and 14,991 lines leave `dev` (`git diff --diff-filter=D --numstat 72a62f1c <tip>`); the
  CLI, the protocol package and the sponsor no longer carry code no production path reaches.
- `@arp-protocol/core` no longer declares `@metamask/smart-accounts-kit` as an optional peer, and
  the CLI build no longer needs to mark it external.

**Negative:**
- The CLI after 0.0.6 has no hire endpoint. A tester following an older page that says `arp node`
  gets `unknown command`.
- Bringing the hire loop back is a merge from a branch that will drift from `dev`.

**Neutral (worth knowing):**
- `packages/protocol/tsconfig.build.json` now lists `"types": ["node"]`. It had `[]`, and the build
  found Node's types only through `@metamask/smart-accounts-kit`'s, which `declare/delegated.ts`
  imported. With that file gone `tsc -p tsconfig.build.json` failed on `src/node/`.
- ADR `0092`'s standing licence for the relay is unchanged: nothing on `dev` exercises it.

## References

- Related rule: `.claude/rules/security.md` (signing sites), `.claude/rules/metamask-delegation.md`
- Related doc: `docs/22_RUNNING_THE_NODE.md`, `docs/33_THE_HIRE_LOOP.md`
- Related ADR: `0082` (programs apart), `0089` (one installer), `0092` (the relay), `0094`, `0098`
- Post-mortem: `.claude/learning/127-prune-dev-keep-the-hire-loop.md`
