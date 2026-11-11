# 126 — The skills say what CLI 0.0.4 to 0.0.6 does

**Task:** `docs/tasks/138-the-skills-say-what-0-0-6-does.md`
**Completed:** 2026-11-11
**Commit:** uncommitted (worktree branch from `origin/dev` `af27f507`)
**Verifier verdict:** PASS (second pass; the first failed on three sentences)

## What shipped

- `apps/cli/assets/plugin-skill.md` — 0.2.0: the hook's closing line, ADR `0191`'s sharing question (wait for the person's own answer, never `arp-share:` in the asking message), what a shared line says.
- `skills/arp/SKILL.md` — 0.2.0: the three hosted services, the `uses` read with `_or` on `object_term` for versioned lines, the `version` id, form B with the 0.0.6 levels, the sponsored tool set and when to call `arp_declare_used`, the connector's key qualified.
- `packaging/claude/arp/skills/arp/SKILL.md`, `packaging/gemini/arp/ARP.md` — regenerated.
- `.claude/STATE.md` — row 138 and header.

## Surprises

- First pass failed on three sentences. Every one of them was a paraphrase of a source that was right somewhere else in the same diff:
  - the plugin skill said an x402 line "names the terms" (they are in the signed request the sponsor keeps, `docs/34` §3);
  - the version came from `HEAD` only (ADR `0192` §3 also accepts a node receipt's digest);
  - the agent key was "created by a writing tool" (`handlers.ts:4` says any of the mode's three tools).
- The task file and STATE carried the same wrong wording as the skill. The fix needed a grep across all four files.
- The versioned query, extracted from the shipped skill and run on both indexers: no errors, 3 rows on 13579, 0 on 1155.
- Verifier re-ran it from the shipped file (same result) and counted `uses` edges whose object is a `version` triple: 0 on 13579, 0 on 1155, 2026-11-11. The skill's "no versioned edge on either chain" holds; its citation (`docs/34` query 3) covers 13579 only, the 1155 half rests on `docs/34`'s term table (`version`: exists, 0).
- Verifier advisories, not blocking: "The words are plain strings" in the published skill is loose (`uses`, `in context of`, `has type` are pinned Things); the sharing question also needs a skill with a public GitHub source (`offerShare`), which neither skill says.

## Decisions made

- **No ADR** — semver bump; each sentence restates ADRs `0186`, `0189`, `0191`, `0192`, `0196`, `0110`.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Check 5 (grep the old wording) caught the task file and STATE copies.

## Suggestions for future tasks

- When two skills state the same fact, write the precise one first and derive the shorter one from it. Check the shorter one against the source, not against the other skill.
- Run a skill's GraphQL from the file as shipped (extract the fenced block), not from a copy kept beside it.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier. It does not move ARP up: it keeps declared lines accurate about which version of a skill they name and who agreed to send them.
