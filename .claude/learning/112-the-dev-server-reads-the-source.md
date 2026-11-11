# 112 — What runs from the checkout reads `packages/protocol/src`, not a stale `dist/`

**Task:** `docs/tasks/124-the-dev-server-reads-the-source.md`
**Completed:** 2026-11-11
**Commit:** `8ca44008`
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/package.json`, `packages/graphql/package.json` — `arp-source` and `bun` export conditions to `src/` on every entry, `src` in `files`
- `apps/web/vite.config.ts` — `arp-source` prepended to `defaultClientConditions`, for `command === 'serve'` only
- `apps/web`, `apps/sponsor`, `apps/mcp`, `apps/node` `package.json` — `dev`/`start` no longer build `dist/` first
- `apps/sponsor/Dockerfile`, `apps/mcp/Dockerfile` — no build of `packages/protocol`; Bun reads `src/`, which the allowlist `.dockerignore` already admits

## Surprises

- `bunfig.toml` cannot set resolution conditions, so a custom condition alone would have needed `--conditions` on 32 documented command lines (`git grep -nE "bun run apps/(sponsor|mcp|node)/src" -- ':!docs/tasks' ':!.claude' ':!data' | wc -l`, 2026-11-11). The built-in `bun` condition needs no flag.
- Vite must not get `bun` in its conditions: it would switch every dependency that ships a `bun` export. Hence the second, unique name.

## Decisions made

- **`bun` + `arp-source`, not a rebuild hook or a watcher** — the runtime picks `src/` itself, so no command can forget a step; every shipped build (`vite build`, the CLI and hook bundles at `--target=node`, `tsc`, vitest) still reads `dist/` after its own build. No ADR: build configuration, reasons recorded in the task file; verifier judged that acceptable.

## Rules touched

- `.claude/rules/code.md` — sufficient
- `.claude/rules/workflow.md` — sufficient
- `.claude/rules/claims.md` — sufficient; the one count in the task file (32) ships with its command and re-derives

## Suggestions for future tasks

- A gate that passes says nothing about a dev server; when a defect lives in what runs locally, reproduce it headless (stale `dist/` by hand, then load the page) before and after the fix.
- `apps/api` `wrangler dev` is still exposed to a stale `dist/` across a merge (task file, "What still reads `dist/`").
- Editors still show `dist/*.d.ts` types until a build; running code is unaffected.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier (the atom page's Before you install, `beforeInstall`) and hire column, observed tier (the sponsor's x402 payment label, `parsePaymentAtomLabel`): both incidents were a merged change to what ARP reads or writes not being what ran locally; this removes that class of defect and adds no evidence, so it does not move ARP up the ladder.
