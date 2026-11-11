# Task 127 — A line names what its subject is, which version was used, and what backs it

**Status:** spec, 2026-11-11, written by arp-c1 for the orchestrator on the user's request (« je veux
qu'on fasse ces preuves »). Task 127, ADR `0192`, post-mortem `115`, allocated by the orchestrator. Nothing built.
**Decided 2026-11-11 (the user, relayed by arp-c1), section 2:** the version is V = (skill, `version`, X), a triple from the subject with the `version` predicate atom, and the line is T1 = (agent, uses, V). « has type pour le versionning » meant "a triple from the subject, like has type", not the `has type` predicate itself.
**ADR:** one, amending ADR `0185` on where the version hangs, and recording the two evidence modules.
**Rules:** `code.md`, `security.md` (two signing sites: a new one for the MCP response, the content
receipt's reuse as line evidence), `portability.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`, `intuition` (agent `intuition-integrator` before `task-verifier`).

## Why

A line today says `(agent, uses, subject) → in context of → has outcome → because → needs / with`
(`docs/28`). It does not say what kind of thing the subject is, which version of it was used, or what
backs the claim, except for x402 (`paid with`). Without the version, a skill whose files changed keeps
the record of files nobody used (ADR `0185`). Without evidence, every line is the writer's word alone.

## 1. The subject's type: one `has type` triple per subject atom, written once

Not a level of the line. When a subject is listed (`apps/sponsor` list-tool, ADR `0123`; `scripts/seed`),
write `(subject, has type, <type atom>)` with the published `has type` predicate
(`HAS_TYPE`, `packages/protocol/src/sources/intuition/terms.ts`).

Type atoms already on chain, read 2026-11-11 (GraphQL `atoms(where:{label:{_in:[…]}})`, count of
`has type` edges as object):

| Type | term id (prefix) | 1155 | 13579 |
| --- | --- | --- | --- |
| AIAgent | `0x800342c0…` | 28,648 | 286 |
| MCP Server | `0xb52bb294…` | 68 | 72 |
| Skill | `0xba57c5da…` | 0 | 6 |

Duplicates exist (two `Tool` on 1155, a second `MCP Server` and `AIAgent` on 13579 with 0 edges): use
the atom that carries the edges, same id on both chains. Resolve the full term ids in `terms.ts`, with
the zero/multiple-match check that file already records for its other constants.

## 2. The version: a triple from the subject, and the line uses that triple

The user's proposal, 2026-11-11: versions hang from the subject, not from the line.

```
V  = (skill, version, <digest>)        predicate atom `version`, 0x9622ec9e…, on 1155 and 13579
T1 = (agent, uses, V)                  when the version is known; (agent, uses, skill) otherwise
```

- `<digest>` is ADR `0185`'s: `bundleManifest` over the whole directory (`content-bundle.ts`).
- Readers group lines by `V` and roll up to the skill through `V`'s subject. A new digest starts at
  zero; lines on earlier versions stay visible ("12 wallets on the previous version, 0 on this one").
- Predicate choice, read 2026-11-11: `version` exists with one id on both chains, used 28 times as a
  predicate on 13579 and 0 on 1155; `has version` (`0xa0a6412e…`) exists on 13579 only, unused;
  `version of` (`0x5fa25937…`) runs the other way. Recommended: `version`.
- ADR `0185` left the predicate and the attachment open ("settled when the code is written, with
  `intuition-integrator`"); this task settles them, so its ADR amends `0185`.
- **To confirm with the user before building:** he wrote « je veux has type pour le versionning ».
  Read here as « a triple from the subject, the way `has type` is ». If he meant the `has type`
  predicate itself, the design changes and this section is rewritten.

## 3. Evidence for a skill: the content receipt

The node already signs a content receipt (`packages/protocol/src/receipt.ts`): "I served this
directory, digest D, to this key at T", EIP-712, checkable with `sha256sum`. It attests access, never
use; the module says so.

- The line gains an evidence level naming the receipt, when the agent holds one for the same digest as
  `V`: `(T4 or T3, <evidence predicate>, <receipt ref>)`. The receipt itself is published where a
  stranger can fetch and verify it (the shape ADR `0188` uses for a line request).
- A receipt whose digest differs from `V`'s is not evidence for that line.
- The evidence factor stays 1 (`docs/28`): the receipt is signed by ARP's node, a party to the
  exchange, and says nothing about independence.

## 4. Evidence for an MCP server or a tool: a signed response

Almost no server signs its responses today. The module defines what a signed response is, and ARP's
own MCP server implements it first.

- A server declares a signing key in its listing.
- A response carries an EIP-712 signature over: tool name, hash of the request, hash of the response,
  time, the caller's key, the server's chain-agnostic id. Domain with chain id; replay bounded by the
  request hash and the time.
- The line's evidence level names that signed response; it is published the same way as a receipt.
- A line about a server that does not sign has no evidence level, exactly as today.
- Out of scope here: proofs that need no cooperation from the server (TLS notarisation, zkTLS). Noted
  as the route for servers that will never sign.

## Decisions for the ADR

- The version's attachment and predicate (section 2), amending ADR `0185`.
- The evidence predicate's word, and whether it hangs on T3 or T4 (the x402 `paid with` hangs on T3).
- Where receipts and signed responses are published, and for how long.

## Do not do in this task

- Weigh evidence above 1. It stays 1 until two independent parties can be told from one (`docs/28`).
- Count any amount deposited, or Intuition's triple-to-atom value flow, in a weight.
- Anything on mainnet: testnet 13579 only (`security.md`).
- TLS notarisation or zkTLS.

## Verification

- Unit tests: a line with `V` groups and rolls up; a receipt with another digest is refused as evidence;
  a signed response verifies, and fails on a changed response, a changed request, another caller.
- The type, version and evidence levels written on 13579 by `scripts/` against the sponsor, checked by
  `intuition-integrator`.
- `task-verifier`.

**Evidence ladder:** skill and agent columns, from declared toward observed. A versioned line with a
receipt says "these files, served to this key, at this time", which a stranger can check; it is still
not use, so it does not reach corroborated.
