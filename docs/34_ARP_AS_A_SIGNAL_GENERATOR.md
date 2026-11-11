# 34 — ARP as a signal generator

**Status:** spec for an adapter author, 2026-11-11 (task 134). It describes what ARP writes and
publishes today. It decides nothing: the shared ontology is open, and section 7 lists what is to settle.
**Everything ARP writes is on Intuition testnet 13579.** No ARP line is on mainnet 1155, and the port
is blocked (`docs/28` § Open, `docs/27`).

## Who this is for

An adapter reads Intuition in real time (an indexer of Intuition Core into a graph database), ranks
what it reads, and normalises a score to 0–100. A composition graph names the sources it trusts to
judge. Its ontology has domains, sub-domains, and relations between people and between people and
agents.

ARP can be one of those sources. What it brings is **outcomes, evidence, context and domain
proximity**: an agent's public line about a skill, a tool or another agent it used, in a domain, with
an outcome and a reason. This document says how those lines are written on chain, which words they
use, how a reader checks the evidence without trusting ARP, which files ARP publishes, how to query
the chain directly, and what ARP does not produce.

Every figure below is read by a committed script, named where it is used, on 2026-11-11:

```
bun run scripts/measure/signal-generator-terms.ts     # term ids and counts, both chains
bun run scripts/measure/signal-generator-queries.ts   # the GraphQL examples of section 5, run on 13579
```

Their outputs are `data/measurements/signal-generator-terms-2026-11-11.json` and
`data/measurements/signal-generator-queries-2026-11-11.txt`.

## 1. What ARP writes on chain

### A line

A line is form B (ADR `0138`, `docs/28`): each triple is the subject of the next, so an outcome belongs
to its domain and a reason to its outcome. The same sentence always gives the same term id, so two
agents who write it stand behind one term, each with its own position.

```
T1 = (agent, uses, subject)                      subject: a skill, a tool, an x402 endpoint, an agent
T2 = (T1, in context of, domain)                 optional
T3 = (T2, has outcome, worked | failed)          with no domain: (T1, has outcome, …)
T4 = (T3, because, reason)                       only after failed
T5 = (T4, needs, name)                           after missing-program or missing-key
     (T3, with, name)                            on a worked line instead: what the agent had to add
     (T3, paid with, eip155:<chain>/tx/<hash> <url paid>)    an x402 line (ADRs 0159, 0162, 0186)
     (T3, has evidence, content-receipt:<hash>)              from CLI 0.0.6 (ADR 0192)
```

"T3" in the last three rows is the outcome triple, whatever its depth. A line can stop at any level.

### From CLI 0.0.6: type and version

Task 127, ADR `0192`. CLI 0.0.6 is on npm (`npm view @arp-protocol/cli versions`, 2026-11-11), and the
hosted sponsoring service answers `GET /receipt`. **No line in this shape is on 13579 yet** (query 3
below returns 0 for all three counts); it was written only on a local fork of 13579
(`data/measurements/versioned-line-fork-2026-11-11.json`).

```
(subject, has type, Skill | MCP Server)          written once, when the subject is listed
V  = (skill, version, sha256:<digest>)           the skill's directory digest (ADR 0185)
T1 = (agent, uses, V)                            when the version is known; (agent, uses, skill) otherwise
```

`V` hangs from the skill, so lines on one version meet on one term, and a reader rolls them up to the
skill through `V`'s subject. The sponsoring service writes a version only when the digest is the
skill's directory at its repository's `HEAD`, or the digest of a content receipt from a node it
accepts. A local edit names no version. The 6 `(x, has type, Skill)` triples on 13579 today are
another writer's (`0x232C0e54a9fC9872D1682877EB1EE0812837F605`, query 7), not ARP's.

The digest is `sha256` over the output of `sha256sum` on every file of the skill's directory, paths
relative to it, sorted (`content-bundle.ts` `bundleManifest`); the atom is `sha256:` and the 64 hex
digits. Anyone recomputes it, from the skill's directory:

```
(cd <skill-dir> && find . -type f | sed 's|^\./||' | LC_ALL=C sort | xargs sha256sum) | sha256sum
```

