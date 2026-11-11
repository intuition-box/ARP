# Task 140 — The API and the probe on Coolify

**Status:** built 2026-11-11 on `task-140-coolify-api-probe`, from `dev`. Task 140, ADR `0200`,
post-mortem `128`, allocated by the orchestrator. **Not deployed**: the deploy is the user's (the
sheet below).
**Rules:** `code.md`, `security.md`, `portability.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

`apps/api` (ADR `0084`) and `apps/probe` (ADR `0093`) were Cloudflare Workers that only ever ran under
`wrangler dev`. The user, 2026-11-11, option (b): « les adapter à Coolify » — everything stays on
intuition.box's Coolify, no Cloudflare account.

**Narrowed during the task** (the user, 2026-11-11, « je veux skill et github, pas x402 tout de
suite »): the API deploys the GitHub and skills.sh facts; its `/x402/last-purchase` route (task 120)
stays in the code behind `ARP_X402_LAST_PURCHASE`, off by default, a 404 with no outbound call when
off. The probe is still ported, since endpoint reachability is the tools side; its x402 part (keeping
402 offers, `GET /x402`, task 122) is behind `ARP_PROBE_X402`, off by default. The site gets
`VITE_ARP_API_URL` only; the sponsor's `ARP_PROBE_URL` is **not** set yet. Both switches are
documented as "later".

## What changes

1. **Storage.** `apps/api/src/sqlite-store.ts`: the `Store` seam on `bun:sqlite`, KV's TTL semantics.
   `apps/probe/src/store.ts`: `sqliteReadings`, which applies `migrations/` by `PRAGMA user_version`;
   `d1Readings` is gone. Both under `ARP_DATA_DIR`.
2. **Schedule, host, guard** in `@arp-protocol/core/node`: `every()` (one run at a time, a run on
   start), `hostedListener` and `refuseOtherHost` (`hosted.ts`), and `pinnedAsk`, moved from
   `apps/sponsor/src/admit-tool.ts` (`pinned-ask.ts`; the sponsor keeps a wrapper with its values); it now opens no pooled socket, `agent: false`, since a reused socket skips the lookup). Tested in `packages/protocol/test/node-{hosted,pinned-ask}.test.ts`; with `@vitest/coverage-v8` added for the measurement and removed after, 100% lines and functions on both, branches 96.87% and 95.45%. Rebased 2026-11-12 onto task 136's gate (`origin/dev` `9304ff74`): its `bunfig.toml` and `every-module` tests are kept, its D1 and Worker-entry tests replaced by the SQLite and `server.ts` ones, its other cases kept on the new seam. `src/main.ts` in both apps is excluded from the measurement and from `every-module`, the way 136 excludes `apps/sponsor/src/main.ts`: it binds a port and starts the schedule at import, and `src/server.ts`, which it runs, is tested. Root `bun run test` exits 0; `apps/api` and `apps/probe` at 100% lines on every measured file, functions 92.31% at least. `packaging/` regenerated: the CLI bundles `@arp-protocol/core/node`, which now holds `pinnedAsk` and `hosted.ts`.
3. **Processes.** `apps/{api,probe}/src/server.ts` (`start()`, tested) and `main.ts` (runs it); `worker.ts` → `service.ts`, its
   Worker export removed. The probe asks endpoints through `pinnedAsk({allowPrivate: false})`, reads
   no `ARP_ALLOW_PRIVATE_PROBE`, follows no redirect.
4. **Wrangler dropped**: `wrangler.jsonc` ×2, `.dev.vars.example`, the `wrangler` devDependency and
   its lockfile entries.
5. **Switches**: `ARP_X402_LAST_PURCHASE` (API), `ARP_PROBE_X402` (probe). The site's last-purchase
   card reads a 404 as "no such route" and renders nothing (`apps/web/src/services/last-purchase.ts`,
   `LastPurchase.tsx`) — before this it would have shown "not read" with the route off.
6. **Images**: `apps/api/Dockerfile`, `apps/probe/Dockerfile`, each with an allowlist
   `.dockerignore`, `oven/bun:1.3.14`, user `bun`, `/data` owned by it, a `bun` `HEALTHCHECK` on
   `/healthz`, no secret.
7. **Docs**: `apps/web/DEPLOY.md` "The API", "The probe", "Later: the two x402 switches"; the two
   READMEs; `CLAUDE.md`'s map, `README.md`, `docs/31`, `apps/web/public/docs/{architecture,developers}.md`,
   `.env.example`; ADRs `0084` and `0093` point to `0200`.

## The deploy, for the user

Two new applications in the ARP project, each:

| Setting | API | Probe |
| --- | --- | --- |
| Source | the Git repository, branch `main` | same |
| Build pack | Dockerfile | Dockerfile |
| Base Directory | `/` | `/` |
| Dockerfile Location | `/apps/api/Dockerfile` | `/apps/probe/Dockerfile` |
| Ports Exposes | `8787` | `8788` |
| Domain | `https://api.arp.intuition.box` | `https://probe.arp.intuition.box` |
| Health check | off (the image has its own) | off |
| Consistent Container Names | on | on |
| Persistent storage, volume | Destination `/data`, Source Path **empty** | same |
| Replicas | one | one |
| Runtime variables ("Available at Runtime", not Buildtime) | `API_PUBLIC_HOST=api.arp.intuition.box`; `GITHUB_TOKEN` (no scopes, secret) recommended | `PROBE_PUBLIC_HOST=probe.arp.intuition.box` |
| Leave unset for now | `ARP_X402_LAST_PURCHASE`, `REFRESH_SECRET` | `ARP_PROBE_X402` |

Then, on the site: the build variable `VITE_ARP_API_URL=https://api.arp.intuition.box`, and rebuild.
Nothing on the sponsor yet.

## Do not do in this task

- Set or honour `ARP_ALLOW_PRIVATE_PROBE` anywhere.
- Turn either x402 switch on, or set `ARP_PROBE_URL` on the sponsor.
- Deploy: the user does.
