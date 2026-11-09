# 0154 — Public read pages are dated static snapshots, not a live endpoint

**Status:** Proposed
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09, on how an agent searching the web would reach ARP: « par exemple quelqu'un est dans son gemini sur google ou dans chatgpt sur bing et il demande une tâche […] grâce à ARP il trouverait le bon outil ». Planned in `docs/tasks/83-found-from-the-web.md`.

Numbering: 0154 was the next free number on `main` at `d10c9c5`. Unpushed branches have collided with `main` before (task 81's note in `.claude/STATE.md`); renumber at merge if 0154 is taken.

## Context

An assistant that answers from the web (Gemini over Google, ChatGPT search, Perplexity) does two things: it searches, then it fetches a URL and reads what comes back. Three facts decide whether that reaches ARP:

1. **The site is a client-rendered app.** `apps/web` is Vite and React Router; `apps/web/nginx.conf` answers every path that is not a file with `index.html` (`try_files $uri /index.html`). The facts on a pulse page are fetched and drawn by JavaScript after load.
2. **The crawlers behind those assistants do not run JavaScript.** Third party, Vercel, 2024-12-17: "none of the major AI crawlers currently render JavaScript", naming GPTBot, ClaudeBot and PerplexityBot (https://vercel.com/blog/the-rise-of-the-ai-crawler). Not re-measured here. A crawler that fetches `/pulse/<owner>/<repo>/<skill>` reads an empty shell.
3. **What the site already gives a crawler is about the app, not the data.** `apps/web/vite.config.ts:77-86` writes `robots.txt` (`Allow: /` for every agent) and a `sitemap.xml` of `SITEMAP_PATHS` (`:45-57`), which are the app's routes. `llmsTxt()` (`:20-42`) writes `/llms.txt` and `/llms-full.txt` from the docs. None of it carries a line, a category or a skill.

And one constraint: `docs/12`, "Not in the path of a request". Unplug ARP's servers and every declaration, every stake and every agent-to-agent call still completes. Hosted services may only cost an agent a convenience, never a capability.

People ask by task, not by tool name ("remove the silences from my video"), so the pages that answer them are pages per category of the domain tree (`data/catalogue/domain-tree-13579.json`, `docs/25`), with pages per skill under them.

## Decision

ARP publishes **dated static snapshots** of what its graph holds: one page per category of the domain tree that has at least one line, and one per skill that has at least one line. Each exists as plain HTML with no script and as Markdown, generated at build time from a reading of the chain that a committed script makes and dates. They are listed in `sitemap.xml` and named in `/llms.txt`. They live under a prefix no app route uses, so nginx serves the file and the app's routes are untouched.

They are **not** a live endpoint. Nothing answers a query at request time; a snapshot is rebuilt by re-running the script and redeploying. Unplugging ARP leaves every page an agent already fetched, or a search engine already indexed, as true as its date.

A hosted, public, read-only MCP connector is a **separate** decision, not taken here.

## Alternatives considered

- **Server-render the app.** Makes every existing page readable, but changes how the whole site is built and served, which the user declined on 2026-11-09 (« ça voudrait dire quoi, tout changer, c'est pas intéressant »).
- **A live read endpoint (JSON, Markdown on request, or a hosted MCP server).** Always fresh, but ARP becomes a host that agents reach at request time, which is the shape `docs/12` and ADR `0045` keep ARP out of. It may still be worth it for reads only; that needs its own ADR.
- **Rely on `llms.txt` alone.** It points an agent that is already on the site; it does not get the site found by a search, and today it carries no data.
- **Do nothing.** Every question an assistant answers from the web goes to pages that hold no usage at all: registries and lists.

## Consequences

**Positive:**
- An assistant that searches by task can land on a page that answers it, in text it can read.
- ARP stays out of the request path: a page is a file, read without ARP doing anything.
- The pages reuse the reading the app already makes; no new source of truth (`docs/02`, one canonical source per datum).

**Negative:**
- A page is as old as its last build, and says so. Freshness costs a rebuild.
- Every sentence on a page is public copy and falls under `docs/30`. A template that says "ranked by real use" or "shows who used it" breaks it on every page at once, so the template is tested for those phrases.
- A page with no line is thin content and is not published; a category appears only once something was written under it.

**Neutral (worth knowing):**
- ARP's own test identities are hidden from the public site (`apps/web/src/services/test-identities.ts`). The pages read the same list, so a line from a hidden identity is not shown there either.
- Whether an assistant cites a page is not in ARP's control. Referrers from assistant domains in the web server's log are the measure.

## References

- Related rule: `.claude/rules/claims.md`, `.claude/rules/workflow.md`
- Related doc: `docs/12_THE_IDEA.md` ("Not in the path of a request"), `docs/25_THE_DOMAIN_TREE.md`, `docs/28_THE_SIGNAL.md`, `docs/30_THE_POSITIONING.md`, `docs/32_THE_EVIDENCE_LADDER.md`
- Related ADR: `0045`, `0084`, `0093`, `0142`, `0147`
- Task: `docs/tasks/83-found-from-the-web.md`