Run on `skills/arp` in this repository on 2026-11-11, it printed `02705b83…0cba`, the same value
`bundleManifest` gives. Paths are sorted by code unit; `LC_ALL=C` matches that for ASCII names, and `xargs` needs names
without spaces.

### The atoms a line points at

| Atom | Shape on 13579 | Example |
| --- | --- | --- |
| Agent | an IPFS-pinned `Thing`, labelled `Agent <chain>:<id>`, with `(agent, same as, <CAIP-19>)`, `(agent, has type, AIAgent)`, `(agent, implement, ERC-8004)` | `Agent 13579:38`, `same as` `eip155:13579/erc721:0xC165A2AD2E540A4069E02834009161E2b4490d5A/38` |
| Skill or tool | an IPFS-pinned `Thing` derived from the normalised URL alone (`declare/tool-thing.ts`), labelled with the URL without its scheme | `github.com/softaworks/agent-toolkit?skill=web-to-markdown` |
| Domain | a plain-string atom, a node of ARP's tree (section 2) | `video` |
| A word | a plain-string atom: its id is `calculateAtomId(stringToHex(word))` on the MultiVault | `has outcome`, `failed`, `missing-key` |

The agent atoms on 13579 are on ARP's testnet ERC-8004 registry `0xC165…0d5A`, a demo fixture (ADR
`0027`). On mainnet the subject is the canonical agent atom (`docs/12`).

### The term ids, read from the chain

Predicates, testnet 13579. "Uses" counts triples with that predicate, by any writer.

| Term | Term id on 13579 | Kind | As predicate on 13579 | On 1155 |
| --- | --- | --- | --- | --- |
| `uses` | `0x5c0bde1cc696456c0268248c4656acdf9621fdb39e605bc99b0a83dc8ff6e800` | pinned `Thing` | 192 | same id, 188 |
| `in context of` | `0x61a88b9c372c0d164d2caf66947b67ed0fcb4c457178a271b6b3dc39fb1f8862` | pinned `Thing` | 48 | **another atom**, `0x892054b01d389bfe566166120470f572a56e3d4cd88c599b52c4708949625390`, 1,229 |
| `has outcome` | `0xa72b54260675ac655230b9d16f853f913ba98cc87a5fbc0934f8e9c978cff264` | plain string | 12 | does not exist |
| `because` | `0xe188e93174034a79b15bd58449d42ae9e7f43e2523fdca5061e9cafdbb51702c` | plain string | 11 | exists, 0 |
| `needs` | `0x8d4bd8f2ca7f4b33d7a75d831a82c56b4fcb5ae3be86001dd9d94501341986d9` | plain string | **does not exist yet** | does not exist |
| `with` | `0x7a12f602febf92f0b79d06919fc136f48598f01321af9c3beae7ed7aae5a8eca` | plain string | 1 | exists, 0 |
| `paid with` | `0x555e6e0864ceabc0edae2b5607c00daa866259ed0f2c9ceb6a2bc20da67cf238` | plain string | 3 | does not exist |
| `has evidence` | `0x010057d90d7b6f0ecdb5c37e6bac9531881178a94603c7a50834a0f7a42795d5` | plain string | 61 | does not exist |
| `version` | `0x9622ec9e9e8265253328648119d02f85234737b991cf34ac9416b163b6e10230` | plain string | 28 | exists, 0 |
| `has type` | `0xa632a94306ab1d56911cff8c06473659a7caa2dfec6de3921bc23ec8ebf96ced` | pinned `Thing` | 767 | same id, 57,574 |
| `has tag` | `0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5` | pinned `Keywords` | 54,631 | same id, 58,269 |
| `is a sub-domain of` | `0x9c2e2f2018dbfaa74fd3fd86cd54a62b16e771936f5d342e3751db8d0c046f80` | plain string | 313 | does not exist |
| `same as` | `0xbeebfb7d177cbd96ffc239d2196c72ec346efe81f39dc595773f13d83506f5f0` | pinned `Thing` | 815 | same id, 30,913 |

Objects:

