# 0167 — The hook reads a skill before `npx skills add` runs, and so makes a network call

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/98`; the user's decisions of 2026-11-10 (feature A, first priority): an
automatic check before a skill is installed, facts and never a verdict, nothing blocks.

## Context

ADR `0165` (task 96) built the reading, `readSkillContents`, and put it where an agent asks:
`arp_pulse`, `arp_get_skill`, the Desktop install dialog, the skill page. Every one of those needs the
agent or the person to come to ARP first. An agent that runs `npx skills add owner/repo` on its own
never does, and that is the case the user named: agents act on their own, so a person must see what is
inside a skill before the agent installs it.

The one place that sees the install whatever the agent decided is the runtime. Claude Code runs a
`PreToolUse` hook before every tool call, waits for a hook not marked `async`, shows its top-level
`systemMessage` to the person and adds `hookSpecificOutput.additionalContext` to the agent's context
"alongside the tool result" (code.claude.com/docs/en/hooks, "JSON output" and "PreToolUse decision
control", read 2026-11-10). ARP already ships a hook, on `PostToolUse` and `PostToolUseFailure`, and
until now it made no network call (`docs/22`, "The hook", 2026-10-30).

## Decision

1. **The hook routes by event.** `apps/hook/src/hook.ts` reads `hook_event_name` before anything
   else and sends `PreToolUse` to `pre-install.ts`; an event with no route falls through to the
   recording, unchanged. Adding an event is one line in `ROUTES` and one row in `CLAUDE_HOOKS`.
2. **`CLAUDE_HOOKS` is a list of registrations**, each with an optional `sync`, `timeout` (seconds)
   and `if` (one permission rule). One event may hold several rows; `withHooks` strips ours once per
   event name and writes every row, `hasHooks` counts them. `arp init` and the plugin's
   `hooks/hooks.json` come from the same spec (`apps/cli/scripts/packages.ts`).
3. **The new row**: `PreToolUse`, matcher `Bash`, waited on, `timeout: 15`, `if: "Bash(*skills*)"`.
   Waited on because an `async` hook's output arrives on the next turn and its `systemMessage` is not
   shown (docs, "async"); the `if` rule because without it every `Bash` call would wait on Node's
   start. The rule is wider than an install on purpose: the command has many spellings
   (`npx -y skills@1.7.4 add`, `bunx skills i`, `pnpm dlx skills add`) and the docs allow one rule per
   handler; the hook answers nothing for any other command.
4. **What is recognised** is the `skills` CLI's `add` and its aliases `a`, `install`, `i`
   (skills 1.7.4 `dist/cli.mjs`), bare or through `npx`, `pnpx`, `bunx`, `pnpm dlx`, `yarn dlx`,
   `npm exec`, with the CLI's own GitHub source forms (`owner/repo`, `@skill`, a sub-path, a
   `github.com` URL with or without `/tree/<ref>/<path>`, `github:`, a `#ref[@skill]` fragment) and
   `--skill`/`-s` (several), `--all`, `--skill '*'`. `--list` installs nothing and is not read. Any
   other source (GitLab, Azure, `git@`, `ssh://`, a local path, a download URL) is named and not
   read. The parser is `packages/protocol/src/skill-install.ts`, pure, so `arp check` (task 86) can
   use it.
5. **Bounds**: at most 3 skills, through `readPulse` and `githubPulseSource` (task 63, ADR `0134`),
   answered within 6 s whatever GitHub does; `GITHUB_TOKEN`, else `GH_TOKEN`, when set. A ref the
   command names is reported and not followed: `readPulse` reads the default branch's `HEAD`.
6. **Facts, no decision.** The output carries no `permissionDecision`, no `decision`, no
   `continue`. The person's own permission flow decides whether the command runs, as it would
   without the hook (ADR `0165`).

## What leaves the machine

