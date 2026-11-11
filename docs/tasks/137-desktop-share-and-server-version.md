# Task 137 — Desktop's share setting stops overwriting, and the server names its version

**Status:** built 2026-11-11, written by a subagent of arp-24. `task-verifier` PASS, post-mortem `.claude/learning/125-desktop-share-and-server-version.md`. Task 137, post-mortem `125`, no ADR
(the user approved both fixes as stated; the one choice left is recorded below). Not released: it
ships in the next CLI release, with no version bump here.
**Rules:** `code.md`, `security.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

Two defects in the Claude Desktop extension built by task 135, both approved by the user on 2026-11-11.

1. The share checkbox (task 88's `share_failures`, passed as `ARP_SHARE`) rewrote `~/.arp/sharing.json`
   at every start. Claude Code on the same machine reads the same file, so an `arp share on`, or an
   "always" answer to the hook's question (task 126), was turned off by the next Desktop start with the
   box left at its default. The user's question, "the checkbox overwrites the choice; fix it?", answer
   « oui ».
2. `initialize` answered `serverInfo.version: '0.2.0'`, hard-coded since task 50, in the plugin and in
   the `.mcpb` alike, whatever the release.

## What changes

- `apps/mcp/src/share-ask.ts`, `applyDesktopShare`: the checkbox writes `sharing.json` only when no
  choice is on file, when the choice on file is the extension's own (`how: desktop`), or when the
  checkbox changed since the last start. Its value at each start is kept in `~/.arp/desktop-share.json`
  (`{"share": bool}`). A start with the box unchanged leaves any other choice alone, so the extension
  never turns sharing off silently: it writes off only over its own choice, or when the person unticks.
- `apps/mcp/src/config.ts`, `SERVER_VERSION = process.env.ARP_PACKAGE_VERSION || 'source'`; `server.ts`
  reports it. `apps/cli`'s two builds inline it from `package.json` `version`, like `sponsorDefault`
  and `contentDefault` (ADR `0175`): the `build` script (`--define … $npm_package_version`) and
  `scripts/packages.ts` (`pkg.version`), so `dist/cli.js`, `packaging/claude/arp/bin/arp.js` and the
  `.mcpb`, which copies that file, all report it. Run from source, `source`.
- `packaging/claude/arp/bin/arp.js` regenerated. `apps/cli/CHANGELOG.md` gains an "Unreleased" section.
- The new file is listed where every file under `~/.arp` is: `docs/22_RUNNING_THE_NODE.md`,
  `apps/web/public/docs/uninstall.md`, and `apps/web/public/docs/local-memory.md` § Sharing.

## The one choice

With no `desktop-share.json` yet (the first start of this version), the last-seen value is the
manifest's default, unticked. So an unticked box over a choice made in Claude Code changes nothing,
and a box the person ticked turns sharing on, even over an earlier "no", since ticking it is a choice
made in Desktop. A choice the 0.0.6 extension wrote (`how: desktop`) keeps following the box, as before.

## Checked, 2026-11-11

- `apps/mcp/test/share-ask.test.ts`: Claude Code turns sharing on, Desktop starts twice with the box
  unticked and unchanged, sharing stays on (`how: command`); an "always" answer before Desktop ever ran
  survives; the person ticks then unticks, each applies; an `arp share off` under a box still ticked
  stays off; a 0.0.6 `desktop` file follows the box; a first tick over "no" turns sharing on.
- `apps/cli/test/mcpb.test.ts`, against `packaging/claude/arp/bin/arp.js` under Node in Desktop's env:
  `initialize` answers `{name: 'ARP', version: '0.0.6'}`, and the same on/unchanged/changed sequence
  through the real bundle. `apps/cli/test/cli.test.ts`: `dist/cli.js mcp` answers `0.0.6`.
  `apps/mcp/test/server.test.ts`: from source, `source`.
- `bun run --cwd apps/cli mcpb` built `arp-0.0.6.mcpb`; unzipped, its manifest is version 0.0.6 with
  `ARP_TARGET=testnet`, `ARP_TOOLS=desktop`, `ARP_SHARE=${user_config.share_failures}`, default
  unticked; its `server/arp.js` started with `ARP_SHARE=false` over a `how: command` file answered
  `"serverInfo":{"name":"ARP","version":"0.0.6"}` and left `sharing.json` on.
- Gates: `apps/cli` test (92 pass), lint, `check:node`, `packages --check`; `apps/mcp` test (337 pass)
  and lint; root `bun run check`. `apps/hook` is not touched.

## Do not do in this task

- No version bump. `apps/cli/assets/plugin-skill.md` and `skills/arp/SKILL.md` belong to task 138.
