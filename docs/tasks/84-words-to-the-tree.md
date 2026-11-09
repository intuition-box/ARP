# Task 84 — Words to the tree

**Status:** verified 2026-11-09, `task-verifier` PASS (round 2), commit `49f186d`, post-mortem `.claude/learning/75-words-to-the-tree.md`; on `feat/84-domain-aliases`, not pushed.
**ADR:** `0155`.
**Rules:** `code.md`, `claims.md`, `workflow.md`.

## Why

Since task 79 the tree's nodes are OASF names nobody types ("presentation authoring"). An agent declaring a
use "in slides" was refused, and could then add `slides` as a new sub-domain beside the node that means it:
two nodes, lines split between them, neither reaching three wallets. The user, 2026-11-09: the point is that
agents declare in the right categories; and « je ne veux jamais récupérer le texte de l'utilisateur ».

## The user's decisions, 2026-11-09

1. A table of aliases, local, rather than a model or a measurement campaign (« c'est pas overkill ? »).
2. The words never leave the machine: no hosted matcher, no embedding API.

## Deliverables

1. `data/catalogue/domain-aliases.json`: 106 words → a node, every target checked against the OASF pin; 85
   reach a node written on 13579, the other 21 name OASF nodes not written yet.
2. `packages/protocol/src/domain-words.ts`: `resolveDomain` (a node by name or alias, else the closest
   nodes), `domainInText` (a node or an alias found whole in a sentence). Pure, tested.
3. Wired where a domain is given or guessed: `arp_declare_used` (an alias names the node; an unknown word is
   refused with the closest nodes), `arp line` (the same), `arp_file_category` in the sponsored mode (a
   word for an existing node files under it), `arp_pulse` (a given domain or one found in the words).
4. The hook: a failure's context is a node found in the person's words, else the node the skill is filed at
   (`data/catalogue/skill-nodes-13579.json`, built by `scripts/build/build-skill-nodes.ts` from task 79's proposal). The keyword table that named
   the old categories is no longer read there; a domain the hook records must be a node of the tree.

## Do not do in this task

- A model, a hosted matcher, or anything that sends a person's words off the machine.
- Hiding copies in the search, suggestions when filing from a classifier, a measurement with real sessions:
  left for when lines exist.
