# 0190 — A tool URL that carries a value is refused wherever it is listed, never stripped

**Status:** Accepted
**Date:** 2026-11-11
**Amends:** `.claude/rules/security.md` (the sponsoring table's tool-listing row)
**Triggered by:** `docs/tasks/119` review finding (c), relayed by the orchestrator as task 123: `/list-tool` wrote a pasted URL's values, so an MCP URL with `?api_key=` from the web form would put the key on chain for good

## Context

A tool's atom is its normalised URL (`normaliseToolUrl`, `packages/protocol/src/declare/tool-thing.ts`),
which keeps the sorted query with its values. ADR `0186` reduced an x402 endpoint's URL at the payer; every
other way a tool's atom is created still wrote the URL as pasted:

| path | before |
| --- | --- |
| the site's Add it form → `POST /list-tool` | GitHub rebuilt by `canonicalToolUrl` (`?skill=` only); any other URL as normalised, values kept |
| Add it with a wallet (`apps/web/src/services/tool-register.ts`) | `normaliseToolUrl`, values kept, GitHub included |
| a declaration (`prepareDeclareUsed`, used by `arp_declare_used` and the site's form) | derives the Thing from `normaliseToolUrl`, values kept; the pasted URL also sent to the index lookup |
| `planToolListing` (the sponsor, `scripts/seed/list-originals.ts`) | as `/list-tool` |

`arp line` and the desktop loop already reduce a paid line's URL (ADR `0186`); no other CLI or MCP path
lists a tool.

Measured, testnet 13579, 2026-11-11T13:36Z, `scripts/measure/tool-url-values-on-chain.ts`
(`data/measurements/tool-url-values-on-chain-2026-11-11.json`): of the 105 Things ARP's deployer or sponsor
created (61 http(s) URLs) and of the 78 Things a `uses` triple points at (53 http(s) URLs), **0** would be
refused by the rule below. So the defect was **latent**. Across all 55,078 Things on testnet, whoever made
them, 16,093 of 30,520 http(s) URLs would be refused, 13,893 of them `en.wikipedia.org/?curid=…`: other
projects' atoms, not ARP listings.

## Decision

1. **One rule, `publishableToolUrl`** (`packages/protocol/src/tool-url-values.ts`), on the URL as it would
   be written. `github.com`: no query, or the one parameter `skill` (a skill's name, already public in its
   repository); the path is not checked, since an owner's and a repository's names are public names.
   Any other host: what `redactEndpointUrl` leaves unchanged (ADR `0186` decision 1). A refusal names
   `listable`, the form that would be accepted, or `null`. `assertPublishableToolUrl` throws
   `ToolUrlCarriesValuesError`.
2. **Refuse, never strip, on every path.** The person who pasted a key needs to know they did: a silent
   strip lists a URL they did not type (an MCP endpoint without its key may not even answer the admission
   probe), and leaves them unaware that the key sat in a form field. The message names the form that would
   be accepted, so the fix is one paste.
3. **Where it is checked, earliest first:**
   - the site's Add it form (`listingRequest`, `apps/web/src/services/list-tool.ts`), before the wallet is
     asked to sign and before anything is sent. It also **sends the canonical form**, so a GitHub URL's
     other parameters never leave the page;
   - Add it with a wallet (`planToolRegistration`), `carries-values`, before any chain or index read;
   - `POST /list-tool`, 422 `rule: 'endpoint-private'` with `listable`, before `resolveTool`,
     `admitTool`, pinning or sending, the same rule name as `/line`;
   - `planToolListing`, after `canonicalToolUrl`, so every caller is covered;
   - `prepareDeclareUsed`, after normalisation and **before the lookup**, so the key reaches neither the
     index nor the chain.
4. **What does not change.** `normaliseToolUrl` (every atom id would move); `canonicalToolUrl` (a GitHub
   URL pasted with `?skill=x&token=y` through the sponsor is still rebuilt to `?skill=x`, as task 53
   decided: the token is never written). The wallet path does not canonicalise GitHub, so there the same
   URL is refused, naming `?skill=x`.

## Alternatives considered

- **Strip the value, as the payer does for an x402 line (ADR `0186`).** Right there: the payer's URL is the
  one it paid, and the values are what it asked; the line is about the endpoint, whatever was asked. A
  listing is a person naming a tool, and a value in it is most likely a key they did not mean to publish.
  Telling them is worth more than saving a paste.
- **Refuse only at the sponsor.** The browser would still sign and send the key to ARP's service, and the
  wallet and declaration paths would still write it.
- **Check the declaration only when it derives a new atom.** It would keep declaring a use of an existing
  atom with values possible, but the pasted URL would reach the index lookup first. No ARP atom carries a
  value (above); the 16,093 that do are not tools ARP lists.

## Consequences

**Positive:**
- No path in this repository writes a tool atom whose URL carries a query value, a fragment or a path
  segment that looks personal, with the one exception of a GitHub skill's `?skill=`.
- The key never leaves the browser on the Add it form, and never reaches the index on a declaration.

**Negative:**
- Declaring a use of an existing atom whose URL carries a value is refused, through ARP's planners.
- A route word in the path (`/weather/paris`) is not caught, as in ADR `0186`.
- The personal-segment heuristics can refuse a legitimate URL (a host whose route holds 6 digits or a long
  mixed-case id); the message names the `:id` form, which then lists a different atom from the one a
  reader might expect.

**Neutral (worth knowing):**
- A direct writer, outside ARP's code, can still create any atom it likes on Intuition.

## References

- Related rule: `.claude/rules/security.md`, `.claude/rules/claims.md`
- Related doc: `apps/web/public/docs/what-arp-publishes.md`
- Related ADR: `.claude/choices/0186-*.md`, `0123`, `0163`
- Task: `docs/tasks/123-a-tool-url-without-its-values.md`
