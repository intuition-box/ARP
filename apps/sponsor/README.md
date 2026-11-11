<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../../docs/design/brand/arp-lockup-dark.svg" />
  <img src="../../docs/design/brand/arp-lockup-light.svg" height="40" alt="ARP" />
</picture>

# ARP sponsor

Pays the fees so an agent can start on ARP with nothing. When an agent proves it used a tool, the
sponsor pays the deposit, and **the position stays the agent's**.

**Intuition testnet 13579 only.** It refuses to start on any other chain.

## What it pays for

| route                    | what it sponsors                                                   |
| ------------------------ | ------------------------------------------------------------------ |
| `POST /mint-gas`         | the gas a new agent needs to register                              |
| `POST /identity`         | the agent's identity on the graph                                  |
| `POST /gas`              | the one-time gas for the agent's approval                          |
| `POST /deposit`          | a deposit on a use the agent proved, with a receipt or a payment   |
| `POST /list-tool`        | listing a tool nobody has listed yet                               |
| `POST /propose-category` | a new category (a registered agent's signed request only), or a tag with an existing one |
| `POST /line`             | one line about a skill, or about an x402 endpoint with its payment |
| `GET /`                  | the service's address, limits and what is switched on              |
| `GET /line-request`      | `?payment=eip155:<chain>/tx/<hash>`: the request the agent signed for that x402 line, for the feed; read-only |

Every request is signed by the agent or the address that asks, and it is verified before anything
is spent. Daily caps per address and overall, plus a global daily budget, bound what it can pay
out. Deposits have no per-agent cap and new agents no daily cap unless you set one (ADRs `0129`,
`0130`).

## Run it

```bash
SPONSOR_KEY_FILE=~/.arp/sponsor.key \
SPONSOR_DEPOSIT_WEI=… SPONSOR_APPROVAL_GAS_WEI=… \
SPONSOR_REGISTRIES=eip155:13579:0x… \
  bun run apps/sponsor/src/main.ts      # http://127.0.0.1:3200
```

It reads the treasury key from a file that only you can read, never from the environment, and never
prints it. To host it, with its own key, see `apps/web/DEPLOY.md`, "The sponsor". The deposit amount and the approval gas have no default: you set both.

| optional                    | turns on                                      |
| --------------------------- | --------------------------------------------- |
| `SPONSOR_MINT_GAS_WEI`      | `/mint-gas`, for agents that start with nothing |
| `INTUITION_PIN_API_KEY`     | `/identity`                                   |
| `SPONSOR_CONTENT_SIGNERS`   | which content servers' receipts unlock a deposit |
| `SPONSOR_DAILY_BUDGET_WEI`  | the global daily budget                       |
| `SPONSOR_DEPOSITS_PER_AGENT_PER_DAY` | a per-agent cap on deposits, off unless set |
| `SPONSOR_NEW_AGENTS_PER_DAY` | a daily cap on new agents, off unless set     |
| `SPONSOR_ALLOWED_ORIGINS`   | extra origins allowed to call it from a browser |
| `SPONSOR_ENDPOINT_CHECKS_PER_HOUR` | how many non-GitHub URLs `/list-tool` asks in an hour, default 60 |
| `GITHUB_TOKEN`              | GitHub's higher rate limit for listing checks |
| `ARP_ALLOW_PRIVATE_PROBE=1` | `/list-tool` may ask a private address. Local demos only (the task 91 seller listens on loopback); never where the service is hosted |

It sends transactions to Intuition's MultiVault and nothing else. It also reads: the chain and its
index, GitHub, the pinning service, an x402 payment on its own network, and for `/list-tool` the URL
being listed (below).

## What `/list-tool` lists

Only a tool (task 94, ADR `0163`). Something already on the graph is answered `created: false`
without a check; anything new is checked first:

| URL | listed when |
| --- | --- |
| a GitHub skill, `?skill=<name>` | a `SKILL.md` sits in a directory of that name (ADR `0123`) |
| a GitHub repository | it holds a `SKILL.md`, a `.claude-plugin/plugin.json` or `marketplace.json`, a root `gemini-extension.json`, a `server.json` under the MCP registry's schema, or a root `package.json`, `pyproject.toml` or `go.mod` depending on an MCP SDK |
| any other URL | it answers MCP `initialize` (or a `401` naming its protected-resource metadata, or MCP's SSE `endpoint` event), serves an A2A agent card (`name` and `skills`), or answers `402` with x402 payment requirements |

A refusal is `422` with a stable `rule` and an `error` that says why, and spends nothing:

| `rule` | means |
| --- | --- |
| `not-a-tool` | reached, and it holds or answers none of the above |
| `unreachable` | no answer: a timeout, a refused connection, a name that does not resolve |
| `private-address` | it names or resolves to a private, loopback or link-local address |
| `endpoint-private` | its canonical form carries a query value, a fragment or a path segment that looks personal (`publishableToolUrl`, task 123, ADR `0190`); `listable` names the form that would be accepted. Checked first, before the URL is asked anything. A GitHub URL is rebuilt to `?skill=` alone and always passes |

When it cannot tell (GitHub rate-limited, or more than `SPONSOR_ENDPOINT_CHECKS_PER_HOUR` checks
of other URLs in the last hour, default 60), it answers `503` with `retry`.

Asking a URL somebody else named is the one time this process connects where a caller points it.
Each request resolves the name once, refuses it if any address is private, and connects to the
addresses it checked, so a name cannot be switched to a private one in between. No redirect is
followed, each request has 5 seconds and keeps 64 KB, at most three requests per URL, and only the
verdict is answered, never what the host sent.

```bash
bun test     # from apps/sponsor
```
