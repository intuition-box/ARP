# Task 127 — A line names what its subject is, which version was used, and what backs it

**Status:** verified 2026-11-11 (sections 1 to 3; `intuition-integrator` PASS in round 5, `task-verifier` PASS). Post-mortem `.claude/learning/115-a-line-names-type-version-evidence.md`. Section 4 deferred, and the 13579 write deferred to the v6 release
(see "Built, and what was left" at the end). Spec written by arp-c1 for the orchestrator on the user's request
(« je veux qu'on fasse ces preuves »). Task 127, ADR `0192`, post-mortem `115`, allocated by the orchestrator.
**Line request version 6.** CLI 0.0.6 and the sponsoring service ship together: a v6 sponsor refuses a 0.0.5
line (401), a v5 sponsor a 0.0.6 one.
**Decided 2026-11-11 (the user, relayed by arp-c1), section 2:** the version is V = (skill, `version`, X), a triple from the subject with the `version` predicate atom, and the line is T1 = (agent, uses, V). « has type pour le versionning » meant "a triple from the subject, like has type", not the `has type` predicate itself.
**Confirmed 2026-11-11 (the user, after a call with the HOL adapter's side):** `uses` points at the versioned object V = (skill, `version`, digest), never at the digest alone, as built; a graph walk goes skill → its version triples → their `uses` lines.
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

Duplicates exist (two `Tool` on 1155, a second `MCP Server` and `AIAgent` on 13579 with 0 edges under the published `has type`; _corrected at build: they carry 68 and 104 under a plain-string `has type` on 13579, ADR `0192`_): use
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

**Evidence ladder (as built):** the skill column, toward observed for access only, through the content receipt; the agent column is not served. Nothing moves until a versioned line exists on 13579. _(The spec's sentence below said skill and agent columns.)_

**Evidence ladder:** skill and agent columns, from declared toward observed. A versioned line with a
receipt says "these files, served to this key, at this time", which a stranger can check; it is still
not use, so it does not reach corroborated.

## Built, and what was left (2026-11-11)

**1. Type.** `(subject, has type, Skill)` for a skill URL, `(subject, has type, MCP Server)` for an endpoint
that answered MCP, planned by `planToolListing` (`subjectTypeOf`, `packages/protocol/src/sponsor/list-tool.ts`)
and written by `POST /list-tool`; a skill already listed gets its type on its next listing without being
admitted again. Term ids in `terms.ts` (`SKILL_TYPE`, `MCP_SERVER_TYPE`, `VERSION`), chosen by
`scripts/measure/subject-type-atoms.ts` (`data/measurements/subject-type-atoms-2026-11-11.json`). Re-measured
2026-11-11: `AIAgent` 28,648 on 1155 and **289** on 13579 (the spec's 286 was read earlier the same day),
`MCP Server` 68 and 72, `Skill` 0 and 6. No backfill was run: a skill already listed gets its type on its
next listing, and every line lists first; a seed run spends on chain and is the user's.

**2. Version.** `V = (skill, version, sha256:<digest>)` (`planVersionedUse`, `skill-version.ts`), `T1 = (agent,
uses, V)` in `POST /line`; written only when the digest is the skill's directory at `HEAD`
(`skillDigestOnGitHub`, `apps/sponsor/src/github.ts`) or an accepted receipt's, else 422 `version` and the
writer drops it. Readers: `getPulseUsage({version})` reads versioned uses in the same request
(`PULSE_VERSIONED_USES_QUERY`), rolls them up to the skill and groups them (`byVersion`, `usageOnVersion`);
`arp_pulse`, the site's skill pulse, the hook's failure answer and the skill lines feed pass it. The hook
records the digest (`skillDirectoryDigest`); `arp share send` and `arp line --skill-dir` carry it.

**3. Evidence.** `(T3, has evidence, content-receipt:<hash>)` (`line-evidence.ts`, `checkReceiptEvidence`): a
receipt from an accepted node, for this agent, this tool and the line's digest. A receipt over another
digest is refused (422 `evidence`). Kept in `line-receipts.jsonl`, served at `GET /receipt?hash=`.

**4. A signed MCP response: not built.** Two reasons, both checked: ARP's hosted MCP server holds no key
(`apps/mcp` is read-only, `STATE.md` task 117), so it needs a new secret and a new signing site; and Claude
Code does not pass an MCP result's `_meta` to the hook (`STATE.md`, task 125), so a signed response would not
reach the line writer through the runtime. The follow-up, scoped: (a) `packages/protocol/src/mcp-response.ts`,
EIP-712 over tool name, request hash, response hash, time, caller key, server id, chain id in the domain;
(b) a signing key declared in the server's listing; (c) ARP's MCP server signing into `_meta`; (d) a way for a
line writer to hold the signed response, which today means the agent passing it, not the hook; (e) the same
`has evidence` level, `mcp-response:<hash>`.

**On chain.** Not written on 13579: that waits on the sponsor's redeploy and on the user. Written on a local
anvil fork of 13579 instead, against the real MultiVault, by `scripts/sandbox/versioned-line-fork.ts`
(`data/measurements/versioned-line-fork-2026-11-11.json`): the type, `V`, `T1` with a triple as its object,
the outcome and `has evidence`, all nine transactions `success`, every term read back as created.

**Readers.** After `intuition-integrator`'s first review, every `uses` reader but one reads versioned edges:
`getAgentLines` (by default), the tool listing, recent declarations, `arp_tool_reputation`, the sponsor's
wallets per tool, an agent's declared modules, the atom standing's claims (after the second review), the landing's pulse. Each changed query was sent to both
indexers (`scripts/measure/versioned-queries-valid.ts`, `data/measurements/versioned-queries-valid-2026-11-11.txt`).
Not read: `registered-tools.ts`'s per-atom count, and the atom standing's incoming edges, which filter on no predicate by design (ADR `0192`, Consequences). Both are latent until the first versioned line. The evidence predicate became
`has evidence`, an existing plain-string atom, instead of a new `backed by` (ADR `0192`, Alternatives).
After the second review: `/list-tool` skips admission only when the type triple is the only thing to create
(`onlyType`), so a listing of somebody else's bare atom is still admitted (ADR `0163`); `versionedSubject` also
requires the `sha256:` label, as the pulse does; the type-edge counts are said to be under the published `has
type` only.

**Deferred to the release (orchestrator, 2026-11-11).** The spec's step "the type, version and evidence levels
written on 13579 by `scripts/` against the sponsor, checked by `intuition-integrator`" cannot be met before
version 6 is live: it needs CLI 0.0.6 and the sponsor redeployed together, and the user's go. It is done at that
release, with one real versioned line backed by a receipt, then `intuition-integrator` again. Until then the fork
run above stands in, and the rest of the task is judged without it.
