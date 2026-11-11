# 0162 — The x402 feed names the endpoint exactly as it was paid, and the tool atom stays canonical

**Status:** Accepted
**Date:** 2026-11-10
**Amends:** ADR `0159` (decision 1, the payment level's object; decision 4, the line request's version; decision 6, the feed's record), `.claude/rules/security.md` (the line request's signing-site entry and the sponsoring table's line row)
**Amended:** 2026-11-11 by ADR `0186` (task 119): decision 1's "the URL is kept as typed" now reads "as paid, with values removed" (`redactEndpointUrl`), decision 6's schema is `arp.x402-outcomes/3`, and decision 4's version stays 4. The text below is the decision as it stood.
**Amended:** 2026-11-10 by task 107: decision 2's mainnet read is done. `atomDataMaxLength` is 1,000 on
testnet 13579 (block 9,378,420) and on mainnet 1155 (block 10,795,862), read by
`scripts/measure/atom-data-max-length.ts` into `data/measurements/atom-data-max-length-2026-11-10.json`.
The 512-character bound holds on both. The text below is the decision as it stood.
**Triggered by:** the user, 2026-11-10, after task 91's end-to-end run published `"endpoint": "https://127.0.0.1:4021/x402-demo/no-delivery"` for a seller called at `http://127.0.0.1:4021/x402-demo/no-delivery`

## Context

A tool's atom derives from `normaliseToolUrl` (`packages/protocol/src/declare/tool-thing.ts:75`): https
forced, `www.`, a trailing `/` and `.git` stripped, the query sorted, so that one tool is one atom. The
x402 feed of ADR `0159` emitted that canonical URL as `endpoint`. x402 Doctor, which reads the feed
(`FUTURE.md`, x402 section, 2026-11-09), matches a record to an endpoint by the URL called, so `http`,
`www.`, a trailing slash or the query order made a record attach to nothing.

The user's decision, 2026-11-10: keep the atom canonical; the x402 line also carries the exact URL the
payer called, inside what the agent signs; the sponsor writes it on chain beside the payment; the feed
emits it as `endpoint` with the canonical form beside it. The shape on chain is the cheapest one.

## Decision

1. **The exact URL rides in the payment level's object atom**, after the payment and one space:
   `T5 = (T3, paid with, "eip155:<chain>/tx/<hash> <exact URL>")` (`paymentLevelLabel`,
   `packages/protocol/src/x402-payment.ts`). The payment part stays lower case; the URL is kept as typed.
   This adds **no atom, no triple and no deposit** to a line: the payment atom was already one per payment.
2. **What an exact URL is** (`isExactEndpointUrl`): `http` or `https` with a host, printable ASCII
   without a space, at most 512 characters. `atomDataMaxLength` is 1,000 on 13579 (read from
   `getGeneralConfig()` 2026-11-10); mainnet's is read before any port.
3. **The exact URL must reduce to the tool's URL**: `normaliseToolUrl(exact) === normaliseToolUrl(tool's
   thing.url)` (`exactEndpointNamesTool`), or a writer could name any URL beside somebody else's endpoint.
   The sponsor reads the tool's URL from the index and refuses a mismatch with 422 `rule: 'endpoint'`
   before it spends; the feed skips one as "the exact URL does not normalise to the tool's URL". Both
   sides are normalised so a Thing listed outside `normaliseToolUrl` still matches its own spellings
   (`intuition-integrator`, finding 2).
4. **The line request is version 3** and signs `endpoint` (`packages/protocol/src/sponsor/line.ts`). A
   payment requires it; without a payment it must be `""`. **A version 2 request no longer verifies**,
   the convention v1→v2 set in ADR `0159` decision 4: the CLI, the MCP path and the sponsor ship together,
   and every v2 signer in this repo (`apps/mcp/src/desktop/loop.ts`) changes in the same commit. An
   installed CLI that predates this change gets a 401 from an updated sponsor until it is updated. A v2 signature fails v3's typed data, and a
   v2 body without `endpoint` is refused as malformed (`test/sponsor-line.test.ts`).
5. **The sponsor's ledger key stays the bare payment** (`line-payment:eip155:<chain>/tx/<hash>`), so one
   payment backs one sponsored line whatever URL spelling a second request names.
6. **The feed's record** (schema `arp.x402-outcomes/2`): `endpoint` is the exact URL, `endpoint_canonical`
   the tool atom's URL. A line written before task 93 has no exact URL: `endpoint` is `null`, never a guess
   from the canonical form. `by_endpoint` is keyed by `endpoint_canonical`, so every spelling and the
   older lines count under one key. The schema moved to 2 because `endpoint` became nullable and changed
   meaning.
7. **The feed reads the atom's `data`, not its `label`**: the testnet index cuts a text atom's label at
   256 characters and keeps `data` whole (measured 2026-11-10, `intuition-integrator`, finding 1). A
   prefix of up to 88 characters leaves a label room for only about 168 characters of URL.
8. **Who passes the exact URL:** `arp line --payment-tx` signs `--tool` as the exact URL, scheme required
   (`apps/mcp/src/line.ts`, `apps/mcp/src/desktop/loop.ts`). No other path builds an x402 line: the hook
   records a `payment` outcome locally and `arp share` sends lines without a payment.
   `scripts/demo/x402-e2e.ts` step 6 asserts `endpoint` equals the URL called.

## Alternatives considered

- **A sixth level, `(T5, at, "<exact URL>")`** — one more atom (`getAtomCost()` + `minDeposit`), one more
  triple (`getTripleCost()` + `minDeposit`) and one more sponsored deposit per line. On 13579, read
  2026-11-10: 1000000001000000 + 1e15 + 1000000002000000 + 1e15 = 4000000003000000 wei, about 0.004 tTRUST,
  plus `SPONSOR_DEPOSIT_WEI`; a hundred times that on 1155 (`portability.md` §3). It buys nothing a reader
  needs, since the URL belongs to one payment.
- **The exact URL as the tool atom** — one tool would become several atoms, the fragmentation
  `tool-thing.ts` exists to stop. The user ruled it out.
- **The exact URL only in the signed request, not on chain** — the feed is rebuilt from the graph, so it
  would lose the URL; and a record would then rest on ARP's word.
- **Keep v2 verifying beside v3** — the convention of ADR `0159` is the other way, and a v2 request would
  write a line with no exact URL for no reason.

## Consequences

**Positive:**

- Doctor can match a record on the URL its user called. The atom, the ranking and `by_endpoint` keep one
  key per tool.
- No fee more per line.

**Negative:**

- Two spellings of one payment are two atoms. The sponsor writes one; a direct writer could write both,
  and the feed then drops both, only the writer's own records.
- The payment atom no longer says only the payment, so a reader of the graph splits at the first space.
- A schema change for a reader of version 1. Nobody reads the feed yet: it held no record on Base.

**Neutral (worth knowing):**

- Task 91's line (`line_id` `0xefdb8232…ca01`, Base Sepolia) has no exact URL. Built with Base Sepolia
  enabled on 2026-11-10 it gives `endpoint: null`, `endpoint_canonical: "https://127.0.0.1:4021/x402-demo/no-delivery"`.
- The payment level is still a plain string, not a pinned document: ADR `0159`'s choice, unchanged.

## References

- Task: `docs/tasks/93-x402-feed-exact-endpoint.md`
- Code: `packages/protocol/src/x402-payment.ts`, `packages/protocol/src/x402-feed.ts`, `packages/protocol/src/sponsor/line.ts`, `packages/graphql/src/queries/x402-feed.ts`, `apps/sponsor/src/routes/line.ts`, `apps/mcp/src/line.ts`, `scripts/demo/x402-e2e.ts`
- Doc: `apps/web/public/docs/x402-feed.md`
- Related ADR: `0144`, `0159`, `0160`
- Rule: `.claude/rules/security.md`
