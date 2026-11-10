# Task 114 — Every way to install ARP, listed in one place

**Status:** verified 2026-11-10, `task-verifier` PASS, post-mortem `.claude/learning/103-every-install-route.md`. On `worktree-agent-aac5087771a466695`, not pushed.
**ADR:** none (a docs page and pointers; no decision beyond the user's request).
**Rules:** `workflow.md`, `claims.md`; `ui.md` does not apply (Markdown only, plus one manifest entry).
**Required skills:** `arp-contributing`.

## Why

The user, 2026-11-10: « tous les installers doivent être répertoriés dans le repo ». The routes were spread
over `README.md`'s Get started table, `docs/23`, the site's `quickstart`, `testers`, `cli`, `mcp-tools`,
`no-install` pages and tasks 102 and 105, and they disagreed on Claude Desktop.

## Deliverables

1. `apps/web/public/docs/install.md`: a table (runtime, route, state on 2026-11-10, what you get), then one
   section per route: the Claude Code plugin (install, update), Claude Desktop by hand
   (`claude_desktop_config.json`, `npx -y @arp-protocol/cli@0.0.3 mcp`, `ARP_TARGET=testnet`,
   `ARP_TOOLS=read`, what having no hook means), the hosted connector (not live), the `.mcpb` extension (not
   published), `arp init`, `arp init --sponsored`, the npm package and the MCP Registry entry with the
   commands that check them, the skill file and `npx skills add`, a Docker test, the one-ARP-per-runtime
   rule, the link to Uninstall.
2. Registered in `apps/web/src/docs/manifest.ts` (Start, after Quickstart).
3. Pointers instead of restatements: `README.md` (its table replaced by two commands and a link),
   `quickstart.md` (its four install sections replaced by the picker and a link), `testers.md`,
   `cli.md`, `mcp-tools.md`, `no-install.md`, `uninstall.md`, `apps/cli/README.md`, `docs/23` (header),
   `docs/31` (an amendment on the stale 0.0.1 line).
4. `scripts/build/build-claude-index.ts` read only two-digit post-mortems (`^\d{2}-`), so 103, the first with three digits, was left out of `.claude/learning/INDEX.md`; it now reads two or three and sorts by number.

## Checks run, 2026-11-10

| what | command | result |
| --- | --- | --- |
| npm | `npm view @arp-protocol/cli version mcpName dist-tags` | `0.0.3`, `io.github.Wieedze/arp`, `latest: 0.0.3` |
| MCP Registry | `curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.Wieedze/arp"` | one entry, 0.0.3, `active`, `isLatest: true`, published 2026-11-10T13:21:55Z |
| the Desktop entry's command, outside Desktop | `ARP_TARGET=testnet ARP_TOOLS=read npx -y @arp-protocol/cli@0.0.3 mcp`, sent `initialize` and `tools/list` over stdio (Linux, Node 22.21.1) | chain 13579; tools `arp_pulse, arp_tool_reputation, arp_agent_endpoints` |
| the plugin, clean | `docker run --rm node:22-bookworm bash -c "npm i -g @anthropic-ai/claude-code; claude plugin marketplace add intuition-box/ARP; claude plugin install arp@arp; claude plugin list; claude plugin marketplace update arp; claude plugin update arp@arp"` | Claude Code 2.1.322; `arp@arp` 0.0.3 enabled; "already at the latest version (0.0.3)" |
| the skill | `npx skills add intuition-box/ARP --list` | 5 skills found, `arp` among them |
| skills.sh | `curl -s 'https://skills.sh/api/search?q=intuition-box'` | one other skill of the org; ARP's not listed |
| `init --print` | `npx -y @arp-protocol/cli@0.0.3 init --print` | an `sh -c` entry with `ARP_TARGET=testnet` only, the full tool set; not used for Desktop |

The stdio check sent these three lines, one per line, then read the replies:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

Not run: the Desktop entry inside Claude Desktop (macOS, Windows), the interactive Docker session, the
hosted connector (not deployed), `arp init` in Cursor, Gemini CLI, Codex or Copilot.

## Gates

- root `bun run check`: pass.
- `apps/web`: `bunx tsc -b` 0; `bun run test` 106 files, 908 passed, 2 skipped (the docs tests check the
  manifest, every link and every anchor).

## Do not do in this task

- Change `docs/30`.
- Touch tasks 112 and 113's files (`apps/web` pages, `apps/mcp`, the plugin's SKILL.md).
- Deploy, publish, push.

## Evidence ladder

Skill column, observed tier: a stranger who can install ARP is a precondition for a line from a machine that
is not ARP's. The page does not move ARP up the ladder by itself; it removes a wrong instruction on the way.
