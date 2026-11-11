# 111 — A tool URL is never listed with a value in it

**Task:** `docs/tasks/123-a-tool-url-without-its-values.md`
**Completed:** 2026-11-11
**Commit:** `37383f46`, `f878ff38` (branch `worktree-agent-acfa6c163789fc406`, on `440cfd1f`)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/tool-url-values.ts` — `publishableToolUrl`, `assertPublishableToolUrl`, `ToolUrlCarriesValuesError`, `ToolUrlVerdict`; GitHub may carry `?skill=` only, any other host what `redactEndpointUrl` leaves unchanged. Exported from the core index.
- Five checks, each before any read: the web Add it form (`apps/web/src/services/list-tool.ts` `listingRequest`, which now sends the canonical form), the wallet path (`tool-register.ts`, `carries-values`), `POST /list-tool` (422 `endpoint-private` with `listable`), `planToolListing`, `prepareDeclareUsed`.
- Tests in protocol, sponsor, mcp and web (hook, services, StartPage), each asserting nothing was read, signed, pinned or sent.
- `scripts/measure/tool-url-values-on-chain.ts` and `data/measurements/tool-url-values-on-chain-2026-11-11.json`: 0 of 61 ARP-created http(s) URLs, 0 of 53 `uses` objects (latent); 16,093 of 30,520 across all 55,078 Things on 13579, mostly `en.wikipedia.org/?curid=`.
- Docs: `what-arp-publishes.md`, `apps/sponsor/README.md`, `security.md` tool-listing row; task 119 finding (c) closed; `packaging/` regenerated.

## Surprises

- `ToolUrlCarriesValuesError.message` starts with the raw URL, key included. The MCP server does not leak it because its error boundary runs `redactUrls` (`apps/mcp/src/server.ts:218`); the sponsor and the wallet path build their own messages without the URL. A future caller that logs or forwards the error's message would carry the key.
- The sponsor's `endpoint-private` refusal returns `listable`, but the web `refused` result drops it, so the message after a server-side refusal says "Remove it." without naming the accepted form. Unreachable in practice: the form refuses first.

## Decisions made

- **Refuse, never strip; one rule on the URL as written; GitHub `?skill=` exception; check before any read** — ADR: `.claude/choices/0190-a-tool-url-with-a-value-is-refused-wherever-it-is-listed.md`.

## Rules touched

- `.claude/rules/security.md` — tool-listing row amended (ADR `0190`); sufficient.

## Suggestions for future tasks

- An error that carries a secret-bearing input should not echo it in `message`; prefer the reduced form, so safety does not depend on every boundary redacting.
- ADR `0190` is not yet in `.claude/choices/INDEX.md`: run `scripts/build/build-claude-index.ts` at close.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

It serves the declared tier of the skill and agent columns (a listing and a declaration are what an operator or agent declares) and does not move ARP up the ladder: it keeps a declaration from publishing a secret, a guard on the bottom rung.

## After the verdict

Finding 1 fixed before the close commit: `ToolUrlCarriesValuesError` takes `(why, listable)` and its message
no longer names the URL (`packages/protocol/test/tool-url-values.test.ts` asserts the key is absent). Finding 2
(the web drops the sponsor's `listable`) left as is: the form refuses first, so it is not reached from the site.
