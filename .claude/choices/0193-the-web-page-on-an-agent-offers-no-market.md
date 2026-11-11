# 0193 — the web page on an agent offers no market and no declaration

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** user decision, `docs/tasks/128-the-agent-page-is-for-reading.md`

Narrows ADR `0056` to the protocol on one point. `0056`'s reasoning stands.

## Context

ADR `0056` put a market on an agent's own atom and a `(my agent) uses (this agent)` declaration card
on its page. On 2026-11-11 the user set the line for the web app: it shows a person what helps them
decide, and an agent reads everything through the MCP server. Asked whether the support market on
an agent's page served that person, he answered « non pas pour les agents … mais pour les skills on
garde ».

Two facts bear on it. `arp_pulse` never counts the size of a deposit (the MCP server's own
instructions say so), so the market changes nothing in where an agent ranks. And a line about
calling an agent is written by the calling agent, after the call, through the MCP server or the hook;
a person filling a form for their agent writes it from memory.

## Decision

**The web page on an agent offers no support market and no declaration card.** The agent's atom
vault and the `uses` edge stay exactly as ADR `0056` defines them, and the MCP tools still reach
both. Skill and tool pages keep their market and their declaration card.

## Alternatives considered

- **Keep the market on agents too** — the user's first reaction was to keep it, then he chose to
  keep it for skills only. Nothing in the search reads it, and the page is for reading.
- **Remove the market everywhere** — rejected by the user: on a skill, support is the one act a
  person takes there.
- **Remove only the declaration card** — leaves the one write a person can still make on a page the
  user wants read-only.

## Consequences

**Positive:**
- The agent page holds only what a person reads: the description, Before you call, the tabs, the
  identity and the relations.

**Negative:**
- A person who wants to back an agent from the web has no surface for it; they need the MCP server
  or another Intuition client.

**Neutral (worth knowing):**
- The sigil's Saffron core still lights for a viewer who holds a position taken elsewhere.
- After this the agent page has no stake control at all: the rating rows lost theirs on 2026-10-27
  (`components/agent/RatingRow.tsx`) and only display the positions on a provider's claim.

## References

- Related ADR: `.claude/choices/0056-the-market-on-an-agent-is-on-its-atom-and-the-edge-is-a-receipt.md`
- Related task: `docs/tasks/128-the-agent-page-is-for-reading.md`
- Related rule: `.claude/rules/ui.md`
