# 0187 — An endpoint's last purchase by nohumans.directory is read on demand, and shown beside the lines

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** `docs/tasks/120-an-endpoints-last-purchase.md` (the orchestrator's brief for task 120)

## Context

nohumans.directory buys listed x402 endpoints with real USDC on Base and publishes, per listing, whether
its latest settled purchase delivered, the failure code when it did not, the settlement transaction and
the moment (`paid_verification_latest`). The data is CC BY 4.0: attribute "nohumans.directory" with a
link to `https://api.nohumans.directory`, and when a verdict is republished, say when it was observed
(`https://nohumans.directory/llms.txt`, section "## Licence", read 2026-11-11). Two of its routes are
free and answer for one endpoint: `GET /v1/listings/:id` and `GET /v1/resolve?url=`; seven others are
paid in x402 (same file, "One of 7 paid routes").

ARP shows other people's figures through `apps/api` (ADR `0084`), each dated and sourced. Those reads
run on a cron over a catalogue known in advance: 53 repositories and 673 skills on 2026-11-11
(`REPOS.length` and `SKILLS.length` of `apps/api/src/catalogue.ts`, printed with
`bun -e "import {REPOS,SKILLS} from './src/catalogue.ts'; console.log(REPOS.length, SKILLS.length)"`
in `apps/api`). The endpoints a page
would ask about are any tool atom whose label is a URL, and no list holds them.

Two facts about the site shaped the rest, both read 2026-11-11:

1. A tool atom's label is its normalised URL **without the scheme** (`normaliseToolUrl`,
   `packages/protocol/src/declare/tool-thing.ts`), and on 13579 such atoms include package pages
   (`npmjs.com/package/…`, `pypi.org/project/…`, `hub.docker.com/r/…`) and remote MCP endpoints
   (`mcp.neon.tech/mcp`, `mcp.atlassian.com/v2/mcp`).
2. `/atom/:id` sent any label with two path segments to `RepoPage`, whatever its host. So
   `mcp.atlassian.com/v2/mcp` rendered as a GitHub repository, a page that reads GitHub.

## Decision

1. **`apps/api` reads `GET /v1/resolve?url=<endpoint>` on demand** (`GET /x402/last-purchase?url=`),
   keeps an answer for a listed endpoint in KV for six hours (a week before KV drops it), and serves it
   with the source, the licence and `fetchedAt`. **Writes are bounded:** an `unknown` answer is never
   stored, and about `MAX_ENTRIES_PER_DAY` (100) answers are stored a UTC day, counted in one key (a
   soft cap: see Negative);
   past the cap the answer is served uncached. A failed refresh serves the previous answer with its own date. Only the
   free route is called; only the endpoint's public URL is sent (ADR `0155`).
2. **The card is shown for an atom whose label is a URL on a dotted host that is not a code or
   package host** (`github.com`, `gitlab.com`, `npmjs.com`, `pypi.org`, `hub.docker.com`), when the
   build has `VITE_ARP_API_URL`. The site cannot tell an x402 endpoint from an MCP one without asking,
   and nohumans lists both; "not listed there" is its own answer ("absence is not a verdict").
3. **The card has three lines in every state**, loading and failure included, each line cut rather
   than wrapped, so the facts column does not move when the reading lands.
4. **`RepoPage` and `SkillPage` are dispatched only for `github.com`.** Both read GitHub; on another
   host the atom keeps the generic page, which is the one the card is on.

## Alternatives considered

- **Read on the cron, like the other sources** — no catalogue of endpoints exists to iterate; building
  one is a second copy of the chain's tool list, which the storage principle forbids.
- **The browser calls nohumans.directory directly** — `/v1/resolve`, asked with an `Origin` header on
  2026-11-11, answered with no `access-control-allow-origin`, so a browser cannot read it; and every
  visitor would make the call, where the Worker keeps a listed endpoint's answer six hours.
- **Show the card only when the endpoint is listed** — the card would appear after the read and push
  everything below it, which is what the user asked these pages not to do.
- **`GET /v1/listings/:id`** — needs the listing id, which ARP does not hold; `resolve` takes the URL.
- **Mark "not delivered" in `--color-alarm`** — `rules/ui.md` keeps the alarm for a signature mismatch
  and a module used but never declared. Somebody else's verdict does not get it.
- **Leave the `RepoPage` dispatch alone** — then the card never shows on an endpoint whose path has two
  segments, such as `mcp.atlassian.com/v2/mcp` or `api.tickersfeed.net/econ/snapshot`.

## Consequences

**Positive:**

- An x402 endpoint's page shows whether somebody actually paid it and got something, dated, with the
  transaction a reader can check on Base, beside ARP's own lines and never counted with them.
- `mcp.atlassian.com/v2/mcp` and every non-GitHub two-segment label get the generic page instead of a
  repository page reading GitHub for them.

**Negative:**

- On 13579, the nine MCP endpoint atoms checked on 2026-11-11 all read "not listed there". The
  whole population that gets the card was not listed, so how many others do is not known.
- The host list in point 2 is hand-kept. A new package host shows a card that says "not listed there"
  until it is added.
- Anyone can make the Worker ask nohumans.directory about any URL. The KV writes this costs share
  the `FACTS` namespace's daily write budget with the cron, which `refresh.ts` slices to stay under
  it, so they are bounded (point 1): made-up URLs answer `unknown` and cost no write, and stored
  answers stop at about 100 a UTC day, 200 writes with their count (a soft cap, below). Past the cap every request for an
  uncached endpoint is a read of nohumans.directory, so the edge's five-minute `cache-control` is
  then the only cache. The count is a read-then-write in KV with no lock, and KV is eventually consistent between
  locations, so the cap is soft: misses on listed URLs that land together, or at different
  locations before the count propagates, can each store an answer past it. The overshoot is bounded
  by the number of such requests, not by one. The key is a SHA-256 of the URL, so a URL up to the
  2048-character limit fits KV's 512-byte key.
- An `unknown` answer is not cached in KV, so an endpoint not listed there is asked again on each
  request past the edge's five minutes.

**Neutral (worth knowing):**

- `pypi.org/project/<name>` also had two segments and went to `RepoPage`; it now gets the generic page.
- The scout pays on Base only (`llms.txt`), so the transaction link is Basescan's.

## References

- Related rule: `.claude/rules/ui.md`, `.claude/rules/claims.md`
- Related ADR: `0084` (apps/api), `0155` (the user's text stays local), `0170` (x402 Doctor's Trust Index, the same treatment)
- Related doc: `apps/web/public/docs/architecture.md`, `apps/web/public/docs/web-app.md`
