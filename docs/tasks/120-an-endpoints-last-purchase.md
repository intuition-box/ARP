# Task 120 — An endpoint's last purchase, checked by nohumans.directory, beside ARP's lines

**Status:** in progress.
**ADR:** `0187` (read on demand, the card's states, the `RepoPage` dispatch).
**Rules:** `code.md`, `ui.md`, `claims.md`, `workflow.md`, `portability.md`.
**Required skills:** `arp-contributing`.

## Why

The orchestrator's brief (arp-24), 2026-11-11: show an external, open-data verdict on an x402 tool's
last purchase next to ARP's own lines. nohumans.directory buys listed x402 endpoints with real USDC on
Base and publishes the outcome under CC BY 4.0. It is the "after paying" side ARP's lines also speak
to (`FUTURE.md`, x402 section), from a party that paid.

## What was read before designing, 2026-11-11

All with `curl`, the endpoint's public URL the only thing sent.

| what | command | result |
| --- | --- | --- |
| terms and licence | `curl -s https://nohumans.directory/llms.txt` | "## Licence": directory data CC BY 4.0, attribute "nohumans.directory" with a link to `https://api.nohumans.directory`; "if you republish one, say when it was observed". `/v1/resolve` and `/v1/listings/:id` free; seven routes paid in x402 (`/verdict`, `/purchases`, …) |
| a purchase that failed | `curl -s 'https://api.nohumans.directory/v1/resolve?url=https%3A%2F%2Fapi.tickersfeed.net%2Fecon%2Fsnapshot'` | `200`, `{match: "active", detail: {…}}`; `detail.paid_verification_latest` = `{at: 1793351081, at_iso: "2026-10-30T09:04:41Z", delivered: false, failure_reason: "stale_data", tx_hash: "0x7d12…1997", amount_usdc: 0.005, note, age_days}` |
| a purchase that delivered | `curl -s https://api.nohumans.directory/v1/listings/1359c41a-9f7` | the same record shape; `paid_verification_latest.delivered: true`, `failure_reason: null` |
| listed, never bought | `curl -s https://api.nohumans.directory/v1/listings/35716578-d19` | `paid_verification_latest: null`, `paid_verification: {verified: false}` |
| never listed | `curl -s 'https://api.nohumans.directory/v1/resolve?url=https%3A%2F%2Fexample.com%2Fnot-a-thing'` | `404`, `{match: "unknown", note: "… Absence is not a verdict …"}` |
| CORS | `curl -sD - -o /dev/null -H 'Origin: https://example.org' '…/v1/resolve?url=…'` | no `access-control-allow-origin`: a browser cannot read it |
| testnet endpoint atoms | `resolve` for the nine MCP endpoint atoms on 13579 (`mcp.neon.tech/mcp`, `mcp.paypal.com/mcp`, `mcp.zapier.com/api/v1/connect`, `api.mobbin.com/mcp`, `mcp.figma.com/mcp`, `mcp.supabase.com/mcp`, `mcp.atlassian.com/v2/mcp`, `mcp.prisma.io/mcp`, `docs.mcp.cloudflare.com/mcp`) | `unknown` for all nine |

## Deliverables

1. `apps/api/src/purchases.ts`: `readLastPurchase` (the free `GET /v1/resolve?url=`, a 404 `unknown`
   read as an answer), `lastPurchase` (KV under a SHA-256 of the URL, so any accepted URL fits KV's
   512-byte key; six hours fresh, a week to expiry; a failed refresh serves the older answer with its
   date), `lastPurchaseAnswer` (the source, the licence, network
   `eip155:8453`, the listing's URL, `fetchedAt`). Route `GET /x402/last-purchase?url=` in
   `worker.ts`: 400 for a URL that is not absolute http(s), 502 for a failed read with nothing cached.
   Tests in `apps/api/test/purchases.test.ts`, against bodies recorded on 2026-11-11.
2. `apps/web/src/services/last-purchase.ts` (parse, fetch, `endpointOfLabel`, `lastPurchaseView`),
   `hooks/use-last-purchase.ts` (off when `VITE_ARP_API_URL` is unset),
   `components/atom/LastPurchase.tsx`: in the facts column of `/atom/:id`, above the GitHub figures
   (which arrive late and would push it, the `ui-reviewer`'s note), a card of three lines in every
   state: the verdict and failure code, the day and the Basescan link,
   the credit (`nohumans.directory ↗ · CC BY 4.0 ↗`); a Hint holds the caveat. Absent with no Worker
   or for an atom that is not an endpoint.
3. `/atom/:id` sends a label to `RepoPage` or `SkillPage` only on `github.com` (ADR `0187` point 4),
   with a test that fails without it.
4. Docs: `apps/web/public/docs/architecture.md` (the storage table's row, the facts cache's two rows),
   `web-app.md` (the endpoint row of `/atom/:atomId`), `apps/api/README.md`, `FUTURE.md` (a paragraph
   in the x402 section, apart from task 118's).

## Do not do in this task

- Call a paid route, or pay anything.
- Count the reading anywhere: not in `arp_pulse`'s score, not in a line count, not in an order.
- Write it on chain, or call it a line.
- Name the directory in marketing copy; the card and the docs name it as the cited source.

## Checks

| gate | scope | result |
| --- | --- | --- |
| `bun run --cwd apps/api test` | `apps/api/test` | 29 pass |
| `bun run --cwd apps/api lint` | `apps/api` `src` and `test` (`tsc --noEmit`) | clean |
| `cd apps/web && bunx tsc -b` | `apps/web/src` | clean |
| `cd apps/web && bun run lint` | `apps/web` | clean |
| `cd apps/web && bun run test` | `apps/web/src` | 107 files, 897 pass, 2 skipped |
| `cd apps/web && bun run check:tokens` | `apps/web/src` | every `var()` resolves |
| `bun run check` | `scripts/` typecheck, tokens, contrast | clean |
| live, local | `wrangler dev` in `apps/api`, `curl 'http://127.0.0.1:8787/x402/last-purchase?url=https%3A%2F%2Fapi.tickersfeed.net%2Fecon%2Fsnapshot'` | `match: active`, `delivered: false`, `reason: stale_data`, the transaction, `fetchedAt` |
