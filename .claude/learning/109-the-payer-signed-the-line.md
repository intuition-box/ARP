# 109 — A reader can check that an x402 line was signed by the wallet that paid

**Task:** `docs/tasks/121-the-payer-signed-the-line.md`
**Completed:** 2026-11-11
**Commit:** `b5150f91` (the work), `21c7fe2c` (the round-1 fix), and the close commit after them, on the worktree branch
**Verifier verdict:** PASS (second round)

## What shipped

- `apps/sponsor/src/line-requests.ts` — `LineRequestStore`, `line-requests.jsonl` under `ARP_HOME`, the one copy of each x402 line's signed request, kept before the first send
- `apps/sponsor/src/routes/line.ts`, `service.ts`, `main.ts` — `GET /line-request?payment=<label>` (200, 400, 404, 503), store wired at start
- `packages/protocol/src/x402-feed.ts` — `signed_request`, `signed_by_payer`, `signed_requests_from`, `signedByPayer`; schema stays `arp.x402-outcomes/3`
- `packages/protocol/src/sponsor/line.ts` — `lineRequestTypedDataJson`, the viem-ready JSON form
- `scripts/build/build-x402-feed.ts` — reads `ARP_SPONSOR`; both snapshots rebuilt (2 test records, both `null`/`false`, predating the store)
- Docs: `x402-feed.md` "Who signed the line", `what-arp-publishes.md`, `developers.md`, `DEPLOY.md`, sponsor README, Dockerfile, `.env.example`, `security.md` signing-site entry

## Surprises

- Round one failed on a reachable claim: a request is kept before the send, so after a send that reverts and frees the payment key, the line for that payment can be written another way with other words, while the kept request still recovers to the payer. Binding only `payment` and `outcome` gave `signed_by_payer: true` over a record whose reason, domain or endpoint the payer never signed, and the doc said such a line's `signed_request` was `null`. Fixed by binding all four words (`""` for `null`).
- "Written up to <date>" was the wrong boundary for "no kept request": the hosted service lacks the store until it is redeployed.

## Decisions made

- **The sponsor's file, not IPFS or a level atom** — a level carrying the CID is a term the agent did not sign but would hold a position on. ADR: `.claude/choices/0188-the-signed-line-request-is-kept-by-the-sponsor-and-published-in-the-x402-feed.md`.
- **No version 5, no EIP-191 form** — installed CLIs keep working; an EIP-191 form is worth building only if the reader cannot take EIP-712 (ADR `0188`).
- **`signed_by_payer` binds every word the record repeats from the request** — payment, outcome, reason, domain, endpoint.

## Rules touched

- `.claude/rules/security.md` — signing-site entry amended for the kept and republished request; sufficient.
- `.claude/rules/claims.md` — sufficient; check 1 (reachability) caught the defect.

## Suggestions for future tasks

- When a stored artefact is written before the action it backs, ask what it means once the action reverts, and bind every field a reader will compare, not only the ones the brief names.
- State a "before X" boundary as the deploy or the code change, never the calendar date of the commit.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire column (x402 paid calls), observed tier: the record already proved the payment on its own chain and now carries the payer's own EIP-712 signature over the line's words, so an outside reader can check without ARP that the payer stands behind the report, a precondition for counting it toward corroborated, which this does not reach by itself.
