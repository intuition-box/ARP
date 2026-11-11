# 105 — The deploy: site, sponsor, MCP endpoint and demo seller on Coolify

**Task:** `docs/tasks/117-the-deploy.md`
**Completed:** 2026-11-11
**Commit:** `1c4bb561` on `deploy/117-the-deploy`, on `1a291387` plus task 122's merge `3839cfd1`
**Verifier verdict:** PASS (second round)

## What shipped

- Four hosts on Coolify, testnet 13579: `https://arp.intuition.box`, `https://sponsor.arp.intuition.box` (signs as `0x7793…7ec9`), `https://mcp.arp.intuition.box/mcp` (three read tools), `https://seller.arp.intuition.box` (402, delivers nothing). Re-read by `curl` at verification: 200, 200, 200, 402.
- `apps/cli/package.json` — 0.0.4, `config.sponsorDefault` the hosted sponsor; `server.json` 0.0.4 with a `remotes` streamable-http entry; `packaging/` regenerated. Not published (npm still 0.0.3).
- Docs that said the sponsor, the site or the endpoint was not hosted, amended in place: `install.md`, `DEPLOY.md`, `README.md`, `architecture.md`, `cli.md`, `developers.md`, `mcp-tools.md`, `local-memory.md`, `docs/22`, `docs/23`, `docs/26:218`, `docs/31` (mermaid, table, limits), `skills/arp/SKILL.md`, `scripts/demo/terminal-demo.ts:308`, `start-steps.ts` comment.

## Surprises

- Round 1 failed on stale "our machine" wording in `docs/31`, `docs/26` and a demo script string, which the task's own grep list (`not hosted`, `not live`, `:3200`, `ARP_SPONSOR=`) did not cover. Claims check 5 again: grep the fact, not one phrasing of it.
- `bun run --cwd apps/cli packages --check` from the repo root reports `packaging/claude/arp/bin/arp.js` stale on a clean tree; run from inside `apps/cli` it matches. The bundle's path comments are cwd-relative (`apps/cli/scripts/packages.ts:91`). Pre-existing, not this task's.

## Decisions made

- **Keep the user's 2026-11-09 sponsor key** (choice (a)) — no address changed in the repo. No ADR; every setting is DEPLOY.md's.
- **Release order bundled** — merge, redeploy the sponsor on line request v5, publish 0.0.4 together, because 0.0.3 fails against v5 and 0.0.4 against the v4 sponsor running now.

## Rules touched

- `.claude/rules/claims.md` — sufficient; check 5 is the one that failed in round 1.
- `.claude/rules/security.md` — sufficient; the sponsor signs on 13579 only, the key was never read.

## Suggestions for future tasks

- When a component moves from local to hosted, grep "our machine", "Local only", the port and the old default together, and read `docs/31`'s "What runs where" table every time.
- `install.md:47` and `:120` say in the present tense that the hosted sponsor checks line request v5; true only once the bundled release lands. Phrase such lines "once it runs v5", as `DEPLOY.md:168` does, or ship them only with the release.
- Document that `packages --check` must run from inside `apps/cli`, or make it cwd-independent.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: it lets a tester declare with nothing running locally, because the hosted sponsor writes the line, and it does not move ARP to observed or corroborated by itself.
