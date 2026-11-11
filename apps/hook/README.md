<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../docs/design/brand/arp-lockup-dark.svg" />
  <img src="../../docs/design/brand/arp-lockup-light.svg" height="40" alt="ARP" />
</picture>

# ARP hook

Records which tools your agent actually used, as the runtime saw them. This record is what a
declaration is built from later.

It runs after every tool call (`PostToolUse` and `PostToolUseFailure`) and appends one line to
`.arp/session.jsonl` for each skill or MCP call.

The recording makes no network call. It writes locally and nothing else. Two answers read the
network, each on its own event:

**Before a skills install it reads GitHub.** On `PreToolUse`, when the agent is about to run
`npx skills add` (or `bunx`, `pnpm dlx`, `yarn dlx`, `npm exec`, any version of `skills`), it reads
up to three of the skills that install would take, within six seconds, and shows you and the agent
what their files contain: programs, keys, scripts, fetch-and-run lines, domains, hidden text. Facts,
never a verdict, and it blocks nothing (`src/pre-install.ts`, ADR `0167`). What reaches GitHub is
the repository and skill names already in the command. `GITHUB_TOKEN` or `GH_TOKEN` raises GitHub's
limit of 60 requests an hour when set. A source that is not on GitHub is named and not read.

**After a skill fails it reads the Intuition graph.** On `PostToolUseFailure`, when a command a
skill asked for fails because a program, a key or a file is missing, it reads that skill's lines
from the Intuition graph (testnet 13579) and hands them to the agent beside the error, such as
`2 wallets wrote failed · because missing-program (2) · needs ffmpeg (2)`. It sends the skill's
atom, a hash of its public address, which tells the index that skill failed but not why, and never
the command, its output or your words. Once per session, skill and reason, within three seconds,
silent when it fails. `ARP_FAILURE_LINES=off` stops it (ADR `0168`).

**It asks the model during the task.** When a skill loads, once per skill in the session, it asks
the model to end its final reply with one line, `arp: <skill> worked`, `failed` or `unsure`. On
`Stop` it reads that line and writes the answer to `~/.arp/outcomes.jsonl`. No network, and no extra
turn: `Stop` prints nothing. A reply without the line records nothing (ADR `0169`, ADR `0179`).

**It asks once whether to share, and starts the sending.** While `~/.arp/sharing.json` does not exist,
the first skill with a public source to load carries one more request: when the closing line says
`worked` or `failed`, the agent asks the person whether to share that result, "yes, this once",
"always" or "no", and ends its reply to the answer with `arp-share: once`, `always` or `no`. `Stop`
reads it from a later message of the same session, never the one that asked, and writes
`sharing.json` with the date and how it was chosen. The question is put once per machine. On
`SessionEnd`, with sharing on or a "yes, this once" from that session, it starts
`arp share send --auto` detached and returns at once: that program, not the hook, reaches the
sponsoring service, takes a lock and writes what happened to `~/.arp/share-log.jsonl`. The hook
finds it beside itself (`arp.js` in the plugin, `cli.js` under `arp hook`), in `send.json` beside
it (written by `arp init`), or in `ARP_CLI`. `ARP_SHARE_AUTO=off` stops the question and the sending
(`src/share-ask.ts`, ADR `0191`).

## Install

```bash
arp init         # copies the hook to ~/.arp/bin and registers it, backing up your settings first
arp uninstall    # removes it
```

By hand: `cd apps/hook && bun run build`, then point its five events in `.claude/settings.json` (`Stop`, `SessionEnd` and the `Skill` row of `PostToolUse` without `async`) at
`apps/hook/dist/arp-hook.js`. The exact snippet is in
[Running the node](../../docs/22_RUNNING_THE_NODE.md#the-hook--appshook).

## What it writes, and what it never writes

Per call: the tool, the outcome (`ok`, `tool_error`, `auth`, `timeout`, `unreachable`, and for
x402 `payment_required`, `payment_refused`, `paid_no_delivery`), the status code, the duration and
the size of the response.

The three x402 outcomes (task 125). `payment_required` is the `402` that opens every x402 call, and
is not a failure: whether it was then paid is the next line of that tool in the session.
`payment_refused` is a payment refused or failed before it settled (insufficient funds, a rejected
payment, `Settlement failed`). `paid_no_delivery` is written only when the call's own payload holds
a settlement (`success: true`, a network, a transaction) and the call failed or came back empty.
Claude Code passes an MCP result's content and not its `_meta`, where x402's MCP transport puts the
settlement, so there it is seen only when the tool writes it in its result; otherwise a paid call
that failed is `tool_error`. None of the three feeds a line: `arp share` sends skill lines only.
Lines before 2026-11-11 may say `payment`, which held all three.

**Never** the response itself, the arguments or the error text, because those can hold a key or a
file. A URL is stripped of its query, credentials and anything that looks like a token. The first
time it runs, it writes a `.gitignore` in `.arp/` so the log is never committed by accident.

A payload it cannot read exits cleanly and writes nothing, so the hook never blocks a tool call. On
`Stop` it never continues the turn.

```bash
bun test     # from apps/hook
```