**The repository and skill names the command already holds**, in at most two requests to
`api.github.com` (the tree and the repository's figures) per install, and from
`raw.githubusercontent.com` the `SKILL.md` files that name the skill (others in the repository too,
when its directory does not carry its name, as `readPulse` searches) and up to five scripts each skill
runs. That is the same host the install itself is about to
clone from. Nothing the person typed, no file of theirs, no other part of the command. The token goes
to `api.github.com` only (`githubPulseSource`: raw requests carry no header). The memory rule "a
user's text never leaves their machine" holds: a command an agent wrote is not the person's text, and
only its source argument is used.

This retracts "the hook makes no network call" wherever it was written. The sites corrected:
`apps/hook/README.md`, `docs/22` (the hook section, the outbound section, the environment variables),
`README.md`, `CLAUDE.md`'s directory map, `docs/31`'s diagram, and `apps/web/public/docs/`
`overview.md`, `architecture.md` (two), `developers.md`, `quickstart.md`, `cli.md`, `glossary.md`,
`testers.md`; the notes in `apps/hook/src/skill-failure.ts` and `data/catalogue/skill-nodes-13579.json`
(with its builder) now say the failure record reads no network, which stays true. Older ADRs and
post-mortems are append-only and keep their wording.

`docs/22`'s check `grep -cE "fetch\(|createPublicClient\("` still prints `0` and no longer proves
anything, because `githubPulseSource` calls `fetch` as `get`. It is replaced by one that lists the
request sites.

## Alternatives considered

- **`async: true`, like the other two rows.** The session would not wait, but the docs say an async
  hook's `additionalContext` and `systemMessage` arrive on the next turn and the `systemMessage` is not
  shown to the person. The person seeing it before the install is the whole point.
- **The brief's `if: "Bash(npx skills add *)"`.** It misses `npx -y skills add`, `skills@<version>`,
  `bunx`, `pnpm dlx` and the aliases; a list of rules is not allowed, and several rows matching one
  command would run the hook twice.
- **A `permissionDecision: "ask"`** to force a confirmation. That is a verdict in all but name and the
  user decided nothing blocks (ADR `0165`); the permission flow the person configured already decides.
- **Reading the ref the command names.** `readPulse` reads `HEAD` and adding a ref to it touches every
  caller of task 63's reader; the report says which ref was named and that `HEAD` was read.
- **Index lines (`needs`, `with`, outcomes) in the same message.** `readPulse` returns none; they come
  from the graph through `arp_pulse` (task 97), and reading the graph from the hook is a second network
  call and a second host. Left out; noted in task 98.

## Consequences

**Positive:**
- An install the agent decided on its own is read before it runs, in Claude Code and its plugin, with
  nothing for the person to remember.
- Tasks 99 and 100 add an event with one row and one route.

**Negative:**
- A command containing `skills` waits for Node's start, and an install up to six seconds more.
- Without a token, two GitHub API requests per install count against 60 an hour shared with
  `arp_pulse`; past it the report says so and reads `SKILL.md` alone from the raw host.
- Whether Claude Code's `if` matcher accepts `Bash(*skills*)` as the docs describe was not tested
  against a live runtime here; the hook's own parser is what decides, so a wider match only costs a
  silent start.

**Neutral (worth knowing):**
- Grok Build reads the same settings; whether it sends `PreToolUse` and honours this output is
  untested. The recording path is unchanged for it.
- The `additionalContext` reaches the agent next to the tool result, so the agent reads it once the
  install has run; the person reads the `systemMessage` before.

## References

- Related rules: `.claude/rules/security.md`, `.claude/rules/claims.md` (check 5, the retraction)
- Related docs: `docs/22_RUNNING_THE_NODE.md`, `docs/tasks/98-a-check-before-a-skill-is-installed.md`
- Related ADRs: `0165` (the reading), `0134` (`readPulse`), `0090` (the recording's events), `0145`
  (the plugin carries its hook)
- Post-mortem: `.claude/learning/87-a-check-before-a-skill-is-installed.md`
