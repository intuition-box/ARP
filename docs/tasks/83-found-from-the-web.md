# Task 83 — Found from the web

**Status:** proposed 2026-11-09, not started. Numbering: 83 was the next free number on `main` at `d10c9c5`; renumber at merge if an unpushed branch took it.
**ADR:** `0154` (proposed).
**Rules:** `code.md`, `ui.md` (copy), `portability.md`, `workflow.md`, `claims.md`, `security.md` (part B).

**Closed 2026-11-10 by task 103 (ADR `0172`):** closed into task 102 (ADR `0171`): what others read of ARP is its feeds and its registry listing, dated and static, not a live page.

## Why

Someone asks Gemini or ChatGPT for a task, the assistant searches the web, and ARP should be among what it reads, so it can name a skill and tell the person how to add it (the user, 2026-11-09). Today it cannot: the app is rendered by JavaScript, the crawlers behind those assistants do not run it, and what the site gives a crawler is a list of the app's routes and the docs, not the data (ADR `0154`, Context).

Two halves, because a page nobody wrote a line on answers nothing:

- **A. Pages a web agent can read.** One per category of the domain tree, one per skill, from the chain, dated.
- **B. A first agent that writes what it really used**, so those pages are not empty on the day they ship, and say plainly who wrote them.

## The user's decisions, 2026-11-09

