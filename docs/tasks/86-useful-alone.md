# Task 86 — Useful alone: the check comes first

**Status:** proposed 2026-11-09, not started. Numbering: first written as 84; renumbered 86 because tasks 84 and 85 landed on `main` first.
**ADR:** none needed unless the landing's scene order changes (a redesign is the user's decision, `docs/30`).
**Rules:** `code.md`, `ui.md`, `workflow.md`, `claims.md`.

**Closed 2026-11-10 by task 103 (ADR `0172`):** closed into task 98, which runs the check by itself before `npx skills add` (ADR `0167`) and exports `skillInstallOf` and `skillInstallReport` from `@arp-protocol/core` for an `arp check`. Not built: `arp check` itself, the `SessionStart` line, the hero field and the onboarding example (deliverables 1, 4, 5, 6); `FUTURE.md`, "Left by the sweep".

## Why

A network is empty on its first day, so the first person who installs ARP has to get something from it alone. ARP already gives it: `arp_pulse` reads a skill's own files and reports what they mention, a login, key names, paid words, the commands it runs, the hosts it talks to (`apps/mcp/src/handlers/pulse.ts`), with no line written by anyone. `docs/30` allows saying so, "as matches in the file, not requirements".

The model is already told: the skill's description opens with "Check a skill, MCP server or API before you install or pay for it" (`skills/arp/SKILL.md:3`), `arp_pulse`'s description opens with "Before installing a skill" (`apps/mcp/src/tools.ts`), and the read-only instructions say "LOOK HERE FIRST" (`apps/mcp/src/server.ts`, `READ_INSTRUCTIONS`).

The person is not. Read on `main` at `79d5c92`, 2026-11-09 (rechecked after tasks 84 and 85 landed):

| surface | what the person meets first | what is missing |
| --- | --- | --- |
| CLI | `arp init` ends with "Done. Restart your agent runtime…" (`apps/cli/src/install/commands.ts`, `change`) | anything the operator could not see before, which `docs/23` §7.3 already asks for |
| CLI | no command checks a skill; the subcommands are `mcp`, `hook`, `share`, `line`, `backfill`, `node`, `init`, `uninstall`, `doctor` (`apps/cli/src/cli.ts`) | a way to see a check from the terminal |
| MCP server, full mode | the full-mode instructions open with what declaring costs ("WHAT DECLARING BUYS", `SERVER_INSTRUCTIONS`); the Desktop and read-only modes already open with "LOOK HERE FIRST" (`DESKTOP_INSTRUCTIONS` starts with `READ_INSTRUCTIONS`) | the check first, the declaring after, in the read-only mode's order |
| Claude Code, Codex, VS Code | no `SessionStart` line (no match for `SessionStart` in `apps/cli/src` or `apps/hook/src`) | one line of fact at session start, which `docs/23` §7.3 proposes |
| Web | the hero's first control is "Open the agent index"; the scenes tell the network (an agent writes, the next one knows, plug in) (`apps/web/src/pages/Landing.tsx`) | a way to check a skill from the first screen; the per-skill page that shows the check already exists (`/pulse/:owner/:repo/:skill`, `PulsePage.tsx`) |

## The user's decision, 2026-11-09

Put "useful alone, before any network" first, in Claude Code, the CLI, Desktop and the web front (« il faut qu'on le mette en avant dans l'interaction avec ARP »).

## Deliverables

1. **`arp check <owner/repo[/skill] | skills.sh URL | "a need in words">`.** Read-only, no wallet, no key. For a skill: what its files mention (login, key names, paid words, commands, hosts) and, if any, the lines written about it with their outcomes. For a need: the top results of the same search as `arp_pulse`. It calls the handler the MCP server already uses; no second implementation. Copy as in `PulsePage.tsx`: matches in the text, not requirements.
2. **`arp init` ends with the next step.** After "Done.", two lines: the `arp check` command on one real skill, and one sentence to give the agent ("Find a skill to transcribe this podcast, with ARP", the landing's own example). It runs nothing by itself.
3. **Full-mode instructions in the read-only order.** `SERVER_INSTRUCTIONS` opens with the check (the "LOOK HERE FIRST" paragraph); "WHAT DECLARING BUYS" comes after it, unchanged. `DESKTOP_INSTRUCTIONS` and `READ_INSTRUCTIONS` already do this.
4. **One `SessionStart` line** in the runtimes `docs/23` §7.3 confirms (Claude Code, Codex, VS Code): that ARP is installed and that a skill or MCP server is checked with ARP before it is installed. One line of fact, never a pitch (`ui.md`, Copy). `arp uninstall` removes it.
5. **Web, first screen.** The hero's first control becomes a field: paste a skill (owner/repo/skill or a skills.sh URL) to open its `/pulse/` page, or type a need to open `/search`. "Open the agent index" stays, second. One field and one link, not a tagline with two buttons (`ui.md`, anti-templates).
6. **Web, onboarding.** `/start/claude` and `/start/agent` show, right after the install command, the same `arp check` example and the sentence to give the agent.
7. **Copy.** Every new sentence is checked against `docs/30`'s table. Not used: "safe", "verified", "secure", "it works".

## Gates

```
bun run --cwd apps/cli test
bun run --cwd apps/cli packages --check
cd apps/web && bunx tsc -b && bun run lint && bun run test && bun run check:tokens
bun run check:scripts
```

`ui-reviewer` on deliverables 5 and 6 before `task-verifier` (`workflow.md`). A test asserts that `arp check` on a fixture skill prints its login line and hosts, and that `arp init --dry-run` prints the next step.

## Do not do in this task

- Redesign the landing's scenes or change their order. Only the hero's first control changes; a redesign is the user's decision.
- Run a check, or any network call, during `arp init` without being asked.
- Present a file match as a requirement, or a check as a verdict.
- Write anything on chain from `arp check`.

## Open questions for the user

1. Which skill the `arp init` example and the onboarding use (one with a login and a host shows the most).
2. Whether the hero field replaces "Open the agent index" or sits above it.

## Evidence ladder

Skill column. The check is not on the ladder: it reads a skill's files, not what anyone declared, and moves nothing up. What it changes is who runs the hook: every person who installs ARP for the check also records what their agent used, and a failure the hook records is the skill column's observed tier (`docs/32`).
