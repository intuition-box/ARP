# 0153 — The search reads skills.sh's index, and the agent list opens on the reachable

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** `docs/tasks/82-enough-to-test.md`, the user's decisions of 2026-11-09

## Context

ARP's catalogue is 673 skills from 41 repositories, frozen by `docs/tasks/63`, because an agent's
search (`arp_pulse`) already runs `npx skills find` over skills.sh's whole index. But the site's
`/search` and `arp_find_tools` read only the catalogue. On 20 needs fixed in advance they met 10,
and skills.sh met 18 (`scripts/measure/readiness-bench.ts`, 2026-11-09). On the agent side, 38 of
286 agents in the directory answered a request, and `/agents` opened on all 286.

## Decision

1. `/search` and `arp_find_tools` also read skills.sh's search endpoint, the one `npx skills find`
   calls (`packages/protocol/src/skills-index.ts`). The browser reads it through a same-origin proxy
   (`/skills-index/api/search`, in `nginx.conf` and `vite.config.ts`), because skills.sh sends no
   CORS header. Order: skills agents declared using, then the index's order, then the catalogue's
   other matches. Nothing is written on chain and the freeze stands.
2. `/agents` opens on the agents that answered the last dated reading
   (`scripts/measure/directory-reachable.ts`), with "All" for the whole index.

skills.sh's `robots.txt` disallows `/api/`. The user chose to read it for a person's own search
(2026-11-09), the same request its own CLI makes anonymously. `scripts/measure/skills-installs.ts`
recorded the same disallow and read the pages instead, because it scraped; this is one search a
person typed, not a crawl.

## Alternatives considered

- **Write more skills on chain** (the top of skills.sh by installs). Rejected by the user: it
  reverses the freeze, costs tTRUST and hours of pipeline, and stays a fixed subset.
- **Both.** Rejected with it.
- **Probe agents live from the browser.** Not possible: most endpoints send no CORS header, and one
  visit would cost at least 73 probes, one per agent declaring a callable endpoint.
- **Proxy through `apps/api`.** It is not hosted, and the site's nginx already is.

## Consequences

**Positive:**
- The readiness gate is met: 18 of 20 (`data/measurements/readiness-bench-2026-11-09T1457.json`).
- A result ARP does not hold says so (`in_registry: false`, or its own section on the site).

**Negative:**
- The search depends on a third party that can change or close its endpoint. A failure is shown as
  `skills_index: unavailable` or "skills.sh did not answer", and the catalogue still answers.
- The site's server makes a request to skills.sh for each new search (cached five minutes by the
  browser). The browser's cookies are not forwarded.
- The reachable list goes stale between readings. Its date is in the header `Hint`.

**Neutral (worth knowing):**
- skills.sh returns a name, a repository and an install count, with no description. What a result
  needs is read from its file by `arp_pulse` or on the pulse page.

## References

- Related rule: `.claude/rules/portability.md` (the search is in `packages/protocol/`)
- Related doc: `docs/tasks/63-the-pulse.md`, `docs/tasks/82-enough-to-test.md`
- Related ADR: `0139` (one search, two results), `0143` (the 3-wallet threshold)
