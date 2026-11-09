# 73 — Enough to test

**Task:** `docs/tasks/82-enough-to-test.md`
**Completed:** 2026-11-09
**Commit:** `uncommitted`
**Verifier verdict:** PASS (round 2; round 1 FAIL on one claim and uncommented casts)

## What shipped

- `scripts/measure/readiness-bench.ts`: the gate. 20 fixed needs, the real MCP server over HTTP on 13579, a blind sonnet judge run twice. ARP met 10 of 20 before (`readiness-bench-2026-11-09T1444.json`) and 18 of 20 after (`…T1457.json`). The gate is 15.
- `packages/protocol/src/skills-index.ts`: `searchSkillsIndex` over skills.sh `/api/search`. A failure returns `unavailable`, never an empty list.
- `apps/mcp`: `mergeIndexed` in `tool-search.ts`, and `arp_find_tools` merges the index, with `in_registry: false` and `skills_index: 'unavailable'`.
- `apps/web`: a `/skills-index/api/search` proxy (`nginx.conf`, `vite.config.ts`), the "On skills.sh" section on `/search`, and `/agents` opening on Reachable/All from `agents-reachable.json`.
- `scripts/measure/directory-reachable.ts` and `scripts/build/build-agents-reachable.ts`: 286 agents listed, 189 documents read, 73 declare a callable endpoint, 38 answer (`directory-reachable-2026-11-09T1505.json`).

## Surprises

- The template figure was wrong in its pattern, though the count was right. "27 copies of `*-api.vercel.app`": 27 are on `vercel.app` with the same paths, but only 23 match `*-api`. The figure was hand-derived and the pattern it named did not reproduce it. Now fixed with a one-line command in the task file.
- After the merge, ARP's 18 of 20 equals skills.sh's own 18. On these needs the bench mostly measures the index's ranking through ARP's server. The task file says so: "the gate is met on these needs, not coverage".

## Decisions made

- **Read skills.sh's live index instead of writing more skills on chain.** The catalogue freeze of task 63 stands. `robots.txt` disallows `/api/`; the user chose to read it anyway, one search per person, the same request as the CLI. ADR: `.claude/choices/0153-search-reads-skills-sh-and-agents-open-on-reachable.md`.
- **The reachable list is a dated reading bundled with the site, not a live probe.** A browser cannot probe the endpoints itself: most send no CORS header. Same ADR.
- **No reachable figure on a chain other than the reading's.** `/agents` falls back to All rather than show one chain's figure beside another chain's index.

## Rules touched

- `.claude/rules/claims.md`: sufficient. Check 6 and "commit the script" caught the template count.
- `.claude/rules/code.md`: sufficient. Uncommented `as` casts in the package and the scripts were caught at verification, not by any gate.
- `.claude/rules/portability.md`: sufficient. The search is in `packages/protocol/` with no chain constant.
- `.claude/rules/ui.md`: sufficient. `ui-reviewer` FAIL then PASS (chain mixing, a duplicate class, a comment).

## Suggestions for future tasks

- When a figure is a subset count ("N of M are X"), print it from the measurement script or quote the command beside it. Write the pattern from the command's output.
- No gate catches an uncommented `as` cast. Grep ` as ` over the diff before calling the verifier.
- Refreshing `/agents` means rerunning `directory-reachable.ts`, then pointing `build-agents-reachable.ts` at the new file. Its input path is hardcoded to the 1505 reading.
- `use-skills-index.ts` is tested only through a mock in `SearchPage.test.tsx`.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

It serves the skill column at "declared" and does not move ARP up by itself. It widens what a tester can find, so testers can write the declared lines the next tiers need: today 10 result lines on 13579, all paid by ARP's own wallets (`scripts/measure/line-writers.ts`, 2026-11-09T15:19). The reachable list is a dated probe of the agent column and counts for no tier.
