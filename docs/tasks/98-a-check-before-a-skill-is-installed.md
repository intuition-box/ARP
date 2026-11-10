# Task 98 — a check before a skill is installed

**Status:** verified 2026-11-10, post-mortem `.claude/learning/87-a-check-before-a-skill-is-installed.md`, ADR `0167`.
**ADR:** `0167`.
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`. No atom, triple or contract.

## Why

The user, 2026-11-10 (feature A, first priority): agents install skills on their own, so the moment
`npx skills add` is about to run is when a person should see what the skill contains. Task 96 built the
reading (`skill-contents.ts`, ADR `0165`) and put it where an agent asks ARP; this puts it where the
runtime sees the install whatever the agent decided. **Facts, never a verdict; nothing blocks.**

## Deliverables

1. **A pure parser and reader**, `packages/protocol/src/skill-install.ts`: `skillInstallOf(command)`
   recognises the `skills` CLI's `add` (aliases `a`, `install`, `i`, skills 1.7.4) bare or through
   `npx`, `pnpx`, `bunx`, `pnpm dlx`, `yarn dlx`, `npm exec`, any version, launcher flags and
   `VAR=value` prefixes, in a compound command; the CLI's GitHub source forms and `--skill`/`-s`,
   `--all`, `--skill '*'`; `--list` is not an install; other sources are `elsewhere`.
   `readSkillInstall` reads at most 3 skills through `readPulse` before a deadline;
   `skillInstallReport` writes the lines (`contentsLines` per skill, or why it was not read).
   Tested in `packages/protocol/test/skill-install.test.ts`.
2. **The hook routes by event** (`apps/hook/src/hook.ts`, `ROUTES`), and `PreToolUse` goes to
   `apps/hook/src/pre-install.ts`: a skills install is answered with a top-level `systemMessage` (the
   person) and `hookSpecificOutput.additionalContext` (the agent), never a `permissionDecision`;
   anything else exits 0 with nothing on stdout. GitHub's budget is 6 s, with `GITHUB_TOKEN` or
   `GH_TOKEN` when set. Imports are by path, never the core index. Tested in
   `apps/hook/test/pre-install.test.ts`, GitHub mocked.
3. **A per-event spec** in `apps/cli/src/install/edits.ts`: `HookEvent` rows with `sync`, `timeout`,
   `if`; several rows per event allowed. `CLAUDE_HOOKS` gains `PreToolUse` / `Bash`, waited on,
   `timeout: 15`, `if: "Bash(*skills*)"`. `arp init`, `arp doctor` and the plugin's `hooks.json`
   follow it; `packaging/` regenerated. `check-node.sh` runs the plugin's hook on a `PreToolUse`.
4. **The retraction** of "the hook makes no network call" at every site (ADR `0167` lists them), and
   `docs/22`'s outbound and environment sections.

## For tasks 99 and 100

One row in `CLAUDE_HOOKS` and one line in `ROUTES`:

```ts
// apps/cli/src/install/edits.ts, CLAUDE_HOOKS.events
{ name: 'Stop', sync: true, timeout: 20 },
// apps/hook/src/hook.ts, ROUTES — returns stdout text or null
Stop: (payload) => onStop(payload),
```

`eventOf` (`payload.ts`) reads the event before `toolCallOf`, which refuses a payload with no tool.

## Not done, and why

- **`needs`/`with` lines** (task 97) are not shown: `readPulse` returns none, they come from the graph
  through `arp_pulse`, and reading the graph from the hook would be a second host.
- **A ref the command names** is reported, not read: `readPulse` reads `HEAD`.
- **Task 86** (`arp check`, a `SessionStart` line) is not started and is not duplicated here;
  `skillInstallOf` and `skillInstallReport` are exported from `@arp-protocol/core` for it.
- **Whether Claude Code's `if` matcher fires on `Bash(*skills*)`** as its docs describe was not tested
  in a live runtime.

## Gates

```
bun run --cwd apps/hook test && bun run --cwd apps/hook lint
bun run --cwd packages/protocol test && bun run --cwd packages/protocol lint
bun run --cwd apps/cli test && bun run --cwd apps/cli check:node && bun run --cwd apps/cli packages --check
bun run check && bun run test:scripts
```

## Do not do in this task

- Return a `permissionDecision`, a `decision` or anything that stops the command.
- Send anything but the source's repository and skill names off the machine.
- Import `@arp-protocol/core`'s index from the hook.

## Evidence ladder

Skill column, declared tier: the check reads what a skill's own files say, which is the skill's word
about itself, and it moves nothing up the ladder by itself. What it changes is who has the hook: the
same install that shows the check records what the agent then used and what failed, which is the skill
column's observed tier (`docs/32`).
