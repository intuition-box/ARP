# Task 107 — Small leftovers: the atom size limit, the plugin's icon, stale defect rows

**Status:** in progress 2026-11-10, worktree `agent-ae7f87f7e12a1240e`.
**ADR:** none new. ADR `0162` gains an **Amended** header line (`.claude/choices/README.md`'s convention, as ADR `0123` was amended by `0163`).
**Rules:** `workflow.md`, `code.md`, `claims.md`, `portability.md`. Reads only on chain: nothing written, nothing deployed, published or pushed.

## Why

Three gaps left by earlier tasks, each small:

- Task 93 bounded an x402 payment level's exact URL at 512 characters under `atomDataMaxLength`, cited as
  1,000 on testnet 13579 from a read with no committed script, and mainnet's not read
  (`.claude/learning/82-x402-feed-exact-endpoint.md:34`, ADR `0162` decision 2).
- Task 102 found the Claude plugin has no icon (`docs/tasks/102-be-read-where-agents-are.md:79`).
  Anthropic's directory takes a square PNG of 512 to 2048 px, once, the first time the plugin is saved.
- Rows in `STATE.md`'s known defects that are no longer true.

## Deliverables

1. **`scripts/measure/atom-data-max-length.ts`** reads `getGeneralConfig()` from the MultiVault on 13579
   and 1155 (`atomDataMaxLength`, `minDeposit`, `minShare`, `feeDenominator`, `feeThreshold`) at a
   named block, and writes `data/measurements/atom-data-max-length-2026-11-10.json`. Run 2026-11-10:
   `atomDataMaxLength` is **1,000 on both** (13579 at block 9,378,420; 1155 at block 10,795,862). The
   comment on `MAX_EXACT_ENDPOINT_LENGTH` (`packages/protocol/src/x402-payment.ts`) and ADR `0162`'s
   header cite the script. Task 93's file cites no figure, so it is unchanged.
2. **The plugin's icon.** `apps/cli/scripts/plugin-icon.ts` renders the Source mark
   (`docs/design/brand/v1/HANDOFF.md` §2, all three rings, Saffron core) on `--color-ground` to
   `apps/cli/assets/icon.svg` and `apps/cli/assets/icon.png`, 1024 × 1024, through `rsvg-convert`.
   `apps/cli/scripts/packages.ts` copies the PNG to `packaging/claude/arp/.claude-plugin/icon.png` and
   sets `icon` in `plugin.json`; `--check` compares its bytes. The marketplace entry gets no icon:
   `claude plugin validate --strict` flags `plugins[0].icon` as an unknown field (claude 2.1.318).
3. **Stale defect rows.** `STATE.md` drops three rows that are no longer defects (`Landing.tsx` is 584
   lines and task 53 is done; the `/list-tool` row was a merge note; `@arp-protocol/cli` is on npm and
   `/start/agent` runs it) and records them under "Closed recently". `FUTURE.md`'s "Left by the sweep"
   holds nothing stale: `arp check <skill>` is still not built, and task 67's results still do not exist.

## Do not do in this task

- Touch `apps/web` (task 104), the CLI version, sponsor default, `mcpName` or changelog (task 105), or
  the live hook test (task 106).
- Change `MAX_EXACT_ENDPOINT_LENGTH`: 512 holds under 1,000 on both chains.
- Write on chain, deploy, publish or push.

## Gates

`apps/cli`: `bun run test`, `bun run check:node`, `bun run packages --check`. Root: `bun run check`,
`bun run test:scripts`. `claude plugin validate --strict packaging/claude/arp`, and with
`--profile directory`.
