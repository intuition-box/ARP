# 114 — Ask once whether to share, with "always"

**Task:** `docs/tasks/126-ask-once-to-share.md`
**Completed:** 2026-11-11
**Commit:** `uncommitted` (worktree `agent-aab4248385534d933`, on `8c9985e5`)
**Verifier verdict:** PASS (second pass; the first failed because "always" published every result already kept)

## What shipped

- `packages/protocol/src/sharing-state.ts` (+ test) — the choice with `at` and `how`, the three answers, `shareAnswerIn`; pure, imported by path.
- `apps/hook/src/share-ask.ts` (+ test on the real hook) — the question on the first public-source skill while undecided, the answer read on a later `Stop` of the same session, a `share-once.jsonl` grant for "once" and "always", `SessionEnd` spawning `arp share send --auto` detached; `ARP_SHARE_AUTO=off`.
- `apps/cli/src/share.ts`, `cli.ts` (+ test) — `how`/date on file, "once" sends the granted result alone, "always" sends the granted result and rows with `at >= choice.at`, older rows counted as `earlier`; `share-send.lock`; `--auto` silent, logged to `share-log.jsonl`.
- `apps/cli/src/install/*`, `scripts/packages.ts`, `packaging/` — `how: init`, `send.json`, `SessionEnd` in the hooks; regenerated.
- `apps/mcp/src/share-ask.ts` — the server no longer asks; Desktop writes `how: desktop`.
- Docs: `local-memory.md` (Sharing), `install.md`, `cli.md`, `uninstall.md`, `testers.md`, `what-arp-publishes.md`, three READMEs, `docs/22`, `28`, `31`, the `apps/hook` line of `CLAUDE.md`.

## Surprises

- A "yes" to a question about one result was first implemented as "sharing on", which also sends the whole local history, backfill included. The question never showed that history. Fixed by a time cut at the choice plus a grant for the asked result, which predates the answer by a turn.
- `bun test` in `packages/protocol` and `apps/mcp` is the wrong runner (vitest there): `node-serve` times out and `vi.hoisted` is missing. `bun run test` is green.

## Decisions made

- **One question, after the first result, with "always"** — the user's choice; the answer travels as a closed `arp-share:` line read on a later `Stop`. ADR: `.claude/choices/0191-ask-once-after-the-first-result-with-always.md` (amends `0157`).
- **"Always" is from now on** — rows kept before the choice stay local and are counted; `arp share on` includes them after printing them. ADR `0191` §3.
- **Stale-lock race accepted** — two sends taking one stale lock may send a line twice. ADR `0191` §5.

## Rules touched

- `.claude/rules/code.md` — sufficient.
- `.claude/rules/claims.md` — sufficient; the live runs predate the fix and the task file says so.

## Suggestions for future tasks

- A consent question scopes what it covers: check what the "yes" sends against what the person was shown, history included.
- Run each package's own `test` script, not `bun test`, where the package uses vitest.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: a model's closed worked/failed answer, kept locally, becomes a public declared line once the person says yes, without a second command; it does not move ARP up the ladder, since the line stays the agent's word.
