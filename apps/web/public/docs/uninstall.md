# Uninstall

Every command below was run in a clean `node:22-bookworm` container on 2026-11-09, with Claude Code 2.1.319 and `@arp-protocol/cli` 0.0.1.

## The short version

If you installed the Claude Code plugin:

```bash
claude plugin uninstall arp@arp
claude plugin marketplace remove arp
```

If you ran `npx -y @arp-protocol/cli init`:

```bash
npx -y @arp-protocol/cli uninstall
```

Then, either way, ARP's own folder in your home and the log in each project where you used it:

```bash
rm -rf ~/.arp
rm -rf .arp        # in each project folder
```

Read the next sections before the `rm -rf ~/.arp` if you ever wrote a line: that folder holds your agent's key.

## The Claude Code plugin

`claude plugin marketplace add intuition-box/ARP` and `claude plugin install arp@arp` write only inside Claude Code's own folder:

| Path | What |
| --- | --- |
| `~/.claude/plugins/marketplaces/arp/` | a clone of the repository |
| `~/.claude/plugins/cache/arp/` | the installed plugin, with its program in `bin/arp.js` |
| `~/.claude/settings.json`, `~/.claude/plugins/*.json` | Claude Code's record that the plugin is installed and enabled |

`claude plugin uninstall arp@arp` disables and removes the plugin, and `claude plugin marketplace remove arp` removes the clone. In our run, `~/.claude/plugins/cache/arp/` was still there afterwards: Claude Code marks it and keeps it. You can delete it:

```bash
rm -rf ~/.claude/plugins/cache/arp
```

The plugin's server and hook also write to `~/.arp/` and to `.arp/` in your projects, described below. Uninstalling the plugin does not touch those.

## `arp init`

`arp init` edits your runtimes' configuration. `arp uninstall` removes exactly what `init` added and nothing else. Run it the way you ran `init`: with `npx -y @arp-protocol/cli uninstall` if you used `npx`, with `arp uninstall` if you installed the CLI with `npm install -g`, and with the same `--project` or `--runtime` options.

What `init` writes, per runtime:

| Runtime | Your user files | With `--project` |
| --- | --- | --- |
| Claude Code | the MCP server through `claude mcp add-json arp … --scope user` (into `~/.claude.json`); the hook in `~/.claude/settings.json` | `.mcp.json` and `.claude/settings.json` |
| Grok Build | reads Claude Code's files. Without Claude Code, the same two files are written | same |
| Cursor | `~/.cursor/mcp.json` | `.cursor/mcp.json` |
| Gemini CLI | `~/.gemini/settings.json` | `.gemini/settings.json` |
| Codex | `[mcp_servers.arp]` in `~/.codex/config.toml` | `.codex/config.toml` |
| Copilot (VS Code, CLI) | `~/.copilot/mcp-config.json` | `.copilot/mcp-config.json` |
| Claude Code or Grok selected, or `--capture` | the hook program, copied to `~/.arp/bin/hook.js` | |

The hook is added to Claude Code only. With `--capture`, `init` also adds it to the others (`.cursor/hooks.json`, Gemini's `settings.json`, `.codex/hooks.json`, `.copilot/hooks/arp.json`), and `uninstall` removes it again.

Before it writes a file, `init` and `uninstall` keep a copy beside it, named `<file>.arp-backup-<date>`. A change made through the `claude` command has no copy: what it removes is printed instead. `uninstall` leaves those copies. To find and delete them:

```bash
find ~ -name '*.arp-backup-*' 2>/dev/null
find ~ -name '*.arp-backup-*' -delete 2>/dev/null
```

If you installed the CLI globally, remove it too:

```bash
npm uninstall -g @arp-protocol/cli
```

With `npx`, nothing is installed globally. npm keeps the package in its own cache, which `npm cache clean --force` empties along with everything else in it.

## `~/.arp/`, in your home

Every ARP program keeps its state here. `ARP_HOME` moves most of it: if you set it, delete that folder too. These always stay in `~/.arp`, whatever `ARP_HOME` says: `bin/hook.js`, `captures/`, and the node binding files (`node-binding.json`, `node-binding.document.json`, `handshake-message.txt`).

| Path | Written by | What |
| --- | --- | --- |
| `receipt-key` | the MCP server, on its first start | a key that signs a receipt when a skill's files are served. It cannot move value |
| `.gitignore` | the MCP server | `*`, so the folder is never committed by accident |
| `bin/hook.js` | `arp init` | the hook program |
| `failures.jsonl` | the hook, and `arp backfill` | a skill's failures seen on this machine, in closed words |
| `asked.jsonl`, `outcomes.jsonl` | the hook, on `Stop` | the skills it asked about, and the model's answer in closed words |
| `sharing.json` | `arp share on` / `off` | whether sharing is on. Absent means off |
| `shared-failures.jsonl` | `arp share send` | what was made public |
| `skills-cli/` | `arp_pulse` | the search package's home and npm's cache of it |
| `pulse-listings/` | `arp_pulse` | the file lists of repositories your searches returned, kept a day |
| `agent-key` | `arp line`, `arp share send`, the sponsored setup | **your agent's private key on testnet** |
| `agent.json` | the same | your agent's id, once registered |
| `receipts.jsonl` | the sponsored setup | every skill served to the agent, with its receipt |
| `captures/` | `arp init --capture` | hook payloads kept to teach the hook a new runtime |
| `node.key`, `node-payments.jsonl` | `arp node` | the node's key and the payments it has used |
| `node-binding.json`, `node-binding.document.json`, `handshake-message.txt` | `arp init --node` | the binding between your node and your agent |

All of it is safe to delete. Two things to know first:

- **`agent-key` is your agent.** Delete it and the next line you write comes from a new agent, with a new identity. The old lines stay on the public graph, signed by a key nobody holds any more. It is testnet, with test money, so nothing of value is lost.
- **`node.key`** is the key your node signs receipts with. A new one means a new signed address.

```bash
rm -rf ~/.arp
```

## `.arp/`, in each project

The hook and the server write here, in the folder your runtime runs in. The folder carries its own `.gitignore` of `*`.

| Path | What |
| --- | --- |
| `session.jsonl` | which skills and MCP tools a session used, with an outcome, a code, a duration and a size. Never the arguments or the content |
| `searches.jsonl` | what `arp_pulse` answered: the domain and the skills found. Never your words |
| `receipts.jsonl` | the receipts of skills fetched through ARP |
| `.gitignore` | `*` |

```bash
rm -rf .arp
```

The sponsored setup (`arp init --sponsored`) also installs a skill you accepted into `.claude/skills/<name>/`. Those are skills now, like any other: remove the ones you do not want.

## What stays public

Uninstalling removes nothing from the public graph. A line you sent with `arp share send` or `arp line` is permanent, on Intuition testnet 13579, attributed to your agent's address. Turning sharing off stops new lines; it does not remove old ones.
