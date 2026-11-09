# Task 82 — Enough to test

**Status:** verified 2026-11-09, `ui-reviewer` PASS (round 2), `task-verifier` PASS (round 2), post-mortem `learning/73`, on `main`.
**ADR:** `0153`.
**Rules:** `code.md`, `ui.md`, `portability.md`, `workflow.md`, `claims.md`.

## Why

Before a tester round, the user asked whether there was enough for a person or an agent to use
(2026-11-09: « c'est trop peu pour être un produit de test non ? »). Measured the same day:

- **Skills.** 20 needs fixed in advance, each with a short query. ARP's catalogue (673 skills from
  41 repositories, frozen since `docs/tasks/63`) met **10 of 20**. The same queries through
  skills.sh's index met **18 of 20**. Raw output: `data/measurements/readiness-bench-2026-11-09T1444.json`.
- **Agents.** 286 in the directory on testnet 13579. 189 registration documents could be read, 73
  declare a callable endpoint, and **38 answered one request**. 27 of those 38 are on `*.vercel.app`
  with the same `/mcp` and agent-card paths, 23 of them at `*-api.vercel.app`. None of the 31
  identities on 13579 answered, ARP's own included.
  Raw output: `data/measurements/directory-reachable-2026-11-09T1505.json`. The two host counts:

  ```
  python3 -c "import json;a=json.load(open('data/measurements/directory-reachable-2026-11-09T1505.json'))['answering'];e=[x['endpoints'][0] for x in a];print(sum('.vercel.app/' in u for u in e),sum('-api.vercel.app/' in u for u in e))"
  ```

## The user's decisions, 2026-11-09

1. Do the four items proposed: a readiness gate, wider skill coverage, reachable agents first, and
   real MCP servers as tools.
2. The gate is **15 of 20** needs met before a tester is invited.
3. Coverage comes from **skills.sh's live index**, read by the site and by `arp_find_tools`, and not
   from writing more skills on chain. The catalogue freeze of `docs/tasks/63` stands.

## Deliverables

1. `scripts/measure/readiness-bench.ts`: the gate. Twenty needs, the real MCP server over HTTP, a
   blind judge (sonnet, twice). A need is met when one top-5 result is rated "does this job" by both
   judgements.
2. `packages/protocol/src/skills-index.ts`: `searchSkillsIndex`, the endpoint `npx skills find`
   calls. A failure returns `unavailable`, never an empty list.
3. `arp_find_tools` merges it in (`mergeIndexed` in `apps/mcp/src/tool-search.ts`): skills agents
   declared using first, then the index in its own order, then the catalogue's other matches. A row
   ARP does not hold says `in_registry: false`.
4. The site: `/skills-index/api/search` is proxied by `apps/web/nginx.conf` in production and by
   `vite.config.ts` in dev. `/search` has an "On skills.sh" section linking each result to its pulse
   page.
5. **Superseded by task 87 (ADR `0156`):** `/agents` now reads the 8004 sieve's walk,
   `data/catalogue/agent-sieve-13579.json`, and the build script and JSON below are removed. As built here:
   `scripts/measure/directory-reachable.ts` and `scripts/build/build-agents-reachable.ts` write
   `apps/web/src/data/agents-reachable.json`. `/agents` opens on "Reachable", with "All" for the
   whole index, and a header figure whose `Hint` gives the reading's date.

## Results

| gate | before | after |
| --- | --- | --- |
| `readiness-bench.ts`, ARP | 10 of 20 (`…T1444.json`) | **18 of 20** (`…T1457.json`) |

Missed after the change: "translate a document into French" and "analyse a CSV and make charts".
Twenty needs and one judge model: n is small, and the figure says the gate is met on these needs, not
that coverage is 90%.

## Evidence ladder

Skill column, tier "declared" (`docs/32`). This does not move ARP up the ladder by itself: it widens
what a tester can find, so that testers can write the declared lines the next tiers need. Today
there are **10 result lines on 13579, all paid by ARP's own wallets, 0 from another wallet**
(`scripts/measure/line-writers.ts`, run 2026-11-09T15:19). The reachable list is a dated probe of
the agent column, not a line, and counts for no tier.

## Not done, and why

- **Real MCP servers as tools (item 4 of the proposal).** Not needed for the gate, which the skills
  index meets. Adding more means new tool atoms on chain, which the freeze covers. Waits for the user.
- **A stable address for ARP's own node.** Every node start writes a new signed address (task 65), so
  none of ARP's agents answers. It needs a host that stays up, which is the user's Coolify. Waits for
  the user.
- The reachable list is a **dated reading**, not a live probe. A browser cannot probe 286 endpoints:
  most send no CORS header, and one visit would cost one probe each. Refreshing it means rerunning
  the two scripts in deliverable 5.

## Checks

`bunx tsc -b`, `bun run lint`, `bun run test`, `bun run check:tokens` in `apps/web`;
`bunx vitest run` in `apps/mcp` and `packages/protocol`; `bun run check:scripts` at the root. The
nginx proxy was tested in `nginx:1.27-alpine` with the committed `nginx.conf`.
