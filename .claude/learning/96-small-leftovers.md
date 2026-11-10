# 96 — Small leftovers: the atom size limit, the plugin's icon, stale defect rows

**Task:** `docs/tasks/107-small-leftovers.md`
**Completed:** 2026-11-10
**Commit:** `61d3139`, `a45e3ae`, `e9fd532` on `ce71b1e`, worktree `agent-ae7f87f7e12a1240e`
**Verifier verdict:** PASS (first pass)

## What shipped

- `scripts/measure/atom-data-max-length.ts` — read-only `getGeneralConfig()` on the MultiVault of 13579
  and 1155 at a named block.
- `data/measurements/atom-data-max-length-2026-11-10.json` — `atomDataMaxLength` 1000 on both (13579
  block 9378420, 1155 block 10795862).
- `packages/protocol/src/x402-payment.ts` — `MAX_EXACT_ENDPOINT_LENGTH` comment cites the script; the
  value stays 512.
- `.claude/choices/0162-*.md` — an **Amended:** header line, no new ADR.
- `apps/cli/scripts/plugin-icon.ts`, `apps/cli/assets/icon.{svg,png}` — the Source mark (HANDOFF §2),
  1024 × 1024 on `--color-ground`, through `rsvg-convert`.
- `apps/cli/scripts/packages.ts` — copies the PNG into `packaging/claude/arp/.claude-plugin/`, sets
  `icon` in `plugin.json`; `--check` compares bytes for binary files.
- `.claude/STATE.md` — three stale defect rows moved to "Closed recently", task 107 row.

## Surprises

- The marketplace entry rejects an `icon` field under `claude plugin validate --strict`; only
  `plugin.json` takes one.
- `--check` compared everything as UTF-8 text; a binary file in `packaging/` needed a byte compare.

## Decisions made

- **Amend ADR `0162` instead of a new ADR** — a measurement that confirms the decision's bound is
  not a new decision.
- **Render once, copy in `packages`** — `--check` needs no rasteriser on the machine that runs it.

## Rules touched

- `.claude/rules/claims.md` — sufficient: the figure that had no script now has one.
- `.claude/rules/portability.md` — sufficient: the script records a dated read, nothing reads it back
  as a constant.

## Suggestions for future tasks

- A figure read by hand during a task gets its `scripts/measure/` script in the same task, not two
  tasks later.
- Any generator writing binary output into a checked tree compares bytes, not text.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

None directly: the limit read keeps the x402 line (hire column, observed tier) writable on mainnet
without a guess, and the icon is distribution for the skill column's declared tier; it does not move
ARP up the ladder.
