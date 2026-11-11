# What ARP publishes about you

ARP writes lines on a public graph, Intuition testnet 13579, that anyone can read and nobody can delete. This page lists what goes there, what stays on your machine, and what reaches someone else's server without being written anywhere. Everything else in these pages agrees with it; if one does not, this one is the list to fix.

## Three things to know first

- **The paying wallet is public, and a wallet plus a list of paid endpoints draws a profile.** An x402 payment is a token transfer on its own chain, Base by default, readable by anyone, and a line names it. Pay from a wallet dedicated to the agent's payments, never a personal one.
- **No request body, response or error text ever leaves your machine.** A line carries closed words only: `worked` or `failed`, and a reason from a fixed list (`missing-key`, `missing-program`, `missing-file`, `not-the-right-tool`, `no-delivery`).
- **The hosted MCP server logs no tool argument.** When it runs, it receives your arguments, the words of a search among them, and keeps none in what it logs. The test that checks it is "logs none of a caller's arguments" in [hosted.test.ts](https://github.com/intuition-box/ARP/blob/main/apps/mcp/test/hosted.test.ts). The hosted server is not deployed yet: see [Install](/docs/install).

## What is written on the public graph

Only what you send yourself: by `arp line`, by `arp share send`, or by a call you sign from a planner or the web app. Nothing is written by a search, by the hook, or by a read tool the plugin serves.

| What | When | Its content |
| --- | --- | --- |
| The agent | The first line you send | `Agent 13579:<id>`, and the address that holds it: a key ARP makes on your machine (`~/.arp/agent-key`), not your own wallet |
| A line | Each `arp line`, each line `arp share send` sends | The tool's public URL, a domain from the category tree, the outcome, a closed reason, and with a missing program or key its name as the skill's SKILL.md writes it, never its value |
| A payment level | An x402 line, with `--payment-tx` | The network, the transaction hash, and the endpoint's URL with its values removed (below) |
| A listing | A tool nobody listed yet, before its first line | The tool's URL: for an x402 line, with its values removed |
| A position | With each level of a line | A small deposit in the agent's name, so its address stands behind what it wrote |

Each of these is a transaction on testnet 13579, so the agent's address and the time are public too. What a line says: [Lines](/docs/lines).

On the paying chain, outside ARP, the payment itself is public: the payer, the recipient, the amount and the asset. ARP signs and sends nothing there; it reads the transaction.

## What the sponsoring service keeps, and publishes beside the graph

For each x402 line it writes, ARP's sponsoring service keeps the request your agent's key signed, and publishes it in [the x402 outcomes feed](/docs/x402-feed) and at its `GET /line-request`. It holds what the line already says on the graph (the agent's address and id, the tool's atom, the domain, the outcome, the reason, the payment and the URL without its values), plus a random nonce, an expiry time and the signature. What it adds is that your agent's key signed those words, which is why it is published: a reader checks the signature without asking ARP. A line about a skill keeps nothing.

## What stays on your machine

- The session log, the search log, the failure memory and the model's answers (`.arp/` in the project, `~/.arp/` in your home folder): [Local memory and sharing](/docs/local-memory).
- The command a skill ran, its output, and any error text: never written, even locally.
- Your words: matched against fixed words, never copied.
- The request you sent to an endpoint, and what it answered.
- The query values, fragment and personal path segments of an endpoint you paid.

## What reaches another server without being written

None of these is on the graph. Each lets the server see your IP address and the time.

- A search sends its words to skills.sh, and reads each result's files from GitHub.
- Before `npx skills add`, the hook reads the skill from GitHub, naming the repository and the skill.
- When a skill fails, the hook reads that skill's lines from Intuition's index, naming the skill and nothing else: the index can infer that it just failed somewhere. `ARP_FAILURE_LINES=off` stops it.
- `arp line` reads the payment on its own chain, and ARP's sponsoring service reads it again, before anything is written.

The full list of files and connections: [Running the MCP server, the node and the hook](https://github.com/intuition-box/ARP/blob/main/docs/22_RUNNING_THE_NODE.md).

## An endpoint's URL, with its values removed

A URL you called can hold what you asked: a city, a search, an email, a wallet address, a token. So `arp line` removes it on your machine before it signs, and ARP's sponsoring service refuses a URL that still carries one, with `422` and the rule `endpoint-private`. The rules are closed, so anyone who applies them to the URL they called gets the same result:

1. The scheme, the host and the port are kept as typed.
2. A URL with `user:pass@` is refused.
3. The fragment (`#…`) is removed.
4. Each query parameter keeps its name and loses its value. A part with no `=` is removed.
5. A path segment, or a parameter name, that looks personal becomes `:id`. It looks personal when, as typed or decoded, it holds an `@`; `0x` and 40 or more hex digits; a UUID; 6 digits in a row; 16 hex digits in a row with a digit among them; a phone number (digits, spaces and `+ - . ( )`, with 7 digits or more); a space; or more than 20 characters of base64 with an upper-case letter, a lower-case letter and a digit.

| Called | Written |
| --- | --- |
| `https://api.example.com/weather?city=paris&units=metric` | `https://api.example.com/weather?city=&units=` |
| `http://www.api.example.com/x402/weather/?q=pizza#results` | `http://www.api.example.com/x402/weather/?q=` |
| `https://api.example.com/v1/users/alice@example.com/orders` | `https://api.example.com/v1/users/:id/orders` |
| `https://api.example.com/balance/0x1111…1111?chain=base` | `https://api.example.com/balance/:id?chain=` |
| `https://api.example.com/orders/123e4567-e89b-12d3-a456-426614174000` | `https://api.example.com/orders/:id` |
| `https://mainnet.example.io/v3/9aa3d95b3bc440fa88ea12eaa4456161` | `https://mainnet.example.io/v3/:id` |
| `https://api.example.com/search?paris` | `https://api.example.com/search` |
| `https://user:secret@api.example.com/weather` | refused |

The payment level keeps this form as paid. The tool's atom takes its canonical form: `https`, no `www.`, no trailing `/`, the names sorted, so `https://api.example.com/x402/weather?q=` for the second row. Two calls that differ only in what they asked land on one atom.

**What the rules do not catch: a plain word in the path.** `https://api.example.com/weather/paris` is written as it is, because nothing tells a route from a search there. Write `:id` in its place yourself before you run `arp line`: `--tool https://api.example.com/weather/:id`.

The host is kept, so a host that names you names you. The rules are in [endpoint-redaction.ts](https://github.com/intuition-box/ARP/blob/main/packages/protocol/src/endpoint-redaction.ts).

A value is not replaced by its hash. A hash of a guessable value, such as a city, is found again by trying candidates, and a hash with a secret added would give two payers two different URLs for one endpoint.

## What was written before 2026-11-11

Lines written before values were removed kept the URL as typed. Read on testnet 13579 on 2026-11-11, none of them carried a value: of the 2 payment levels, one named a URL, and neither it nor its tool's atom had a query value, a fragment or a personal path segment; nor did any of the 38 http(s) URLs, GitHub left out, that a `uses` triple points at. The count comes from [endpoint-values-on-chain.ts](https://github.com/intuition-box/ARP/blob/main/scripts/measure/endpoint-values-on-chain.ts). The x402 feed removes values again as it reads, whatever a line wrote: [The x402 outcomes feed](/docs/x402-feed).
