# 0163 — `/list-tool` lists only what is a tool, and asks a stranger's URL from a pinned connection

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/94`, the user, 2026-11-10: « empêcher de mettre n'importe quelle URL »;
`FUTURE.md` "`/list-tool` refuses what is not a tool, and a skill is read before it is installed", point 1.
**Amends:** ADR `0123` step 6.

## Context

ADR `0123` let the sponsoring service pay to list a tool: a GitHub skill had to have its `SKILL.md`, a
GitHub repository had to exist, and **any other URL was accepted unchecked**, because the process holding
the treasury key fetching an arbitrary URL is SSRF. The caps bounded what an invented URL cost, about
0.002 tTRUST a listing, but they did not keep the index from holding URLs that are not tools.

Two questions: what counts as a tool, and where a stranger's URL may be asked.

## Decision

### 1. A GitHub repository is listed when its tree shows something a runtime loads

Read from GitHub's tree API, the call the service already made for a skill, then at most four
manifests from `raw.githubusercontent.com` when the names show nothing
(`packages/protocol/src/sponsor/tool-forms.ts`, `repositoryForms`, `manifestForm`):

| form | read from | why |
| --- | --- | --- |
| `skill` | a `SKILL.md` at any depth, any case | what a skills runtime loads; the same basename rule as `skillFilesIn` |
| `claude-plugin` | `.claude-plugin/plugin.json` or `marketplace.json`, any depth | what Claude Code installs |
| `gemini-extension` | root `gemini-extension.json` | what Gemini CLI installs |
| `mcp-registry` | `server.json` whose `$schema` starts `https://static.modelcontextprotocol.io/schemas/` | the official MCP registry's manifest; the name alone is too common |
| `mcp-package` | root `package.json` with `@modelcontextprotocol/sdk` or `fastmcp` in `dependencies` or `peerDependencies`, or an `mcpName`; root `pyproject.toml` with `mcp` or `fastmcp` in `[project] dependencies` or `[tool.poetry.dependencies]`; root `go.mod` requiring `modelcontextprotocol/go-sdk` or `mark3labs/mcp-go` | an MCP server that publishes no registry manifest |

**Evidence.** `scripts/measure/tool-forms.ts` runs the sponsor's own `admitRepository` over the 53
repositories of `data/catalogue/tools.json` (22 MCP servers, 31 skill repositories, read 2026-10-28).
Run 2026-11-10, `data/measurements/tool-forms-2026-11-10T0811.json`: **53 of 53 admitted**. By the first
form found: skill repositories 17 `claude-plugin`, 14 `skill`; MCP servers 9 `mcp-registry`, 5
`claude-plugin`, 4 `skill`, 3 `gemini-extension`, 1 `mcp-package`. So each content form is needed by at
least one catalogue repository: the 9 `mcp-registry` show no name form, and `makenotion/notion-mcp-server`
is admitted only by its `package.json`'s `@modelcontextprotocol/sdk` dependency. The Python and Go forms
admit no catalogue repository; they are in because they are the same declaration in the other two
official SDK ecosystems, and they cost a read only when nothing else matched.

Not accepted: a `.mcp.json` alone (a client's configuration naming servers, not a server), a Desktop
extension's `manifest.json` (the name is a browser extension's too, and no catalogue repository needs
it), `devDependencies` (a test client is not what the package is), and a Python dependency declared
anywhere else in `pyproject.toml`. A GitHub skill URL (`?skill=`) keeps ADR `0123`'s check.

### 2. Any other URL is listed when it answers as a tool

