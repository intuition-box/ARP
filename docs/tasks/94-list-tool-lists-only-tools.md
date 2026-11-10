# Task 94 — `/list-tool` lists only what is a tool

**Status:** in progress.
**ADR:** `0163` (amends `0123` step 6).
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`. No atom shape changes, so no `intuition-integrator`.

## Why

The user, 2026-11-10: « empêcher de mettre n'importe quelle URL ». Until now `POST /list-tool` checked a
GitHub skill's `SKILL.md`, checked that a GitHub repository existed, and accepted **any other URL
unchecked**, because the process holding the treasury key must not fetch an arbitrary URL (SSRF, ADR
`0123`). `FUTURE.md` "`/list-tool` refuses what is not a tool…" point 1 is this task; point 2, the read
before install, is not.

## Deliverables

1. **A GitHub repository** (no `?skill=`) is listed only if its tree shows a form a runtime loads: a
   `SKILL.md`, a `.claude-plugin/plugin.json` or `marketplace.json`, a root `gemini-extension.json`, or,
   read from `raw.githubusercontent.com`, a `server.json` under the MCP registry's schema or a root
   `package.json` / `pyproject.toml` / `go.mod` depending on an MCP SDK. Rule and evidence in ADR `0163`;
   `packages/protocol/src/sponsor/tool-forms.ts`.
2. **Any other URL** is listed only if it answers as MCP (`initialize`, a `401` naming its
   protected-resource metadata, or the SSE `endpoint` event), an A2A card, or an x402 `402`. Asked from
   the sponsor through `pinnedAsk` (`apps/sponsor/src/admit-tool.ts`): the name resolved once, refused
   if any address is private, the connection made to the checked addresses; no redirect, 5 s, 64 KB,
   three requests at most, 60 URLs an hour.
3. A refusal is `422` with `rule` `not-a-tool`, `unreachable` or `private-address`, spends nothing,
   counts against no limit; an atom already on the graph is not checked. Tested in
   `apps/sponsor/test/service.test.ts` and `admit-tool.test.ts`.
4. `arp line` and the MCP server's sponsored mode (both `writeLine`) say the refusal's status, rule and
   reason.
5. `apps/sponsor/README.md`, `apps/web/DEPLOY.md`, `FUTURE.md`, ADR `0123`'s header, task 91's runbook
   and `scripts/demo/x402-e2e.ts` (its seller is on loopback: `ARP_ALLOW_PRIVATE_PROBE=1`), `STATE.md`.
6. `scripts/measure/tool-forms.ts` runs the sponsor's own check over the catalogue's repositories.

## Do not do in this task

The read before install, scanning file contents, any change to what the site shows, deploying,
publishing, pushing, calling `/list-tool` on chain.

## Gates

`apps/sponsor` test and lint; `packages/protocol` test and lint; `apps/mcp` test and lint; `apps/cli`
test, `packages --check`, `check:node`; root `bun run check` and `bun run test:scripts`.
