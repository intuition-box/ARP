# 91 — Be read where agents already are

**Task:** `docs/tasks/102-be-read-where-agents-are.md`
**Completed:** 2026-11-10
**Commit:** `45400db`, `0cfc7c1`, `929d6ce` on `feat/102-be-read-where-agents-are` (base `bbd1040`)
**Verifier verdict:** PASS (first pass)

## What shipped

- `packages/protocol/src/skill-lines-feed.ts`, `agent-sieve-feed.ts` — pure shapers, exported from `index.ts`; tested in `packages/protocol/test/skill-lines-feed.test.ts` (8 tests, both shapers).
- `scripts/build/build-skill-lines-feed.ts` (reads 13579, no key), `build-agent-sieve-feed.ts` (no network; rebuild is byte-identical, checked by the verifier).
- `apps/web/public/feeds/skill-lines.json` (`arp.skill-lines/1`, 8,332 B: 10 skills, 10 lines, 5 with an outcome, all `arp_test`, 36 skipped = 33 payer edges + 3 domains outside the tree) and `agent-sieve.json` (`arp.agent-sieve/1`, 55,070 B: 283 agents, `by_chain`).
- `apps/web/public/docs/skill-lines-feed.md`, `agent-sieve-feed.md`, manifest entries; cross-links in `x402-feed.md`, `the-sieve.md`, `lines.md`, `developers.md`, `docs/23` §7.1.
- `server.json` at the root — official MCP Registry entry, npm stdio, not published; `remotes` deliberately absent until a real host exists.
- Task file §2–3: listing steps per marketplace, the `npx skills` proposal (no extension point today; three routes). Outreach drafts in ARP-business-dev, uncommitted.

## Surprises

- `claude-plugins-official` takes no submissions; Anthropic's directory portal does (`docs/23` §7.1 amended).
- The `skills` CLI's audit table has three hardcoded partners and no override; ARP could only ask for an informational column.
- A first `agent-sieve.json` summed rungs across four chains; `ui-reviewer` caught it (claims.md check 2).

## Decisions made

- **Two feeds, not one** — different keys and dates. ADR: `.claude/choices/0171-feeds-a-registry-reads-beside-its-listing.md`.
- **No free text by construction** — domains outside the tree and non-`Agent <chain>:<id>` labels written `null`; names in the sieve feed dropped. Same ADR.
- **ARP's test lines marked `arp_test`, not hidden.** Same ADR.
- **No placeholder `remotes` in `server.json`.** Same ADR.

## Rules touched

- `.claude/rules/claims.md` — sufficient; check 2 (one number, one context) is what the reviewer applied.
- `.claude/rules/code.md` — sufficient. Advisory: `build-skill-lines-feed.ts` has `const usage = new Map();`, which TypeScript types `Map<any, any>`; give it `Map<string, PulseUsage>` next time the file is touched.
- `.claude/rules/portability.md` — sufficient; the shapers hold no chain constant, the build script reads `data/deployments/13579.json`.

## Suggestions for future tasks

- When a feed counts across a population, write `by_chain` from the start.
- `new Map()` without type arguments is an implicit `any`; no gate here sees it.
- The Claude directory takes the plugin icon only on first save: add it via `apps/cli/scripts/packages.ts` before the user's first submission.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column at declared (skill lines) and agent column at observed (sieve rungs are request results from a committed walk); it moves ARP outward, not up — existing facts become readable by third parties, a precondition for corroborated, but every line in `skill-lines.json` is ARP's own test, so no tier changes for any skill or agent.
