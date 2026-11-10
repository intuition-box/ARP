# 90 — Outside signals as dated, sourced facts

**Task:** `docs/tasks/101-outside-signals.md`
**Completed:** 2026-11-10
**Commit:** `d1da1a9..8c2bc2d` (branch `worktree-agent-aa1825949a5cbd560`)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/outside-signals.ts` — file shape, failure-issue query, whole-word skill match, Trust Index summariser, `repoFacts` / `endpointFacts` returning `{says, per, on, check, licence?}`; nothing for what was not read.
- `scripts/measure/{repo-liveness,repo-failure-issues,x402-trust-index}.ts` → `data/measurements/*-2026-11-10.json` → `scripts/build/build-outside-signals.ts` → `data/catalogue/outside-signals.json` (25,692 bytes; rebuild is byte-identical).
- `apps/mcp/src/outside.ts` — `outside` on `arp_pulse`, `arp_find_tools` (full), `arp_agent_endpoints`, with `OUTSIDE_NOTE`.
- `apps/web/src/components/atom/SkillOutside.tsx`, `apps/web/src/components/agent/AgentTrustIndex.tsx` — facts-column panels; the agent one hidden when no host was read.

## Surprises

- The Trust Index has two copies: a GitHub `trust-data` branch with no stated licence, and a Hugging Face dataset with `license: cc-by-4.0`. Only the second was usable; the script refuses to run if the card's licence changes.
- The dataset holds `verdict: "error"` (393 rows), which its card does not document.
- Title-only search changes the figure by an order of magnitude: on `mattpocock/skills`, 28 with `in:title` against 255 without, of 1,037 issues (re-run by the verifier 2026-11-10, exact).
- 0 of 324 asked URLs were in the index; only 6 of 107 hosts. The x402 fact is mostly "not listed" today.

## Decisions made

- **Outside facts never feed a score or an order** — shown with source, day and a `check` URL; not on chain. ADR: `.claude/choices/0170-outside-signals-are-dated-sourced-facts.md`.
- **No issue text kept** — numbers, states, days only; titles read only to match a skill's name.
- **Bundled, not live** — no MCP call to Doctor's API; the live URL is given as `check`.

## Rules touched

- `.claude/rules/claims.md` — sufficient; every figure traced to a measurement file or a re-runnable query.
- `.claude/rules/ui.md` — sufficient; caveats in `Hint`, credit as a visible link (licence obligation, not an explanatory sentence).
- `.claude/rules/portability.md` — sufficient; logic in `packages/protocol`, no chain.

## Suggestions for future tasks

- When importing a third party's data, check every mirror's licence and read from the one that states it; pin the revision in the measurement.
- Keep "not read" and "not listed" distinct in every shape that carries an outside fact.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill and agent columns at tier observed (records the actor did not write: GitHub's archive flag and issue tracker, x402 Doctor's unpaid daily scan), shown beside ARP's lines as context; it does not move ARP up the ladder, because none of it is ARP's observation and it never enters the score.