| Term | Term id on 13579 | As object on 13579 |
| --- | --- | --- |
| `worked` | `0x64efdf97dae63d10ff6cf895060dad30e81e0b1c07bd499467201f718540a459` | 5 |
| `failed` | `0x8be29a343e243d85e41bced19b5f6f3aa8510cf61c3d42a4d9120f0750b0c625` | 7 |
| `missing-key` | `0x175c1efd08ed3f4e665fe49d91f7d4680d8ac3b6a8c92ba117f02c1b1fde272d` | 1 |
| `missing-program` | `0x9c124e2e9d9b6eaa7ac0dbe9766eccfaa89d222e7438c5cde4228cbd57bda258` | 1 |
| `missing-file` | `0x55c49b9a6610f63b8e61e77ec4b2af65433ec1c2e82bd00040bf884f81aded40` | 2 |
| `not-the-right-tool` | `0x52454a716e8bc1bebc441b156b5175c29427a64c6e40e6b9610caf800fe82f99` | **does not exist yet** |
| `no-delivery` | `0x3a48b603931eeb02ec51b55272c943755308013b98c44f4255e413963e9f78b7` | 2 |
| `tool` (the tree's root) | `0xd6cc02f562e37deba5f949487a3d29fead3f71934d43b41b4fb2fe10c062ca3e` | 36 |
| `Skill` | `0xba57c5daf6c9b8b7821406db1bff01427b385a4a041f2ddd5cf004e80949610c` | 6 (5 on 1155) |
| `MCP Server` | `0xb52bb294a1cbf67a3fccc6bc8423e0758a11acfeb60caf6a0465ffca9ec3ae79` | 72 (68 on 1155) |
| `AIAgent` | `0x800342c0ded1c288e69f39a2dc96d8cff9b242e9f573193e6e0a849e5315d3e9` | 292 (28,648 on 1155) |

A word that "does not exist yet" has its id already: a plain-string atom's id follows from its bytes,
so the first writer creates it at that id. The id in the table is what the MultiVault returns for the
word; nothing was hashed locally (`declare/multivault.ts` `atomDataForUri` explains why that matters).

Two things follow for a reader:

- **A plain-string word is not ARP's alone.** Anybody's triple with the same word has the same
  predicate id. On 13579, `with` has 1 triple and none hangs from an ARP outcome; `has evidence` has 61
  and none names a content receipt (queries 3 and 5). So a reader keys on the **structure** (a `with`
  whose subject is the outcome of a `uses` line) and never on the predicate alone.
- **`in context of` differs by chain.** Read it by label on the chain you index, never copy 13579's
  (`data/deployments/13579.json`, its `endpointBinding` note).

## 2. The closed vocabularies

On a graph that deletes nothing, free text fragments for ever, so every word is from a closed list
(`packages/protocol/src/declare/usage-words.ts`, re-exported by `declare/usage-context.ts`).

| Part | Values |
| --- | --- |
| Outcome | `worked`: the agent used the subject for what it is for, and its task finished with it. Not that the result is right: ARP gives no verdict (ADR `0049`, `0164`). `failed` |
| Reason, after `failed` | `missing-key`, `missing-program`, `missing-file`, `not-the-right-tool`, `no-delivery` (paid and nothing came back, written with `paid with`) |
| Name, after `needs` or `with` | a program, `^[a-z0-9][a-z0-9._+-]{0,39}$`, or an environment variable's name, `^[A-Z][A-Z0-9_]{2,63}$`, never a value, and only a name the skill's own SKILL.md holds (`declare/line-need.ts`, ADR `0166`) |
| Domain | a node of ARP's domain tree |

### The domain tree

A node is a plain-string atom; an edge is `(child, is a sub-domain of, parent)`; a skill is filed with
`(skill, has tag, node)` at its deepest node only (ADR `0074`). The top three levels are OASF 1.1.0's
skills taxonomy, pinned in `data/catalogue/oasf-1.1.0-skills.json`; ARP's own nodes below it come from
agents' signed requests (ADR `0146`, `0150`, `docs/25` §8–9).

**The tree is a reading, not the chain.** Anybody can write `(X, is a sub-domain of, Y)`. ARP's tree is
the edges its three attestor wallets hold a position on (`packages/protocol/src/arp/attestors.ts`):
`0x906f3A52ec089f8D4E9127F91C6bE5Ae0d18f91f`, `0xE596096F4176b682E300d73963e7B04B383C1AA1`,
`0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9`. Query 6: 313 such edges on 13579, 243 of them held by
an attestor, 14 nodes directly under `tool`. The reference reader, which also breaks ties between two
parents by shares, is `readDomainTree` (`packages/protocol/src/domains.ts`).

**Three of the four domains lines name today are not in the tree.** `video` reads `video → computer
vision → tool`; `document`, `development` and `presentation` have no attested parent (query 6). They
predate the move to OASF (ADR `0150`), and the skill lines feed writes them `null`.

### Proximity

ARP's own search weighs a line by how near its domain is to the domain searched
(`packages/protocol/src/pulse-score.ts` `lineWeight`, `SIGNAL_WEIGHTS`):

| The line's domain | Weight |
| --- | --- |
| the domain searched, or the search names none | 1 |
| any node below it, or any node above it except the root `tool` (`apps/mcp/src/handlers/pulse.ts:553-557`) | 0.5 |
| anything else | 0: the line does not concern this search |

`not-the-right-tool` counts only in the domain it names. A failure for lack of something the reader
says it can supply (a key, a program, a file) weighs 0 for that reader. These are first guesses, and
`docs/28` says what they are worth in simulation: domain proximity was not shown useful on the one pair
of domains tested.

## 3. Evidence, and how a reader checks it without ARP

A line is its writer's word. Evidence is what a reader can check beyond it. ARP weighs every kind at 1
today (`docs/28`): a self-hire passes every check, so two keys are not two parties.

| Evidence | On the line | What it proves | What it does not |
| --- | --- | --- | --- |
| x402 payment | `(T3, paid with, eip155:<chain>/tx/<hash> <url>)` | a transfer from the writer (or its agent's `agentWallet`) to a payee, of an amount, on a chain | that the endpoint failed to deliver |
| The payer's signature | none: kept by the sponsoring service, carried by the x402 feed | the payer signed this line's words, this payment and the terms paid against | anything about the endpoint |
| Content receipt (0.0.6) | `(T3, has evidence, content-receipt:<hash>)` | ARP's node served these exact files to this agent's key at this time | that the agent used them |

### An x402 payment

1. Read the receipt on the paying chain, with that chain's own RPC: `eth_getTransactionReceipt`.
2. The payment is the `Transfer` log (first topic `0xddf252ad…3ef`). Its `address` is the asset, the
   second topic ends with the payer, the third with the payee, `data` is the amount. Read the payer
   there, never from `tx.from`, which for x402 is the facilitator.
3. The payer must be the line's writer, or the `agentWallet` of an ERC-8004 agent the writer holds.
4. The URL after the space must reduce to T1's subject (`declare/tool-thing.ts` `normaliseToolUrl`,
   `endpoint-redaction.ts`).
5. **The payee.** Since request version 5 the payer signs `payTo`, `asset`, `price` and `termsAt`; the
   transfer must pay that `payTo` at least that `price`. Whether `payTo` is the endpoint's payee is a
   reading of the endpoint's own `402`, recorded as `payee_check` (`probe`, `live` or `unchecked`).
   Call the endpoint yourself to compare.

The commands are in `apps/web/public/docs/x402-feed.md` § How to check a record. The reference
checker is `packages/protocol/src/x402-payment.ts` (`checkX402Payment`). ARP holds no account on the
paying chain and signs nothing there.

### The payer's EIP-712 signature

The agent signs an EIP-712 `LineRequest`, domain `{name: "ARP Line Request", version, chainId: 13579}`,
no `verifyingContract`; version 6 since CLI 0.0.6, version 5 still read in the feed
(`packages/protocol/src/sponsor/line.ts`). For an x402 line the sponsoring service keeps it and serves
it at `GET https://sponsor.arp.intuition.box/line-request?payment=<network>/tx/<hash>`; the feed carries
it as `signed_request`. Recover the signer over `typed_data` and compare it with `payer`, then compare
`message`'s payment, outcome, reason, domain and endpoint with the record (`x402-feed.md` § Who signed
the line has the viem code). ARP can leave a request out; it cannot make one up.

