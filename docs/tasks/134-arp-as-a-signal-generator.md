# Task 134 — ARP as a signal generator, for an external adapter

**Status:** written 2026-11-11. Task 134, post-mortem `122`, allocated by the orchestrator. No ADR: the
document describes what is built and decides nothing.
**Rules:** `claims.md` (strictly: every figure has its command, every term id is read), `workflow.md`,
`portability.md`.
**Required skills:** `arp-contributing`.

## Why

An adapter reads Intuition in real time (an Intuition Core indexer into a graph database), ranks what it
reads and normalises a score to 0–100; a composition graph names the sources it trusts. Its ontology has
domains, sub-domains, and relations between people and between people and agents. The user met its
side on 2026-11-11: ARP positions itself as a first signal generator, bringing outcomes, evidence,
context and domain proximity; the adapter indexes the same ontology in a micro-subgraph; social relations
stay apart; context and outcomes both weigh. Versioning was settled the same day (task 127, ADR `0192`).

An adapter author needs one document that says what ARP writes, in which words, how to check it, and
what is left to decide.

## Deliverables

1. `docs/34_ARP_AS_A_SIGNAL_GENERATOR.md`, for an adapter author: (1) the on-chain shapes, today and from
   CLI 0.0.6, with the term ids on 13579 read from the chain; (2) the closed vocabularies and the domain
   tree with proximity; (3) each kind of evidence and how a reader checks it without ARP; (4) the feeds,
   with URLs and schema versions; (5) GraphQL queries run on 13579 and quoted; (6) what ARP does not
   produce and what an adapter decides; (7) open questions for the shared ontology, as questions.
2. `scripts/measure/signal-generator-terms.ts`: every word and constant a line uses, its id computed by
   the MultiVault (`calculateAtomId`) or read from the code, then read on both chains.
3. `scripts/measure/signal-generator-queries.ts`: the document's queries, run on 13579.
4. Their outputs, `data/measurements/signal-generator-terms-2026-11-11.json` and
   `data/measurements/signal-generator-queries-2026-11-11.txt`.
5. `CLAUDE.md`'s directory map names `docs/34`.

## Do not do in this task

- Name the adapter's company, cite the meeting notes, or point to the private business-development
  repository: this repository is public.
- Change a shape, a word, a weight or a feed. Gaps found go in section 7 as questions.
- Write on chain, on either network.

## Verification

- Both scripts run, and every figure in `docs/34` is in their output or in a command quoted beside it.
- Root `bun run check` (scripts typechecked by `tsconfig.scripts.json`, the web's token and contrast
  checks).
- `task-verifier`.

## Done, 2026-11-11

Written as specified. Read on 13579 on 2026-11-11: 12 outcomes, all created by ARP wallets about ARP's
test agents 1 to 43; 0 versioned `uses`, 0 `version` triples to a `sha256:` atom, 0 receipt evidence;
3 `paid with`, all Base Sepolia; `needs` and `not-the-right-tool` do not exist as atoms yet. On mainnet
1155, `has outcome`, `paid with`, `has evidence` and `is a sub-domain of` do not exist, and `in context
of` is another atom. Three of the four domains lines name are outside today's attested tree.

**Evidence ladder:** the skill column, declared tier, with the paths to observed spelled out for a third
party. It does not move ARP up: it makes the declared tier readable by an adapter.
