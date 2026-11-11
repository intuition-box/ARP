# 0192 — A line names what its subject is, which version was used, and what backs it

**Status:** Accepted. Amends ADR `0185` on where the version hangs; the digest stays `0185`'s.
**Date:** 2026-11-11
**Triggered by:** `docs/tasks/127-a-line-names-type-version-evidence.md`, written on the user's request
(« je veux qu'on fasse ces preuves »). Section 2 decided by the user, 2026-11-11: the version is a triple
from the subject, `V = (skill, version, X)`, and the line is `T1 = (agent, uses, V)`.

## Context

A line said `(agent, uses, subject)` and what followed (`docs/28`). It did not say what kind of thing the
subject was, which version of it was used, or what backed the claim, except an x402 line's `paid with`.
ADR `0185` decided that a skill's version is its directory digest and left open the predicate and where it
hangs. The content receipt (`packages/protocol/src/receipt.ts`) already signs that digest, but nothing
connected a receipt to a line.

Measured 2026-11-11 by `scripts/measure/subject-type-atoms.ts`
(`data/measurements/subject-type-atoms-2026-11-11.json`): `version` is one plain-string atom with one id on
1155 and 13579 (`0x9622ec9e…`), used 28 times as a predicate on 13579 with objects such as `1.0.0`, 0 on
1155. `has version` exists on 13579 only, unused. Under the published `has type` (`HAS_TYPE`, the predicate
1155 uses), the type atoms with the edges are the IPFS-pinned `AIAgent` (28,648 on 1155, 289 on 13579),
`MCP Server` (68, 72) and `Skill` (0, 6), one id on both chains. 13579 also holds plain-string `AIAgent` and
`MCP Server` atoms with none under it, but with 104 and 68 under a plain-string `has type` (`0x3facdb2c…`,
268 uses on 13579, 1 on 1155; `intuition-integrator`, 2026-11-11). The script counts under `HAS_TYPE` only.

## Decision

1. **Type.** A listed subject says once what it is: `(skill, has type, Skill)` for a skill URL, and
   `(endpoint, has type, MCP Server)` for an endpoint that answered MCP (`subjectTypeOf`, planned by
   `planToolListing`). No other form is typed: a repository, a plugin, an A2A card and an x402 endpoint have
   no type atom the ecosystem writes to. A skill listed before this gets its type on its next listing,
   without being admitted again; every line writes a listing first, so the type follows the lines.
2. **Version.** `V = (skill, version, sha256:<digest>)`, the digest ADR `0185`'s, its atom labelled
   `sha256:` and 64 hex so it cannot be read as a term id. With a version, `T1 = (agent, uses, V)`; without
   one, `(agent, uses, skill)` as before. No agent is asked to hold a position on `V`: it is a fact about files (the sponsoring service, which creates it, holds its creation deposit), and the
   positions that say "I used it" are on T1 and below. Readers ask for versioned uses in the same request
   as the others (`PULSE_VERSIONED_USES_QUERY`), roll them up to the skill through `V`'s subject, and group
   them by digest (`byVersion`, `usageOnVersion`, where a new digest starts at zero).
3. **A published version only.** The sponsoring service writes a version when it is the skill's directory
   at its repository's `HEAD`, computed from GitHub as the content server computes it (`serveSkillBundle`),
   or the digest of a receipt from a node it accepts. Otherwise 422 `rule: 'version'`, and the writer signs
   again without one: ADR `0185` §2, a local edit writes no version.
4. **Evidence: the content receipt.** The evidence predicate is `has evidence`, one word for every evidence
   module: a plain-string atom already on 13579 (`0x010057d9…`, 61 triples as predicate there, read as
   "claim has evidence evidence"). It is not on 1155 yet; created there on first use, it gets the same id,
   being a plain string. On 13579 ARP creates no word of its own. It hangs
   on the outcome (T3, or T1's outcome with no domain), as `paid with` does. Its object
   is `content-receipt:<hash>`, the receipt's EIP-712 hash, so the atom names one signed receipt. The
   sponsoring service accepts it only when the receipt verifies, its signer is one it accepts, it was served
   to the line's agent, it names the line's tool, and **its digest is the line's version**
   (`checkReceiptEvidence`). It keeps the receipt, the only copy, for as long as its data volume, and serves
   it at `GET /receipt?hash=` (`line-receipts.jsonl`), the shape ADR `0188` uses for a line request.
   Its weight stays 1 (`docs/28`): its signer is ARP's node, a party to the exchange.
5. **Line request version 6.** The agent signs `version` and `evidence` (the receipt's hash). A version 5
   request no longer verifies at `/line`; the x402 feed still reads a version 5 request the service
   archived (`readArchivedLineRequest`), so a payer's earlier signature still reads as signed.
6. **Where the digest comes from.** The hook computes it where the skill ran (`skillDirectoryDigest`, node
   builtins only) on a worked answer and on a recorded failure; `arp share send` carries it; `arp line
   --skill-dir <path>` computes it by hand. The receipt is the one `arp_get_skill` kept in
   `receipts.jsonl`, when its digest is the version and it names this agent's key.

## Alternatives considered

- **The version as a level of the line** (`(T1, version, X)`, ADR `0185`'s open option). Each agent would
  write its own version triple, and lines on one version would not meet on one term. The user chose the
  triple from the subject.
- **`has type` as the version's predicate.** Read from « has type pour le versionning »; the user meant a
  triple from the subject, like `has type`, not the predicate itself.
- **`has version`.** On 13579 only, unused, and IPFS-pinned on one chain: a predicate that does not exist on
  1155 would have to be created there.
- **`backed by`.** The first build used it. An IPFS-pinned `backed by` exists on both chains
  (`0x5aa63834…`, 0 uses) meaning "financial or moral support", so a plain-string `backed by` would have
  shared its label and not its meaning (`intuition-integrator`, 2026-11-11). The fork run
  (`data/measurements/versioned-line-fork-2026-11-11.json`) was made before the change and names it; the
  shape it proves is the same.
- **Evidence on T4.** A reason exists only on a failure; a worked line would have nowhere to hang it.
- **The sponsor recomputing every version from GitHub, even with a receipt.** The receipt already names
  the files ARP's node served at a pinned commit, which may be older than `HEAD`; refusing it would refuse
  the agents that fetched through ARP.
- **Section 4 of the task, a signed MCP response, in this task.** Deferred: ARP's hosted MCP server holds no
  key today and would need one (a new secret and a new signing site), and Claude Code does not pass an MCP
  result's `_meta` to the hook (`STATE.md`, task 125), so a signed response could not reach the line writer
  through the runtime. It stays a follow-up in the task file.

## Consequences

**Positive:**
- A score can say which files it is about, and a changed skill shows as a new digest at zero.
- A receipt and a line about the same files meet on one value, and a stranger can check both.
- The type travels with the listing, written once, with the atom the ecosystem's edges already use.

**Negative:**
- One more request breaking change: CLI 0.0.6 and the sponsoring service ship together, as 0.0.4 did.
- A versioned line costs `V` once per digest (one atom and one triple) on top of its levels.
- Reading a version from GitHub costs two API requests and one raw read per file of the skill, cached ten
  minutes per URL, before the daily caps are checked; a replayed nonce is refused first.
- The sponsoring service sees the digest of a directory it then refuses, a local edit's. It writes nothing
  of it and keeps no record of a refused request.
- No reader weighs `has evidence` yet; `pulse-usage.ts`'s `proven` is still unset on real lines.
- Every reader of `uses` edges reads versioned ones too: `getPulseUsage({version})` where a caller passes
  it (`arp_pulse`, the site's skill pulse and landing, the failure answer, the skill lines feed), and
  `getAgentLines` by default; the tool listing, recent declarations, `arp_tool_reputation`
  (`TOOL_USAGE_QUERY`), the sponsor's wallets per tool and an agent's declared modules through
  `object_term` (`versionedSubject`, which also requires the `sha256:` label), the atom standing's claims, each query checked against both indexers by
  `scripts/measure/versioned-queries-valid.ts` (`data/measurements/versioned-queries-valid-2026-11-11.txt`). **Not read:** `registered-tools.ts`'s per-atom `uses` count
  (an aggregate on the atom, which an edge to `V` is not under; the index's `terms` has no
  `as_object_triples` to reach it), the atom standing's incoming edges (`ATOM_STANDING_QUERY`'s `triples`, filtered on `object_id` and on no predicate by design, so a skill's atom page misses its `(agent, uses, V)` edges and their count), and `arp_find_agents`' agent objects, which are never versioned. The
  first is a live undercount from the first versioned line: the catalogue's declaration count for that
  skill. Every reader is latent until then: no versioned edge is on 13579.
- `version` grouping trusts the object's label (`sha256:` and 64 hex), not its `data`: an IPFS atom
  labelled that way would group with the plain-string one. Low risk, noted.
- `MCP Server` now types two kinds of subject: its existing edges are on ERC-8004 agent atoms, ARP's on
  endpoint URL atoms. An MCP endpoint listed before this is not typed, since it is not admitted again.
- A new digest makes each agent write a new T1 and its levels; nothing carries over between versions.
  The evidence level is one atom and one triple per line, since each receipt is its own atom.
- `skillDigestOnGitHub` reads `commits/HEAD`, the default branch: a skill on another branch always gets 422
  `version` and its line names none. It fails safe.
- Only the sponsoring service writes a versioned line. An agent writing its own line, the mainnet route,
  has no version path yet.

**Neutral (worth knowing):**
- Written on a local fork of 13579 by `scripts/sandbox/versioned-line-fork.ts`
  (`data/measurements/versioned-line-fork-2026-11-11.json`): the type, `V`, a `uses` triple whose object is
  a triple, the outcome and `has evidence` all landed against the real MultiVault. Not written on 13579: that
  waits on the redeploy and on the user.
- 46 of 662 catalogued skills are byte-identical at several paths (ADR `0185`); they share a digest and so a
  `V` atom label, but not a `V`, which hangs from each skill's own atom.

## References

- Task: `docs/tasks/127-a-line-names-type-version-evidence.md`
- Amends: ADR `0185`. Related: `0138` (form B), `0159` (`paid with`), `0188` (the kept request), `0094`
  (the content receipt as a proof)
- Rules: `.claude/rules/security.md` (the signing list), `.claude/rules/claims.md`
- Doc: `docs/28_THE_SIGNAL.md`
