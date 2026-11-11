# Task 123 — A tool URL is never listed with a value in it

**Status:** verified 2026-11-11, `task-verifier` PASS (round 1), post-mortem `.claude/learning/111-a-tool-url-without-its-values.md`; on the worktree branch, for the orchestrator to push. After the verdict, its non-blocking finding 1 was fixed: `ToolUrlCarriesValuesError`'s message no longer holds the URL (tested).
**ADR:** `0190` (amends `.claude/rules/security.md`'s tool-listing row).
**Rules:** `code.md`, `ui.md` (one message on the Add it form), `security.md`, `claims.md`, `workflow.md`,
`portability.md`. Gates: `packages/protocol` test and lint, `apps/sponsor` test and lint, `apps/mcp` test
and lint, `apps/cli` test, `check:node`, `packages --check`, root `bun run check` and `bun run test:scripts`,
`apps/web` `tsc -b`, lint, test, `check:tokens`.
**Required skills:** `arp-contributing`.

## Why

Task 119's review, finding (c): `POST /list-tool` wrote the URL a person pasted on the web register page as
normalised, values kept. An MCP URL with `?api_key=…` would go on chain with its key, and Intuition has no
deletion. The same was true of the wallet path, of a declaration of a tool with no atom, and of every caller
of `planToolListing`.

## Do not do in this task

- Change `normaliseToolUrl` or `canonicalToolUrl`: every atom id would move.
- Touch `apps/sponsor/src/routes/line.ts` or `packages/protocol/src/sponsor/line.ts` (task 122 is there).
- Change the x402 line path: the payer already reduces (ADR `0186`).

## Every place a tool's atom is created, found by grep

`grep -rn "list-tool\|planToolListing\|signListToolRequest\|toolThing(\|toolAtomUri(" apps packages scripts`,
non-test hits, read one by one:

| path | listed from | now |
| --- | --- | --- |
| `apps/web/src/hooks/use-list-tool.ts` → `services/list-tool.ts` | the site's Add it form, to the sponsor | `listingRequest`: refused before signing or sending, `status: "private"` with `listable`; otherwise the canonical form is what is signed and sent |
| `apps/sponsor/src/routes/list-tool.ts` | `POST /list-tool` | 422 `endpoint-private` with `listable`, before `resolveTool`, `admitTool`, pinning or sending |
| `packages/protocol/src/sponsor/list-tool.ts` `planToolListing` | the sponsor, `scripts/seed/list-originals.ts` | throws `ToolUrlCarriesValuesError` after `canonicalToolUrl` |
| `apps/web/src/services/tool-register.ts` `planToolRegistration` | Add it with a wallet | `ToolRegisterGuardError("carries-values")` before any read |
| `packages/protocol/src/declare/plan.ts` `resolveToolAtom` | `arp_declare_used`, the site's declaration (`services/declare-use.ts`) | throws before the index lookup |
| `apps/mcp/src/desktop/loop.ts` `writeLine`, `apps/mcp/src/line.ts` | a line's tool, before `/list-tool` | unchanged: a paid line's URL is reduced (ADR `0186`); an unpaid line about a non-skill is refused by `/line`, and now by `/list-tool` too |
| `scripts/seed/*`, `scripts/measure/*`, `scripts/demo/*` | the catalogue, measurements | unchanged: personal tooling, writing GitHub and catalogue URLs (0 refused, below) |

The rule, the choice to refuse rather than strip, and the GitHub exception are ADR `0190`.

## Deliverables

1. `publishableToolUrl`, `assertPublishableToolUrl`, `ToolUrlCarriesValuesError`, `ToolUrlVerdict` in
   `packages/protocol/src/tool-url-values.ts`, exported from the core index.
2. The five checks in the table above.
3. `apps/web/src/services/list-tool.ts`: `listingRequest`, the `private` result and its message, and a
   message for the sponsor's `endpoint-private`. `StartPage` offers no wallet link after it (a wallet
   would be refused too).
4. Tests: `packages/protocol/test/tool-url-values.test.ts` (the rule; `planToolListing` throws before any
   read; `prepareDeclareUsed` throws before the lookup and still plans `?api_key=`);
   `apps/sponsor/test/service.test.ts` (refused signed and unsigned, nothing resolved, admitted, pinned or
   sent; `listable` holds no key; the listable form, a skill and a GitHub URL with a token still list);
   `apps/web/src/hooks/__tests__/use-list-tool.test.tsx` (no wallet opened, no fetch; a GitHub token never
   sent); `services/__tests__/list-tool.test.ts`, `tool-register.test.ts` (no read, no lookup),
   `pages/StartPage.test.tsx`; `apps/mcp/test/server.test.ts` (`arp_declare_used` refuses, the key not echoed).
5. The measurement: `scripts/measure/tool-url-values-on-chain.ts`,
   `data/measurements/tool-url-values-on-chain-2026-11-11.json`.
6. Docs: `apps/web/public/docs/what-arp-publishes.md` (the listing row, a section on a tool's URL, the
   measurement), `apps/sponsor/README.md` (the `endpoint-private` rule), `.claude/rules/security.md`.
7. `packaging/` regenerated (`bun run --cwd apps/cli packages`): the bundled CLI carries the protocol change.

## The measurement

Testnet 13579, read 2026-11-11T13:36:05Z,
`bun run scripts/measure/tool-url-values-on-chain.ts --json data/measurements/tool-url-values-on-chain-2026-11-11.json`:

| population | Things | http(s) URLs (GitHub) | would be refused |
| --- | --- | --- | --- |
| created by ARP's deployer or sponsor | 105 | 61 (23) | 0 |
| the object of a `uses` triple | 78 | 53 (14) | 0 |
| every Thing, any creator | 55,078 | 30,520 (904) | 16,093: a query value alone 14,252, a personal path segment alone 1,568, both 174, a fragment alone 83, other combinations 16; `en.wikipedia.org` 13,893, `x.com` 845, `www.imdb.com` 460 |

The defect was latent for ARP: no tool it listed or that a `uses` triple names carries a value. The last
row is other projects' atoms; nothing changes them, and a declaration of a use of one through ARP is now
refused (ADR `0190`, negative consequences).

## What was decided

ADR `0190`: one rule on the URL as written, refuse on every path with the accepted form named, the GitHub
`?skill=` exception, the check before any read.
