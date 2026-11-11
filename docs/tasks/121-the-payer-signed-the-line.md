# Task 121 — A reader can check that an x402 line was signed by the wallet that paid

**Status:** in progress.
**ADR:** `0188`.
**Rules:** `code.md`, `security.md` (a signing site's entry updated), `claims.md`, `workflow.md`,
`portability.md`, `docs/02`'s storage principle. Gates: `packages/protocol` test and lint, `apps/sponsor`
test (and its `lint`), `apps/mcp` test and lint, `apps/cli` test, `check:node`, `packages --check`, root
`bun run check` and `bun run test:scripts`, `apps/web` `tsc -b`, lint, test, `check:tokens`.
**Required skills:** `arp-contributing`.

## Why

A directory of x402 purchase outcomes counts a report only when the paying wallet signed it, and counts
each payer once per service. It said it could read ARP's lines as reports if they carried that signature.
An x402 line written through ARP's sponsoring service already rests on an EIP-712 `LineRequest` the agent
signed (`packages/protocol/src/sponsor/line.ts`, version 4); the signature was stored nowhere.

## Do not do in this task

- Bump the line request's version: version 5 breaks every installed CLI (task 119), and task 122 would
  share any bump. Not needed here.
- Add a second signing scheme (EIP-191). The ADR says whether it is worth it later.
- Name the directory in the repo, or cite private mail.

## Questions answered first, in the code

- **Is the signature stored anywhere?** No. The ledger (`apps/sponsor/src/ledger.ts`) keeps kind,
  status, subject, value, time, key, term, curve, shares and a send's hash; the line's atoms carry what
  was signed, not the signature; nothing is pinned for a line (`apps/sponsor/src/pin.ts` serves
  `/identity`, `/list-tool`, `/publish`).
- **Where can it live?** The sponsor's own file, served read-only, and carried by the feed. Why not IPFS
  with a CID in a level: ADR `0188`, "Why the sponsor's store".

## Deliverables

1. `apps/sponsor/src/line-requests.ts`, `LineRequestStore`: `line-requests.jsonl` under `ARP_HOME`
   (`SPONSOR_LINE_REQUESTS`), one row per x402 line request, kept before the first send
   (`apps/sponsor/src/routes/line.ts`), loaded at start (`apps/sponsor/src/main.ts`).
2. `GET /line-request?payment=<label>` (`apps/sponsor/src/routes/line.ts` `lineRequest`,
   `apps/sponsor/src/service.ts`): the request as posted, `404`, `400`, or `503`.
3. `packages/protocol`: `lineRequestTypedDataJson` (`sponsor/line.ts`); in `x402-feed.ts`,
   `signedRequests` in the config, `signed_request` and `signed_by_payer` on each record,
   `signed_requests_from` at the top, `signedByPayer` exported. Schema stays `arp.x402-outcomes/3`.
4. `scripts/build/build-x402-feed.ts` reads `ARP_SPONSOR`'s `GET /line-request` when set; both snapshots
   rebuilt.
5. Docs: `apps/web/public/docs/x402-feed.md` ("Who signed the line": the three conditions, viem, EIP-712
   not EIP-191, the `agentWallet` case, the `payers` count), `what-arp-publishes.md` (what the service
   keeps and publishes), `developers.md`, `apps/web/DEPLOY.md`, `apps/sponsor/README.md`,
   `apps/sponsor/Dockerfile`, `.env.example`, `.claude/rules/security.md`.
6. Tests: `packages/protocol/test/x402-feed.test.ts` ("the request the payer signed": true when the payer
   signed, false for an `agentWallet` payment signed by the holder, false for another outcome, payment or
   signer, `null` for a stored request that does not verify, no snapshot when the store is down);
   `apps/sponsor/test/service.test.ts` (the route answers the posted request and it verifies; 404, 400,
   503; nothing kept for a refused request or a line without payment; the file read back after a restart).

## The rebuilt test feed

`bun run scripts/build/build-x402-feed.ts --test`, 2026-11-11, with `ARP_SPONSOR` unset: `2 records (0
signed by the payer), 0 skipped`. Both lines were written before the service kept requests, so each
carries `signed_request: null`, `signed_by_payer: false`, and `signed_requests_from` is `null`. A `true`
needs a line written through a sponsoring service running this code; none was written in this task (it
would spend test USDC on Base Sepolia and the sponsor's tTRUST, which nobody asked for).
