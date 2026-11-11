# 0200 — The API and the probe run as containers on Coolify, with SQLite, and their x402 parts off

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** the user, 2026-11-11, option (b): « les adapter à Coolify » (everything on
intuition.box's Coolify, no Cloudflare account); then, during the task: « je veux skill et github,
pas x402 tout de suite ». Task 140 (`docs/tasks/140-api-and-probe-on-coolify.md`).

Amends ADR `0084` (the facts API) and ADR `0093` (the probe) on **where they run** and **what holds
their state**. What each serves, and that neither is a source, a score or on chain, is unchanged.

## Context

`apps/api` and `apps/probe` were Cloudflare Workers, run only under `wrangler dev`: the API on Workers
KV with a ten-minute cron, the probe on D1 with a five-minute cron. Neither was deployed, because
deploying needed a Cloudflare account, and the user chose not to open one: the site, the sponsor, the
MCP endpoint and the content server already run on one Coolify project.

Two things the edge gave for free do not hold on a host of our own:

- **A private address reached nothing from a Worker.** From a container on ARP's host, `10.x`,
  `172.17.0.1` or `169.254.169.254` is that host's network. The probe connects to every catalogued
  endpoint with `fetch`, which follows redirects, so one catalogued endpoint that redirects, or a name
  that resolves to a private address, would have it read ARP's own network.
- **The cron.** Coolify has scheduled tasks, but they run a command in the container; the schedule
  belongs with the code that has the state.

## Decision

1. **One runtime, Bun in a container; wrangler is dropped.** `wrangler.jsonc`, `.dev.vars.example`,
   the `export default { fetch, scheduled }` objects and the D1 adapter are removed, and `wrangler` leaves
   both `package.json` files and `bun.lock`. Keeping the Worker build would have kept two storage
   implementations and two schedules to test, for a runtime the user declined.
2. **The handlers keep their logic behind the seams they already had.** The API's `Store` (get, put
   with `expirationTtl`) gets `sqlite-store.ts` on `bun:sqlite`, with KV's semantics: an expired value
   reads as absent, a put without a TTL clears it, expired rows are deleted on the next put. The probe's
   `Readings` gets `sqliteReadings`, which applies the same `migrations/` D1 applied, in name order,
   counted by `PRAGMA user_version`. Both files live under `ARP_DATA_DIR`, `/data` in the images, a
   volume. `worker.ts` is renamed `service.ts`; `server.ts` starts the service (`start()`, tested on port 0) and `main.ts` is the few lines that run it.
3. **The crons become `every()`** (`@arp-protocol/core/node`, `hosted.ts`): the same periods, ten and
   five minutes, **one run at a time** (a tick during a run is skipped, not queued), a run that throws
   reported and the schedule kept, and **one run on start**. For the API that resumes a cycle at its
   cursor and does nothing when none is due; for the probe it reads every target at once after a
   deploy.
4. **The probe asks an endpoint only through `pinnedAsk`, private addresses refused, always.**
   `pinnedAsk` moves from `apps/sponsor/src/admit-tool.ts` to `@arp-protocol/core/node`
   (`pinned-ask.ts`), taking its timeout, body cap and user agent as options (the sponsor keeps a
   wrapper with its own values) and, new, opening **no pooled socket** (`agent: false`): under Node
   the global agent keeps connections alive, and a reused socket skips `lookup`, so a request could
   inherit a connection opened under another policy. Found by its own test, task 140. It resolves once, refuses any private, loopback or
   link-local address, connects to the checked addresses, and follows no redirect. The probe passes
   `allowPrivate: false` and reads no `ARP_ALLOW_PRIVATE_PROBE`. A registry read (`registry.npmjs.org`,
   `pypi.org`, fixed hosts ARP chose) keeps `fetch`.
