# Task 132 — The install page says what runs today

**Status:** done 2026-11-11, branch `docs/132-install-doc`, written by arp-97. `task-verifier` PASS on round 2, post-mortem `.claude/learning/120-the-install-page-says-what-runs.md`. Task 132, post-mortem
`120`, no ADR, allocated by the orchestrator.
**Rules:** `claims.md`, `workflow.md`. Docs only.
**Required skills:** `arp-contributing` (tone).

## Why

Before the first testers (the user, 2026-11-11: « si tout le flow marche alors on peut commencer à
partager »), every install route was run in clean `node:22-bookworm` containers. Two kinds of line
were wrong in `apps/web/public/docs/install.md`: dated results from 2026-11-10 that no longer described
the published version, and the sponsored route marked "works" while its `arp_get_skill` and
`arp_declare_used` fail off the user's machine (task 131). The user's go: fix the page and mark what
waits for 0.0.6 as soon to be released.

## What changes

- `install.md`: the page's date; the plugin's check, the Desktop entry's and the npm/Registry check,
  each re-run on 2026-11-11 and quoted; the `--sponsored` row and section say **soon to be released**
  for the two tools, worded so the release of 0.0.6 removes one row cell and one paragraph; the
  `npx skills --list` line names the four other skills it finds and that `--skill arp` installs only
  ARP's.
- `mcp-tools.md`: the same one-line note on `arp_get_skill` and `arp_declare_used`.

## Checked, 2026-11-11

- In a clean `node:22-bookworm` container, Claude Code 2.1.322: `claude plugin marketplace add
  intuition-box/ARP`, `claude plugin install arp@arp`, `claude plugin list` (0.0.5, enabled), `claude
  plugin update arp@arp` ("already at the latest version (0.0.5)"), `claude mcp list` (`✔ Connected`).
- Same container: `ARP_TARGET=testnet ARP_TOOLS=read npx -y @arp-protocol/cli@0.0.5 mcp`, over stdio,
  `initialize` then `tools/list`: `arp_pulse, arp_tool_reputation, arp_agent_endpoints`, chain 13579.
- Same container: `npx -y skills add intuition-box/ARP --list`: `arp`, `arp-contributing`, `intuition`,
  `mms-gator-cli`, `mms-smart-accounts-kit` (`arp-listing-test` is internal and not shown).
- On the host: `npm view @arp-protocol/cli version mcpName dist-tags.latest` → `0.0.5`,
  `io.github.Wieedze/arp`, `0.0.5`; `curl -s
  "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.Wieedze/arp"` → three entries,
  0.0.3, 0.0.4, 0.0.5, the last `isLatest: true`, 0.0.4 and 0.0.5 with the remote
  `https://mcp.arp.intuition.box/mcp`.
- Web gates: `tsc -b`, `lint`, `check:tokens`, `test` (915).

## Do not do in this task

- Remove the "soon to be released" notes. They go at the 0.0.6 release, with the orchestrator.
- Change the skills.sh line: it was not re-checked and keeps its date.