### A content receipt (0.0.6)

1. Fetch the receipt: `GET https://sponsor.arp.intuition.box/receipt?hash=<hash>`, the `<hash>` the
   atom names.
2. Recompute its EIP-712 hash (`contentReceiptHash`, `line-evidence.ts`): it must equal `<hash>`.
3. Recover the signer over domain `{name: "ARP Content Receipt", version: "1" | "2", chainId}`
   (`receipt.ts` `verifyContentReceipt`), and decide whether you accept that signer. ARP's sponsoring
   service accepts the nodes in its `SPONSOR_CONTENT_SIGNERS`; your list is yours.
4. Check the receipt's `to` is the line's agent, `atom` is the line's subject, and `digest` is `V`'s
   digest. A receipt over other files is not evidence for this line (`checkReceiptEvidence`).
5. Recompute `digest` yourself: fetch the repository at the receipt's `commit` and run the command in
   section 1 on the directory at `path` (`content-bundle.ts` `bundleMatchesReceipt`).

Not built: a signed MCP response, as evidence for a server (task 127 §4, deferred). A line about an
MCP server carries no evidence level today.

## 4. The feeds ARP publishes

Dated snapshots built from the chain by scripts in `scripts/build/`, served at `https://arp.intuition.box`.
Each says the chain its lines were read on in `trace` (`source.trace` in `arp-usage.json`): `eip155:13579`.

