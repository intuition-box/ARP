# Task 136 — Coverage ninety

**Status:** verified 2026-11-11, `task-verifier` PASS (round 2; round 1 FAIL on `apps/cli`'s per-file gate over `scripts/mcpb.ts`, the missing ladder sentence, stale figures and a stray `foundry.lock`), branch `test/coverage-90` on `origin/dev` `4815c2b9`, post-mortem `.claude/learning/124-coverage-ninety.md`. Not pushed.
**ADR:** `0198`.
**Rules:** `code.md`, `workflow.md`, `claims.md`; `ui.md` for `apps/web`; `security.md` for `apps/sponsor`.
**Required skills:** `arp-contributing`. **Reviewer:** none per domain (tests only, no product code
changes beyond what makes a module testable); `task-verifier` at the end.

## The user's go

2026-11-11. Asked "est-ce que nos tests unitaires vérifient tout ?", shown the measurement below, the
user answered « ok donc faut amelioré drastiquement », then chose, in three questions:

- objective: **« 90 % partout, CI bloque »**;
- order: **« Tout en parallèle »** — one agent per workspace in separate worktrees;
- live tests against the chain or deployed services: **« Non, unitaires seulement »**.

## Why

Measured 2026-11-11 on `0b47689d`, line coverage of each workspace's own `src/`:

| workspace | lines | branches | how |
| --- | --- | --- | --- |
| `contracts/src` | 100 % | 100 % | `forge coverage` |
| `apps/node` | 99 % | not measured | `bun test --coverage` |
| `apps/cli` | 97 % | not measured | idem |
| `packages/protocol` | 94.2 % | 82.0 % | `vitest --coverage` |
| `apps/api` | 90 % | not measured | `bun test --coverage` |
| `apps/sponsor` | 89 % | not measured | idem |
| `apps/probe` | 82 % | not measured | idem |
| `apps/web` | 74.7 % | 63.5 % | `vitest --coverage` |
| `apps/hook` | 67 % | not measured | `bun test --coverage` |
| `apps/mcp` | 62.4 % | 50.4 % | `vitest --coverage` |
| `packages/graphql` | 52.1 % | 66.9 % | `vitest --coverage` |

`bun test` reports lines and functions, not branches, and counts only the files a test imports. Until
this task no vitest workspace could be measured: `@vitest/coverage-v8` was not installed. No gate
enforced any figure.

## Deliverables

1. `@vitest/coverage-v8` 4.1.8 in the four vitest workspaces.
2. Every workspace's `test` script runs with coverage and **fails under 90 %**:
   - vitest workspaces: `coverage.thresholds` 90 for lines, branches, functions and statements, over
     `src/**`;
   - bun workspaces: `coverageThreshold` 0.9 for lines and functions in `bunfig.toml` (bun measures no
     branches), plus one test that imports every `src/` module so an unimported file counts at 0 %.
3. Tests that bring each workspace to that threshold. A file left out of the measurement is listed in
   the config with a one-line reason (an entrypoint that binds a port, a generated file). An exclusion
   to make a number is a defect.
4. `code.md`'s coverage targets state the 90 % gate. ADR `0198`.
5. CI unchanged in shape: `bun run test` already runs every workspace, so the threshold makes it block.

## Outcome

Measured 2026-11-11 at `abba75e9` (on `origin/dev` `4815c2b9`), by the root `bun run test`, which exits 0:

| workspace | lines before → after | branches before → after | excluded, with the reason in the config |
| --- | --- | --- | --- |
| `packages/protocol` | 94.2 → 98.7 % | 82.0 → 91.3 % | none |
| `packages/graphql` | 52.1 → 100 % | 66.9 → 94.6 % | none |
| `apps/mcp` | 62.4 → 97.9 % | 50.4 → 91.7 % | `src/fetch-skill.ts`, `src/session-log.ts` (run at import) |
| `apps/web` | 74.7 → 99.05 % | 63.5 → 94.08 % | `src/main.tsx` (mounts React only), test helpers under `src/` |
| `apps/hook` | 67 → 98.7 % | not measured | `src/hook.ts` (reads stdin, exits at import; run as a child process by its tests) |
| `apps/sponsor` | 84.7 → 99.2 % | not measured | `src/main.ts` (reads the key file, binds a port) |
| `apps/api` | 92.8 → 98.9 % | not measured | none |
| `apps/cli` | 97.6 → 97.9 % | not measured | `src/cli.ts` (runs a command at import; tested as the built binary) |
| `apps/node` | 99.7 % | not measured | `src/node.ts` (calls the RPC at import) |
| `apps/probe` | 74.0 → 100 % | not measured | none |

`apps/cli`'s figure includes `scripts/mcpb.ts`, which task 135 added after the lot measured: its build
moved into `build(paths, run)` so a test runs it (100 % functions, 97.4 % lines).

2026-11-12: rebased on task 139 (`eda9f36c`), which deleted `apps/node`, the sponsor's `/publish`,
`declare/delegated.ts`, `term-labels.ts` and the JSON pinner. This branch's tests of those went with
them, and so did `apps/node`'s gate; the table above is the 2026-11-11 record.

The bun "before" figures include a test importing every module, so they differ from the table above
where an unloaded file was invisible. Every bun workspace ignores `../../packages/**`, gated in its own
workspace. No test file or test was removed; no product code changed beyond extracting `apps/cli/scripts/mcpb.ts`'s build into a function.

Found and **not fixed** (product behaviour, out of this task's scope):

1. `packages/graphql` `RECENT_QUERY` uses `$curveId` without declaring it; its one caller
   (`packages/protocol/src/recent.ts`) adds the declaration by `.replace`. Latent: nothing breaks today.
2. `packages/protocol/src/skill-requires.ts` `shellLinesRun` ignores backslashes: an escaped `\"` in a
   shell fence opens a quote and hides every later line of the fence from `runs`.
3. `publishableToolUrl("https://github.com/a/b#readme")` refuses with "its query repeats skill"; the
   cause is the fragment.
4. `apps/web/src/pages/AtomPanel.test.tsx` and `components/brand/ActivityLog.test.tsx` made real
   requests through happy-dom's `fetch`. Fixed here: both stub it.

Known weaknesses: `apps/hook/src/hook.ts` (397 lines) and `apps/sponsor/src/main.ts` (500 lines) are
excluded entrypoints, reached only by child-process tests bun does not count. Also: under `apps/mcp` about half the new tests mock `@arp-protocol/core`'s readers, and
five mock an ARP module that does the I/O, rather than `fetch`, as its existing tests already did.
`apps/hook`'s tests read the real `~/.agents` and `~/.claude/skills` (bun's `homedir()` ignores `HOME`)
and use `zq-` names to avoid a match. `intuition-source.test.ts` timed out once under three parallel
coverage runs.

## Evidence ladder

Skill column, observed tier: the gate keeps the code that writes observed records (the hook's records,
the content receipt, the sponsor's payment checks) at 90 % under test. It does not move ARP up a tier,
and because every test mocks the network it proves nothing about the live record.

## Do not do in this task

- No live test: no request to the chain, Intuition's GraphQL, IPFS or a deployed service.
- No product change beyond extracting a function so it can be tested; behaviour stays identical.
- `scripts/` is outside every workspace and outside this gate (7 test files for 166 `.ts`, measured
  2026-11-11). It stays so; recorded in ADR `0198`.
- No hand edit of `packaging/`; regenerate with `bun run --cwd apps/cli packages` if `apps/cli` changes.
- No push. The orchestrator merges.
