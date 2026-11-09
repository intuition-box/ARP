# Task 75 — A line adds the domain it names

**Status:** in progress, 2026-11-09, on `feat/75-line-domain` (worktree `../ARP-tree`, from `origin/main` 9e01db8), not pushed.
**ADR:** `0146` (task 73), which this extends to the command line. No new decision.
**Rules:** `code.md`, `security.md`, `claims.md`, `workflow.md`.

## The user's decision, 2026-11-09

After task 73, `arp line` still refused a domain the tree lacks. The user: « je veux les deux »
(file the last skills of task 59, and let `arp line` add a domain), then « go ».

## Deliverables

1. `arp line --domain X --parent Y --why Z`: when `X` is not a category, the agent's local key signs a
   category request (`packages/protocol/src/sponsor/category.ts`) and the CLI sends it to the sponsor's
   `/propose-category` before the line. When `X` exists, `--parent` and `--why` are dropped.
   - The `/line` request's signed type does not change, so a CLI that does not know the flags keeps working.
   - The domain is normalised as the sponsor does (`normaliseCategoryLabel`).
   - A line refused with `unknown_domain` right after the domain was filed is retried while the index catches up.
2. `apps/web/public/docs/cli.md` and `lines.md`, `docs/28`: the two flags.
3. `scripts/seed/file-categories.ts`: an unsigned filing goes as a tag instead of being skipped. A re-run
   had skipped the four `research` skills because the list carries their parent, though `research`
   existed. Run 2026-11-09 against the local sponsor: 61 of 61 answered, 10 tags written, the 4
   `research` ones already there. That closes task 59's last 10.

## Do not do in this task

- Mainnet; publishing the CLI (0.0.3 is the user's to publish).
- A domain in `arp share send`: it writes the failures the hook recorded, which name no domain.