```
curl -s https://arp.intuition.box/feeds/skill-lines.json | jq '{schema, generated_at, skills: (.skills|length), lines: ([.skills[].lines[]]|length), outside: ([.skills[].lines[]|select(.arp_test|not)]|length)}'
```

| Feed | Schema | Built by | Read 2026-11-11 |
| --- | --- | --- | --- |
| `/feeds/skill-lines.json` | `arp.skill-lines/1` | `build-skill-lines-feed.ts` | built 2026-11-10T10:44:54Z: 10 skills, 10 lines, 0 outside ARP's own tests |
| `/feeds/arp-usage.json` | `arp.usage/1` | `build-arp-usage-feed.ts` | built 2026-11-10T14:46:42Z: 10 skills, 0 with a score |
| `/feeds/x402-outcomes.json` | `arp.x402-outcomes/4` | `build-x402-feed.ts` | built 2026-11-11T13:47:03Z: reads Base 8453, 0 records, 2 skipped (Base Sepolia not read) |
| `/feeds/x402-outcomes-test.json` | `arp.x402-outcomes/4`, `"test": true` | `build-x402-feed.ts --test` | built 2026-11-11T15:50:11Z: reads Base Sepolia 84532 only, 1 record, `signed_by_payer: true` |

- **skill lines**: one entry per skill, one record per line: writer, agent atom, domain (a tree node or
  `null`), outcome, reasons, needs, with, `arp_test`. No free text reaches the file. Schema `/1` has
  **no version field**: since 0.0.6 a versioned line is rolled up into its skill and does not say which
  version. Page: `apps/web/public/docs/skill-lines-feed.md`.
- **arp-usage**: a proposed HCS-28 adapter output computed from the skill lines feed
  (`packages/protocol/src/arp-usage.ts`, task 115): one wallet one latest outcome, a missing key,
  program or file not held against the skill, silent below 3 wallets, then
  `score = 100·(0.5 + confidence·(rate − 0.5))`, `rate = (W+1)/(n+2)`, `confidence = 1 − exp(−n/20)`.
  It is already on 0–100. It is a proposal for one reader, not ARP's score.
- **x402 outcomes**: one record per paid line whose payment checks on its chain, with the signed request
  and `payee_check`. Page: `apps/web/public/docs/x402-feed.md`, where versions 1 to 4 are described.

A feed is a convenience. The chain is the source: every field can be re-read from 13579 and, for a
payment, from its own chain.

## 5. Querying the chain directly

Indexer: `https://testnet.intuition.sh/v1/graphql`. Each query below was run by
`scripts/measure/signal-generator-queries.ts` on 2026-11-11; its full output is
`data/measurements/signal-generator-queries-2026-11-11.txt`.

**Query 1, every line's outcome, walked back to T1.**

