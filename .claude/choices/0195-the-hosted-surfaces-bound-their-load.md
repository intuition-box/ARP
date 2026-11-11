# 0195 — The hosted surfaces bound their load, and the server caches none of the words searched

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** `docs/tasks/130-load-on-the-hosted-surfaces.md`, the user's question about 1k users

## Context

Two hosted surfaces turn one person's search into work on ARP's machine: the site's skills.sh proxy
(`apps/web/nginx.conf`) and `arp_pulse` on the hosted MCP server, which starts up to four
`npx skills find` processes per call. Neither was bounded across callers. The cheap remedy under load
is a cache, and on both surfaces the key of that cache is the words searched. ADR `0161` says the hosted
server keeps a caller's words for the length of the call and no longer.

## Decision

Bound the work, and cache nothing keyed on words on the server. The MCP server runs at most `ARP_SEARCH_CONCURRENCY`
search processes at once (default 4), queues at most `ARP_SEARCH_QUEUE` (default 64) for no longer
than the search's own limit, refuses past that, and runs a phrase asked twice at the same moment
once, forgetting it when it answers or when its last caller leaves. The site's proxy is rate-limited per visitor and for the site,
answering `429`, and logs nothing on that path below `crit`. The user chose this over a five-minute
in-memory cache, 2026-11-11.

## Alternatives considered

- **A five-minute cache in memory** (`/dev/shm` for nginx), amending `0161`. More effective for a
  query asked again within five minutes, but it keeps a caller's words after the call. Refused by
  the user.
- **A cache of only the GraphQL reads that carry no word** (ids, fixed lists). Smaller gain, and each
  read would need its own proof that its variables do not derive from the words.
- **No bound.** A crowd starts a crowd of processes in one container and the server stops answering
  everyone.

## Consequences

**Positive:**
- The hosted MCP server's processes are bounded whatever the number of callers; a crowd gets "busy"
  answers instead of an outage.
- The site's proxy no longer logs the words searched on its path, which it did before this change
  (nginx's default access log carries the query string).

**Negative:**
- A search repeated a minute later costs the same as the first.
- At four processes the server takes about one full search at a time; throughput depends on the
  container's CPU and was not measured. `ARP_SEARCH_CONCURRENCY` is the setting to raise.
- The ten Intuition GraphQL reads of a search are neither cached nor bounded by this decision; they
  are HTTP reads, not processes, and their load falls on Intuition's endpoint.

**Neutral (worth knowing):**
- The proxy's `Cache-Control: public, max-age=300` (task 82) is unchanged, so a visitor's browser
  may keep skills.sh's answer five minutes. That is the visitor's machine, not ARP's server.
- The gate is per process: two replicas would each run four.
