# 0150 — The domain tree is OASF's skills taxonomy, and ARP adds depth below it

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09, task 79

## Context

ARP's tree was 24 categories ARP chose itself, filled by a keyword table and two filing runs. ERC-8004
points at OASF (AGNTCY, Linux Foundation, Apache-2.0) for an agent's skills and domains, as flat optional
lists in off-chain files. Read against OASF, ARP's categories were coarse and often wrong: per skill, 290 of
662 land outside their old category's OASF subtree (`data/catalogue/oasf-skill-tags-proposal-13579.json`).

## Decision

The user's decisions, 2026-11-09:

1. **The top of the tree is OASF's skills taxonomy, pinned at 1.1.0** (`data/catalogue/oasf-1.1.0-skills.json`,
   with its notice). A node's atom is OASF's caption, normalised; OASF's multi-word names are kept as they
   are, an exception to ADR `0088` that holds for OASF nodes only.
2. **ARP adds depth below OASF**, as deep as use needs, by agents' signed requests (ADR `0146`), with the
   one-word rule. ARP keeps two nodes of its own: `design` under Web Development [602], `card` under
   Payments Integration [120304]. A category OASF names with several words is not split word by word: its
   OASF children are the split, and words a person types go to an alias table for the search.
3. **The OASF id is not on chain.** The pinned file maps a name to its id, and the next OASF version is a
   new pinned file and a mapping. This replaces an id edge per node, which would have cost about 480 more
   writes on testnet.
4. **Only nodes that carry something are written**, with their ancestors; the rest of OASF is offered as
   suggestions off chain.
5. **Testnet is the bench, mainnet starts empty.** Nothing of ARP's old categories is carried: what does not
   map is retired by redeeming the attestors' positions, and no `same as` layer is kept for them.
6. **Filing a skill is a person's or an agent's act; the machine only suggests.** A classifier was measured
   (`bge-small-en-v1.5`, pinned): 31% exact agreement with the reviewed proposal, 58% on the category, 86%
   [76–93] on the tenth it is surest of. Too weak to file alone; good enough to offer three candidates.
7. **Finding is where the machine works**: a person's or an agent's words are matched to the nearest OASF
   nodes (embeddings, plus aliases), because a wrong guess there costs a search, not a permanent write.
   How and where that model runs is a task of its own.
8. **Copies of one skill:** the original repository's listing is shown when it can be found; otherwise every
   copy is shown, and contexts and lines tell them apart. The original of 156 copied listings,
   `inference-sh/skills`, is not in the catalogue; listing it is part of this task.

## Alternatives considered

- **Keep ARP's own categories and map them to OASF** — two vocabularies, and the old ones are wrong for
  nearly half the skills.
- **Split OASF's multi-word categories word by word** — the words duplicate OASF's own children and are not
  concepts on their own ("business", "professional").
- **The OASF id on an edge** — about 480 writes for what a pinned file does for free.
- **File automatically above a confidence threshold** — the user chose no automatic filing.

## Consequences

**Positive:**

- One vocabulary with ERC-8004's readers; a feedback carrying `oasf.skills` lands in ARP's tree directly.
- ARP owns only the depth, which its agents grow from real use.

**Negative:**

- OASF renumbers between versions (15 → 18 categories from 0.8.0 to 1.1.0); a version change is a migration.
- OASF names are not what people type: the search needs aliases and a matcher before this is usable by words.
- Lines written today with an old category as their domain lose it from the tree (testnet test lines).

**Neutral (worth knowing):**

- The proposal was produced by a model reading truncated descriptions; the 68 low rows were reviewed, the
  rest were not read by a person.
- Agents' suggested sub-domains (`inference`, `storyboard`, `pricing`…) are kept in the proposal, not seeded.
