# 0171 — Feeds a registry reads beside its listing, and listings prepared, not sent

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/102-be-read-where-agents-are.md` (feature E, the user's task list of 2026-11-10)

## Context

ARP's data is read in ARP's own surfaces: the site, the MCP server, the plugin. A registry or a
marketplace that wants to show it beside its own listing has one file to read today,
`/feeds/x402-outcomes.json` (ADRs `0159`, `0162`), and that file holds no record. The lines about
skills and the sieve's reading of ERC-8004 agents (ADR `0156`) exist only behind a tool call or a page.

Three constraints shape any feed. No user text may leave a machine (ADR `0155`, the user's standing
rule), and a line's levels are atoms anybody can write, so a domain or an agent label read from the
chain can be free text. Every figure must be re-derivable by a committed script (`claims.md`). And
nothing may be published, submitted or sent by an agent: the user does it.

## Decision

1. **Two more static, dated feeds**, built by committed scripts into `apps/web/public/feeds/`, each
   with one documented schema page in `apps/web/public/docs/`, served under the existing
   `location /feeds/` (CORS `*`):
   - `skill-lines.json`, schema `arp.skill-lines/1`, built by `scripts/build/build-skill-lines-feed.ts`
     from Intuition testnet 13579: per skill, each line with domain, outcome, reasons, `needs`, `with`,
     writer and agent. Shaped by `packages/protocol/src/skill-lines-feed.ts` (pure).
   - `agent-sieve.json`, schema `arp.agent-sieve/1`, built by `scripts/build/build-agent-sieve-feed.ts`
     from `data/catalogue/agent-sieve-13579.json`: per ERC-8004 agent, its rung, `could_not_say`, the
     proof URL and the protocols that answered. Shaped by `packages/protocol/src/agent-sieve-feed.ts`.
2. **No free text in a feed, by construction.** A domain outside ARP's tree (read from the chain at
   build time) is written `null` and counted; an agent label not of the form `Agent <chain>:<id>` is
   written `null`; reasons are the closed list; `needs` and `with` passed `line-need.ts`'s shape
   check before `pulse-usage.ts` returned them. The sieve feed carries no name and no description:
   they are text an owner typed, and a registry already holds them.
3. **ARP's own tests are marked, not hidden**: `arp_test` on a line whose writer is one of ARP's
   wallets or whose agent is one of its test identities (`apps/web/src/data/arp-test-identities.json`).
   A feed for outside readers says what it holds; the site's filtering (task 74) is a display choice.
4. **An edge a payer created is not a line.** `getPulseUsage` keeps the sponsoring service's row
   because it did create the `uses` edge; it says nothing by it (ADR `0144`), so the feed leaves it
   out and counts it in `skipped`.
5. **Listings are prepared as files and steps, never submitted.** `server.json` at the repository
   root for the official MCP Registry (npm package, stdio); the hosted endpoint's `remotes` entry is
   added by the user once its host name exists. The Claude Code marketplace file already exists and
   validates. Every other listing is a list of steps in `docs/tasks/102`.

## Alternatives considered

- **One feed with skills and agents together** — two populations with different keys and dates (a
  walk of 2026-11-09 against a chain read at build time). One file would carry two dates for one
  `generated_at`.
- **Hide ARP's test lines, as the site does** — the feed would be empty and say nothing about why;
  a reader could not tell "no line" from "lines filtered". Marking keeps both facts.
- **Copy domain and agent labels as read** — a label is anybody's to write, so the file would carry
  whatever someone typed on chain. Nulling outside a known set is the only way to promise no free text.
- **Keep the sieve feed's `chain_id`, `registry`, `token_id` beside the key** — about 80 KB against
  55 KB for the same facts; the CAIP-style key holds all three.
- **A placeholder host in `server.json`'s `remotes`** — a file that validates and points at no server
  can be published by mistake. The entry waits for the real name.

## Consequences

**Positive:**
- A registry can show ARP's lines and sieve rungs with one GET each, no key, no MCP client.
- Each feed is rebuilt by one command and checkable line by line on the chain.

**Negative:**
- Both feeds are snapshots: they go stale between rebuilds, as the x402 feed does (ADR `0154`).
- On 2026-11-10 every line in `skill-lines.json` is marked `arp_test`. The file proves the shape, not
  outside use.
- No per-agent outcome feed: lines about an agent are read through `arp_agent_endpoints` only.

**Neutral (worth knowing):**
- The sieve feed counts rungs per chain (`by_chain`), never across chains (`claims.md` check 2); a
  first draft added the four chains together, and `ui-reviewer` caught it.
- Publishing to the MCP Registry needs `mcpName` in `apps/cli/package.json` and that version on npm;
  both are the user's.

## References

- Related rule: `.claude/rules/claims.md`, `.claude/rules/portability.md`
- Related doc: `docs/23_INSTALLING_ARP.md` §7.1, `docs/28_THE_SIGNAL.md`
- Related ADR: `0143`, `0144`, `0154`, `0155`, `0156`, `0159`, `0161`, `0162`, `0166`
