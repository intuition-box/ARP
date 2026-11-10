# Task 95 — The agent page reads lines

**Status:** verified 2026-11-10: `ui-reviewer` PASS (loupe version), `task-verifier` PASS (round 2), commits `0101207`..`4f2be74`, post-mortem `.claude/learning/84-the-agent-page-reads-lines.md`. Branch `feat/95-agent-lines`, worktree `../ARP-95`. Not pushed. Reshaped twice on 2026-11-10 by the user after seeing it: the lines ride the Relations loupe, and `worked` reads « task done » (ADR `0164` amendment).
**ADR:** `0164`.
**Rules:** `code.md`, `ui.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

The user, 2026-11-10, after the x402 and ERC-8004 argument: an ERC-8004 feedback is a score; an ARP line
says what an agent used, for what, and how it went, with the writer's identity. Between two agents that is
the point, so the agent page should lead with it. « ça correspond mieux à notre idée ».

The page keeps its name, **Agents** (the user, same day: « hire c'est bizarre »). The x402 study of
2026-11-10 (business-dev, read by the coordinating session) found that who is paid is already public
elsewhere and joins to a wallet, not an agent; what is missing is the buyer's outcome tied to an 8004
identity and a domain, which is a line.

## Deliverables

1. **`getAgentLines`** (`packages/protocol/src/agent-lines.ts`): for one agent atom, the lines where it is
   what was used (`(other, uses, agent)`) and the lines it wrote about what it used (`(agent, uses, tool)`),
   with domains and outcomes, through `getPulseUsage`'s rules (ADR `0138`), so a stranger's qualifier
   never counts as the declarer's. One new query, `PULSE_SUBJECT_USES_QUERY`.
2. ~~**A `Lines` tab, first**~~ — **superseded** (ADR `0164` amendment, the user: « je comprends pas
   l'utilité »): the lines ride the Relations field. The loupe's card prints domain · outcome under the
   figure (`ClaimField` `reserveLine`), the "uses" ring reads "used by", and a ring of what the agent used
   is added (`direction: "out"`). One row per edge. ARP's own test identities are left out.
3. **The contexts** the agent appears in, under its name, from those lines.
4. **Ratings moves last.** Endpoints and Capabilities stay. Met as written.
5. Tests for the reader and ~~for the tab~~ for the loupe (`ClaimField.test.tsx`, superseded with 2).
6. **`worked` reads « task done »** (added, the user): one display word (`lib/outcome-words.ts`) for the
   loupe, the landing and the pulse page; the definition in the MCP `outcome` description, `docs/28`,
   `docs/31`, the site's glossary and lines pages, and a `Hint` under the agent page's field.

## Kept as it is (the user, 2026-11-10)

- The sigil and the header's composition, first.
- The Relations block with the claim field and its loupe, at the bottom.
- The name `Agents` in the navigation.

## Do not do in this task

- **No paid figure and no paid mark.** The x402 feed's records key on an endpoint and a payment level,
  not on a `uses` edge, and it holds 0 records today; a mark joined on `(writer, endpoint, domain)` would
  be a guess. Waits on the user's decision about the cross-measurement the coordinating session proposed.
- No rename, no hire button, no change to `/agents`' list (the context filter is a later step).
- No push, no merge.

## Gates

```
cd packages/protocol && bun run test
cd apps/web && bunx tsc -b && bun run lint && bun run test && bun run check:tokens
```

`ui-reviewer`, then `task-verifier`.
