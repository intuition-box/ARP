# Task 75 — A line adds the domain it names

**Status:** **verified 2026-11-09** (`task-verifier` PASS, `.claude/learning/66-a-line-adds-its-domain.md`), on `feat/75-line-domain` (worktree `../ARP-tree`), rebased on `origin/main` 80760b3, not pushed.
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

## Run on testnet 13579, 2026-11-09

The user chose a live run with a real category (« Yes, you pick »).

```
ARP_TARGET=testnet bun run apps/cli/src/cli.ts line --tool "https://github.com/anthropics/skills?skill=pptx" \
  --outcome worked --domain presentation --parent document \
  --why "document covers files in general; slide decks are a distinct need people search for by that name"
```

- Agent 12 (`0x56BC52C2A0B863C39dBcBE9aC853f301D79bec42`, the local key) signed. The sponsor filed
  `presentation` under `document`, logged `newCategory: true`, `agent: 0x56BC…ec42`, `status: complete`,
  2 transactions.
- The line: 3 levels, `uses` `0xbff60fd2…1452`, then the context, then the outcome. 6 transactions.
- `readDomainTree` afterwards: `pathToRoot("presentation")` = `presentation → document → tool`.
- **The line's `worked` is not a use.** Agent 12 never ran `pptx`; the line exists to test the path.
  One wallet, so it moves no ranking (ADR `0143`, 3 wallets), and the user decided testnet lines need no
  marking (2026-11-05).

## Do not do in this task

- Mainnet; publishing the CLI (0.0.3 is the user's to publish).
- A domain in `arp share send`: it writes the failures the hook recorded, which name no domain.
