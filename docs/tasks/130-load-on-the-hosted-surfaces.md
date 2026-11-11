# Task 130 — The hosted surfaces under a crowd

**Status:** done 2026-11-11, branch `fix/load-search-cache`, worktree `../ARP-load`, written by
arp-32. `task-verifier` PASS on round 2, post-mortem `.claude/learning/118-load-on-the-hosted-surfaces.md`. Task 130, ADR `0195`, post-mortem `118`, allocated by the orchestrator (arp-50).
**ADR:** `0195` — the hosted surfaces bound their load, and the server caches none of the words searched.
**Rules:** `code.md`, `security.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

The user, 2026-11-11: « si demain j'ai 1k utilisateurs d'un coup, le site et tout le reste tiennent le
coup ? » (the sponsoring service set aside). A reading of the code, with no load test, found two places
where a crowd lands on one machine:

1. **The site's search** goes through `apps/web/nginx.conf`'s `/skills-index/api/search`, so every
   visitor's search reaches skills.sh from the site's one address, with no bound per visitor.
2. **`arp_pulse` on the hosted MCP server** (`mcp.arp.intuition.box`) starts one `npx skills find`
   process per phrase, up to four per call (`MAX_PHRASES`), with no limit across callers. A crowd of
   callers starts a crowd of processes in one container.

## What changes

1. **`apps/mcp/src/search-gate.ts`**: one gate per process in front of the search package. At most
   `ARP_SEARCH_CONCURRENCY` (default 4) run at once; up to `ARP_SEARCH_QUEUE` (default 64) more wait,
   each no longer than the search's own limit (25 s, `budget.searchMs`); past that a phrase answers
   `the server is running as many searches as it can`, which `arp_pulse` reports as a failed phrase.
   Two callers asking the same phrase while it runs start one process; the run stops only when both
   have left, and each leaves on its own signal. The gate keeps nothing after the call: the key, the
   words searched, leaves the map when the phrase answers or its last caller leaves.
2. **`apps/web/nginx.conf`**: the search proxy is rate-limited, 20 a minute per visitor with a burst
   of 10, and 5 a second for the whole site with a burst of 40, refused with `429`. The visitor's
   address is the one Coolify's proxy forwards, trusted only from a private network. Nothing on that
   path is logged below `crit`, because the address carries the words searched.
3. `docs/22_RUNNING_THE_NODE.md` names the two variables.

## What the user decided

A cache keyed on the words was proposed for both surfaces and for the ten Intuition GraphQL reads of
one search (`scripts/measure/pulse-requests.ts`, 2026-11-11, n = 1: 10 to `testnet.intuition.sh`,
11 to GitHub, 1 RPC). It would keep a caller's words beyond the call, which ADR `0161` excludes. The
user chose to keep the rule (2026-11-11). So the server keeps no response, on either surface.

**Whether a response holds anything user-specific:** the server caches nothing. The proxy's response
is skills.sh's answer to the words, the same for any visitor; the visitor's cookies are not forwarded
and `Set-Cookie` is hidden (task 82), so it holds nothing about the visitor. It carries
`Cache-Control: private, max-age=300` since the follow-up below, so the visitor's browser may keep it
five minutes and no shared cache in between may. A `429` carries no such header: `add_header` without `always` does not apply to it.
What the proxy sends upstream is unchanged: the path and the query string.

## Do not do in this task

- Cache a search result, a GraphQL response or a skills.sh answer keyed on, or holding, the words.
- Touch the sponsoring service (the user set it aside) or `arp_pulse`'s handlers beyond `search()`
  (task 127 is open on another branch).
- Change `MAX_PHRASES` or the search's time budget.

## Gates

`cd apps/mcp && bun run test && bun run lint`; `cd apps/web && bunx tsc -b && bun run lint && bun run
test && bun run check:tokens`; `bun run check`; `cd apps/cli && bun run test && bun run packages
--check`; `docker build` of `apps/web/Dockerfile` and `apps/mcp/Dockerfile`, and the web image run
locally to see the `429`.

## Follow-up, 2026-11-11

The user chose `private` over `public` on the proxy's `Cache-Control` (task 82 had `public`), relayed
by the orchestrator: only the visitor's browser may keep the answer to their words. In
`apps/web/nginx.conf`, the header says `private`, and skills.sh's own `Cache-Control: public, max-age=0,
must-revalidate`, which the proxy passed through beside ours, is hidden (seen on the local image
before the fix: two `Cache-Control` headers on one response); gates `apps/web` tsc, lint, test and a `docker build` of `apps/web`.
