# 128 — The API and the probe on Coolify

**Task:** `docs/tasks/140-api-and-probe-on-coolify.md`
**Completed:** 2026-11-12
**Commit:** d154a83c (on top of `dev` 2377487d; the post-mortem lands in the author's next commit)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/node/hosted.ts`: `hostedListener`, `refuseOtherHost` (421), and `every()` (one run at a time, a run on start).
- `packages/protocol/src/node/pinned-ask.ts`: `pinnedAsk`, moved from `apps/sponsor/src/admit-tool.ts`, which keeps a wrapper; now `agent: false`.
- `apps/api/src/{sqlite-store,server,main}.ts`, `worker.ts` → `service.ts` (no Worker export, `ARP_X402_LAST_PURCHASE` switch).
- `apps/probe/src/{store,server,main}.ts` (`sqliteReadings` with migrations by `PRAGMA user_version`; `guardedIo` = `pinnedAsk` with `allowPrivate: false`), `worker.ts` → `service.ts` (`ARP_PROBE_X402` switch).
- `apps/{api,probe}/Dockerfile` + allowlist `Dockerfile.dockerignore`: `oven/bun:1.3.14`, user `bun`, `/data` owned by it, a `bun` `HEALTHCHECK`.
- wrangler gone: both `wrangler.jsonc`, `apps/api/.dev.vars.example`, the devDependency and its `bun.lock` entries.
- `apps/web`: `fetchLastPurchase` maps a 404 to `null`, and `LastPurchase` renders nothing then (service and component tests).
- Docs: `apps/web/DEPLOY.md` (The API, The probe, Later: the two x402 switches), both READMEs, `CLAUDE.md`, `README.md`, `docs/31`, `apps/web/public/docs/*`, `.env.example`, amendment notes on ADRs `0084` and `0093`, `STATE.md`.

## Surprises

- Node's global agent reused a keep-alive socket and skipped `pinnedAsk`'s `lookup`, so a request could ride a connection that another policy opened. Its own test found this. The fix is `agent: false`, which also applies to the sponsor.
- The site's last-purchase card showed "not read" on the API's 404, not nothing. The orchestrator had assumed it rendered nothing. The change grew into `apps/web` and went through `ui-reviewer`.
- With no redirect followed, an endpoint that redirects now reads as `http-error`. None of the catalogued endpoints redirected on 2026-11-11.

## Decisions made

- **One runtime, wrangler dropped.** Keeping it meant two stores and two schedules for a runtime the user declined. ADR `0200` §1.
- **In-process schedule, not Coolify scheduled tasks.** It keeps the one-at-a-time guarantee in one tested place. ADR `0200` §3.
- **The probe asks endpoints only through `pinnedAsk`, with private addresses always refused.** Nothing reads `ARP_ALLOW_PRIVATE_PROBE`. ADR `0200` §4.
- **Both x402 parts are off by default** (the user's narrowing). ADR `0200` §6.
- **Each app's entry is split into `server.ts` (`start()`, tested on port 0) and a few-line `main.ts`.** This is for task 136's 90% per-file gate.

## Rules touched

- `.claude/rules/security.md`: sufficient. No new signature site. The outbound guard reuses ADR `0163`'s `pinnedAsk`.
- `.claude/rules/claims.md` check 5: applied. The old "Cloudflare Worker / local only" wording is amended where it describes current state. It survives only in historical task files and ADRs.
- `.claude/rules/code.md`: sufficient. The one new `as` (`lookup as unknown as typeof dnsLookup`) carries its reason in a comment.

## Suggestions for future tasks

- A service that moves from the edge to a host of ARP's own loses the edge's network isolation. Audit every outbound `fetch` it makes for private addresses and redirects before porting it.
- When an outbound guard relies on a `lookup` hook, disable socket pooling and test a second request to the same name.
- Before telling the user a route "is just off", check what the front end renders on the route's 404.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

It serves the skill column at the observed tier. GitHub's and skills.sh's figures are records that neither the skill's author nor any agent wrote by hand. This task makes them reach the hosted site instead of a bundled, dated copy. It does not move ARP up a tier, because no new kind of evidence is added. The probe's ARP-measured reachability of tool endpoints reaches no reader yet: nothing on the site reads it, and `ARP_PROBE_URL` stays unset.
