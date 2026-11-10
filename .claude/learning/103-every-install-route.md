# 103 — Every way to install ARP, listed in one place

**Task:** `docs/tasks/114-every-install-route.md`
**Completed:** 2026-11-10
**Commit:** `2b0a0bca`
**Verifier verdict:** PASS

## What shipped

- `apps/web/public/docs/install.md`: the one list. A table (runtime, route, state on 2026-11-10, what you get), then one section per route: plugin, Desktop by hand, hosted connector (not live), `.mcpb` (not published), `arp init`, `arp init --sponsored`, npm + MCP Registry with the commands that check them, skill file, Docker.
- `apps/web/src/docs/manifest.ts`: `install` under Start, after Quickstart.
- Pointers instead of restatements: `README.md` (table removed), `quickstart.md` (four sections down to the picker and a link), `testers.md`, `cli.md`, `mcp-tools.md` (Plugin row now names the Registry entry and the Desktop entry), `no-install.md`, `uninstall.md`, `apps/cli/README.md`, `docs/23` header, `docs/31` amendment.

## Surprises

- The routes had been out of step on Claude Desktop: README said the `.mcpb` was the Desktop route, while a hand-written `claude_desktop_config.json` entry with `ARP_TARGET=testnet ARP_TOOLS=read` already worked. `ARP_TARGET` defaults to mainnet (`apps/mcp/src/config.ts:100`), so leaving that variable out of a hand-written entry would have quietly planned against 1155.
- `skills/arp/SKILL.md:70-73`, which generates `packaging/claude/arp/skills/arp/SKILL.md`, still says ARP "runs" the hosted endpoint, in the present tense. `install.md` says it is not live. That file belongs to task 113 and was left alone on purpose.

## Decisions made

- **No ADR.** The task is a docs page and pointers, and the request came from the user.
- **testers.md keeps "Desktop is not part of this round"** (task 111) and links to the Desktop entry, so it no longer contradicts install.md.

## Rules touched

- `.claude/rules/claims.md`: sufficient. Check 6 was met by giving the command next to each state claim (npm view, registry curl, docker, `skills add --list`). The Desktop stdio check names its command but not the JSON-RPC lines it sent.

## Suggestions for future tasks

- When an install route's state changes (connector deployed, `.mcpb` published, Desktop tried for real), edit `install.md` first and grep `hosted endpoint`, `mcpb`, `0.0.3` for the other copies.
- Make `skills/arp/SKILL.md`'s hosted-endpoint paragraph match `install.md` (task 113, or the next task that touches the skill).
- If the Desktop entry's check gets re-run, commit the stdio exchange as a script, so a reader can run the same check.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, observed tier: a stranger who can install ARP is needed before any line can come from a machine that is not ARP's. The page does not move ARP up by itself. It removes wrong install instructions that stood in the way.
