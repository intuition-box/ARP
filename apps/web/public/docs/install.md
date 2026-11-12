# Install

Every way to install ARP, and the state of each on 2026-11-11. This page is the one list: other pages point here instead of repeating it. Every install plans against Intuition testnet 13579 (the skill file reads either chain), and checking a skill needs no wallet, no key and no account.

| where your agent runs | route | state, 2026-11-11 | what you get |
| --- | --- | --- | --- |
| Claude Code | [the plugin](#claude-code-the-plugin) | works | three read tools, the hook, five commands you type |
| Claude Desktop | [an MCP entry you add by hand](#claude-desktop-today-an-mcp-entry-by-hand) | works outside Desktop; not yet run inside it | three read tools, no hook |
| Claude Desktop, claude.ai | [a custom connector to ARP's hosted endpoint](#claude-desktop-and-claude-ai-a-hosted-connector) | live at `https://mcp.arp.intuition.box/mcp`; not yet added as a connector in Claude | three read tools, no hook, your words reach ARP's server |
| Claude Desktop | [the extension, one `.mcpb` file](#claude-desktop-the-extension) | published, 0.0.7; tested on Windows, not on macOS | sponsored tools, nothing to sign |
| Cursor, Gemini CLI, Codex, Copilot, Grok Build | [`arp init`](#other-runtimes-arp-init) | works | the full tool set; the hook in Claude Code and Grok Build only |
| the runtimes `arp init` finds, sponsored | [`arp init --sponsored`](#arp-init---sponsored) | works from 0.0.6, with ARP's hosted sponsor and content server | tools that sign nothing for you |
| any MCP client | [the npm package and the MCP Registry](#the-npm-package-and-the-mcp-registry) | published, 0.0.7 on npm (2026-11-12) | what the client's entry starts |
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
- one question, once: after the first skill result, the agent asks whether to share it, with three answers, "yes, this once", "always" and "no". Nothing is shared before you answer. "Always" sends that result and each later one in the background when its session ends, nothing kept before ([Sharing](/docs/local-memory#sharing));
- five commands you type yourself: `/arp:share`, `/arp:share-on`, `/arp:share-off`, `/arp:share-send`, `/arp:line`. The last two need a sponsoring service: ARP's is hosted at `https://sponsor.arp.intuition.box`, the default from 0.0.4. 0.0.5 and earlier cannot write a line through it: it checks line request v6 (task 127), which they do not sign, so update to 0.0.6. Since 0.0.5 the plugin asks once whether to share. The send after "always" or "yes, this once" goes through the same service; when it fails, why is written down in `~/.arp/share-log.jsonl`, not shown.

Checked on 2026-11-12 in a clean `node:22-bookworm` container with Claude Code 2.1.322: both install commands succeeded, `claude plugin list` showed `arp@arp`, version 0.0.7, enabled, both update commands succeeded and `claude plugin update arp@arp` answered `arp is already at the latest version (0.0.7)`, and `claude mcp list` showed `plugin:arp:arp … ✔ Connected`.

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
      "args": ["-y", "@arp-protocol/cli@0.0.7", "mcp"],
      "env": { "ARP_TARGET": "testnet", "ARP_TOOLS": "read" }
    }
  }
}
```

Node.js 22 or later must be installed: Desktop starts `npx` itself. Both variables matter. Without `ARP_TARGET=testnet` the server plans against mainnet 1155; without `ARP_TOOLS=read` it serves the full tool set, planners included.

What you get: the plugin's three read tools. **Claude Desktop runs no hooks**, so nothing of the hook happens there: no record of what failed on your machine (`failed_on_this_machine` stays empty), no check before an install, no answer when a skill fails, no question whether a skill worked, so no worked line to share, and no question whether to share.

State: the command, with `@arp-protocol/cli@0.0.7`, was run in a clean `node:22-bookworm` container on 2026-11-12, outside Desktop. It answered `initialize` and listed `arp_pulse, arp_tool_reputation, arp_agent_endpoints` on chain 13579. This entry has not yet been run inside Claude Desktop, on macOS or on Windows.

## Claude Desktop and claude.ai: a hosted connector

ARP runs its MCP server read-only as a hosted endpoint, with nothing installed on your machine:

```
https://mcp.arp.intuition.box/mcp
```

Streamable HTTP, no sign-in, testnet 13579. Add it as a custom connector (untested in Claude, see below), or point any MCP client that takes a URL at it. It is also the `remotes` entry of the MCP Registry listing from 0.0.4 (see [the npm package and the MCP Registry](#the-npm-package-and-the-mcp-registry)).

State: live since 2026-11-11. That day `tools/list` answered `arp_pulse, arp_tool_reputation, arp_agent_endpoints` and a search came back, both by `curl`. It has not yet been added as a connector in Claude Desktop or claude.ai.

It serves the same three read tools, with no hook. One difference with every other route: the words of a search reach ARP's server, because the server runs there, not on your machine.

## Claude Desktop: the extension

A one-file extension (`.mcpb`), in sponsored mode on testnet 13579: you sign nothing and see no wallet. Download `arp-0.0.7.mcpb` from the [v0.0.7 release](https://github.com/intuition-box/ARP/releases/tag/v0.0.7) (sha256 `fc92faa23aaa660a7ef9668d3ce064843e8a5f3dda62d798752fb28268d0b965`), then open it, or drag it into Claude Desktop's Settings, then Extensions.

Checked on Windows on 2026-11-12: `arp_pulse` searched skills.sh with the copy of the search the extension carries, `arp_get_skill` showed a skill's `contains` lines then its SKILL.md, and `arp_declare_used` declared. **Not yet tried on macOS.** Claude Desktop runs no hook, so there is no question after use there.

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

`arp_get_skill` and `arp_declare_used` fetch a skill through ARP's content server, which signs the receipt the sponsor pays against. From 0.0.6 that is ARP's hosted one, `https://content.arp.intuition.box` (task 131); up to 0.0.5 they looked for one on your own machine (`http://127.0.0.1:3002`) and failed unless you ran one.

The same install with `ARP_TOOLS=sponsored`: tools that walk the loop with nothing for you to sign, because ARP's sponsoring service pays, plus `arp_get_skill`, which installs a skill you accept into the project's `.claude/skills/`. It holds a local agent key, on testnet. From 0.0.4 the calls that send something reach ARP's hosted sponsoring service, `https://sponsor.arp.intuition.box`, testnet 13579. 0.0.5 and earlier cannot write a line through it: it checks line request v6 (task 127). When it does not answer, they fail and name it. Checked on 2026-11-12 in a clean `node:22-bookworm` container with 0.0.7, `ARP_TOOLS=sponsored` and `ARP_TARGET=testnet` and nothing else: `arp_pulse` searched with the copy of `skills` the release carries (`"search": "skills find (skills@1.7.6, bundled)"`, 100 results), then `arp_get_skill` and `arp_declare_used` on the `pdf` skill, then `arp line --tool "https://github.com/anthropics/skills?skill=pdf" --outcome worked`, all answered. On 2026-11-11 the same with 0.0.6 started from `init --sponsored`.

## The npm package and the MCP Registry

The CLI is on npm as [`@arp-protocol/cli`](https://www.npmjs.com/package/@arp-protocol/cli), and in the official MCP Registry as `io.github.Wieedze/arp`. A client that installs from the registry gets `npx @arp-protocol/cli mcp` with `ARP_TARGET=testnet` and `ARP_TOOLS=read`, the plugin's three read tools, and no hook.

Check both yourself:

```bash
npm view @arp-protocol/cli version mcpName dist-tags.latest
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.Wieedze/arp"
```

On 2026-11-12 the first printed `version = '0.0.7'`, `mcpName = 'io.github.Wieedze/arp'` and `dist-tags.latest = '0.0.7'`. The second returned five entries, one per version, all `active`: 0.0.3 (published `2026-11-10T13:21:55Z`, no `remotes`), 0.0.4 (`2026-11-11T15:29:46Z`), 0.0.5 (`2026-11-11T17:07:29Z`), 0.0.6 (`2026-11-11T17:58:56Z`) and 0.0.7 (`2026-11-12T08:52:51Z`, `isLatest: true`), the last four with the remote `https://mcp.arp.intuition.box/mcp`. The entries come in that order, so a client that shows the first one shows 0.0.3: read `isLatest`.

## Nothing installed: the skill file

Any agent that can make HTTP requests can use ARP through public reads. Point it at [`skills/arp/SKILL.md`](https://github.com/intuition-box/ARP/blob/main/skills/arp/SKILL.md), which holds the whole procedure as GraphQL reads and calls you sign. See [Without installing anything](/docs/no-install).

With the `skills` CLI, the same file installs as a skill:

```bash
npx skills add intuition-box/ARP --skill arp
```

`npx skills add intuition-box/ARP --list` found the `arp` skill on 2026-11-11, beside four the repository keeps for its own work (`arp-contributing`, `intuition`, `mms-gator-cli`, `mms-smart-accounts-kit`); `--skill arp` installs only ARP's. ARP's skill is not listed on skills.sh: on 2026-11-10 its search for `intuition-box` returned one other skill of the organisation.

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

The install half was run non-interactively on 2026-11-11 (see the plugin above); the interactive session was not.
