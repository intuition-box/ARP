# 122 — ARP as a signal generator, for an external adapter

**Task:** `docs/tasks/134-arp-as-a-signal-generator.md`
**Completed:** 2026-11-11
**Commit:** `uncommitted` (branch `worktree-agent-a101628547ab2c7cd`)
**Verifier verdict:** PASS

## What shipped

- `docs/34_ARP_AS_A_SIGNAL_GENERATOR.md` — for an adapter author: the line's shapes today and from CLI 0.0.6, every term id on 13579 with its count and its 1155 counterpart, closed words, the domain tree and proximity weights, how to check each kind of evidence without ARP, the four feeds, eight GraphQL queries run and quoted, what ARP does not produce, 11 open questions.
- `scripts/measure/signal-generator-terms.ts` — `calculateAtomId` on the MultiVault for each plain-string word, code constants for pinned atoms, both chains read, two columns never summed.
- `scripts/measure/signal-generator-queries.ts` — the doc's queries on 13579.
- `data/measurements/signal-generator-terms-2026-11-11.json`, `data/measurements/signal-generator-queries-2026-11-11.txt` — their outputs.
- `CLAUDE.md` — one directory-map line for `docs/34`.

## Surprises

- On 13579 every plain-string word ARP uses has other writers: `has evidence` 61 triples and 0 content receipts, `because` 11 with 6 on ARP lines. A reader has to key on structure, not on the predicate. The doc says so.
- `in context of` is a different atom on 1155 (`0x8920…5390`, 1,229 triples). `has outcome`, `paid with`, `has evidence` and `is a sub-domain of` do not exist on 1155 at all.
- Three of the four domains lines name today (`document`, `development`, `presentation`) are outside the attested tree.
- The 6 `has type Skill` triples on 13579 belong to another writer (`0x232C…F605`), not ARP.
- Verifier re-ran both scripts: the terms output matched byte for byte apart from the timestamp, and so did the queries output apart from its header line. The digest command reproduced `02705b83…0cba` on `skills/arp`.

## Decisions made

- None. The doc describes what is built; gaps went to section 7 as questions. No ADR.

## Rules touched

- `.claude/rules/claims.md`: sufficient. Every count came from a committed script, so check 6 held without a review round.
- Nit, left as is: §4 says every feed names its chain in `trace`. `arp-usage.json` carries it at `source.trace`, not at the top level.

## Suggestions for future tasks

- For a doc addressed to a third party, write the measurement script first and the doc from its output. That is why this one passed on the first round.
- For any word written as a plain string, report its count for every writer next to its count on ARP lines.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier, with the routes to observed (a payment, a content receipt) written out so a third party can check them. It does not move ARP up a tier: it makes the declared tier readable by an adapter.
