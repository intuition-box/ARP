# 0155 — A word names a node through a local alias table; the words never leave the machine

**Status:** Accepted. Amended by ADR `0161` (2026-11-10): ARP's hosted read-only MCP endpoint receives the words of a caller who chooses it, and keeps none; point 3 holds for everything a person installs.
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09, task 84

## Context

Task 79 put OASF's names at the top of the tree (ADR `0150`). They are precise and nobody types them. The
places that take a domain matched a node's name word for word, so "slides" named nothing, and an agent
refused could add `slides` as a new sub-domain beside `presentation authoring`, splitting lines between two
nodes. The hook went further: it guessed a failure's domain with a keyword table that names the old
categories, which no longer exist.

A matcher was measured for task 79 (`data/measurements/oasf-classifier-2026-11-09.json`, accuracy only). Its
footprint was measured separately, once by hand on 2026-11-09 and not committed: for `Xenova/bge-small-en-v1.5`
(fp32) with `@huggingface/transformers` 3.7.5, about 700 MB on disk (the model 133 MB, `onnxruntime-node` 536 MB)
and about 360 MB of memory. Running it on a server instead would send people's words to ARP.

## Decision

1. **A table of aliases**, `data/catalogue/domain-aliases.json`, maps words people use to nodes; every target
   is checked against the OASF pin by a test. 85 of the 106 reach a node written on testnet 13579; the
   other 21 name OASF nodes not written yet and resolve to nothing until a skill is filed there.
2. **Resolved locally** by `resolveDomain` and `domainInText` (`packages/protocol/src/domain-words.ts`), in the
   MCP server, the CLI and the hook. An unknown word is refused with the closest nodes, so an agent picks one
   before it adds a sub-domain.
3. **The matching runs locally; no word is sent to ARP or to a matcher** (the user, 2026-11-09: « je ne veux jamais récupérer le texte de
   l'utilisateur »). No hosted matcher and no embedding API, for the search or for declaring.
4. **The hook takes a failure's domain from the person's words, else from where the skill is filed**
   (`data/catalogue/skill-nodes-13579.json`, built by `scripts/build/build-skill-nodes.ts`), and records only a
   node of the tree.

## Alternatives considered

- **A local model** — about 700 MB on disk and 360 MB of memory for a plugin (the hand measurement above).
- **A hosted model** (ARP's server or Workers AI) — sends people's words to ARP; refused by the user.
- **A measured search campaign first** — the user judged it overkill while no third-party line exists.

## Consequences

**Positive:** an agent's "slides" lands on `presentation authoring`; a refusal names where to go instead.

**Negative:** the table is curated by hand and will miss words; a miss is a refusal with suggestions, not a
wrong node. The skill-to-node table is a snapshot of task 79 and grows only when it is regenerated.

**Neutral:** `classifySkill` and its keyword table remain for the seeding and audit scripts only.