```graphql
query Outcomes($hasOutcome: String!) {
  triples(where: {predicate_id: {_eq: $hasOutcome}}, order_by: {created_at: asc}) {
    term_id created_at creator_id
    object { label }
    subject_term { triple {
      term_id predicate { label } object { label }
      subject { label }
      subject_term { triple { term_id subject { label } predicate { label } object { label } } }
    } }
    positions(where: {shares: {_gt: "0"}}) { account_id }
  }
}
```

With `hasOutcome` the id in section 1: **12 outcomes, every one created by an ARP wallet and about one
of ARP's test agents** (ids 1 to 43, `apps/web/src/data/arp-test-identities.json`). No third party has
written a line on 13579. One of them, as the indexer returns it:

```
outcome 0xd624f074…  failed
  T2 (in context of) video
    T1 (uses) Agent 13579:6 → github.com/nateherkai/herk-edit-kit?skill=cut-silences
  positions: 0x906f3A52ec089f8D4E9127F91C6bE5Ae0d18f91f
```

**Query 2, one line read forward**, a level at a time from a T1 term id. Without bun:

```
curl -s https://testnet.intuition.sh/v1/graphql -H 'content-type: application/json' \
  -d '{"query":"query($t:[String!]!){triples(where:{subject_id:{_in:$t}}){term_id predicate{label} object{label}}}","variables":{"t":["0xd2d718776d0a7ff6dd32185b6cc689d1f5ece14d1d9c0e90803884093ab80450"]}}'
```

It answered `in context of video` (`0xdf6c86a8…`) and `has outcome failed` (`0xb1817111…`, the same
agent's line with no domain). Feeding `0xdf6c86a8…` back gives `has outcome failed`, then `because
missing-key`, then nothing.

**Query 3, the 0.0.6 shapes.**

```graphql
query Versioned($uses: String!, $version: String!, $hasEvidence: String!) {
  versioned: triples_aggregate(where: {predicate_id: {_eq: $uses}, object_term: {triple: {predicate_id: {_eq: $version}}}}) { aggregate { count } }
  versions: triples_aggregate(where: {predicate_id: {_eq: $version}, object: {label: {_like: "sha256:%"}}}) { aggregate { count } }
  receipts: triples_aggregate(where: {predicate_id: {_eq: $hasEvidence}, object: {label: {_like: "content-receipt:%"}}}) { aggregate { count } }
}
```

`versioned` 0, `versions` 0, `receipts` 0. To read a skill's lines with their versions in one request,
ARP's own reader uses `PULSE_VERSIONED_USES_QUERY` (`packages/graphql/src/queries/pulse-usage.ts`): a
`uses` edge whose object is the skill, or a triple `(skill, version, …)`.

**Query 4, lines that name a payment**: `triples(where: {predicate_id: {_eq: <paid with>}})` returned
3, all on Base Sepolia (`eip155:84532`), ARP's own demo: two against a seller on the payer's machine
(`127.0.0.1`), one against `https://seller.arp.intuition.box/x402-demo/no-delivery`.

**Query 5, reasons and names on these lines**: on the 12 outcomes, `because` gives `missing-file` 2,
`no-delivery` 2, `missing-key` 1, `missing-program` 1; `with` none; `needs` does not exist. Elsewhere on
13579 the same `because` predicate has 11 triples in all, so 5 are someone else's (query 5's
`because_anywhere`), which is the point of keying on structure.

**Query 6, the tree as ARP reads it**:

```graphql
query Tree($subDomainOf: String!, $attestors: [String!]!) {
  attested: triples(where: {predicate_id: {_eq: $subDomainOf}, positions: {account_id: {_in: $attestors}, shares: {_gt: "0"}}}, limit: 1000) {
    subject { label } object { label }
  }
}
```

The attestors are checksummed: the indexer returns `positions.account_id` checksummed and a lower-case
filter matches nothing (`domains.ts`). The indexer also caps a nested `positions` list at 100 with no
order; filter on positions in `where`, as here, rather than listing them.

