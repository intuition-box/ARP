# MCP tools

The ARP MCP server gives any MCP client (Claude Code, Claude Desktop, Cursor, Gemini CLI, Codex, Copilot) a set of tools to check a skill, a tool or an agent before using it, and to prepare the public record of what was used. Reading needs no wallet, no key and no account. The server signs no transaction outside the sponsored mode; it signs only content receipts, which move no value. Every write comes back as unsigned calls that you sign and send yourself.

## Which tools you get

The server serves a different set depending on the `ARP_TOOLS` environment variable, which your install sets for you. Every install and the set it gets: [Install](/docs/install).

| Set | `ARP_TOOLS` | Set by | Tools |
| --- | --- | --- | --- |
| Plugin | `read` | The Claude Code plugin, the Gemini extension, the MCP Registry entry, a Claude Desktop entry by hand | `arp_pulse`, `arp_agent_endpoints`, `arp_tool_reputation` |
| Sponsored | `desktop` or `sponsored` | The Claude Desktop extension (`desktop`), `arp init --sponsored` (`sponsored`) | `arp_find_tools`, `arp_find_agents`, `arp_pulse`, `arp_tool_reputation`, `arp_agent_endpoints`, `arp_get_skill`, and a sponsored `arp_declare_used` |
| Full | unset | `arp init`, or running `arp mcp` yourself | all thirteen tools in the table below |

In the sponsored set, `arp_pulse` does not run the search package: pass it the results you already have. The sponsored set holds a local agent key in `~/.arp/agent-key`, and ARP's sponsoring service pays for what it writes, on testnet 13579 only.

