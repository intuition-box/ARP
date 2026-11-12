# 130 — The backlog leaves the public repository, and a short README for users

**Task:** `docs/tasks/142-the-backlog-leaves-and-a-short-readme.md`
**Completed:** 2026-11-12
**Commit:** `43b6d4ba`, `09edc028` on `task-142-future-readme`, rebased onto `dev` `692a13d8` (uncommitted post-mortem)
**Verifier verdict:** PASS (second pass; the first failed on three README claims and the ADR index)

## What shipped

- `FUTURE.md` — deleted; a byte-identical copy is committed in the private backlog repository (checked with `cmp` against `git show 314dd77f:FUTURE.md`).
- `.claude/rules/workflow.md` — a deferred idea goes to the backlog kept outside this repository (ADR `0202`).
- `CLAUDE.md`, `.claude/STATE.md`, `.claude/skills/arp-contributing/SKILL.md`, `docs/33_THE_HIRE_LOOP.md`, seven code comments — references rewritten; append-only records keep theirs.
- `README.md` — short, for a user, after `docs/30`.
- `apps/web/public/docs/developers.md` — each piece's README table and the `@arp-protocol/core` example, moved from the old README.

## Surprises

- The first README draft was wrong in three places, and each read well: "your words stay on your machine", although a search's words go to skills.sh (`what-arp-publishes.md`); "shows what each one asks of you" for MCP servers and agents, although `docs/30` allows only matches in a skill's files; the ask-once share question stated for every route, although only the plugin carries the hook.
- Public files written before this task already name the private repository (`docs/09`, `docs/tasks/27`, `docs/tasks/115`, two `STATE.md` rows, a design doc). This task did not touch them.

## Decisions made

- **Backlog kept privately, named by no path in public text** — the user's decision. ADR: `.claude/choices/0202-the-backlog-leaves-the-public-repository.md`.

## Rules touched

- `.claude/rules/workflow.md` — changed (scope discipline's destination), ADR `0202`.
- `.claude/rules/claims.md` — sufficient; check 3 (cite the source) caught the three README sentences.

## Suggestions for future tasks

- When a short public text summarises a privacy page, check each "stays local" sentence against that page's "what reaches another server" list, not only its "what is written" list.
- A claim about what ARP shows must name the kind of thing it shows it for (skill, MCP server, agent): `docs/30` allows it per kind.
- Decide whether the older public mentions of the private repository should go too; this task's rule covers only new text.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

The skill column at the declared tier: the README says what ARP shows before an install and that every result about a skill so far is ARP's own (`data/measurements/line-writers-2026-11-12T0845.json`). It is docs and hygiene work, so it does not move ARP up the ladder.
