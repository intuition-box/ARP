# 0164 — The agent page leads with lines, and shows no payment yet

**Status:** Proposed (on `feat/95-agent-lines`, waiting on the user's look)
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/95-the-agent-page-reads-lines.md`, the user's request of 2026-11-10

## Context

An ERC-8004 feedback is a client's score on an agent. An ARP line says what an agent used, in which
domain, and how it went, written with the writer's identity. Between two agents that context is what a
score does not carry, and the user asked the agent page to go that way (« ça correspond mieux à notre
idée »). The page opened on Capabilities, with Ratings (a provider's score) second.

The coordinating session's x402 study of 2026-11-10 (business-dev, not in this repo) found that who is
paid is already public elsewhere and that a payment joins to a wallet, not an agent. The x402 feed in
this repo (`apps/web/public/feeds/x402-outcomes.json`) keys its records on an endpoint and a payment
level, and held 0 records when this was written.

## Decision

The agent page opens on a **Lines** tab: who used this agent and what it used, each with the domain
and outcome its declarer wrote, read by `getAgentLines` (`packages/protocol/src/agent-lines.ts`) through
`getPulseUsage`'s rules (ADR `0138`). The domains those lines name sit under the agent's name. Ratings
moves to the last tab. The name stays `Agents`, the sigil and header stay first, and the Relations block
with the claim field stays at the bottom (the user).

No payment is shown: no figure and no mark.

## Alternatives considered

- **Rename the page `Hire`** — the user found it odd, and it promises a marketplace ARP is not.
- **A `paid` mark per line, joined on writer, endpoint and domain** — the feed has no `uses` edge id, so
  the join would be a guess, and it has nothing to join today. Waits on the cross-measurement the
  coordinating session proposed and on the user's decision.
- **A new reader for the agent-as-subject side** — `getPulseUsage` keyed on the agent's tools, filtered
  to the agent's own declarations, gives the same rules with one new query.

## Consequences

**Positive:**
- One set of rules decides what a line says on the tool page, the landing and the agent page.
- The page leads with the thing ARP adds over an ERC-8004 score.

**Negative:**
- On testnet every real line today comes from ARP's hidden test identities, so the tab is empty on most
  agents a reader can open.
- One identity atom is read: an agent with several has lines under the others that this page misses.
- Reading what the agent used asks for every declaration on each of its tools, up to the index's cap of
  250 per read; a widely used tool can push the agent's own line past it, and the page then says the
  read stopped.

## Amendment, 2026-11-10 — the lines ride the loupe, and `worked` reads « task done »

**The Lines tab is gone.** Seen in the browser, it repeated the Relations field as a list (the user: « je
comprends pas l'utilité »). Its content moved into the field: the loupe's card prints the domain and
outcome under the figure, with room reserved so the card never grows, and a ring of what the agent used
sits beside "used by". One row per edge, so the sponsor that created a sponsored edge is not a second,
empty use.

**`worked` reads « task done » on screen** (the user, same day). Readers took `worked` for "the result is
good", and for a Solidity contract no agent can say that of its own work. The definition: **the agent used
the tool for what it is for, and its task finished with it — not a verdict on the result.** The chain
keeps `worked`, so no line changes and the closed vocabulary stays two words; only the display does, as
"support" already stands for a stake (ADR `0103`). The definition is written where each reader meets the
word: the MCP tool's `outcome` description (agents), `docs/28` (the schema), and a `Hint` under the agent
page's field (people). `apps/web/src/lib/outcome-words.ts` is the one place the display word is chosen.

A third outcome word was rejected: a word on chain stays for ever, and each one more splits the lines
that the score needs three wallets to agree on (ADR `0143`). A failure reason for "it ran and the result
was wrong" was raised and not decided.
