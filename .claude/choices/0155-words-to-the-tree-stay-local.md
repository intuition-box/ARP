# 0155 — A word names a node through a local alias table; the words never leave the machine

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09, task 84

## Context

Task 79 put OASF's names at the top of the tree (ADR `0150`). They are precise and nobody types them. The
places that take a domain matched a node's name word for word, so "slides" named nothing, and an agent
refused could add `slides` as a new sub-domain beside `presentation authoring`, splitting lines between two
nodes. The hook went further: it guessed a failure's domain with a keyword table that names the old
categories, which no longer exist.

A matcher was measured for task 79 (`data/measurements/oasf-classifier-2026-11-09.json`): running it locally
needs about 700 MB (a 133 MB model, a 536 MB runtime) and 360 MB of memory, measured on 2026-11-09; running it
on a server would send people's words to ARP.

## Decision

1. **A table of aliases**, `data/catalogue/domain-aliases.json`, maps words people use to nodes; every target
   is checked against the OASF pin by a test.
2. **Resolved locally** by `resolveDomain` and `domainInText` (`packages/protocol/src/domain-words.ts`), in the
   MCP server, the CLI and the hook. An unknown word is refused with the closest nodes, so an agent picks one
   before it adds a sub-domain.
3. **The words never leave the machine** (the user, 2026-11-09: « je ne veux jamais récupérer le texte de
   l'utilisateur »). No hosted matcher and no embedding API, for the search or for declaring.
4. **The hook takes a failure's domain from the person's words, else from where the skill is filed**
   (`data/catalogue/skill-nodes-13579.json`), and records only a node of the tree.

## Alternatives considered

- **A local model** — about 700 MB and 360 MB of memory for a plugin.
- **A hosted model** (ARP's server or Workers AI) — sends people's words to ARP; refused by the user.
- **A measured search campaign first** — the user judged it overkill while no third-party line exists.

## Consequences

**Positive:** an agent's "slides" lands on `presentation authoring`; a refusal names where to go instead.

**Negative:** the table is curated by hand and will miss words; a miss is a refusal with suggestions, not a
wrong node. The skill-to-node table is a snapshot of task 79 and grows only when it is regenerated.

**Neutral:** `classifySkill` and its keyword table remain for the seeding and audit scripts only.