5. **Host allowlist like the other services**: `<PREFIX>_LISTEN` and `<PREFIX>_PUBLIC_HOST`
   (`API_`, `PROBE_`), the rule of `apps/sponsor/src/listen.ts` in `hostedListener`; any other `Host`
   gets a 421. No `Origin` check: both answer any page's `GET` with `access-control-allow-origin: *`.
6. **The x402 parts are off by default** (the user's narrowing, 2026-11-11). On the API,
   `/x402/last-purchase` (task 120, ADR `0187`) answers only with `ARP_X402_LAST_PURCHASE=on`;
   otherwise it is a 404 and makes no outbound call. On the probe, `ARP_PROBE_X402=on` keeps a `402`'s
   offers and serves `GET /x402` (task 122, ADR `0189`); off, a `402` with offers is still classified
   `x402` with no detail, `/x402` is a 404, and `latestX402` skips a reading that kept no offers. The
   site's last-purchase card reads the API's 404 as "no such route" and renders nothing (before this,
   it would have shown "not read"). The sponsor's `ARP_PROBE_URL` stays unset until the probe's switch
   is on.

## Alternatives considered

- **Deploy to Cloudflare.** The code was ready for it; the user declined the account.
- **Keep both builds, a Worker entry and a container entry.** The handler seam made it cheap in
  code, not in what has to be kept true: two stores, two schedules, two sets of docs, and the D1
  migrations applied by two tools. One runtime is what the user chose.
- **Coolify's scheduled tasks for the crons.** A `bun -e` in the container every N minutes, with no
  lock between a slow run and the next; the in-process schedule has the one-at-a-time guarantee in
  one place, tested.
- **Keep `fetch` in the probe and check the name first.** A resolve-then-`fetch` leaves rebinding
  between the two lookups and still follows redirects; `pinnedAsk` already closed both for the sponsor.
- **A host directory for `/data`.** A Docker volume (Source Path empty) is created owned by the
  image's `bun` user from the image's `/data`; a host directory is root's.

## Consequences

**Positive:**
- Both deploy beside the site, on its wildcard `*.arp.intuition.box`, with no new account.
- The probe cannot be walked into ARP's host network by a catalogued name or a redirect.
- A redeploy keeps the API's cursor and the probe's history (the volume).

**Negative:**
- **An endpoint that redirects now reads `http-error` with its 3xx**, where the Worker followed it.
  None of the 14 catalogued endpoints did on 2026-11-11 (the local run below: 11 `asks-for-auth`,
  1 `refuses`, 1 `not-mcp`, 1 `answers`).
- An endpoint whose SSE stream stays open is read until the ten-second deadline and classified by
  what came by then; its `ms` is then the deadline, not its answer time.
- `measuredBy` says "ARP, from its own server", not "ARP, from Cloudflare": a reading's origin changed.
- One container per volume: Consistent Container Names on, one replica.

**Neutral (worth knowing):**
- Each app's `src/main.ts` is excluded from task 136's coverage gate (ADR `0198`), as `apps/sponsor/src/main.ts` is: it starts the service at import. `src/server.ts`'s `start()` holds everything it does and is tested on port 0.
- The KV soft cap of ADR `0187` (about 100 stored answers a UTC day) is kept in SQLite, where a write
  costs nothing: it is now only the bound on what a stranger's URLs can make the API store.
- The API keeps its 40-read slices; they were for a Worker's subrequest ceiling and now pace a cycle.
- The STATE defect "`apps/api` `wrangler dev` reads `packages/protocol/dist/`" closes: there is no
  `wrangler dev`. Under Bun, `@arp-protocol/core` resolves to `src/` (task 124).

## References

- Related rule: `.claude/rules/security.md` (outbound reads, no key), `.claude/rules/portability.md`
- Related doc: `apps/web/DEPLOY.md` "The API", "The probe", "Later: the two x402 switches"
- Related ADR: `0084`, `0093`, `0187`, `0189`, `0149` (the sponsor's container), `0163` (`pinnedAsk`)
- Post-mortem: `.claude/learning/128-api-and-probe-on-coolify.md`
