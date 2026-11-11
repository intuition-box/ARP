# 108 — An endpoint's last purchase, checked by nohumans.directory, beside ARP's lines

**Task:** `docs/tasks/120-an-endpoints-last-purchase.md`
**Completed:** 2026-11-11
**Commit:** uncommitted
**Verifier verdict:** PASS (fourth pass. Before the rebase: one fail on four claims items and one boundary bug, then a pass. After the rebase onto `origin/main` 1a291387 and the write bound: one fail on the bound's overshoot claim, then a pass)

## What shipped

- `apps/api/src/purchases.ts`: reads the free `GET /v1/resolve?url=` on demand. The answer is kept six hours in KV (a week before KV drops it), the key is `nohumans:<sha256>`, and a failed refresh serves the older answer. Writes are bounded: an `unknown` answer is never stored, and about 100 answers are stored a UTC day (`MAX_ENTRIES_PER_DAY`, counted in `nohumans-writes`, 2 writes per stored answer). It is a soft cap: the count is a read-then-write in KV with no lock, KV is eventually consistent, and the overshoot is bounded by the number of requests that race, not by one (ADR 0187 Negative).
- `apps/api/src/worker.ts`: the `GET /x402/last-purchase?url=` route. It returns 400 for a URL that is not http(s) and 502 for a failed read with nothing cached.
- `apps/api/test/purchases.test.ts`: the apps/api suite is 31 tests, the write bound among them. The test store refuses keys over 512 bytes, as KV does.
- `apps/web/src/services/last-purchase.ts`, `hooks/use-last-purchase.ts`, `components/atom/LastPurchase.tsx`: the card, three lines in every state. It is absent when `VITE_ARP_API_URL` is unset.
- `apps/web/src/pages/AtomPanel.tsx`: RepoPage and SkillPage are dispatched only for `github.com`, with a test. That test was confirmed failing without the guard.
- Docs: `architecture.md`, `web-app.md`, `apps/api/README.md`, FUTURE.md (x402 section, after task 118's notes; the rebase conflict was resolved by keeping both), STATE.md row 120.

## Surprises

- `/atom/:id` had been sending any two-segment label to RepoPage, so `mcp.atlassian.com/v2/mcp` rendered as a GitHub repository.
- nohumans' `/v1/resolve` sends no CORS header, so the read has to go through the Worker.
- An endpoint URL used as the KV key would exceed KV's 512-byte key limit (miniflare `MAX_KEY_SIZE_BYTES: 512`). The verifier caught this, not the tests.

## Decisions made

- **Read on demand, not on the cron**: no catalogue of endpoints exists. ADR: `.claude/choices/0187-an-endpoints-last-purchase-is-read-on-demand-and-shown-beside-the-lines.md`.
- **The card appears in every state, "not listed there" included**, so the facts column never moves. ADR 0187.
- **Hashed KV key**: lets a URL of up to 2048 characters fit the 512-byte key limit.

## Rules touched

- `.claude/rules/claims.md`: sufficient. After the rebase, the bound's overshoot was first written as "one answer more than the cap" and was corrected to a soft cap at seven sites. Before the rebase, the first pass failed on three things: a count copied from a stale comment (662 instead of 673), "every endpoint page" extrapolated from nine endpoints checked, and a consequence understated (the shared FACTS write budget).
- `.claude/rules/ui.md`, `code.md`, `portability.md`, `workflow.md`: sufficient.

## Suggestions for future tasks

- Take a count from the code that holds the population (`bun -e` over `catalogue.ts`), never from a nearby comment.
- Any unauthenticated route that writes to KV shares the namespace's daily write budget. Bound it, or say so in the ADR, before deploying.
- Before using a user-supplied string as a KV key, check its length against 512 bytes.
- A cap counted in KV is soft. Say so wherever the number is written, or give the count a lock (a Durable Object) or a namespace of its own.
- Fixed at the orchestrator's request, in the closing commit: `apps/api/src/refresh.ts:4` now reads 53 repositories, 41 trees, 673 pages, about 770 requests (counted 2026-11-11 from `catalogue.ts`), and so does `apps/api/README.md`; `sources.ts:122` keeps its 662, dated, because the median of 448 characters was measured over those 662 on 2026-10-30.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

The column is hire (an x402 endpoint is what an agent pays to call) and the tier is observed. The card shows a third party's dated record of a real paid call, with its settlement transaction on Base, beside ARP's declared lines. That adds an outside observation to the endpoint's page but does not move ARP's own lines up a tier, because the purchase is not an ARP line and is counted nowhere.