At most three requests: a `GET` (an x402 `402`, an agent card, or MCP's SSE `endpoint` event), then MCP
`initialize`, then `<url>/.well-known/agent-card.json`; the first that answers wins
(`apps/sponsor/src/admit-tool.ts`, `admitEndpoint`):

- **MCP**: a JSON-RPC `result` with `protocolVersion` or `serverInfo`, as JSON or one server-sent event;
  or a `401` whose `WWW-Authenticate` carries `resource_metadata=` (the MCP authorisation spec's answer,
  which the user accepted as an MCP identity on 2026-10-30, `data/catalogue/remote-endpoints.json`
  `_note`); or a `text/event-stream` opening with `event: endpoint`, the older HTTP+SSE transport.
- **A2A**: a JSON object with a non-empty `name` and a `skills` array.
- **x402**: a `402` whose `PAYMENT-REQUIRED` header decodes to `x402Version` and a non-empty `accepts`,
  each offer naming `scheme`, `network` and `payTo` (v2, as `@x402/core` 2.28.0 encodes it); or, with no
  header, the same object as the body (v1).

### 3. The check runs in the sponsor, through a connection pinned to the address it checked

This is the SSRF question ADR `0123` answered by not fetching. It is answered here by fetching only
through `pinnedAsk`:

1. `http` and `https` only; a literal private address, `localhost`, `.local` and `.internal` are
   refused before any lookup (`privateProbeTarget`, the guard `arp_probe_endpoint` uses).
2. The name is resolved once, through `node:dns`, and refused if **any** address is private, loopback
   or link-local (`privateAddress`).
3. **The connection is made to the addresses that were checked**: `node:http`'s `lookup` hook hands
   them to the socket, so no second resolution happens. That closes DNS rebinding, which
   `guardedFetchText` documents as open because `fetch` exposes no such hook. Tested in Bun 1.3.14:
   a request to `pinned.test` reached the local server only through the injected resolver
   (`apps/sponsor/test/admit-tool.test.ts`). Over TLS, a run by hand on 2026-11-10 against
   `example.com` with a resolver-supplied address answered 200 with the certificate checked by name;
   it needs the network, so it is not a committed test.
4. No redirect is followed. Each request has 5 seconds and keeps 64 KB. What a host answered never
   leaves the process: the caller gets a form or a refusal with the status codes seen.
5. At most 60 such URLs an hour, all callers together (`SPONSOR_ENDPOINT_CHECKS_PER_HOUR`), so the
   service is not a way to send requests to third parties; past it, `503` with `retry`. Each verdict is
   remembered for ten minutes, like GitHub's.

`ARP_ALLOW_PRIVATE_PROBE=1`, the setting `apps/mcp` already reads for the same choice, lets a private
address through: task 91's x402 seller listens on `127.0.0.1`. The service prints it at start, and
`apps/web/DEPLOY.md` says never to set it on the host.

### 4. A refusal says why and spends nothing; the gate is on listing

`422` with `rule` `not-a-tool`, `unreachable` or `private-address` and an `error` sentence; `503` with
`retry` when the service cannot tell. The check runs after the plan and the early limit check and
before any pin, so a refusal pins nothing, sends nothing and records nothing in the ledger. **An atom
that already exists is answered `created: false` before the check**, so seeded atoms and earlier
listings are unaffected. A success adds `form` to the answer. `writeLine` (`arp line`, the MCP
server's sponsored mode) reports `the sponsor would not list <url> (<status>, <rule>): <error>`.

## Alternatives considered

- **Ask from `apps/probe`, which holds no key** (the place `FUTURE.md` suggested). A Cloudflare Worker
  cannot reach the sponsor's network, so SSRF is moot there. But it is local only today
  (`apps/probe/README.md:39`), it would need an authenticated HTTP route and a deployment before `/list-tool` could
  list any endpoint, and its verdict would arrive over the network to the same process anyway. The
  pinned connection removes the reason the sponsor could not ask: a caller cannot make it connect to
  anything but a public address it checked.
- **`fetch` with `guardedFetchText` and a `resolveHost`.** Leaves DNS rebinding open, as its own
  comment says; in the process that holds the treasury key the gap matters.
- **Names only, no manifest read.** `server.json` and `package.json` are common names; reading the
  file is what makes them evidence, and the host read is fixed.
- **Accept any 2xx from an endpoint.** That is the gate the user asked to replace.

## Consequences

**Positive:**

- The index ARP pays for holds tools: a repository a runtime loads, or an endpoint that speaks a tool
  protocol.
- A caller learns why in one line, with a stable `rule` to branch on.

**Negative:**

- A GitHub repository listing costs one more GitHub API request (the tree), against 60 an hour
  without `GITHUB_TOKEN`.
- A listing of an endpoint waits up to 15 seconds when the host is slow.
- An MCP server behind authorisation that does not name `resource_metadata`, a Python server that
  declares `mcp` elsewhere than the two tables read, or a paid endpoint that only answers `402` to a
  method other than `GET` and `POST`, is refused. Each is a new form to add here.
- **It bounds ARP's spend and ARP's index, not the graph.** Anyone can still write an atom on Intuition
  with their own funds; `FUTURE.md` point 2 is the defence where an agent installs.
- A tool that answers today can stop answering tomorrow; the check is at listing time only.

**Neutral (worth knowing):**

- The web app's message for these refusals is unchanged ("It could not be added."): the site was out
  of scope. Its `listToolMessage` reads `rule`, so a message per rule is one switch case each.
- Mainnet needs a new ADR, like every sponsored write.

## References

- Related rule: `.claude/rules/security.md`, `.claude/rules/claims.md`
- Related ADR: `.claude/choices/0123-the-sponsor-lists-a-tool-for-the-web-app.md`, `0093` (the probe),
  `0160` (task 91's demo seller)
- Measurement: `scripts/measure/tool-forms.ts`, `data/measurements/tool-forms-2026-11-10T0811.json`
