# Task 136 — Coverage ninety

**Status:** in progress, branch `test/coverage-90`, cut from `0b47689d`.
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

## Do not do in this task

- No live test: no request to the chain, Intuition's GraphQL, IPFS or a deployed service.
- No product change beyond extracting a function so it can be tested; behaviour stays identical.
- `scripts/` is outside every workspace and outside this gate (7 test files for 166 `.ts`, measured
  2026-11-11). It stays so; recorded in ADR `0198`.
- No hand edit of `packaging/`; regenerate with `bun run --cwd apps/cli packages` if `apps/cli` changes.
- No push. The orchestrator merges.
