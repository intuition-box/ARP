# 83 — `/list-tool` lists only what is a tool

**Task:** `docs/tasks/94-list-tool-lists-only-tools.md`
**Completed:** 2026-11-10
**Commit:** `a6a037e`, `cefd465`, `53fffbe`, `d4865a6`, `584aa8e`, `cfbd5ad` on `feat/94-list-tool-only-tools`
**Verifier verdict:** PASS (second pass; the first failed on two items, below)

## What shipped

- `packages/protocol/src/sponsor/tool-forms.ts` — pure rules: repository forms (`SKILL.md`, `.claude-plugin`, root `gemini-extension.json`, MCP-registry `server.json`, root `package.json`/`pyproject.toml`/`go.mod` on an MCP SDK) and endpoint answers (MCP `initialize`, `401` with `resource_metadata`, SSE `endpoint`, A2A card, x402 `402`).
- `apps/sponsor/src/admit-tool.ts` — `pinnedAsk` (resolve once, refuse any private address, connect to the checked addresses via the `node:http` `lookup` hook; no redirect, 5 s, 64 KB), `admitEndpoint` (≤3 requests), `admitRepository` (tree API + ≤4 raw reads), `toolAdmitter` (10 min cache, 60 endpoint checks/hour).
- `apps/sponsor/src/routes/list-tool.ts` — check after the plan and early limit, before pins; refusal 422 `not-a-tool|unreachable|private-address`, 503 `retry` when it cannot tell; existing atom `created:false` unchecked; success carries `form`.
- `apps/mcp/src/desktop/loop.ts` — `writeLine` reports status, rule and reason (`arp line` and sponsored mode).
- `scripts/measure/tool-forms.ts`, `data/measurements/tool-forms-2026-11-10T0811.json` — 53 of 53 catalogue repositories admitted.
- Docs: sponsor README, `apps/web/DEPLOY.md`, `FUTURE.md`, ADR `0123` header, task 91 runbook, `scripts/demo/x402-e2e.ts` (`ARP_ALLOW_PRIVATE_PROBE=1`).

## Surprises

- Bun honours `node:http`'s `lookup` option, so DNS rebinding can be closed in the sponsor itself; `fetch` cannot. Proven by a test that reaches `pinned.test` only through the injected resolver.
- First verification failed on a stale sentence: FUTURE.md point 1 was marked built but still said the check ran in a keyless process (`apps/probe`). The paragraph above it had been corrected; the list item had not (claims.md check 5 again).
- Appending `/.well-known/agent-card.json` to a raw URL string puts it after the query; build it with `URL` and clear `search`.

## Decisions made

- **Check in the sponsor through a pinned connection, not in `apps/probe`** — the SSRF reason ADR `0123` gave for not fetching is closed by connecting only to the checked addresses. ADR: `.claude/choices/0163-list-tool-lists-only-what-is-a-tool.md`.
- **Accepted forms drawn from the catalogue** — each content form admits at least one catalogue repository, except Python/Go (same declaration in the other official SDKs). Same ADR.
- **An atom already on the graph is not re-checked** — the check guards spend, and nothing is spent there.

## Rules touched

- `.claude/rules/claims.md` — sufficient; check 5 caught the FUTURE.md list item on the first pass.
- `.claude/rules/code.md` — sufficient; an uncommented `as` on the GitHub tree response was caught on the first pass.
- `.claude/rules/security.md` — sufficient; no new signature site. The sponsor now connects to a caller-named host, documented in ADR `0163` §3 and the sponsor README.

## Suggestions for future tasks

- When a FUTURE.md item flips to built, reread the whole item, not only the status line.
- The web app's `listToolMessage` has no sentence for the three new rules ("It could not be added."); recorded in FUTURE.md.
- The task 91 seller passing the check is untested until that demo runs again.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Column skill (and agent, for endpoints), tier declared: it does not move ARP up the ladder; it bounds what ARP pays to list at the declared tier, so the index ARP points at holds things a runtime loads.