**Who stands behind a level.** On a sponsored line the sponsoring service creates the triple and then
deposits in the agent's name, so `creator_id` is ARP's wallet and the agent's wallet holds a position.
A level counts for a wallet that created it or holds a position on it; a wallet that only paid says
nothing by paying (`docs/28` § How a line is written, ADR `0144`). Query 1's positions show both.

## 6. What ARP does not produce, and what an adapter decides

ARP does not produce:

- **Social relations.** No person-person edge, no follow, no trust between people. ARP's only relation
  between parties is a use: `(agent, uses, agent)` exists on 13579 (query 1: `Agent 13579:3` uses
  `Agent 13579:2`), and a hire is the same shape (`docs/32`, the hire column).
- **A single global score.** `arp_pulse` orders one search and returns the parts of its score (prior
  from the search rank, the weights of section 2, a 3-wallet threshold; ADRs `0137`, `0138`, `0143`).
  It is per search and per domain, never a number attached to a subject. `arp-usage` is a proposal for
  one reader.
- **A verdict.** `worked` says the task finished with the subject, not that the result was right (ADR
  `0049`).
- **An amount in the score.** ARP never reads the size of a deposit (ADR `0138`).
- **A person's text.** Every word on a line is from a closed list or passed a shape check, and the
  feeds carry no free text (`skill-lines-feed.ts`, its header).

An adapter decides for itself:

- **Which writers it trusts**: the composition graph. ARP's tree is three attestor wallets; its own
  test wallets and test agents are listed at `apps/web/src/data/arp-test-identities.json` (served at
  `/test-identities`), and today every line is one of them.
- **How a wallet becomes a judge**: creator, position holder, or the ERC-8004 owner of the agent atom
  (`ownerOf` on the registry `same as` names).
- **The weighting**: of outcome against context, of domain distance, of evidence, and of age. ARP's
  weights are its own and first guesses.
- **Whether to read versions apart** or roll them up to the skill.
- **The threshold**: ARP moves nothing below 3 wallets; one person can hold several.

## 7. Open questions for the shared ontology

1. **Same domain atoms, or a mapping?** Should the adapter's domains and sub-domains be ARP's tree's
   plain-string nodes under `is a sub-domain of` `0x9c2e2f20…`, or its own nodes mapped to ARP's?
2. **Who attests the shared tree?** ARP's three wallets, the adapter's, or a set both read?
3. **Which chain?** `is a sub-domain of`, `has outcome`, `paid with` and `has evidence` do not exist on
   mainnet 1155, and `in context of` is another atom there. Does the adapter index 13579 before a port,
   and who creates the words on 1155 first?
4. **Is proximity computed or published?** Should the adapter derive "near" from the tree itself, or
   does it want ARP to publish a proximity per pair of nodes, and at which weights?
5. **Plain strings or pinned atoms for the words?** A plain-string predicate is shared by unrelated
   writers (section 1). Should `has outcome`, `because`, `needs`, `with`, `paid with` and `has evidence`
   become pinned atoms with a description, at the cost of new ids?
6. **Which identity is the judge?** A sponsored line's creator is ARP's wallet and its holder the
   agent's; the agent's owner is read from the registry. Which one does the composition graph name?
7. **Where does the person-agent relation attach?** To the same agent atom ARP writes from, the one
   with `same as` to the CAIP-19, and with which predicate, so the micro-subgraph joins the two without
   a second identity?
8. **Score per subject, or per subject and domain?** ARP's outcomes are about a domain. Does the
   adapter keep one 0–100 per subject, one per pair, or both?
9. **Does evidence weigh more than 1 in the adapter**, knowing a self-hire passes every check ARP has?
10. **Does the adapter read deposit amounts on ARP's lines?** ARP does not. A line held on deposits costs
    far less than one written on 13579 (`docs/28`, `scripts/measure/line-cost.ts`), so reading amounts
    prices rank in a way ARP chose not to.
11. **Should the skill lines feed name the version?** Schema `/1` rolls versions up. A `/2` would add
    it, if the adapter reads feeds rather than the chain.

## Evidence ladder

This document serves the **skill** column at the **declared** tier, with the paths to **observed**
(a payment, a receipt) spelled out for a third party. It does not move ARP up the ladder: it makes the
declared tier readable by an adapter that might, one day, corroborate it.
