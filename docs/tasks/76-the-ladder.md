# Task 76 — The evidence ladder, ordered by who produced the signal

**Status:** in progress, 2026-11-09, on `docs/76-the-ladder` (worktree `../ARP-tree`), not pushed.
**ADR:** `0147`.
**Rules:** `workflow.md`, `claims.md`. Docs only (the user: « pour le moment on définit les docs »).

## The user's decisions, 2026-11-09

1. Tier 4 (an enforcer guarding ARP's own funds) is useless as an argument; tiers 1 and 2 are produced
   by ARP itself, through the hook and Intuition. Replace the ladder (« je pense que c'est mieux »).
2. Three tiers ordered by who stands behind a fact: declared, observed, corroborated.
3. Columns that cross it: skill, agent, and the hire of an agent for a specialised task with ERC-8004.
   Every actor answers to the same nested, contextual triples.
4. The enforcer is used in the hire column: the client's agent spends its operator's credits with an
   agent it found on ARP, then declares the result.
5. Reuse audited code as much as possible, as little custom as possible.

## Deliverables

1. `docs/32_THE_EVIDENCE_LADDER.md` — the canonical ladder, the three columns, where ARP stands, what
   tier 2 does not prove.
2. ADR `0147`.
3. `CLAUDE.md`, `.claude/rules/workflow.md`, `.claude/agents/task-verifier.md`,
   `.claude/learning/TEMPLATE.md` point at `docs/32`; `docs/09`'s header says §3 is replaced.
4. `.claude/STATE.md`.

## Do not do in this task

- Build the hire loop under a delegation: a task of its own.
- Rewrite past task files, post-mortems or ADRs that name the old tiers: append-only.
- Change the code comments that cite the old ladder as design history (`SourceMark.tsx`, `agent-trust.ts`).
