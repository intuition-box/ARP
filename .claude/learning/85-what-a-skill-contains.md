# 85 — What a skill contains, shown before install and on the site

**Task:** `docs/tasks/96-what-a-skill-contains.md`
**Completed:** 2026-11-10
**Commit:** `2bb0e2d` on `feat/96-what-a-skill-contains` (rebased on main `a2bb9c9`)
**Verifier verdict:** PASS (second pass; first failed on two ADR claims)

## What shipped

- `packages/protocol/src/skill-contents.ts`: pure, bounded reader (programs, packages, settings, scripts, fetch-and-run, domains, hidden text); 23 tests
- `packages/protocol/src/pulse.ts`, `apps/mcp/src/handlers/pulse.ts`: `contains` on every `arp_pulse` read result, no request added
- `apps/mcp/src/desktop/{loop,handlers,skill-gate}.ts`: `arp_get_skill` returns `contains` before `skill_md`; the install dialog carries the lines
- `apps/web/src/components/atom/SkillContains.tsx`, `hooks/use-skill-contents.ts`, `services/skill-contents.ts`: Contains panel in the skill page's facts column
- `scripts/measure/skill-contents.ts` → `data/measurements/skill-contents-2026-11-10T0938.json` → `scripts/build/build-skill-contents.ts` → `apps/web/src/data/skill-contents.json` (518 of 521 read; rebuild is byte-identical)
- `packages/protocol/src/agent-contents.ts`, `apps/web/src/services/agent-contents.ts`, `hooks/use-agent-contents.ts`: agent twin, not on a page yet

## Surprises

- Quoted examples ("ignore previous instructions" in a skill's own warning) are the main false positive; the reader strips quoted and code spans first.
- HTML comments are mostly template notes; kept, because the rendered page hides them all the same.

## Decisions made

- **Facts, never a verdict; nothing blocks** — user decision 2026-11-10. ADR: `.claude/choices/0165-what-a-skill-contains-is-read-before-install.md`
- **Site reads a dated, bundled walk** — a browser cannot list a directory within GitHub's 60/hour.
- **Agent side ships as service and hook only** — the agent page is reworked on `feat/95-agent-lines`; handover in the task file.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Verifier caught an ADR count ("six lists" naming seven) and a before/after figure no committed script re-derives; both fixed in `2bb0e2d`.
- `.claude/rules/ui.md`, `code.md` — sufficient (ui-reviewer passed on its second pass, after a Hint alignment fix).

## Suggestions for future tasks

- A before/after figure for a reader change needs a committed way to run "before" (a flag), or it should not be quoted.
- Count the items you list in the same sentence that states the count.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: it shows what a skill's own files say before install, so a person can check the author's declarations; it adds no observed or corroborated evidence, so it does not move ARP up the ladder.
