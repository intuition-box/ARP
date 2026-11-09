# 32 — The evidence ladder

**Status:** in force since 2026-11-09, the user's decision (ADR `0147`). It replaces `docs/09` §3
(asserted, rated, staked, proven), which stays there as the record of the old one. Every task's
completion report names a column and a tier from this page (`CLAUDE.md`, `workflow.md`).

## Why it changed

The old ladder ranked a signal by **what it cost to produce**. It no longer described ARP:

- **Proven** was an action passed by a delegation enforcer. `TrustStakeCapEnforcer` was built to cap an
  operator's spend under that operator's delegation, but it never fired on mainnet (0 `StakeCapChecked`
  logs, `scripts/measure/enforcer-events.ts`, 2026-10-27, `security.md`), the only delegations ARP knows of
  were its own operator's, and delegations were set aside on 2026-11-03.
- **Staked** was "capital that can be lost". A sponsored line costs its writer nothing, and the score
  never reads the deposit (ADR `0138`). By that definition ARP's lines were rated, not staked.
- **Asserted** and **rated** are what ARP now produces itself: the identity through the sponsor and
  Intuition, the declarations through the hook and the lines.

What separates ARP's signal from a free rating is **who produced it**, not what it cost. So the ladder
is ordered by that.

## The ladder

Three tiers, the same for every actor of the agentic loop. A tier is about **who stands behind a
fact**: the actor itself, a record the actor did not write by hand, or several actors who do not
share a wallet.

| Tier | Who stands behind it |
| --- | --- |
| **1. Declared** | the actor says so |
| **2. Observed** | a record made by something other than the actor's own words: the runtime, a signed receipt, a contract that checked a payment |
| **3. Corroborated** | at least 3 distinct wallets say the same thing about the same subject in the same context (`WALLETS_TO_MOVE`, ADR `0143-the-ranking-moves-from-three-wallets`) |

## Three columns, one shape

ARP's search returns two kinds of result (ADR `0139`): skills to install and agents to call. Calling an
agent for a specialised task, and paying it, is the third column. In all three, a fact is written the
same way: one triple, then nested levels that qualify the one above (form B, ADR `0138`, `docs/28`).

```
T1 = (actor, uses, subject)
T2 = (T1, in context of, domain)
T3 = (T2, has outcome, worked | failed)
T4 = (T3, because, reason)
```

The subject is a skill, or an agent's ERC-8004 identity. The vocabulary is closed, and a domain is a
category of the tree (`docs/25`), which an agent can extend by a signed request (ADR `0146`). The
characteristics of an agent are the lines written about it and by it, in context, in this one shape:
there is no second vocabulary for agents.

| Tier | Skill — installed | Agent — reached | Hire — paid for a task |
| --- | --- | --- | --- |
| **1. Declared** | `(agent, uses, skill)` and its qualifiers | the agent publishes what it does and a signed address | `((client, uses, agent), in context of, domain)` and its outcome |
| **2. Observed** | a failure the runtime hook recorded; a content receipt (the skill was served to this agent, ADR `0109`) | its signed address answers now (`arp_agent_endpoints`, `answers_now`), or a probe of it did (`arp_probe_endpoint`) | a hire receipt the paid node signed (ADR `0083`, `0098`), and the payment passed the caveat of a delegation the client's operator signed |
| **3. Corroborated** | 3+ wallets, same outcome, same domain, on this skill | 3+ wallets reached it | 3+ clients, same outcome, same domain, on this agent |

### The hire loop

1. The client's agent finds, through ARP, an agent declared for the task's domain whose address answers.
2. It pays that agent under a delegation its operator signed once. A caveat bounds what it can spend.
3. The hired agent's node checks the payment, does the task and signs a receipt.
4. The client's agent declares the result in form B, with the receipt attached.

This is where an enforcer earns its place: it bounds what **your** agent spends of **your** credits
with another agent, which is the product (`docs/12` point 5, `security.md` row 3). Until now the only
delegations ARP knows of were its own operator's.

**Reuse audited code, build as little as possible** (the user, 2026-11-09):

| Spent in | Caveat |
| --- | --- |
| native TRUST | `TrustStakeCapEnforcer` (`contracts/src/enforcers/`, v2 since ADR `0118`), the only custom one |
| an ERC-20 token, x402 credits | MetaMask's own `erc20TransferAmount` or `erc20PeriodTransfer` scope (`.claude/skills/mms-smart-accounts-kit/references/delegations.md:48,109`). No ARP enforcer |

## Where ARP stands, 2026-11-09

| | Skill | Agent | Hire |
| --- | --- | --- | --- |
| Declared | yes | yes | yes, tested with one operator (`docs/tasks/65`) |
| Observed | yes — hook failures, content receipts | yes — probes | receipts yes (`docs/tasks/65` §8); payment under a delegation **not built** — delegations were set aside on 2026-11-03 and come back for this column only |
| Corroborated | **no** | not measured | **no** |

Measured on testnet 13579 on 2026-11-09 by `bun run scripts/measure/line-writers.ts`, raw output in
`data/measurements/line-writers-2026-11-09T1021.json`: 10 `has outcome`
lines, all 10 written by ARP's two wallets, none by an independent wallet. So neither the skill nor the
hire column reaches tier 3, and no ranking has moved from a line. The agent column's tier 3, "3+ wallets
reached it", is not measured: nothing writes a reach on chain per wallet yet.

## What tier 2 does not prove

- **On chain, a line the hook observed and a line the model chose to write look the same.** A third
  party can check tier 2 only where a receipt or a contract is attached. The hook's observation is as
  good as the machine it runs on.
- **A receipt says two keys dealt with each other**, not that they are two people (`agent-pulse.ts`).
  Sybil resistance is tier 3's job, and 3 wallets is a threshold, not a defence: a fresh key is cheap.

## The question every task answers

> **Which column and tier does this serve, and does it move ARP up?**

One sentence: the column (skill, agent or hire), the tier, and why the task moves ARP up or not. A task
that cannot name one has drifted.
