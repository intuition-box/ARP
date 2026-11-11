# 0188 — An x402 line's signed request is kept by the sponsoring service and published in the x402 feed

**Status:** Accepted
**Date:** 2026-11-11
**Amends:** `.claude/rules/security.md` (the line request's entry in the signing-site list: the request is now kept and republished); ADR `0159` (the feed's record gains `signed_request` and `signed_by_payer`, schema unchanged)
**Triggered by:** a reader of x402 purchase outcomes, relayed by the orchestrator on 2026-11-11: it counts a report only when the paying wallet signed it, and could count ARP's lines if they carried that signature

## Context

An x402 line written through ARP's sponsoring service rests on an EIP-712 `LineRequest`, version 4
(`packages/protocol/src/sponsor/line.ts`), that the agent signs. It names the payment, the exact URL paid
with its values removed, the outcome and the reason. `apps/sponsor/src/routes/line.ts` verifies it and
writes the line on Intuition testnet 13579.

**Before this ADR the signature was stored nowhere.** Read in the code on 2026-11-11:

- the sponsor ledger (`apps/sponsor/src/ledger.ts`) keeps `kind`, `status`, `subject`, `value`, `at`, `key`
  (`line-payment:<label>` for an x402 line), `termId`, `curveId`, `shares` and a send's hash; no request,
  no signature;
- the line's atoms carry what the agent signed (the payment level's object is the payment and the URL,
  `paymentLevelLabel`), never the signature;
- nothing is pinned to IPFS for a line; `pin.ts` serves `/identity`, `/list-tool` and `/publish` only.

So a reader could check the payment (`checkX402Payment`, payer from the token's `Transfer` log) and the
line's standing, but not that the payer signed the words.

## Decision

1. **The sponsoring service keeps the request**, the body the agent posted, after `verifyLineRequest`
   accepted it, in `line-requests.jsonl` under `ARP_HOME` (`SPONSOR_LINE_REQUESTS`; `/data` when hosted),
   keyed by the payment label. Appended **before the first send**, as the ledger reserves a spend, so a
   line that lands always has its request. Only lines with a payment: a skill's line backs no x402 record.
   The latest request per payment is the one answered; one payment backs one sponsored line (ADR `0159`),
   so a second one exists only after a revert that landed nothing.
2. **`GET /line-request?payment=<label>`** answers it read-only, as posted, or `404`; `400` for a label that
   is not one, `503` when the store is not configured. Spends nothing.
3. **The feed carries it.** `buildX402Feed` takes `signedRequests` (`scripts/build/build-x402-feed.ts`
   wires it to `ARP_SPONSOR`), and each record of the main and the `--test` feed gains `signed_request`
   (`{typed_data, signature}`, typed data in viem's JSON form, `lineRequestTypedDataJson`) and
   `signed_by_payer`. The top level gains `signed_requests_from`. A request that does not verify is
   published as `null`. A store that does not answer stops the build, as a paying chain does.
4. **`signed_by_payer` is recomputable from the record alone** (`signedByPayer`): the signature recovers
   over `typed_data` to `payer`, the signed `payment` is `<network>/tx/<settlement_tx>`, and the signed
   `outcome`, `reason`, `domain` and `endpoint` are the record's (`""` for `null`). The last binding is
   needed because a request is kept before the send: a kept one can belong to a send that reverted, after
   which the same payment's line was written another way, with other words. A payment made by the `agentWallet` while the line is signed by the address
   that holds the agent gives `false`: the payer signed nothing, and that is the answer.
5. **Schema stays `arp.x402-outcomes/3`.** Three fields are added and none changes meaning; ADR `0186`
   bumped the schema for a change of meaning, which this is not.
6. **No new line-request version, no second signing scheme.** The typed data is unchanged; the signer
   side (`apps/mcp/src/desktop/loop.ts`, `arp line`) is untouched, so installed CLIs keep working.

## Why the sponsor's store, and not IPFS or a level on chain

The three options the orchestrator listed:

- **Pin the signed request to IPFS and name its CID in a level atom.** A new level `(payment level,
  signed as, ipfs://…)` is a triple the agent did not sign, and the service deposits in the agent's name
  on every level (`/line`, `missing`), so the agent's position would stand behind a term it never signed.
  That breaks "the sponsor writes only what the agent signed". Putting the CID in the payment atom
  instead changes the label the agent did sign and every parser of it (`parsePaymentLevelLabel` in the
  feed, the pulse, the sponsor), and costs an atom per line.
- **Keep it at the sponsor and expose it read-only (chosen).** One canonical copy, the service's file
  (`docs/02`: one canonical source per datum); the feed is a dated, derived copy like each of its other
  fields. Nothing new on chain, no new cost, no version change.
- **Have the feed carry it from a store.** That is the chosen option's second half: the store is the
  sponsor's file, and the feed reads it through the route.

**ARP is not trusted for what the request says.** The signature is self-verifying: a reader recovers the
signer and needs no word of ARP's. What ARP can do is **withhold** a request, never forge one, and it could
already withhold the record itself, since it publishes the feed. The cost is availability: the copy lives
on the service's volume, and lost with it, a record's `signed_by_payer` becomes `false` for good. Pinning
the same document to IPFS without a level atom would not let a reader find it from the chain, so it would
add a second copy without adding a route.

## EIP-712, and EIP-191 later

The reader that asked verifies EIP-191 (`personal_sign`). An EIP-712 signature is not an EIP-191 one, and
no EIP-191 signature exists to publish. The doc (`apps/web/public/docs/x402-feed.md`, "Who signed the
line") says how to verify with viem's `verifyTypedData`, and what an `eth_signTypedData_v4` tool adds
(`EIP712Domain` from the three domain fields).

**Is an EIP-191 form worth adding later?** Only if that reader cannot take EIP-712, which is a question to
ask it before building anything. Adding one means the agent signs a second message, EIP-191, over a
canonical string of the same fields: either a new field in the request (version 5, which breaks every
installed CLI, as task 119 noted) or a second signature beside the request, which the sponsor would keep
the same way. Not done here, by instruction.

## What a count means

`by_endpoint.payers` is the size of a set of paying addresses per `endpoint_canonical`
(`buildX402Feed`, `payersOf`). A writer who pays one endpoint from two addresses counts twice, and nothing
in the feed tells that from two writers. Said in `x402-feed.md`.

## Consequences

- Every x402 line written before the sponsoring service runs this code has no kept request, hosted
  lines included until it is redeployed: the two records of the rebuilt test feed
  carry `signed_request: null`, `signed_by_payer: false`, and the main feed has no record. A `true`
  appears only for a line written by a sponsoring service running this code.
- The hosted service's `/data` now holds a third file whose loss is unrecoverable, beside the ledger.
- The published request adds a nonce, an expiry and the signature to what the line already says on chain
  (`apps/web/public/docs/what-arp-publishes.md`).
- A line written by its own wallet, not through the sponsor, has no request; its 13579 transactions are
  signed by the writer, which the feed does not carry.