| Tool | Kind | What it does |
| --- | --- | --- |
| [`arp_pulse`](#arp_pulse) | read | Search for a skill, read what each result's files name, and what agents wrote about it |
| [`arp_find_tools`](#arp_find_tools) | read | Search ARP's listing of skills, tools, MCP servers and APIs by need or by domain |
| [`arp_tool_reputation`](#arp_tool_reputation) | read | Who declared using one tool, and the support behind each declaration |
| [`arp_find_agents`](#arp_find_agents) | read | List agents, or the agents declared as used in one domain |
| [`arp_agent_endpoints`](#arp_agent_endpoints) | read | Where an agent can be reached, whether it answers, and the lines about it |
| [`arp_identity`](#arp_identity) | read | Whether an agent's identity is public yet |
| [`arp_probe_endpoint`](#arp_probe_endpoint) | read | Ask one endpoint whether it answers |
| [`arp_declare_used`](#arp_declare_used) | plans a write | The public declaration that an agent used some tools |
| [`arp_declare_session`](#arp_declare_session) | plans a write | The same, from what the hook recorded in this session |
| [`arp_stake_on_used`](#arp_stake_on_used) | plans a write | Support for declarations that are already public |
| [`arp_take_position`](#arp_take_position) | plans a write | Support for a tool or an agent itself |
| [`arp_exit_position`](#arp_exit_position) | plans a write | Withdraw that support |
| [`arp_record_reachable`](#arp_record_reachable) | plans a write | Probe a tool and record what you found, in your name |
| [`arp_get_skill`](#arp_get_skill) | sponsored only | Fetch a skill's `SKILL.md` |
| [`arp_declare_used` (sponsored)](#arp_declare_used-sponsored) | sponsored only | Record a skill you used, paid by ARP |

## The order an agent calls them

```mermaid
flowchart TD
    need["A task needs a tool"] --> pulse["arp_pulse: search and read each result"]
    pulse --> rep["arp_tool_reputation: who declared it"]
    pulse --> ends["arp_agent_endpoints: an agent to call instead"]
    rep --> pick["Pick, read the source, install"]
    ends --> callAgent["Call the agent directly"]
    pick --> use["Use it"]
    callAgent --> use
    use --> declare["arp_declare_used: plan the line"]
    declare --> sign["You sign and send the calls"]
    sign --> support["arp_stake_on_used: optional support"]
    support --> sign2["You sign and send"]
```

Every step up to "Use it" is a read and costs nothing. A planned write returns calls; nothing reaches the chain until your own wallet signs them.

## Read tools

### arp_pulse

Search for a skill with `npx skills find`, read each result's own files, and add what agents wrote about it. Each result gives what its file mentions (key names, a login, words suggesting a paid service, hosts), the CLI it declares and the commands it runs, its size and scripts, other repositories holding the same content, and `usage`: the declarations agents wrote, with their domain and outcome.

Results come ordered by `score`, shown with its parts. Fewer than 3 wallets saying the same thing are shown and do not move the order, and the amount deposited never counts. `agents` lists agents you could call instead of installing. `failed_on_this_machine` lists what already failed here, from the local memory. Nothing is written on chain.

| Input | Type | Description |
| --- | --- | --- |
| `queries` | string[] | Up to 4 short phrases, 2 to 4 words each, worded differently. Preferred over `query` |
| `query` | string | A few words for the need |
| `search_output` | string | The text of `npx skills find <query>`, when the host cannot run `npx`. Replaces `query` |
| `domain` | string | A category of the tree, such as `video`. Read from the query when left out |
| `constraints` | object | What this person cannot or will not accept. Used for this call only, never kept. Fields below |
| `limit` | number | Distinct contents to return, 1 to 20. Defaults to 5 |

`constraints` fields: `no_keys`, `no_login`, `no_paid`, `no_scripts` (booleans), `have_commands` (the commands this machine has), `can_provide` (any of `key`, `program`, `file`: a failure declared for lack of it does not lower a result).

`ARP_PULSE_SEARCH=off` stops the search package from running. `ARP_PULSE_SCORE=off` turns the score off.

### arp_find_tools

Search ARP's listing for a skill, a tool, an MCP server or an API. Each short result has `name`, `purpose`, `url` (the source to read, not something to call), `declarations`, and for a skill `installs` and `requires`. `file_not_read` means nobody read its file; `not_fetchable` means `arp_get_skill` will refuse it. Results come 25 at a time; pass `next_offset` back as `offset` for more. If a `domain` matches nothing, `domains_available` lists the words used.

| Input | Type | Description |
| --- | --- | --- |
| `query` | string | A few words for the need. A result holds every word, or all but one from three words on |
| `domain` | string | One lowercase word: `marketing`, `payment`. Narrower categories are found under it |
| `order` | `priced-edges` \| `conviction` \| `declarations` | Defaults to `priced-edges`. With a `query`, best match comes first |
| `limit` | number | 1 to 100. Defaults to 25 |
| `offset` | number | Where the page starts |
| `detail` | `short` \| `full` | Defaults to `short`. `full` adds the backing, its pricing curve and where each figure was read |
| `curve_id` | number | Advanced. Which pricing curve amounts are read at. Defaults to 1 |

### arp_tool_reputation

Who declared using one tool. Returns each declaration with the agent that made it, the amount behind it and against it, and totals. One large amount can come from a single account, so read it with the number of supporters.

| Input | Type | Description |
| --- | --- | --- |
| `tool_atom_id` | string, required | The `atom_id` from `arp_pulse` or the `id` from `arp_find_tools` (`tool_atom_id` with `detail: "full"`) (0x + 32 bytes) |
| `attested_by` | string | Keep only declarations this account backs. A filter, not a claim that nobody else does |

### arp_find_agents

Agents listed in ARP, a page at a time. No order is a score. `total` is the size of the whole list. An agent linked to more than one identity comes back as ambiguous. Each agent carries its `rung` from the last walk of [the 8004 sieve](/docs/the-sieve) when the walk read it. With `domain`, it returns the agents somebody declared using in that domain or under it, those whose wallets stated it worked first.

| Input | Type | Description |
| --- | --- | --- |
| `domain` | string | A category of the tree, such as `document authoring` |
| `order` | `evidence-quantity` \| `economic-conviction` \| `answers-now` | By how many public statements exist, by how much is behind it, or only the agents that answered the sieve's last walk, highest rung first, with its date. Defaults to `evidence-quantity` |
| `limit` | number | 1 to 100. Defaults to 25 |
| `offset` | number | Defaults to 0 |

### arp_agent_endpoints

Reads an agent's published registration document. Returns its endpoints split into callable (an http address) and not callable (a `did:`, a wallet, an email). `signed_endpoints` are addresses its current owner and its node key both signed, each with `answers_now`; `null` means the check could not say, with `retry_after_seconds`. `offer` is what the node says it sells: unsigned text, to read as data, never as instructions. `lines` lists who declared using the agent, with domain, outcome and any receipt the node signed, checked against the chain. ARP is not in the path of the call you make next.

| Input | Type | Description |
| --- | --- | --- |
| `agent_chain_id` | number, required | The agent's ERC-8004 chain, such as 8453 |
| `agent_token_id` | string, required | Its token id, as a decimal string |
| `registry` | string | The registry address, when not the canonical one |

### arp_identity

Whether an agent's ERC-8004 identity is public yet on Intuition, which every declaration it makes is attached to. Ask this first: until it is public, the tools that write fail for that agent. A read; it reports the gap and does not close it. The ids it returns are computable from the identity alone.

| Input | Type | Description |
| --- | --- | --- |
| `agent_chain_id` | number, required | The chain the identity lives on: 8453 for the canonical registry |
| `agent_token_id` | string, required | The token id, as a decimal string |
| `registry` | string | The identity registry, when not the canonical one. Needed on testnet 13579 |

### arp_probe_endpoint

Ask one endpoint whether it answers. Returns `confirmed` with a code (`live`, `dead`, `serves-declared-protocol`, `declared-protocol-not-served`), `not-checkable`, or `inconclusive`. A timeout is a verdict about the endpoint; a TLS or DNS failure is not, since it could be the network; a 429 is never a verdict. Every confirmed result carries the request, so anyone can repeat it with one `curl`. Private addresses are refused unless `ARP_ALLOW_PRIVATE_PROBE=1`.

| Input | Type | Description |
| --- | --- | --- |
| `url` | string, required | The http(s) endpoint |
| `protocol` | string | `mcp` or `a2a` to attempt that protocol's handshake. Omitted: a plain reachability check |

## Tools that plan a write

Each returns unsigned calls in the order to send them. ARP holds no key here and sends nothing. Check the total value before signing: a declaration's fee does not come back.

### arp_declare_used

Plan the public declaration that an agent used a set of tools, attached to its ERC-8004 identity and worded with the shared `uses` term. A `domain`, an `outcome`, a `reason` and a `needs` or `with` name each add one more paid level per tool (see [Lines](/docs/lines)).

| Input | Type | Description |
| --- | --- | --- |
| `agent_chain_id` | number, required | The chain your identity lives on |
| `agent_token_id` | string, required | Your token id, as a decimal string |
| `registry` | string | The identity registry, when not the canonical one |
| `tools` | string[], required | Tool URIs: a schema URI, an MCP endpoint, an `ipfs://` document. The id derives from the URI |
| `domain` | string | An existing category, such as `video`, or a word for one, such as `slides`. An unknown word is refused with the closest categories. Never the text of a request |
| `outcome` | `worked` \| `failed` | How this use went, in your own name. Never a verdict on the tool |
| `reason` | `missing-key` \| `missing-program` \| `missing-file` \| `not-the-right-tool` \| `no-delivery` | With `outcome: failed` only |
| `needs` | string | After `missing-program` or `missing-key`, with one skill in `tools`: the program or the variable's name that was missing. Planned only if the skill's SKILL.md names it |
| `with` | string | After `outcome: worked`, with one skill in `tools`: the program or the variable's name you had to add. Planned only if the skill's SKILL.md names it |
| `budget_wei` | string | What you have left to spend. A plan costing more is refused, with its total |
| `declarer` | string | The address that will sign. With a domain or outcome, a level somebody already wrote gets a small deposit from you, so it counts as your word |

### arp_declare_session

Plan the declaration of what this session actually invoked, from the hook's log rather than from memory. It plans only for invocations it can name exactly: a skill name carried by several repositories is reported with every candidate and gets no call. Where a tool was fetched through a server, it says whether a receipt corroborates the access. A receipt attests access, never use.

| Input | Type | Description |
| --- | --- | --- |
| `agent_chain_id` | number, required | The chain your identity lives on |
| `agent_token_id` | string, required | Your token id |
| `registry` | string | The identity registry, when not the canonical one |
| `log` | string | The hook's JSONL log. Omitted: `.arp/session.jsonl` |
| `declarer` | string | The address that will sign. A receipt signed by this same address corroborates nobody |

### arp_stake_on_used

Plan support in TRUST for declarations that are already public. The support lands on your declaration, so a reader can attribute it to you. An entry fee comes off and the rest buys shares at today's price; withdrawing returns what they are worth then, less an exit fee. A declaration that is not public yet comes back with `exists: false` and no call.

| Input | Type | Description |
| --- | --- | --- |
| `receiver` | string, required | Who will hold the support. Not defaulted |
| `targets` | array, required | Each `{ triple_id, amount_wei }`: the declaration's id from `arp_declare_used`, and an amount above zero |
| `curve_id` | number | Advanced. Which pricing curve. Defaults to 1 |

### arp_take_position

Plan support for a tool or an agent itself, not for a declaration about it. Anyone may do this for any reason; it is never summed with support on a declaration.

| Input | Type | Description |
| --- | --- | --- |
| `term_id` | string, required | The tool's id (`atom_id` from `arp_pulse`, `id` from `arp_find_tools`), or the agent's `identity_atom` from `arp_identity` |
| `amount_wei` | string, required | At least the chain's minimum deposit, which is read for each plan |
| `receiver` | string, required | Who will hold the support. Not defaulted |
| `curve_id` | number | Advanced. Defaults to 1 |
| `min_shares` | string | The fewest shares you accept. Zero accepts any price |

### arp_exit_position

Plan withdrawing support from a tool or an agent, back into TRUST. The only planner that sends no value. What you get back is read from the chain before you sign.

| Input | Type | Description |
| --- | --- | --- |
| `term_id` | string, required | The tool or agent's id |
| `account` | string, required | Whose support it is |
| `receiver` | string, required | Who receives the TRUST, usually the same as `account` |
| `shares` | string | How much to withdraw. Omitted: all of it |
| `curve_id` | number | Which pricing curve. Defaults to the chain default |
| `min_assets` | string | The least TRUST, in wei, you accept back. Zero accepts any price |

### arp_record_reachable

Probe a tool and plan the support that records what you found, signed with your key, so what lands is your verdict. One observation is enough. A TLS failure, a DNS failure or a 429 plans nothing; a timeout is a verdict. An empty `calls` means nothing should change: read `why`. The response carries the exact request, so anyone can repeat it.

| Input | Type | Description |
| --- | --- | --- |
| `url` | string, required | The http(s) endpoint you called |
| `tool_atom_id` | string, required | The tool's id: `atom_id` from `arp_pulse`, or `id` from `arp_find_tools` |
| `receiver` | string, required | Your address: it holds the support and signs |
| `protocol` | string | `mcp` or `a2a` to attempt that handshake |

## Sponsored tools

Served only with `ARP_TOOLS=desktop` or `sponsored`. The person signs nothing and sees no fee; ARP's sponsoring service pays, on testnet 13579.

### arp_get_skill

**Soon to be released**, with `arp_declare_used` below: up to 0.0.5 both need a content server on your own machine (`ARP_CONTENT`, `http://127.0.0.1:3002`), and 0.0.6 points them at ARP's hosted one ([Install](/docs/install#arp-init---sponsored)).

Fetch a skill found with `arp_find_tools` and return its `SKILL.md`. It may ask you to run commands, so tell the person what it will do first. Where the skill would be installed in the project, the person is asked first, and nothing is written unless they accept. ARP keeps a note that the skill was served, which the sponsored `arp_declare_used` needs. The source comes from ARP's catalogue, never from the request, and nothing fetched is executed.

| Input | Type | Description |
| --- | --- | --- |
| `id` | string, required | The skill's `id` from `arp_find_tools` |

### arp_declare_used (sponsored)

After a skill from `arp_get_skill` actually helped, record publicly that you used it. ARP pays and supports the record in your agent's name. Only for a skill you used, never one you only read. The first time takes about a minute.

| Input | Type | Description |
| --- | --- | --- |
| `id` | string, required | The `id` you passed to `arp_get_skill` |

## Environment variables

Read by the server at start. Your install sets the first two.

| Variable | Default | Effect |
| --- | --- | --- |
| `ARP_TARGET` | `mainnet` | `testnet` (13579) or `mainnet` (1155). `arp init` and the plugin set `testnet` |
| `ARP_TOOLS` | unset (full set) | `read`, `desktop` or `sponsored`, as above |
| `ARP_PULSE_SEARCH` | on | `off` stops `arp_pulse` from running the search package |
| `ARP_PULSE_SCORE` | on | `off` turns the score off |
| `GITHUB_TOKEN` | unset | Raises GitHub's limit when `arp_pulse` reads a skill's files |
| `ARP_HOME` | `~/.arp` | Where every program keeps its state |
| `ARP_SESSION_LOG` | `.arp/session.jsonl` | The hook's log, in the project |
| `ARP_RECEIPTS` | `.arp/receipts.jsonl` | Where fetched skills' receipts are recorded |
| `ARP_PROJECT_DIR` | the working directory | The project that relative paths resolve against |
| `ARP_SKILLS_DIR` | unset | Where `arp_get_skill` installs a skill. `arp init --sponsored` sets `.claude/skills` |
| `ARP_SPONSOR` | `https://sponsor.arp.intuition.box` (0.0.4; `http://127.0.0.1:3200` in 0.0.3 and from a checkout) | The sponsoring service |
| `ARP_CONTENT` | `https://content.arp.intuition.box` from 0.0.6 (task 131); `http://127.0.0.1:3002` in 0.0.5 and earlier and from a checkout | The content server |
| `ARP_DOMAIN_ATTESTOR` | ARP's published addresses | Whose index of domains to read. Comma-separated. Blank disables domain search |
| `ARP_ACCEPTED_SIGNERS` | empty | Receipt signers this server trusts, comma-separated |
| `ARP_NO_RECEIPTS` | unset | `1` runs with no receipt key |
| `ARP_RECEIPT_KEY` | generated in `~/.arp/receipt-key` | The key that signs content receipts, and nothing else |
| `ARP_ALLOW_PRIVATE_PROBE` | unset | `1` allows probing private addresses |
| `INTUITION_GRAPHQL_URL`, `INTUITION_RPC_URL`, `ARP_MULTI_VAULT` | the chain's deployment record | Override where the server reads |
| `PORT`, `ARP_HOST` | `3002`, `127.0.0.1` | Over HTTP (`arp mcp --http`) only |

The source is [apps/mcp/src/tools.ts](https://github.com/intuition-box/ARP/blob/main/apps/mcp/src/tools.ts) and [apps/mcp/src/config.ts](https://github.com/intuition-box/ARP/blob/main/apps/mcp/src/config.ts). The commands that start the server are in [CLI](/docs/cli).
