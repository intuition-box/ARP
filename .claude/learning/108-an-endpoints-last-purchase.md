# 108 — An endpoint's last purchase, checked by nohumans.directory, beside ARP's lines

**Task:** `docs/tasks/120-an-endpoints-last-purchase.md`
**Completed:** 2026-11-11
**Commit:** uncommitted
**Verifier verdict:** PASS (second pass; the first failed on four claims items and one boundary bug)

## What shipped

- `apps/api/src/purchases.ts`: reads the free `GET /v1/resolve?url=` on demand. The answer is kept six hours in KV (a week before KV drops it), the key is `nohumans:<sha256>`, and a failed refresh serves the older answer.
- `apps/api/src/worker.ts`: the `GET /x402/last-purchase?url=` route. It returns 400 for a URL that is not http(s) and 502 for a failed read with nothing cached.
- `apps/api/test/purchases.test.ts`: 29 tests in the apps/api suite. The test store refuses keys over 512 bytes, as KV does.
- `apps/web/src/services/last-purchase.ts`, `hooks/use-last-purchase.ts`, `components/atom/LastPurchase.tsx`: the card, three lines in every state. It is absent when `VITE_ARP_API_URL` is unset.
- `apps/web/src/pages/AtomPanel.tsx`: RepoPage and SkillPage are dispatched only for `github.com`, with a test. That test was confirmed failing without the guard.
- Docs: `architecture.md`, `web-app.md`, `apps/api/README.md`, FUTURE.md (x402 section), STATE.md row 120.

## Surprises

- `/atom/:id` had been sending any two-segment label to RepoPage, so `mcp.atlassian.com/v2/mcp` rendered as a GitHub repository.
- nohumans' `/v1/resolve` sends no CORS header, so the read has to go through the Worker.
- An endpoint URL used as the KV key would exceed KV's 512-byte key limit (miniflare `MAX_KEY_SIZE_BYTES: 512`). The verifier caught this, not the tests.

## Decisions made

- **Read on demand, not on the cron**: no catalogue of endpoints exists. ADR: `.claude/choices/0187-an-endpoints-last-purchase-is-read-on-demand-and-shown-beside-the-lines.md`.
- **The card appears in every state, "not listed there" included**, so the facts column never moves. ADR 0187.
- **Hashed KV key**: lets a URL of up to 2048 characters fit the 512-byte key limit.

## Rules touched

- `.claude/rules/claims.md`: sufficient. The first pass failed on three things: a count copied from a stale comment (662 instead of 673), "every endpoint page" extrapolated from nine endpoints checked, and a consequence understated (the shared FACTS write budget).
- `.claude/rules/ui.md`, `code.md`, `portability.md`, `workflow.md`: sufficient.

## Suggestions for future tasks

- Take a count from the code that holds the population (`bun -e` over `catalogue.ts`), never from a nearby comment. `refresh.ts:4` still says 662.
- Any unauthenticated route that writes to KV shares the namespace's daily write budget. Bound it, or say so in the ADR, before deploying.
- Before using a user-supplied string as a KV key, check its length against 512 bytes.
- Open: `apps/api` needs a bound on `nohumans:` writes, or a namespace of its own, before it is deployed (ADR 0187 Negative).

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

The column is hire (an x402 endpoint is what an agent pays to call) and the tier is observed. The card shows a third party's dated record of a real paid call, with its settlement transaction on Base, beside ARP's declared lines. That adds an outside observation to the endpoint's page but does not move ARP's own lines up a tier, because the purchase is not an ARP line and is counted nowhere.
