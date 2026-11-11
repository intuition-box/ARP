# 0186 — An x402 endpoint's URL is written without its values, reduced at the payer before signing

**Status:** Accepted
**Date:** 2026-11-11
**Amends:** ADR `0162` (decision 1: "the URL is kept as typed" becomes "as paid, with values removed"; decision 6: the feed's schema), `.claude/rules/security.md` (the line request's signing-site entry and the sponsoring table's line row)
**Triggered by:** a reader of the x402 feed, relayed by the orchestrator on 2026-11-11: query values end up in a public, permanent record

## Context

An x402 line writes the endpoint's URL on Intuition testnet 13579 in two atoms: the tool atom T1, whose
URL is `normaliseToolUrl`'s output and kept the sorted query **with its values**
(`packages/protocol/src/declare/tool-thing.ts`), and the payment level T5, which since ADR `0162` decision 1
carried the URL "exactly as paid" (`paymentLevelLabel`, `packages/protocol/src/x402-payment.ts`). A URL
called can hold a search word, an email, a wallet address or an API key, and an atom cannot be deleted.
The feed republished both.

Measured before the change, testnet 13579, 2026-11-11T09:13Z, `scripts/measure/endpoint-values-on-chain.ts`
(`data/measurements/endpoint-values-on-chain-2026-11-11.json`): 2 payment levels, 1 naming a URL, 0
carrying a value; their 1 tool atom, 0; 38 non-GitHub http(s) URLs that a `uses` triple points at, 0; 38
non-GitHub http(s) URLs among the 105 Things ARP's deployer or sponsor created, 0. So the defect was
**latent**: no value is on chain yet.

## Decision

1. **One function, `redactEndpointUrl`** (`packages/protocol/src/endpoint-redaction.ts`), with closed rules:
   scheme, host and port kept as typed; `user:pass@` refused (`EndpointNotRedactableError`); fragment
   removed; each query parameter keeps its name and loses its value (`?city=paris&q=x` → `?city=&q=`), a
   part with no `=` is removed; a path segment or a parameter name that looks personal becomes `:id`
   (an `@`; `0x` + 40 or more hex; a UUID; 6 digits in a row; 16 hex in a row with a digit; a phone number;
   a space; over 20 base64 characters with upper, lower and a digit), tested as typed and decoded. A
   segment already `:id` is kept. Idempotent. The canonical form is `normaliseToolUrl(redactEndpointUrl(url))`,
   so the names are sorted there and two URLs that differ only in values have one tool atom.
2. **The payer reduces before it signs.** `apps/mcp/src/desktop/loop.ts` `writeLine` reduces the URL of a
   line with a payment before `/list-tool` and before the line request; `apps/mcp/src/line.ts`
   `lineFromArgs` (`arp line`) does the same and returns the refusal as a usage error. A skill's URL
   without a payment is untouched: its `?skill=` value is the skill's name.
3. **`paymentLevelLabel` throws on a URL that is not reduced**: the last place before an atom.
4. **The sponsor refuses, it does not reduce.** `/line` answers 422 `rule: 'endpoint-private'` to an
   endpoint that is not reduced, before it reads the paying chain, and to a tool atom whose URL is not.
   The agent signed the URL; writing a different one would be ARP's word, and reducing a value the agent
   signed would still have sent it.
5. **The line request stays version 4.** The typed data does not change; only what `endpoint` may hold
   narrows. A v4 signer that sends a URL without values still verifies, and one with values gets a clear
   422 instead of a 401. A version 5 would have broken every installed CLI for lines that never carried a
   value.
6. **The feed reduces on read** (`buildX402Feed`, both the main feed and the `--test` feed of task 118):
   `endpoint` and `endpoint_canonical` are reduced whatever the line wrote; a line whose two URLs no longer
   agree once reduced, or with credentials, is counted in `skipped`. `by_endpoint` is keyed by the reduced
   canonical URL. **Schema `arp.x402-outcomes/3`**, because both fields changed meaning; nobody reads the
   main feed yet (0 records).

## Alternatives considered

- **Hash each value** — a plain hash of a guessable value (a city, a common query) is reversed by trying
  candidates; a salted or keyed hash gives two payers two keys for one endpoint and breaks matching.
- **Drop the whole query** — two endpoints that differ by a parameter name (`?op=`) would merge, and a
  reader could not reproduce the route.
- **Change `normaliseToolUrl` for every URL** — every skill atom (`…?skill=<name>`) would change id.
- **Reduce at the sponsor** — the value would already have left the payer's machine, and the signed URL
  would differ from the written one.
- **Detect any word in a path** — impossible from the URL alone; the payer writes `:id` itself, and the
  docs say so.

## Consequences

**Positive:**

- No query value, fragment, credential or recognisable personal segment reaches a signature, an atom or
  the feed from ARP's clients; the sponsor and the feed refuse or reduce what another client sends.
- A reader such as x402 Doctor applies the same rules to the URL it called and gets the same key.

**Negative:**

- A plain word in a path is kept. Documented on `what-arp-publishes` and `x402-feed`.
- `/list-tool` probes the reduced URL. An endpoint that answers 402 only with its parameters filled, or a
  path that only resolves with its segment, is refused `not-a-tool` until its atom exists.
- A false positive (a long mixed-case slug with a digit) merges two routes under `:id`.
- The host is kept, so a host that names the payer still names it.

**Neutral (worth knowing):**

- `/list-tool` itself does not reduce a URL listed outside an x402 line (the web register page): a URL a
  person pastes there with a key in its query is still written. Recorded in the task file as open.

## References

- Task: `docs/tasks/119-an-endpoint-url-without-its-values.md`
- Code: `packages/protocol/src/endpoint-redaction.ts`, `packages/protocol/src/x402-payment.ts`, `packages/protocol/src/x402-feed.ts`, `apps/sponsor/src/routes/line.ts`, `apps/mcp/src/line.ts`, `apps/mcp/src/desktop/loop.ts`
- Measurement: `scripts/measure/endpoint-values-on-chain.ts`, `data/measurements/endpoint-values-on-chain-2026-11-11.json`
- Docs: `apps/web/public/docs/what-arp-publishes.md`, `apps/web/public/docs/x402-feed.md`, `apps/web/public/docs/install.md`
- Related ADR: `0159`, `0162`, `0163`
- Rule: `.claude/rules/security.md`
