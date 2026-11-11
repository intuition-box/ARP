# 118 — The hosted surfaces under a crowd

**Task:** `docs/tasks/130-load-on-the-hosted-surfaces.md`
**Completed:** 2026-11-11
**Commit:** `bbb04c31` on `0c07f6ce`, branch `fix/load-search-cache`
**Verifier verdict:** PASS (second pass; the first failed on one claim and flagged one gate defect)

## What shipped

- `apps/mcp/src/search-gate.ts` — one gate per process before `npx skills find`: `ARP_SEARCH_CONCURRENCY` (4) at once, `ARP_SEARCH_QUEUE` (64) waiting for at most `waitMs`, BUSY past that; one run per phrase in flight, stopped only when its last caller leaves; nothing kept after the call
- `apps/mcp/src/handlers/pulse.ts` — `search()` goes through the gate; the run gets the shared signal and keeps `runSearch`'s own timeout
- `apps/web/nginx.conf` — `limit_req` on `/skills-index/api/search` (20r/m per visitor, burst 10; 5r/s site, burst 40; `429`), real IP from `X-Forwarded-For` trusted only from private ranges, `access_log off` and `error_log crit` on that location
- `docs/22_RUNNING_THE_NODE.md` — the two variables
- `packaging/claude/arp/bin/arp.js` — regenerated

## Surprises

- The proxy's `Cache-Control: public, max-age=300` (task 82) contradicted the first draft's "no response is cached, on either surface". The server keeps nothing, but the browser may keep the answer for 5 minutes.
- In the first gate, two callers sharing one run were both bound to the first caller's signal, so the second failed when the first left.
- Bounding the wait with `AbortSignal.any([stop, timeout])` also raced the run's own timer and broke `pulse-failures`' "answers on time with a search that hangs". The wait and the run need separate limits.
- nginx's default access log carries the query string, so before this task the site logged the words searched.

## Decisions made

- **Bound the work and keep no cache keyed on words on the server.** The user turned down a 5-minute in-memory cache, keeping ADR `0161`. ADR: `.claude/choices/0195-the-hosted-surfaces-bound-their-load.md`.
- **Whether `public` becomes `private` on the proxy's `Cache-Control` is left to the user.** It is not changed in this task.

## Rules touched

- `.claude/rules/claims.md` — sufficient. It caught a sentence about the whole surface that was true only of the server.
- `.claude/rules/code.md` — sufficient.

## Suggestions for future tasks

- Before writing "nothing is cached", read every `Cache-Control` the same location sends. A cache can be the browser's, not ours.
- A shared run needs a caller count. No single caller's signal may cancel it.
- One test is named "the next caller starts a fresh one" but does not assert that part. Add the assertion the next time the gate is touched.
- Not done in this task: a live `arp_pulse` call against the container, and any load test. Throughput at 4 processes is unmeasured.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

It serves the skill column's read path at the declared and observed tiers: the site's search and `arp_pulse`, where those lines are read. It does not move ARP up the ladder, because it adds no evidence and only keeps those reads answering under a crowd.

## After the PASS

Completing the test the verifier flagged ("the next caller starts a fresh one") found a real defect:
when every caller left before the run's turn came, the gate still started the task with an aborted
signal, and a task that adds its abort listener late never ends and holds its slot. `runSearch`
checks `stop.aborted` first, so it was latent there. The gate now starts nothing once the shared
signal has aborted, with its own test. 318 tests in `apps/mcp`.
