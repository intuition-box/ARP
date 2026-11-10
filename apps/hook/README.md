<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../docs/design/brand/arp-lockup-dark.svg" />
  <img src="../../docs/design/brand/arp-lockup-light.svg" height="40" alt="ARP" />
</picture>

# ARP hook

Records which tools your agent actually used, as the runtime saw them. This record is what a
declaration is built from later.

It runs after every tool call (`PostToolUse` and `PostToolUseFailure`) and appends one line to
`.arp/session.jsonl` for each skill or MCP call.

The recording makes no network call. It writes locally and nothing else.

**Before a skills install it reads GitHub.** On `PreToolUse`, when the agent is about to run
`npx skills add` (or `bunx`, `pnpm dlx`, `yarn dlx`, `npm exec`, any version of `skills`), it reads
up to three of the skills that install would take, within six seconds, and shows you and the agent
what their files contain: programs, keys, scripts, fetch-and-run lines, domains, hidden text. Facts,
never a verdict, and it blocks nothing (`src/pre-install.ts`, ADR `0167`). What reaches GitHub is
the repository and skill names already in the command. `GITHUB_TOKEN` or `GH_TOKEN` raises GitHub's
limit of 60 requests an hour when set. A source that is not on GitHub is named and not read.

## Install

```bash
arp init         # copies the hook to ~/.arp/bin and registers it, backing up your settings first
arp uninstall    # removes it
```

By hand: `cd apps/hook && bun run build`, then point its three events in `.claude/settings.json` at
`apps/hook/dist/arp-hook.js`. The exact snippet is in
[Running the node](../../docs/22_RUNNING_THE_NODE.md#the-hook--appshook).

## What it writes, and what it never writes

Per call: the tool, the outcome (`ok`, `tool_error`, `auth`, `timeout`, `unreachable`, `payment`),
the status code, the duration and the size of the response.

**Never** the response itself, the arguments or the error text, because those can hold a key or a
file. A URL is stripped of its query, credentials and anything that looks like a token. The first
time it runs, it writes a `.gitignore` in `.arp/` so the log is never committed by accident.

A payload it cannot read exits cleanly and writes nothing, so the hook never blocks a tool call.

```bash
bun test     # from apps/hook
```
