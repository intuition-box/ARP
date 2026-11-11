# Task 128 — The agent page is for reading

**Status:** done 2026-11-11, branch `feat/agent-page-for-humans`, written by arp-97. Task 128, ADR
`0193`, post-mortem `116`, allocated by the orchestrator.
**ADR:** `0193` — the web page on an agent offers no market and no declaration; ADR `0056` stands for
the protocol.
**Rules:** `ui.md`, `code.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`. Agent `ui-reviewer` before `task-verifier`.

## Why

The user, 2026-11-11, looking at `/agent/8453/2340`: the web app shows a person what helps them
decide, and an agent gets everything through the MCP server (« on devrait avoir que des info utiles
pour un humain sur la web app mais pour les agents on garde tout »). He named the CAIP-19, the
registration file and Before you call's place, then the declaration card and the support market.

## What changes

1. **The description leads**, under the name; Before you call follows it.
2. **Before you call is folded**: the summary line stays, the rows sit behind a `Details`
   disclosure (`folded` on `BeforeSection`; a skill's Before you install is unchanged). The `Speaks`
   row goes, since the summary already names the protocols.
3. **The Identity card** keeps Operator, Registered, Intuition and URL. Registration file and
   CAIP-19 go: Before you call is read from the file, and an agent reads both through the MCP server.
4. **No declaration card** on an agent's page (`AgentDeclareCard` removed). An agent writes its own
   line after a call, through the MCP server or the hook.
5. **No support market** on an agent's page (`AtomMarket` removed there). Skill and tool pages keep
   theirs (the user: « non pas pour les agents … mais pour les skills on garde »). ADR `0193`.
6. **The landing's last scene** reads « Plug in right now and start verifying. » (the user, same day).

## Do not do in this task

- Touch the market or the declaration on skill, tool or atom pages.
- Change the protocol or the MCP tools: `arp_take_position` and `arp_declare_used` still reach an
  agent's atom (ADR `0056` stands there).
- Change the landing's line under the headline; the user has not chosen one.

## Gates

`cd apps/web && bunx tsc -b && bun run lint && bun run test && bun run check:tokens`
