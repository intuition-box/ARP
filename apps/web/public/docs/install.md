# Install

Every way to install ARP, and the state of each on 2026-11-10. This page is the one list: other pages point here instead of repeating it. Every install plans against Intuition testnet 13579 (the skill file reads either chain), and checking a skill needs no wallet, no key and no account.

| where your agent runs | route | state, 2026-11-10 | what you get |
| --- | --- | --- | --- |
| Claude Code | [the plugin](#claude-code-the-plugin) | works | three read tools, the hook, five commands you type |
| Claude Desktop | [an MCP entry you add by hand](#claude-desktop-today-an-mcp-entry-by-hand) | works outside Desktop; not yet run inside it | three read tools, no hook |
| Claude Desktop, claude.ai | [a custom connector to ARP's hosted endpoint](#claude-desktop-and-claude-ai-a-hosted-connector) | **not live**: the endpoint is not deployed | three read tools, no hook, your words reach ARP's server |
| Claude Desktop | [the extension, one `.mcpb` file](#claude-desktop-the-extension) | **not published** | sponsored tools, nothing to sign |
| Cursor, Gemini CLI, Codex, Copilot, Grok Build | [`arp init`](#other-runtimes-arp-init) | works | the full tool set; the hook in Claude Code and Grok Build only |
| the runtimes `arp init` finds, sponsored | [`arp init --sponsored`](#arp-init---sponsored) | works; sending waits for a hosted sponsor | tools that sign nothing for you |
| any MCP client | [the npm package and the MCP Registry](#the-npm-package-and-the-mcp-registry) | published, 0.0.3 | what the client's entry starts |
| nothing installed | [the skill file](#nothing-installed-the-skill-file) | works | the procedure, as public reads and calls you sign |
| a throwaway machine | [a Docker container](#an-isolated-test-in-docker) | works | the plugin, away from your own files |

**Install one ARP per runtime, not two.** With the plugin and `arp init` both in Claude Code, every call is recorded twice. The same holds for two entries in Claude Desktop.

**Pay from a dedicated wallet.** If your agent pays x402 endpoints and you write lines about them, the paying wallet is public and linked to the endpoints it paid. Use a wallet dedicated to the agent's payments, never a personal one: [What ARP publishes about you](/docs/what-arp-publishes).

**Name ARP when you ask.** The agent reaches for ARP when you name it: "find me a skill for X with ARP". Asked only for a task, it may do the task without ARP.

To remove any of them: [Uninstall](/docs/uninstall).

## Claude Code: the plugin

Requires Node.js 22 or later. The plugin carries ARP's program inside it (`bin/arp.js`), so it needs nothing from npm to start.

```bash
claude plugin marketplace add intuition-box/ARP
claude plugin install arp@arp
```

Start a new session afterwards. `claude mcp list` should show `plugin:arp:arp … ✔ Connected`.

To update:

```bash
claude plugin marketplace update arp
claude plugin update arp@arp
```

What you get, the full feature set of this round:

- the MCP server with three read tools: `arp_pulse`, `arp_tool_reputation`, `arp_agent_endpoints` ([MCP tools](/docs/mcp-tools));
- the hook ([Local memory and sharing](/docs/local-memory)): it keeps a local memory of what failed, shows what a skill contains before `npx skills add` runs, shows what others wrote when a skill fails, and asks once per skill whether it did its job;
- five commands you type yourself: `/arp:share`, `/arp:share-on`, `/arp:share-off`, `/arp:share-send`, `/arp:line`. The last two need a sponsoring service, which is not hosted yet.

Checked on 2026-11-10 in a clean `node:22-bookworm` container with Claude Code 2.1.322: both install commands succeeded, `claude plugin list` showed `arp@arp`, version 0.0.3, enabled, and the update commands answered `arp is already at the latest version (0.0.3)`.

## Claude Desktop, today: an MCP entry by hand

Claude Desktop reads its MCP servers from `claude_desktop_config.json`:

| system | folder |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/` |
| Windows | `%APPDATA%\Claude\` |

Add ARP under `mcpServers` (merge it with any servers already there), then quit and reopen Claude Desktop:

```json
{
  "mcpServers": {
    "arp": {
      "command": "npx",
      "args": ["-y", "@arp-protocol/cli@0.0.3", "mcp"],
      "env": { "ARP_TARGET": "testnet", "ARP_TOOLS": "read" }
    }
  }
}
```

Node.js 22 or later must be installed: Desktop starts `npx` itself. Both variables matter. Without `ARP_TARGET=testnet` the server plans against mainnet 1155; without `ARP_TOOLS=read` it serves the full tool set, planners included.

What you get: the plugin's three read tools. **Claude Desktop runs no hooks**, so nothing of the hook happens there: no record of what failed on your machine (`failed_on_this_machine` stays empty), no check before an install, no answer when a skill fails, no question whether a skill worked, so no worked line to share.

State: the command was run on Linux with Node 22.21.1 on 2026-11-10, outside Desktop. It answered `initialize` and listed `arp_pulse, arp_tool_reputation, arp_agent_endpoints` on chain 13579. This entry has not yet been run inside Claude Desktop, on macOS or on Windows.

## Claude Desktop and claude.ai: a hosted connector

ARP's MCP server can run read-only as a hosted endpoint, `https://<host>/mcp`, that you add as a custom connector, with nothing installed on your machine. **It is not live**: the endpoint is prepared but not deployed, so there is no address to give yet. This page will name it once it is deployed.

Once live, it will serve the same three read tools, with no hook. One difference with every other route: the words of a search reach ARP's server, because the server runs there, not on your machine.

## Claude Desktop: the extension

A one-file extension (`.mcpb`), installed from Settings, then Extensions, in sponsored mode: you sign nothing and see no wallet, and `arp_pulse` reads results you pass it instead of running the search. **It is not published**, so there is no file to download. Use the entry by hand above meanwhile.

## Other runtimes: `arp init`

Node.js 22 or later.

```bash
npx -y @arp-protocol/cli init --dry-run   # see what would change
npx -y @arp-protocol/cli init             # asks first, backs up every file it edits directly
npx -y @arp-protocol/cli doctor           # entries present, hook in place, the server answers
```

`init` finds Claude Code, Grok Build, Cursor, Gemini CLI, Codex and Copilot (VS Code and CLI) on the machine and adds the MCP server to each, with `ARP_TARGET=testnet`. The hook goes to Claude Code, and to Grok Build, which reads Claude Code's files. **Cursor, Gemini CLI, Codex and Copilot get no hook**: nothing that fails is recorded there.

This install serves the full tool set: the reads, plus planners that return unsigned calls you sign yourself ([MCP tools](/docs/mcp-tools)). `--print` prints the entry for any other MCP client and writes nothing; the other options are in [CLI](/docs/cli).

A Gemini CLI extension is built in the repository (`packaging/gemini/arp/`) but not listed in Gemini's gallery and not tried; `arp init` is the route for Gemini CLI.

## `arp init --sponsored`

```bash
npx -y @arp-protocol/cli init --sponsored
```

The same install with `ARP_TOOLS=sponsored`: tools that walk the loop with nothing for you to sign, because ARP's sponsoring service pays, plus `arp_get_skill`, which installs a skill you accept into the project's `.claude/skills/`. It holds a local agent key, on testnet. **The sponsoring service is not hosted yet**, so the calls that send something fail and name the service they could not reach.

## The npm package and the MCP Registry

The CLI is on npm as [`@arp-protocol/cli`](https://www.npmjs.com/package/@arp-protocol/cli), and in the official MCP Registry as `io.github.Wieedze/arp`. A client that installs from the registry gets `npx @arp-protocol/cli mcp` with `ARP_TARGET=testnet` and `ARP_TOOLS=read`, the plugin's three read tools, and no hook.

Check both yourself:

```bash
npm view @arp-protocol/cli version mcpName
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.Wieedze/arp"
```

On 2026-11-10 the first printed `version = '0.0.3'` and `mcpName = 'io.github.Wieedze/arp'` (dist-tag `latest`: 0.0.3). The second returned one entry, `io.github.Wieedze/arp` version 0.0.3, status `active`, `isLatest: true`, published `2026-11-10T13:21:55Z`, with the npm package over stdio and those two variables.

## Nothing installed: the skill file

Any agent that can make HTTP requests can use ARP through public reads. Point it at [`skills/arp/SKILL.md`](https://github.com/intuition-box/ARP/blob/main/skills/arp/SKILL.md), which holds the whole procedure as GraphQL reads and calls you sign. See [Without installing anything](/docs/no-install).

With the `skills` CLI, the same file installs as a skill:

```bash
npx skills add intuition-box/ARP --skill arp
```

`npx skills add intuition-box/ARP --list` found the `arp` skill on 2026-11-10. ARP's skill is not listed on skills.sh: its search for `intuition-box` returned one other skill of the organisation that day.

## An isolated test in Docker

To try the plugin away from your own files:

```bash
docker run -it --name arp-test node:22-bookworm bash
```

Inside the container:

```bash
npm i -g @anthropic-ai/claude-code
claude plugin marketplace add intuition-box/ARP
claude plugin install arp@arp
mkdir -p /work && cd /work && claude
```

`claude` asks you to log in the first time. Back to the same container later, and removing it:

```bash
docker start -ai arp-test
docker rm -f arp-test
```

The install half was run non-interactively on 2026-11-10 (see the plugin above); the interactive session was not.
