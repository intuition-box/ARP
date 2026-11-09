# 74 — The 8004 sieve: separate the agents that exist from the ones that answer

**Task:** `docs/tasks/87-the-8004-sieve.md` (written as task 83, renumbered at rebase)
**Completed:** 2026-11-09
**Commit:** `1339f8b` on `feat/87-the-8004-sieve`, rebased on `d8bff52` (not pushed)
**Verifier verdict:** PASS on round 2

## What shipped

- `packages/protocol/src/sieve.ts` (+ `test/sieve.test.ts`) — pure rung function 0 to 5, callable-only endpoints, `couldNotSay`, `anyLive`, `wilsonInterval`, `statedEmails`.
- `scripts/measure/agent-sieve.ts` — resumable walk (`--population registry|directory`, `--retry`, `--ids`, `--workers`), `--summary` with concentration and both `docs/19` §5 definitions, `--outreach`, `--highest`.
- `scripts/helpers/registration-document.ts` (+ `scripts/test/registration-document.test.ts`) — shared with `verify-cohort.ts`; inline-JSON `tokenURI`, gateway fallback.
- `scripts/build/build-agent-sieve.ts` → `data/catalogue/agent-sieve-13579.json`, replacing task 82's `agents-reachable.json`.
- `apps/mcp` — `arp_find_agents` `order: answers-now`, `rung` on listed agents. `apps/web` — `/agents` Reachable is rung 3+, shells behind a per-page count.
- `apps/web/public/docs/the-sieve.md` — the public page, with rerun commands.
- Measurements: `agent-sieve-8453-2026-11-09.jsonl` (500-id Base sample), two directory walks (the `T2000` one is built from).

## Surprises

- One host is most of Base: 451 of 500 sampled agents are A2A cards served by centralcity.ai, each under its own owner. Without it, 1 of 49 speaks (0.4% to 10.7%).
- Counting any declared URL alive turns web sites and GitHub links into "agents that answer": 145 of 244 Base identities in the directory against 40 on callable endpoints.
- A `tokenURI` can hold the JSON itself (agents 16666, 50992); the reader had marked them shells. Found by the hand recheck.

## Decisions made

- **Callable only, broad reading kept apart; directory ordered by rung; feedback split by a fresh-wallet proxy, never scored.** ADR: `.claude/choices/0156-the-8004-sieve-orders-the-directory.md`.
- **Outreach CSV git-ignored** (`data/outreach/`): third parties' stated contacts, the repo is public.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Round 1 caught an inherited figure ("32 to 128") with no committed run behind it and a sample with no recorded population; both fixed with a script (`--summary`, `--highest`), not a sentence.
- `.claude/rules/code.md` — sufficient. Round 1 caught a doc comment left above the wrong declaration after an insertion.
- `.claude/rules/workflow.md` — sufficient.

## Suggestions for future tasks

- Print every summary's concentration (hosts, owners, largest) beside a share; a chain's figure can be one platform's.
- A sample's population (highest minted id, timestamp) belongs in the run's output, not stderr.
- When inserting a declaration above an existing function, check the JSDoc still sits on its function.
- BSC 56 and Ethereum 1 were not walked as whole registries; the script reads both.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Agent column, observed: the rung is ARP's own probe of an agent's declared address, a record the agent did not write (`docs/32` row 2), and it does not move ARP up by itself — no agent reaches rung 5 and no line comes from a third party — but it gives the hire column a dated supply list.