1. Readers need no identity. An assistant on the web reads; it never signs (« pour le registre public ça peut marcher »).
2. Writers are agents with an ERC-8004 identity and the CLI, as today.
3. Do not rebuild the site to get there (« tout changer, c'est pas intéressant »).
4. A first service starts the system by writing what works (« un premier service qui tournerait et qui vérifierait si ça marche […] c'est le début du système »). Part B narrows it to what `docs/12`, `docs/30` and `security.md` allow; see "Do not do".
5. Maximise this channel (« je vais vouloir maximiser ça »).
6. From now on the first agents are real agents doing real work. Testnet data is lost at the move to mainnet, so a page does not label an agent as a test or testnet agent; the chain shown on every page is enough (« pas besoin de montrer que c'est testnet test agent, ça fait doublon »).
7. Mainnet is production. The pages that matter are the ones that read mainnet.

## Deliverables

### A. Pages a web agent can read

1. **`scripts/build/build-public-pages.ts`.** Reads, on one chain, the categories of the domain tree and the form B lines under them (`docs/28`), and writes `apps/web/src/data/public-pages-<chainId>.json` with the reading's date, the chain, and the script's name. Same pattern as `build-agents-reachable.ts`. Identities in the list behind `apps/web/src/services/test-identities.ts` are left out, as on the site.
2. **A build plugin in `apps/web/vite.config.ts`**, beside `llmsTxt()` and `publicSite()`, that emits for each category and each skill with at least one line:
   - `/read/do/<category>/index.html`: semantic HTML, no script, readable by a crawler.
   - `/read/do/<category>.md`: the same facts in Markdown, for an agent that fetches.
   - `/read/skill/<owner>/<repo>/<skill>/index.html` and `.md`.

   `/read/` is a prefix no route in the app uses, so `nginx.conf`'s `try_files $uri` serves the file and every app route is untouched. No page for a category or skill with no line.
3. **What a category page says**, in this order:
   - the task in plain words, as the title (the category's label);
   - the skills under it that have lines, each with: how many lines, how many said `worked` and how many `failed`, the reasons given for failures (`because`), the tier of each fact as `docs/32` defines it for the skill column (declared; observed only for a failure the hook recorded or a line with a content receipt, ADR `0109`), and the distinct wallets that wrote them;
   - the agents declared for the category, each with whether its signed address answered at the last reading and that reading's date (`answers_now`, `arp_agent_endpoints`; the agent column's observed tier). A skill has no address, so it gets no reachability line;
   - for each skill, how to add it, using the install command its source publishes, and how an agent checks it with ARP (`npx -y @arp-protocol/cli init`, then `arp_pulse`);
   - the date of the snapshot, the chain, and a link to the live page in the app.
4. **What a skill page says:** the same facts for one skill, every line with its levels, and the category it was used in.
5. **Copy follows `docs/30` on every page.** No "ranked by real use", "shows who used it" or "written by the agents themselves". A count of lines is a count of declarations, and says so. A unit test fails if a rendered page contains a phrase `docs/30` refuses.
6. **`sitemap.xml` and `/llms.txt` name the pages.** `SITEMAP_PATHS` gains the `/read/` pages; `/llms.txt` gains one short section saying what `/read/do/<category>.md` and `/read/skill/<owner>/<repo>/<skill>.md` hold.
7. **`scripts/measure/assistant-referrals.ts`.** Counts, from the web server's access log, requests whose referrer is an assistant (`chatgpt.com`, `gemini.google.com`, `perplexity.ai`, `claude.ai`) and fetches by the crawlers that feed them, per page. Raw output in `data/measurements/`. This is how the channel is judged.

### B. A first agent that writes what it really used

8. **One agent, operated by the user, registered as ERC-8004 on testnet 13579**, that does real work for the user (the business-development repo, the video project, Sofia). It writes form B lines with `arp line` only for what it used, with the outcome and, when it failed, the reason. Those lines are declared. Its runtime runs the hook, so its failures are also observed; a success is observed only with a content receipt (`docs/32`, skill column). On chain a hook-observed line and a written one look the same (`docs/32`, "What tier 2 does not prove"), so a page shows the tier only where a receipt is attached.
9. **No label, no claim.** Per decision 6 the agent gets no special label. What stays is `docs/30`: no page says or implies that its lines come from third parties, and "written by the agents themselves" is not used until third parties report results. Each line already shows the wallet that wrote it.
10. **Reachability stays a dated fact, not a line.** An agent's or an MCP server's reading (`arp_agent_endpoints`, the probe of ADR `0093`) is shown on the pages as "answered on <date>"; it is not written on chain and not presented as "it works".

## Gates

```
cd apps/web && bunx tsc -b
cd apps/web && bun run lint
cd apps/web && bun run test
cd apps/web && bun run check:tokens
bun run check:scripts
bun run test:scripts
```

`tsc -b` over `apps/web` does not cover `scripts/` (`claims.md` §4); `check:scripts` does.

Plus, on a release build with `VITE_SITE_URL` set: fetch three `/read/` pages with `curl` and confirm the facts are in the HTML returned, with no JavaScript run, and that each is in `sitemap.xml`.

## Do not do in this task

- Server-render or restructure the app.
- Serve anything live: no endpoint that answers a query at request time. A hosted read-only MCP connector is a separate decision (ADR `0154`).
- Sign on mainnet. Part B is testnet 13579. An agent signing with its operator's key is testnet only (`security.md`, ADR `0037`), and the delegation path is set aside except for hire (ADR `0147`).
- Write lines for skills the agent did not use, or a "works" line from a probe answer.
- Publish a page for a category or skill with no line.
- Put the agent of part B in the test-identities list: it is a real agent (decision 6).

## Open questions for the user

1. ~~The agent of part B~~: decided, a real agent with no label (decision 6).
2. **Refresh:** a page changes only when the snapshot is rebuilt and the site redeployed. Daily is the default proposed; the user decides.
3. ~~Which chain~~: decided, production reads mainnet (decision 7). Proposed: on testnet the pages are built for testing but left out of `sitemap.xml` and marked `noindex`, so a search engine does not index pages that disappear at the move.
4. **A hosted read-only connector:** wanted, as its own ADR, or not now?

## Evidence ladder

Skill column, with the agent column's reachability shown beside it. Part A publishes facts at the tiers they already have and moves none of them up; it makes them findable. Part B adds declared lines from one agent, and observed ones where the hook recorded a failure or a content receipt is attached. Corroborated needs three wallets that are not the user's, which this task does not produce: on 13579 on 2026-11-09 all 10 `has outcome` lines came from ARP's two wallets (`docs/32`, `scripts/measure/line-writers.ts`).
