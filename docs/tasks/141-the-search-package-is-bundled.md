# Task 141 — The search package is bundled, so `arp_pulse` searches in Claude Desktop

**Status:** built 2026-11-12 on `feat/pulse-vendored-search`, written by arp-97. Task 141, ADR `0201`,
post-mortem `129`, allocated by the orchestrator. Ships in the release after 0.0.6.
**Rules:** `code.md`, `security.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

The user tested the Desktop extension on Windows, 2026-11-12: `arp_find_tools` and `arp_get_skill`
worked; `arp_pulse` answered nothing. In the modes that keep an agent key it did not run the search
package (commit `ada72614`) and asked the agent to run `npx skills find`; Claude Desktop has no terminal,
and its sandbox's network did not reach skills.sh. Of three options (bundle the official CLI, call
skills.sh's API, drop `arp_pulse` from Desktop) the user chose the first.

## What changes

1. `apps/cli`: `skills@1.7.6` as an exact devDependency; `build` bundles it to `dist/skills-cli.js` and
   runs `scripts/vendor-licenses.ts`, which writes `dist/skills-cli.LICENSE.txt`.
2. `scripts/packages.ts` puts both in the plugin's `bin/`; `scripts/mcpb.ts` in the extension's
   `server/`; the npm package carries them in `dist/`.
3. `apps/mcp/src/handlers/pulse.ts`: `vendoredSearchCli` finds `skills-cli.js` beside the entry it was
   started from; `searchInvocation` runs it with `process.execPath`, the same four variables;
   `canSearch` allows the key-keeping modes only with it; the answer's `search` names what ran.
4. `apps/cli/scripts/check-node.sh`: the plugin's search must run the bundled copy, not `npx`.
5. Docs: `docs/22`, `mcp-tools.md`, `skills/arp/SKILL.md`, the CHANGELOG; ADR `0201`.

## Checked, 2026-11-12

- **No npx, real search.** In a clean `node:22-bookworm` container with `npm` and `npx` moved off `PATH`:
  the unpacked `.mcpb` in `desktop` mode, and the plugin's `bin/arp.js` in `read` mode, each answered
  `arp_pulse` for "video demo website" with `results_found: 93`.
- **Network.** `skills-cli.js find "video demo"` with every `fetch` and socket connect logged, the
  restricted env: `https://skills.sh/api/search?q=…` and `skills.sh:443` only. Without
  `DISABLE_TELEMETRY`: also `https://www.skills.sh/tele/t` with the query.
- **Sizes.** Plugin `bin/`: 3,105,000 bytes on `dev` `eda9f36c`, 4,079,030 after. `.mcpb`: 688,320 bytes
  built from `dev` `72a62f1c` on 2026-11-11, 898,515 after (877.4 kB packed, 6 files). npm package
  894.3 kB packed (`npm pack --dry-run`).
- **Gates.** `apps/mcp` 340 tests, tsc clean; `apps/cli` 89 tests, lint clean, `check:node` PASS,
  `packages --check` matches; `apps/hook` 116; root `bun run check`. New code's coverage:
  `scripts/vendor-licenses.ts` 100% functions, 93.55% lines (the `import.meta.main` lines are not run by
  a test); `pulse.ts`'s new functions each have a test (`vendoredSearchCli`, `searchLabel`, the vendored
  `searchInvocation`, `canSearch`).

## Do not do in this task

- Call skills.sh's API from ARP's code, or change the search's arguments or environment.
- Release: the version and the release are the orchestrator's.
