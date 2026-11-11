# Changelog

`@arp-protocol/cli`. What a person or an agent running `arp` sees change, with the task that changed it
(`docs/tasks/<n>-*.md` in the repository). Everything writes on Intuition testnet 13579 only.

## Unreleased

- **Claude Desktop's share setting no longer overwrites a choice made in Claude Code** (task 137). It
  writes `~/.arp/sharing.json` only when nothing is on file, when the file is the extension's own, or
  when the setting changed since the last start, which it keeps in `~/.arp/desktop-share.json`. Left as
  it was, it no longer turns off an `arp share on` or an "always" answer on the same machine.
- **The MCP server reports the package's version** in `serverInfo.version`, in the plugin and in the
  Desktop extension, inlined at build. It said `0.2.0` whatever the release.

## 0.0.6 — published 2026-11-11

- **Breaking: the line request is version 6** (task 127, ADR `0192`). It signs two more fields, `version`
  and `evidence`. A line sent by 0.0.5 is refused by a sponsoring service built from today's `main`
  (HTTP 401), and a line sent by 0.0.6 by a sponsoring service built before it. Update the CLI and the
  sponsoring service together.
- **A line names the version of a skill it is about.** The hook records the digest of the skill's
  directory where it ran (the content receipt's digest, ADR `0185`), and a shared line is then written
  about `(skill, version, sha256:<digest>)`. `arp line --skill-dir <path>` does the same by hand. The
  sponsoring service writes the version only when it is the skill's directory at its repository's `HEAD`,
  or the digest of a receipt ARP's node signed for you; otherwise the line is written without one, so a
  local edit names no version.
- **A line can be backed by a content receipt.** When this machine holds a receipt from ARP's content
  server over the same files (`arp_get_skill`, `receipts.jsonl`), the line adds
  `(outcome, has evidence, content-receipt:<hash>)`, and the sponsoring service serves the receipt at
  `GET /receipt?hash=`. It says the files were served to your key, never that they were used.
- **`arp_get_skill` and `arp_declare_used` work off this machine** (task 131, ADR `0196`). In sponsored
  mode the content server now defaults to ARP's hosted one, `https://content.arp.intuition.box`
  (`config.contentDefault`), which signs the receipt the sponsoring service asks for. They used to
  default to `http://127.0.0.1:3002`, where nothing listens unless you run `arp mcp --http` yourself,
  so both failed. `ARP_CONTENT` still overrides it. The content server sees the skill fetched and
  your agent's address, never a search.

## 0.0.5 — published 2026-11-11

- **Sharing is asked once** (task 126, ADR `0191`). After the first skill result (worked or failed) on a
  machine where sharing was never chosen, the agent asks: "yes, this once", "always" or "no". Nothing
  leaves without a yes. "Always" turns sharing on and sends lines in the background at the end of each
  session (`arp share send --auto`, a lock, failures in `~/.arp/share-log.jsonl`), counting only results
  kept after the choice. "No" is kept and the question does not come back. `ARP_SHARE_AUTO=off` stops
  both the question and the background send.
- Sharing turned on any other way (`arp init`, `/arp:share-on`) now also sends at the end of a session.
- `arp share` prints when and how sharing was chosen.

## 0.0.4 — published 2026-11-11

- **The sponsoring service is hosted** (task 117): `ARP_SPONSOR` defaults to
  `https://sponsor.arp.intuition.box` instead of `http://127.0.0.1:3200`, so `arp line`, `arp share send`
  and the plugin reach it with nothing set. Set `ARP_SPONSOR` to use another one. Testnet 13579 only.
- The MCP Registry entry names the hosted read-only endpoint, `https://mcp.arp.intuition.box/mcp`
  (streamable HTTP, `arp_pulse`, `arp_tool_reputation`, `arp_agent_endpoints`), beside the npm package.
- **Breaking: the line request is version 5** (task 122). `arp line --payment-tx` now also takes the
  terms the endpoint's `402` gave and you paid against: `--pay-to`, `--asset`, `--price` (the
  `PaymentRequirements` `payTo`, `asset` and `amount`) and `--terms-at` (when the `402` came, unix
  seconds or ISO 8601). `arp line` refuses a payment whose transfer does not match them, and
  `--reason no-delivery` without `--payment-tx`: it means paid, nothing received. A line sent by 0.0.3
  is refused by a sponsoring service built from today's `main` (HTTP 401). Update both together.

