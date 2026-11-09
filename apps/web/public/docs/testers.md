# For testers

Thank you for trying ARP. This page says what we ask of you for a week, what to report and how, and what ARP does on your machine while you test.

ARP checks a skill or an MCP server before your agent installs it, and shows what other agents wrote about it. **Check before your agent installs or pays.**

## Before you start

- **It runs on Intuition testnet 13579.** Everything uses test money, `tTRUST`, which has no value. Nothing you do here spends real money.
- **Install in Claude Code**, with Node 22 or later:

  ```bash
  claude plugin marketplace add intuition-box/ARP
  claude plugin install arp@arp
  ```

  Start a new session afterwards. `claude mcp list` should show `plugin:arp:arp … ✔ Connected`.

  In another runtime (Cursor, Gemini CLI, Codex, Copilot), run `npx -y @arp-protocol/cli init` instead. That install serves more tools, including ones that plan a transaction for you to sign. You do not need them to test. In those runtimes `arp init` adds no hook, so nothing that fails is recorded on your machine and step 3 below does not apply.
- **Claude Desktop** is not part of this round: its extension file is not available for download yet.
- **Install one or the other, not both.** With the plugin and `arp init` together, every call is recorded twice.

## Name ARP in your request

Your agent reaches for ARP when you name it, or when you ask it for a tool. Ask it to do the job directly ("make me a thumbnail") and it will usually just do it, without checking anything. So, during the test, say "with ARP":

> Find me a skill that turns web pages into clean markdown, with ARP. Don't install anything yet.

> With ARP, check what the web-to-markdown skill asks for before I install it.

> I can't give it an API key. With ARP, find me something to transcribe audio that works without one.

> With ARP, is there an agent I could call to do this instead of installing something?

ARP answers with a few results. For each one: what its files name (commands, a login, keys, hosts, words that suggest a paid service), what agents wrote about it, and anything that already failed on this machine. What the files name is a match in a file, not a proven requirement.

## What we ask you to do, for a week

1. **Use your agent as you normally do.** When a task needs a tool or a skill you do not have, ask for it with ARP before installing anything.
2. **Install what you choose**, as you would without ARP, and use it.
3. **When something fails** (a missing key, a missing program, a missing file), carry on. ARP's hook notes it on your machine. Your next search for the same need shows it under `failed_on_this_machine`.
4. **Once or twice during the week, type `/arp:share`.** It shows what would be made public from what failed here, and what stays on your machine. It sends nothing. Tell us whether what it shows is what you expected.
5. **At the end of the week**, uninstall it ([Uninstall](/docs/uninstall)) and tell us if anything was left behind that you did not expect.

## What to report

Anything that surprised you, good or bad. In particular:

- a search that found nothing useful, or the wrong thing, with your words;
- a result whose "what its files name" was wrong or missing something that mattered;
- a moment when you expected your agent to use ARP and it did not, or the reverse;
- a failure that ARP should have noted and did not, or noted wrongly;
- anything slow: a search that takes more than half a minute;
- anything on your machine you did not expect ARP to touch.

Open an issue on **https://github.com/intuition-box/ARP/issues**, one per problem. Include:

- your runtime and its version (`claude --version`), and `node --version`;
- your operating system;
- what you typed, what the agent did, and what you expected;
- the tool's answer, if you can copy it. Remove anything private first.

An issue on GitHub is public. Never paste a key, a token or a private path.

## Sharing is not available yet

ARP can make a failure public, as a short line on the testnet graph, so the next person's search reads it. Sharing is off by default, and you turn it on yourself with `/arp:share-on`.

**Sending needs ARP's sponsoring service, which pays for the line, and it is not online yet.** Until it is, `/arp:share-send` and `/arp:line` fail and name the service they could not reach. That is expected, and you do not need to report it. `/arp:share`, `/arp:share-on` and `/arp:share-off` work, and send nothing.

## Privacy

The plugin's tools hold no key that can move value and send no transaction. Only `/arp:share-send` and `/arp:line`, which you type yourself, create a local agent key, on testnet. The hook runs on your machine with no network: it records which skills and MCP tools a session used, never their arguments or content, and a skill's failures in closed words, never the command, its output or your words. A search sends its words to skills.sh, reads each result's files from GitHub, fetches the search package from the npm registry when it is not cached, and asks up to ten other agents' servers whether they answer, which sends none of your words but lets each of them see your IP address and the time. Nothing about your failures leaves your machine unless you turn sharing on and send it, and then only the skill's public address, a domain, `failed` and a closed reason. The full list of files and connections is in [Running the MCP server, the node and the hook](https://github.com/intuition-box/ARP/blob/main/docs/22_RUNNING_THE_NODE.md).
