# 0146 — An agent grows the domain tree, by a signed request

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09 (« il faut que ce soit faisable pour l'arbre de se créer lui-même »), task 73

## Context

A `uses` declaration can name a domain only if the tree already has it (`prepareUsageContext`,
`unknown_domain`). The tree is read through ARP's two attestors (ADR `0124`), so an agent writing
`(x, is a sub-domain of, y)` itself changes nothing in the index. Task 59 built the rules
(`planCategory`) and the sponsor's `POST /propose-category`, which writes a category as an attestor.
But that route took **unsigned** requests from the web app's origins, and the MCP tool and web step
that called it were archived unmerged on 2026-11-03 (`archive/feat/59-category-step`). So on `main`
nothing could add a domain, and the route that could was open to anyone who reached it.

## Decision

The user's three answers, 2026-11-09:

1. **Only a registered agent adds a category.** The request is EIP-712, signed by the address that
   holds an ERC-8004 agent (`packages/protocol/src/sponsor/category.ts`), the shape of `/line`'s
   (ADR `0144`). The sponsor checks the signer holds the agent, spends the nonce once, and counts the
   category against `categoriesPerAgentPerDay` (default 3) as well as the global `categoriesPerDay`.
2. **In the declaration.** `arp_declare_used` with a domain the tree lacks, plus `domain_parent`,
   `domain_reason` and `declarer`, answers `sign_category_first` with the typed data to sign instead
   of calls; `arp_propose_category` sends the signed request; the agent then asks for the declaration
   again. In the sponsored mode, `arp_file_category` signs with the local agent key.
3. **People file under existing categories only.** The unsigned route still tags a tool with a
   category that exists (path C on the web); a new category without a signature is refused with rule
   `agent`.

## Alternatives considered

- **Keep the route open, bounded by the global cap and the weekly review** — one script fills the
  cap of 10 a day with nonsense the user then reviews. Refused by the user.
- **Let the agent's own triples count** (add every agent to the attestors) — the index would become
  whoever pays the triple fee, the fragmentation ADR `0088` and §5 of `docs/25` exist to stop.
- **Create the category inside `/line`** — the line request's signed type would change, and the CLI
  0.0.1 on npm signs the old one. Left for after the `/line` files' current owner merges (task 73
  "Do not do").
- **A web step that signs with an agent wallet** — more code where the public site is being rebuilt
  (task 74), for people who mostly have no agent.

## Consequences

**Positive:**

- The tree grows where the need appears: an agent declaring a use in a domain nobody named yet.
- Every category has an agent to answer for it, in the sponsor's log (`agent` field) and in the
  weekly review.

**Negative:**

- In the unsigned MCP mode, a new domain is two extra round trips: sign, propose, declare again.
- A fresh agent is cheap on testnet (sponsored mint gas, ADR `0110`), so the per-agent cap is a speed
  bump, not a Sybil defence. The global cap and the review are still the bound.
- `scripts/seed/file-categories.ts` now needs `--agent`, `--key`, `--expect` to file a new category.

**Neutral (worth knowing):**

- Testnet 13579 only, like every sponsored write.
- The sponsor still writes as ARP's attestor: who reads the tree does not change (ADR `0124`).
- `.claude/rules/security.md` lists the request as the eleventh signature site.
