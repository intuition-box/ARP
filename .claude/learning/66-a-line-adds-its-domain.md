# 66 — A line adds the domain it names

**Task:** `docs/tasks/75-a-line-adds-its-domain.md`
**Completed:** 2026-11-09
**Commit:** `f9f684b`, `de89a2d`, `72dcbc0`, `7d3d4d9` on `feat/75-line-domain` (from `9e01db8`), not pushed
**Verifier verdict:** PASS

## What shipped

- `apps/mcp/src/desktop/loop.ts` — `writeLine` signs a category request and posts `/propose-category` before `/line`; retries `/line` on 422 `unknown_domain` only when it filed the domain itself.
- `apps/mcp/src/line.ts` — `--parent`/`--why` parsed together; domain and parent normalised with `normaliseCategoryLabel`; an existing domain drops the flags; an unknown parent is refused before any key is made.
- `apps/cli/src/cli.ts` — the two flags and the usage line; `packaging/` regenerated.
- `apps/mcp/test/write-line.test.ts` — the new-domain path (file first, wait, no wait on a domain it did not file, stop on refusal, normalisation, flag pairing).
- `scripts/seed/file-categories.ts` — an unsigned filing goes as a tag instead of being skipped.
- `apps/web/public/docs/cli.md`, `lines.md`, `docs/28_THE_SIGNAL.md` — the flags.
- Testnet 13579 run: agent 12 added `presentation` under `document` and wrote a line on `anthropics/skills?skill=pptx`; its `worked` is recorded as not a use.

## Surprises

- The root `bun run test` failed in `apps/sponsor` and `apps/hook` because the protocol package rebuilds concurrently; run alone, 130 and 67 pass. Neither package is in the diff. A concurrent rebuild makes the root gate flaky, not red.
- `git diff origin/main..HEAD` shows task 74's files as reversed changes because `origin/main` moved past the branch point; diff against the merge base.

## Decisions made

- **Retry `unknown_domain` only for a domain this call filed** — otherwise a typo would wait two minutes before failing. Extends ADR `0146`; no new ADR.
- **`/line`'s signed type unchanged** — an older CLI keeps working.

## Rules touched

- `.claude/rules/code.md` — sufficient.
- `.claude/rules/security.md` — sufficient; the category request is an existing signature site (task 73), this adds a caller.
- `.claude/rules/claims.md` — sufficient; the run's `worked` is stated as not a use.

## Suggestions for future tasks

- Check a gate failure in an untouched package by running that package alone before attributing it to the change.
- Diff a branch against `git merge-base`, not against a moved `origin/main`.

## Evidence ladder

**Which tier of the evidence ladder does this serve, and does it move ARP up it?**

Staked: the command line can now add the domain a line names, so the context a wallet stands behind is no longer limited to the seeded tree — it widens reach on that tier, not kind.
