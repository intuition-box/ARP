# Task 135 — The Claude Desktop extension is built here

**Status:** built 2026-11-11 on `feat/135-desktop-extension`, written by arp-97. `task-verifier` PASS, post-mortem `.claude/learning/123-the-desktop-extension-is-built-here.md`. Task 135, post-mortem
`123`, no ADR (ADR `0110` decides the mode; task 88 decided the setting and its default). **Not
released**: the user tests the file in Claude Desktop on Windows and macOS, then says so, then the
orchestrator attaches it to the GitHub Release `v0.0.6`, and only then does `install.md` link it.
**Rules:** `code.md`, `security.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

`install.md` lists the Desktop extension as "not published". It was built once, by hand, as
`arp-0.2.0.mcpb` (task 50), and the user walked it on Windows on 2026-11-02; nothing in the repository
could build it again. The user, 2026-11-11: publish it on GitHub as a custom extension.

## What changes

- `apps/cli/scripts/mcpb.ts`, run by `bun run --cwd apps/cli mcpb` after `bun run packages`. It copies
  the plugin's `packaging/claude/arp/bin/arp.js` (one bundle for both, so they cannot drift), writes the
  manifest (version 0.3 of the format: `ARP_TOOLS=desktop`, `ARP_TARGET=testnet`, task 88's
  `share_failures`, off by default, as `ARP_SHARE`), validates it and packs
  `apps/cli/dist-mcpb/arp-<version>.mcpb` with `@anthropic-ai/mcpb` 2.1.2, an exact devDependency of
  `apps/cli`, outside the published `files`. `dist-mcpb/` is ignored by git.
- `apps/cli/test/mcpb.test.ts`: the mode, the env, the setting's default, and the official validator.
- `apps/web/src/data/arp-test-identities.json`: agent 44, created by this task's check, joins the list
  (owner read with `ownerOf(44)` on `0xC165…0d5A`, 2026-11-11: `0x0B2bF0E8E60A5e90ED905fE65b63A53834023C7d`;
  `ownerOf(45)` reverts). Its tests pin 44.

## Checked, 2026-11-11

- `bun run --cwd apps/cli mcpb`: "Manifest schema validation passes!", `arp-0.0.6.mcpb`, 672.0 kB packed,
  4 files (`manifest.json`, `icon.png`, `server/arp.js`, `server/package.json`).
- In a clean `node:22-bookworm` container, the `.mcpb` unzipped, the server started as its manifest
  says (`node server/arp.js mcp`, `ARP_TARGET=testnet`, `ARP_TOOLS=desktop`, `ARP_SHARE=false`), nothing
  else set: `--version` 0.0.6; `tools/list` `arp_find_agents, arp_find_tools, arp_pulse,
  arp_tool_reputation, arp_agent_endpoints, arp_get_skill, arp_declare_used, arp_file_category` on 13579;
  `arp_get_skill` on `pdf` (`0x9b3a3cc6…a8ce`) served it; `arp_declare_used` answered `"declared":
  "pdf"` and registered agent 13579:44. So the bundle's hosted defaults (sponsor and content server) are
  the ones it uses.
- Gates: `apps/cli` test (89 pass), lint, `check:node`, `packages --check`; root `bun run check`; web
  `tsc -b` and test (915).

## The test in Claude Desktop, for the user

Build it (`bun run --cwd apps/cli mcpb`) or take `apps/cli/dist-mcpb/arp-0.0.6.mcpb`. On Windows, then
macOS:

1. Remove any older ARP entry first (an earlier `.mcpb`, or the entry by hand in
   `claude_desktop_config.json`): one ARP per runtime.
2. Claude Desktop, Settings, Extensions: install the file (drag it in, or Install from file). The
   install screen shows **ARP** 0.0.6 and the setting "Share this machine's skill failures as public
   lines", unticked. Afterwards `~/.arp/sharing.json` reads `"failures": false` and `"how": "desktop"`.
   If Claude Code on the same machine had `arp share on`, note that Desktop's start set it back to off
   (task-verifier, task 135: the setting writes the file both share at every start). Fixed by task 137:
   an unchanged setting no longer overwrites a choice made in Claude Code.
3. A new chat: « Find me a skill to work with PDF files, with ARP ». Claude lists skills.
4. « Get the pdf skill with ARP ». Claude shows what it contains, then its SKILL.md.
5. « Declare with ARP that I used it ». About a minute; the answer says declared.
6. Note what failed, with the message, and whether Desktop's own Node or the system's ran it (Settings,
   Extensions, Advanced). The manifest asks for Node ≥ 22.

The key goes in `%USERPROFILE%\.arp\` on Windows and `~/.arp/` on macOS. Its agent then belongs on the
test identities list, like 39 to 44.

## Do not do in this task

- Create the GitHub Release or link the file from `install.md`: both wait for the user's test and go.
- Sign the `.mcpb` (`mcpb sign`): not decided.