- `arp check <owner/repo/skill>`: before you use a skill, what its files contain, the lines agents
  wrote about it, and whether the programs and variables it needed when it failed, or that its files
  name, are on this machine. A variable is reported set or not set, its value never shown. Writes
  nothing, needs no wallet (task 115).
- The hook no longer continues a turn on `Stop` to ask whether a skill worked. When a skill loads, it
  asks the model, once per skill per session, to end its final reply with `arp: <skill> worked`,
  `failed` or `unsure`, and `Stop` records that line and prints nothing. Under `claude -p` the
  session's result is the real answer again (task 109). `arp init` registers `PostToolUse` twice:
  every tool but `Skill` in the background, `Skill` waited on (5 s).

## 0.0.3 — published 2026-11-10

The first release since 0.0.1 (published 2026-11-06 07:59 UTC). 0.0.2 was prepared on 2026-11-09 and
never published; its changes are listed here.

**Breaking: the line request is version 4.** A line sent by 0.0.1 is refused by a sponsoring service
built from today's `main` (HTTP 401): version 3 signs the exact x402 endpoint (task 93), version 4
signs what was missing (task 97), and each one stops the previous from verifying. Update the CLI and
the sponsoring service together.

### Before a skill is installed

- The hook reads a skill before `npx skills add` installs it, and tells the person and the agent what
  agents wrote about it. It asks GitHub for the repository and skill names, nothing else, and never
  blocks the install (task 98).
- `arp_pulse` and `arp_get_skill` return `contains`: the programs, packages, settings (names only),
  scripts, fetch-and-run lines, domains and hidden text in a skill's own files (task 96).
- `arp_pulse`, `arp_find_tools` and `arp_agent_endpoints` return `outside`: dated facts from GitHub
  (archived, not found, issue titles naming a failure) and x402 Doctor's Trust Index, never in a score
  (task 101).
- `arp_find_tools` also searches skills.sh's index (task 82), and finds a category by a word people use
  (`slides` for `presentation`) through a local alias table (task 84).
- `arp_find_agents` reads the 8004 sieve: agents with a callable endpoint, by their highest rung
  (task 87).

### While a skill runs, and after

- When a skill fails for a missing program, key or file, the hook answers with what other agents wrote
  about that skill's failures (task 99). `ARP_FAILURE_LINES=off` turns it off.
- On `Stop`, the hook asks the model once per skill used whether it did its job, and keeps the answer
  in `~/.arp/outcomes.jsonl` (task 100).
- A failure the hook records keeps the missing program or key name when the skill's SKILL.md names it
  (task 97).
- The hook records a category node, never the person's words (task 84).

### Writing a line

- `arp line --needs <name>` after a missing-program or missing-key failure, `--with <name>` on a worked
  line: published only when the skill's SKILL.md names it (task 97).
- `arp line --payment-tx <hash> --network eip155:<chain>`: an x402 line names its payment, read on its
  own chain before any key (task 89); `ARP_X402_NETWORKS` adds a paying network (task 91); `--tool` is
  the exact URL paid (task 93).
- `arp line --parent <category> --why <reason>` adds a category the tree lacks, by the agent's signed
  request (task 75).
- `arp_declare_used` takes `needs` and `with`, under the same guard: one skill, and its SKILL.md must
  name the word (task 105).
- A declaration can add the category it needs (`domain_parent`, `domain_reason`, then
  `arp_propose_category`), and `arp_file_category` files a skill under a category in the sponsored mode
  (tasks 59, 73).
- `arp line` checks its domain and the sponsoring service before it makes a key (task 74).

### Install and modes

- Every install offers sharing once, off unless the person agrees: `arp init --share` / `--no-share`,
  `arp share on|off`, `arp share send` (task 88).
- `ARP_HOSTED=1` runs the MCP server as a hosted read-only endpoint: no key, no tool argument logged
  (task 92).
- The sponsoring service's default address is set when the package is built, from `package.json`'s
  `config.sponsorDefault`, loopback (`http://127.0.0.1:3200`) when empty; `ARP_SPONSOR` still overrides
  it (task 105).
- A refused tool listing says its status, rule and reason (task 94).
- `--help` after any command prints the usage and starts nothing; a mode serves exactly the tools it
  lists; the search keeps no npm log with the query in it (task 74).
- `mcpName` is `io.github.Wieedze/arp`, for the official MCP Registry (task 105).

## 0.0.1 — 2026-11-06

The first published version: `arp mcp`, `arp hook`, `arp node`, `arp init`, `arp doctor`,
`arp uninstall` (task 33b).
