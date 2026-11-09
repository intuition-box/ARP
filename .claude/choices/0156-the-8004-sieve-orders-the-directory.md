# 0156 — The 8004 sieve orders the agent directory, and only callable endpoints count

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** `docs/tasks/87-the-8004-sieve.md`, the user's brief (« si on peut éclaircir tout ce noise, c'est peut-être utile »)

## Context

Task 82 (ADR `0153`) opened `/agents` on the agents that answered one request, from a reading that
counted a 2xx on any endpoint declared as MCP, A2A or an API. Task 87 asks for one reproducible sieve:
each ERC-8004 agent's highest rung, each rung checkable by one request, published with its date, and
the same reading behind the directory and `arp_find_agents`.

Two facts measured while building it shaped the decision:

- **A registration file lists a lot that answers and cannot be called.** Web sites, X accounts, npm
  pages and docs all return 200 to a GET. In ARP's directory walk of 2026-11-09, 145 of 244 Base
  identities had some declared URL alive, and 40 had a callable endpoint that answered
  (`scripts/measure/agent-sieve.ts --summary data/measurements/agent-sieve-directory-2026-11-09T2000.jsonl`).
- **One host can be most of a chain.** In a uniform sample of 500 Base agents (the largest id drawn
  was 1,171,620, 2026-11-09), 451 were A2A cards served by centralcity.ai, under 451 different owners
  (`data/measurements/agent-sieve-8453-2026-11-09.jsonl`). A share of Base is, today, mostly a share
  of that platform.

## Decision

1. **The rung is `packages/protocol/src/sieve.ts`**, a pure function: 0 shell, 1 described, 2 declares
   a callable address, 3 answers, 4 speaks its declared protocol, 5 used by another wallet's line.
   Rungs 2 to 4 read only endpoints declared as MCP, A2A or an API (`isCallable`). The broad reading,
   any declared URL alive, is kept beside the rung and never merged with it. A transport, DNS or TLS
   failure, a 429 and an unrecognised answer leave the agent below with `couldNotSay`.
2. **`/agents` opens on rung 3 and above**, highest first, from the directory's walk bundled in
   `data/catalogue/agent-sieve-13579.json`, which replaces task 82's `agents-reachable.json`. Under
   "All", shells (rung 0) are hidden behind a count that shows them.
3. **`arp_find_agents` gains `order: answers-now`**, the same list with its date, and each listed agent
   carries its rung when the walk read it.
4. **Every summary prints its concentration**: how many hosts and owners stand behind rungs 3 and 4,
   the largest host, and the figures without it.
5. **Feedback is split by reviewer, never scored**: a reviewer whose address has sent at most three
   transactions on that chain is "fresh", the rest are "other". This is a proxy, written down as one,
   not the study's clustering (arXiv 2606.26028, `docs/19`).

## Alternatives considered

- **Count any declared URL that answers.** Rejected: it turns a link to GitHub into an agent that
  answers. Kept only as the `anyLive` column, to compare with the study's wording.
- **Probe live from the browser or from each MCP call.** Rejected: most endpoints send no CORS
  header, and one call would cost a probe per agent. The walk is dated instead.
- **Cluster reviewers as the study does.** Out of reach in this task: `eth_getLogs` over the
  ReputationRegistry is refused by free RPCs (`scripts/measure/erc8004-feedback.ts`). `getClients`
  and one transaction count per reviewer are what a free RPC answers.
- **One "quality" figure per agent.** Forbidden (ADR `0046`); the rung is a fact per step.

## Consequences

**Positive:**
- The directory, the MCP and the published page read one walk, and each rung carries the request
  that proves it as a curl.
- A chain's figure comes with the host behind it, so a platform's agents are not read as a market.

**Negative:**
- "Speaks A2A" means the card was served. Whether the agent then handles a task is not checked.
- The reading goes stale between walks. It is refreshed by rerunning the two scripts.
- The fresh-reviewer proxy flags a new honest wallet as fresh, and misses a farm of old wallets.

**Neutral (worth knowing):**
- Rung 5 is read from lines in ARP on testnet 13579, and needs a writer that is neither the agent's
  owner nor ARP. On 2026-11-09 no agent in the directory reached it.

## References

- Related rule: `.claude/rules/claims.md` (one context per figure, the interval, the concentration)
- Related doc: `docs/19_THE_GAP_A_THIRD_PARTY_MEASURED.md`, `docs/14_THE_WITNESS_PROBLEM.md`
- Related ADR: `0046` (no score), `0064` (one operator in a sample), `0153` (task 82, superseded in part)
