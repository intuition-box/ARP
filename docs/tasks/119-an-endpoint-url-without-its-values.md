# Task 119 — An x402 endpoint's URL is written without its values

**Status:** implemented 2026-11-11, awaiting `task-verifier`.
**ADR:** `0186` (amends `0162`).
**Rules:** `code.md`, `security.md` (a signing site changed: its entry and the sponsoring row updated),
`claims.md`, `workflow.md`, `portability.md`. Gates: `packages/protocol` test and lint, `apps/sponsor`
test, `apps/mcp` test and lint, `apps/cli` test, `check:node`, `packages --check`, root `bun run check` and
`bun run test:scripts`, `apps/web` `tsc -b`, lint, test, `check:tokens`.
**Required skills:** `arp-contributing`.

## Why

A reader of the x402 feed pointed out that query values end up in a public, permanent record. It is worse
than the feed: an x402 line writes the endpoint's URL on chain in two atoms, the tool atom T1
(`normaliseToolUrl` kept the sorted query with its values) and the payment level T5 (ADR `0162`: "exactly
as paid"). So the URL is reduced at the payer, before anything is signed.

## Do not do in this task

- Change `normaliseToolUrl`: every skill atom (`…?skill=<name>`) would change id.
- Change `/list-tool` for URLs listed outside an x402 line (finding (c) below).
- Touch task 118's test-feed wiring beyond what the redaction needs: the reduction lives in
  `buildX402Feed`, which both feeds call.

## Deliverables

1. `redactEndpointUrl`, `isRedactedEndpointUrl`, `looksPersonal`, `REDACTED_SEGMENT`,
   `EndpointNotRedactableError` in `packages/protocol/src/endpoint-redaction.ts`, exported from the core
   index. Rules in ADR `0186` decision 1.
2. The payer: `apps/mcp/src/desktop/loop.ts` `writeLine` and `apps/mcp/src/line.ts` `lineFromArgs` reduce
   a paid line's URL before `/list-tool` and the line request; `arp line`'s usage says so
   (`apps/cli/src/cli.ts`).
3. `paymentLevelLabel` throws on an unreduced URL.
4. The sponsor's `/line` refuses an unreduced endpoint or tool URL with 422 `endpoint-private`, before it
   reads the paying chain (`apps/sponsor/src/routes/line.ts`).
5. The feed reduces on read, schema `arp.x402-outcomes/3`; both snapshots regenerated
   (`apps/web/public/feeds/x402-outcomes.json`, `x402-outcomes-test.json`).
6. The measurement: `scripts/measure/endpoint-values-on-chain.ts`, output
   `data/measurements/endpoint-values-on-chain-2026-11-11.json`.
7. Docs: `apps/web/public/docs/what-arp-publishes.md` (new, in the manifest under "How it works"),
   `x402-feed.md`, `install.md` (dedicated wallet). Old wording swept: `security.md`, `docs/28`, `docs/33`,
   `FUTURE.md`, `sponsor/line.ts`, the core index, ADR `0162`'s header.
8. Tests: `packages/protocol/test/endpoint-redaction.test.ts`, `x402-feed.test.ts` (never republishes a
   value; two URLs differing only in values give one `endpoint_canonical`; credentials skipped),
   `apps/sponsor/test/service.test.ts` (refuses an unreduced endpoint, and a tool atom with values),
   `apps/mcp/test/write-line.test.ts` (the listed and signed URL hold none of an email, an address or a
   search word given in query and path).

## The measurement

Testnet 13579, read 2026-11-11T09:13Z, `bun run scripts/measure/endpoint-values-on-chain.ts --json …`:

| population | http(s) URLs | would change |
| --- | --- | --- |
| payment levels (`paid with`): 2 triples, 1 names a URL | 1 | 0 |
| the tool atom under those lines | 1 | 0 |
| non-GitHub Things a `uses` triple points at (182 `uses` triples with a Thing object) | 38 (3 not http) | 0 |
| non-GitHub Things ARP's deployer or sponsor created (105 Things) | 38 (1 not http) | 0 |

The defect was latent: nothing on testnet carries a value today.

## Review findings for the orchestrator (no code changed for these)

**(a) Refused before payment vs paid with nothing back.**

- In lines: separated by construction. `no-delivery` is the only reason for "paid, nothing received", and
  ARP's sponsor writes a line about an endpoint only with a payment that checks (`apps/sponsor/src/routes/line.ts`,
  `about === 'other' && payment === null` → 422). A call refused before payment has no transaction, so it
  cannot become a sponsored line, and no closed reason names it.
- Two gaps. `verifyLineRequest` does not forbid `no-delivery` without a payment, so a line about a
  **skill** can say `no-delivery`; and a direct writer (not through the sponsor) can write it about an
  endpoint with no payment. The feed drops both (no payment level); whether the pulse weighs them differently was not checked.
- In the hook: `apps/hook/src/classify.ts` has one local outcome, `payment`, for "a 402 or a refused
  payment", i.e. refused before payment. It also matches the normal first `402` of every x402 handshake,
  so a tool that surfaces that 402 in its result could have a call that then paid and worked recorded `payment` (not tested). "Paid,
  nothing received" has no local class: it reads as `ok` with few bytes, or `tool_error`. None of this
  leaves the machine (`arp share` sends skill lines only).
- Docs: `x402-feed.md` now says it ("Failed before paying, and paid with nothing back"). Before this task
  no page said a refused-before-payment call is not a line.

**(b) Can a third party claim someone else's payment?**

- No, as far as the code shows. The feed (`packages/protocol/src/x402-feed.ts`) accepts a transfer from a
  wallet that stands behind **every** level, or from the `agentWallet` of an agent that wallet holds. To
  stand behind a level in V's name, a stranger needs a deposit with V as receiver, which the MultiVault
  refuses without V's approval (`MultiVault_SenderNotApproved`, measured in
  `packages/protocol/src/sponsor/approval.ts`). An `agentWallet` is set only with that wallet's EIP-712
  signature (`contracts/src/erc8004/IdentityRegistry.sol:190-217`). The sponsor checks the same two
  addresses, the holder read on chain.
- Two latent edges. (1) Whoever V approved for deposits (ARP's sponsor) could make V stand behind levels;
  the sponsor does so only for V's signed request. (2) `setAgentWallet`'s signature carries no nonce, only
  a deadline: after an agent changes hands, the new holder can replay the old wallet's signature until the
  deadline and claim that wallet's payments. Not reachable on testnet today (the feed reads ARP's own
  registry, where no agent has changed hands as far as this task checked: not measured).
- A payer is counted once per endpoint: `by_endpoint[...].payers` is a set of payer addresses per
  `endpoint_canonical`. `records`, `worked`, `failed` count every record, so one payer with ten records
  counts ten there. A writer paying once from its own address and once from its `agentWallet` counts as
  two payers.

**(c) Open, outside this task:** `/list-tool` writes the URL a person pastes on the web register page as
typed (normalised). An MCP URL with `?api_key=…` would go on chain with its key. The line path is safe
(the payer reduces, the sponsor checks the tool atom); the listing path for other tools is not.

## What was decided

ADR `0186`: closed rules, no hashing, reduce at the payer, the sponsor refuses rather than reduces, the
request stays version 4, the feed moves to schema 3.
