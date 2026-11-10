# 0185 — A skill's version is the digest of its directory, and a line will carry it

**Status:** Accepted (the decision). Not built: the code waits for the user's return.
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/115-the-hol-adapter.md`, deliverable C. The user chose « Empreinte du
dossier » and « ADR maintenant, code au retour » (2026-11-10).

## Context

A line is about a skill, named by its repository and its name (`(agent, uses, skill)`, `docs/28`). It
is not about a version. When the skill's files change, every earlier line stays attached to the new
files. That is the risk a check before install cares about most: a skill that worked for many agents
changes, and its record vouches for files nobody has used. HOL Guard's `verification.repo-commit-integrity`
says the files are the ones published; nothing says they were ever used.

Half of what a version needs exists. Each catalogued skill repository is pinned to a commit
(`data/catalogue/skill-pins-13579.json`). The content receipt names that commit since its version 2,
and its `digest` is a sha256 over a manifest of **every file of the skill's directory**, paths relative
to it, sorted, hashed again (`packages/protocol/src/content-bundle.ts`, `bundleManifest`,
`bundleMatchesReceipt`). A stranger recomputes it with `sha256sum`.

## Decision

**A skill's version is that directory digest**, computed the way `bundleManifest` computes it, over the
whole directory and never `SKILL.md` alone.

When it is built:

1. **The hook computes it where the skill ran**, from the directory it already finds (`skillDirectory`,
   `apps/hook/src/skill-failure.ts`), and the line carries it as one more level. Its predicate, and
   whether it hangs on T1 or on the outcome, are settled when the code is written, with
   `intuition-integrator`.
2. **A local edit writes no version.** A directory whose digest matches no published one gets no
   version level: tying the line to nothing is useless, and publishing that digest would say the person
   changed the skill.
3. **Scores are per digest.** `arp-usage` (`packages/protocol/src/arp-usage.ts`) and the feeds read the
   version when a line has one. Earlier lines stay visible and stop counting for a new digest: "12
   wallets on the previous version, 0 on this one".

## Alternatives considered

- **The repository commit.** Simpler to read, but it moves when any file of the repository moves, so
  a skill in a busy monorepo would change version every day without changing.
- **`SKILL.md`'s digest alone.** A changed script would keep the old version, which is the exact case
  this exists to catch.
- **Not now.** Kept the idea in `FUTURE.md` only; the user chose to settle the decision before leaving.

## Consequences

**Positive:**
- A score says which files it is about, and a change of files shows as a reset, not as a silent carry-over.
- The digest is the one the content receipt already signs, so a line and a receipt about the same files
  meet on one value.

**Negative:**
- Lines with no version (every line written before the code) count for no version. How a reader shows
  them beside versioned ones is open.
- One more level per line: one more fee on chain (`scripts/measure/need-level-cost.ts` gives the cost of
  a level on 13579).
- **Skills installed by a plugin** live outside `.claude/skills`, where `skillDirectory` does not look.
  Untested.

**Neutral (worth knowing):**
- 46 of 662 catalogued skills exist byte-identical at several paths of one repository (measured
  2026-10-29, cited in `packages/protocol/src/receipt.ts`). They share a digest. Whether their lines add
  up across atoms is a separate decision, not this one.
- The digest names public files only and says nothing about the person.

## References

- Task: `docs/tasks/115-the-hol-adapter.md` (C)
- `FUTURE.md`, "One score per version of a skill"
- Related ADR: `0138` (form B), `0166` (`needs` and `with`)
- Rule: `.claude/rules/claims.md`, `.claude/rules/portability.md`
