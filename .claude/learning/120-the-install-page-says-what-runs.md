# 120 — The install page says what runs today

**Task:** `docs/tasks/132-the-install-page-says-what-runs.md`
**Completed:** 2026-11-11
**Commit:** `20bd67a9` (on `f8abd06e`), branch `docs/132-install-doc`
**Verifier verdict:** PASS (round 2)

## What shipped

- `apps/web/public/docs/install.md` — page date, plugin check (0.0.5, `✔ Connected`), Desktop entry check, npm and Registry check (three entries, read `isLatest`), each dated and quoted; `--sponsored` marked **soon to be released** for `arp_get_skill` and `arp_declare_used`; `--list` names the four other skills.
- `apps/web/public/docs/mcp-tools.md` — the same note on `arp_get_skill`.

## Surprises

- Round 1 failed on three dated sentences, not on the numbers. Every figure re-ran exact on 2026-11-11 (`npm view`, the registry `curl`, the plugin in `node:22-bookworm`). What failed was the dates: re-dating a sentence moved its trailing "that day" onto a check nobody re-ran (skills.sh), and it left a pointer ("2026-11-10, see the plugin above") contradicting the section it pointed to.
- `claude plugin marketplace update` answers "Successfully updated marketplace", not "already at the latest version". "The update commands answered …" described only one of the two.

## Decisions made

- **0.0.6 removes the line, nothing more** — the note is a row cell, one paragraph and one mcp-tools note, so the release only deletes them. No ADR.

## Rules touched

- `.claude/rules/claims.md` — enough. Checks 5 and 6 caught it: when you change a date, read every relative time word ("that day", "see above") that inherits it.

## Suggestions for future tasks

- When re-dating a doc, grep the old date and also `that day|above|below` in the same file.
- Quote what each command actually printed, not what the commands printed as a group.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier. The page tells a tester exactly which routes work, so the lines they write come from working installs, and it does not move ARP up a tier.
