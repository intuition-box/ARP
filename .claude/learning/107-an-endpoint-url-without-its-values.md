# 107 — An x402 endpoint's URL is written without its values

**Task:** `docs/tasks/119-an-endpoint-url-without-its-values.md`
**Completed:** 2026-11-11
**Commit:** `d56fdc6c` (closing commit by the caller)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/endpoint-redaction.ts` — `redactEndpointUrl`, `isRedactedEndpointUrl`, `looksPersonal`, `REDACTED_SEGMENT`, `EndpointNotRedactableError`; closed rules, idempotent, exported from the core index.
- `packages/protocol/src/x402-payment.ts` — `paymentLevelLabel` throws on an unreduced URL.
- `apps/mcp/src/desktop/loop.ts` `writeLine`, `apps/mcp/src/line.ts` `lineFromArgs` — a paid line's URL reduced before `/list-tool` and the signed request; a skill URL without a payment untouched. `apps/cli/src/cli.ts` usage says so.
- `apps/sponsor/src/routes/line.ts` — 422 `endpoint-private` on an unreduced endpoint (before the paying chain is read) and on a tool atom carrying a value.
- `packages/protocol/src/x402-feed.ts` — reduce on read, skip on mismatch or credentials, schema `arp.x402-outcomes/3`; both snapshots regenerated.
- `scripts/measure/endpoint-values-on-chain.ts` → `data/measurements/endpoint-values-on-chain-2026-11-11.json`: 0 values on 13579 (latent).
- `apps/web/public/docs/what-arp-publishes.md` (new, in the manifest), `x402-feed.md`, `install.md` (dedicated wallet).
- Tests: `endpoint-redaction.test.ts`, `x402-feed.test.ts`, sponsor `service.test.ts`, mcp `write-line.test.ts` (no email, address or search word in any outgoing body).

## Surprises

- `normaliseToolUrl` percent-encodes a redacted parameter name: `?:id=` becomes `?%3Aid=`, which `isRedactedEndpointUrl` still accepts. Harmless, but the canonical form of a redacted name is the encoded one.
- The defect was latent: nothing on testnet carried a value, so the line request could keep version 4 without breaking a writer.

## Decisions made

- **Closed rules, no hashing; reduce at the payer, the sponsor refuses rather than reduces; v4 kept; feed schema 3.** ADR: `.claude/choices/0186-an-endpoint-url-is-written-without-its-values.md` (amends `0162`).

## Rules touched

- `.claude/rules/security.md` — signing-site entry and the sponsoring row updated for ADR `0186`; sufficient.
- `.claude/rules/claims.md` — sufficient; measurement committed with its script, defect called latent. Two comments still say "the exact URL paid" without the qualifier (`packages/protocol/src/declare/usage-context.ts:85`, `packages/graphql/src/queries/x402-feed.ts:7`); true but unqualified, fix when next touched.
- `.claude/rules/code.md` — sufficient; every `as` in the new code carries a comment.

## Suggestions for future tasks

- Finding (c): `/list-tool` still writes a pasted URL with its values for tools listed outside an x402 line. Next task in this area: apply `redactEndpointUrl` (or refuse) there, without touching skill atoms' `?skill=`.
- Finding (b)(2): `setAgentWallet`'s signature has no nonce; replayable until its deadline after an agent changes hands. Latent on 13579; worth an ADR before mainnet.
- Finding (a): `verifyLineRequest` allows `no-delivery` without a payment; decide whether to forbid it.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Hire, observed: an x402 line is a paid call checked against a settlement transaction the payer did not write by hand; this does not move ARP up the ladder, it narrows what each observed record makes public so the tier can be filled without publishing what was asked.
