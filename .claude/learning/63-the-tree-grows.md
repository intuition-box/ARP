# 63 — The domain tree grows from the agents

**Task:** `docs/tasks/73-the-tree-grows.md`
**Completed:** 2026-11-09
**Commit:** `491c11f` on `feat/73-tree-grows` (not pushed; merge after 72 and 74, rebased)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/sponsor/category.ts` — EIP-712 `CategoryRequest`, sign and verify; `categoriesPerAgentPerDay` in `limits.ts`
- `apps/sponsor/src/routes/propose-category.ts` — signed by an agent holder: may add a category, nonce spent once, per-agent and global caps; unsigned: tag with an existing category only, a new one refused with rule `agent`
- `apps/mcp` — `arp_declare_used` answers `sign_category_first` for an unknown domain with `domain_parent`, `domain_reason`, `declarer`; new `arp_propose_category`; desktop `arp_file_category` signs with the local agent key
- `apps/web/src/components/tool/ChooseCategory.tsx` — existing categories only, renders nothing without a sponsor
- `scripts/seed/file-categories.ts` — signs with `--agent`/`--key`/`--expect`
- Task 59's eight archived commits replayed (`archive/feat/59-category-step`)
- ADR `0146`, `docs/25` §8, `security.md` eleventh signature site and sponsor row

## Surprises

- Replaying an archived branch onto `main` conflicted in one file (`apps/mcp/src/desktop/handlers.ts`); `STATE.md` had to be kept from `main`, not from the archive.

## Decisions made

- **Only a registered agent's signed request adds a category** — user decision 2026-11-09. ADR: `.claude/choices/0146-an-agent-grows-the-domain-tree.md`.
- **Per-agent cap keyed by the holding address** — one address with several agents shares one allowance, stricter on purpose. ADR `0146`.
- **Not taken from the integrator's review** — a replay of a completed request answers 200 `created:false` before the nonce check (nothing spent); the declare handler does not pre-check the first tool is a Thing with a tool URL (the sponsor refuses with 422 `skill`, nothing spent).

## Rules touched

- `.claude/rules/security.md` — sufficient; signature-site list and mainnet-signing table extended.
- `.claude/rules/code.md`, `ui.md`, `portability.md`, `claims.md` — sufficient.

## Suggestions for future tasks

- `apps/sponsor/src/routes/propose-category.ts` keeps its own `MAX_LABEL_LENGTH` / `MAX_REASON_LENGTH` while `category.ts` exports the same bounds as `CATEGORY_REQUEST_MAX_*`, which nothing imports; one source would close the drift.
- A domain created through `/line` waits for task 74's merge (task 73 "Do not do").
- Before merging, check the post-mortem and ADR numbers against branches 72 and 74.

## Evidence ladder

**Which tier of the evidence ladder does this serve, and does it move ARP up it?**

Staked: a domain becomes a category an agent signed for and ARP's attestor holds a position on, so a line's context can be any domain an agent needs rather than the seeded ones; it moves ARP up in reach, not in kind, since the line is still the agent's word.
