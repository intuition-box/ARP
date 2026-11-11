# 0161 — A hosted read-only MCP endpoint, opt-in, that keeps no word it receives

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** the user, 2026-11-10, task 92 (`docs/tasks/92-a-hosted-read-only-mcp-endpoint.md`)

> **Amended by ADR `0196`, 2026-11-11.** The CLI names one hosted URL from 0.0.6: the content server,
> a separate process that serves no MCP and no search and signs receipts. This endpoint is unchanged.

## Context

The user decided on 2026-11-10 that ARP offers a hosted MCP endpoint: a marketplace or an agent points at a
URL and uses ARP's reads with nothing installed. It runs on Coolify beside the site and the sponsor.

The MCP server already has an HTTP transport and a read-only tool set, `ARP_TOOLS=read`
(`apps/mcp/src/config.ts`), served to the plugin as `arp_pulse`, `arp_tool_reputation` and
`arp_agent_endpoints` (`PLUGIN_TOOL_NAMES`, `apps/mcp/src/tools.ts`). But a hosted endpoint receives the
caller's tool arguments, the words of a search among them. ADR `0155` point 3 says "no word is sent to
ARP", on the user's standing rule « je ne veux jamais récupérer le texte de l'utilisateur ». So this
amends `0155` for one case, and says on what conditions.

Two facts bound what it may read. The plugin runs `ARP_TARGET=testnet` (`packaging/claude/arp/.mcp.json`),
the CLI's installs write the same (`SERVER_ENV`, `apps/cli/src/install/targets.ts`), and the public site
is testnet only (`apps/web/DEPLOY.md`, `VITE_ALLOW_MAINNET` unset). The server's own default is mainnet
1155 (`TARGETS`, `config.ts`), which no installed path uses.

## Decision

`ARP_HOSTED=1` runs the MCP server as ARP's hosted endpoint, built by `apps/mcp/Dockerfile`, on four
conditions. Three are code in `apps/mcp/src/hosted.ts`, checked in `config.ts` before anything else runs,
so a refused setting never listens and never makes a key.

1. **Opt-in by the caller.** The plugin, the CLI, the Desktop extension and the hook keep running the
   server on the person's machine and name no hosted URL, so nothing routes there by default. Only a
   caller who chooses to point at the URL sends words there. This change adds no URL to any of them.
2. **No argument kept.** Hosted, a failed call's log line names the tool and the error's class, never its
   message (`loggable`): a message can carry an argument, as a GraphQL error that quotes its variables
   does. The server logs no request and no body, and writes none to disk. `apps/mcp/test/hosted.test.ts`
   sends distinctive words and an atom id through all three tools against a graph that quotes them back,
   and asserts none appears in what the hosted server prints, while the same calls to a server that is
   not hosted do print them, which shows the capture sees a leak.
3. **Read-only, no key.** Hosted, the server refuses to start unless `ARP_TOOLS=read`, and refuses
   `ARP_RECEIPT_KEY`, `ARP_AGENT_PRIVATE_KEY` and `ARP_ALLOW_PRIVATE_PROBE`. The content receipt key is
   neither generated nor read, so `GET /content/:atomId` serves unsigned. It refuses stdio. It answers
   one public name, `ARP_PUBLIC_HOST`, as `Host` and as the origin `https://<name>`, besides its loopback
   names; a public name without `ARP_HOSTED=1` is refused, so the local server's checks do not move.
4. **Testnet 13579.** Hosted requires `ARP_TARGET=testnet`, the chain the plugin, the CLI and the site
   already read. Mainnet is a new ADR.

ADR `0155`'s status line points here. Its decision holds for everything a person installs.

## Alternatives considered

- **No hosted endpoint; installs only.** The user decided otherwise: a marketplace cannot install a plugin.
- **Hosting with a log of requests for operations.** Breaks condition 2, and the rule it serves.
- **Following the server's mainnet default.** No installed path reads mainnet; a hosted endpoint that
  answered from another chain than the plugin would give a caller different results for the same words.
- **Authentication or rate limits.** Out of this task's scope (`docs/tasks/92`);
  the endpoint has the HTTP transport's existing bounds: 1 MiB bodies, 30 s to receive a request, one
  search answered within 50 s (`PULSE_BUDGET`).

## Consequences

**Positive:**

- A marketplace or an agent reads ARP from a URL, with nothing installed.
- The no-word rule now has a test. Before this ADR nothing checked what the server logs; a mutation of
  `loggable` that returns the message fails it with the words in the output.

**Negative:**

- The words of a caller who chooses the endpoint reach ARP's server, in memory, for the length of the call.
  What keeps them from being kept is this code and its test, not a structure: a later change that logs an
  argument breaks the condition and only the test would say so.
- `arp_pulse` sends the words on to skills.sh through `npx skills@1.7.6 find`, as it does from a person's
  machine (`docs/22`), now from ARP's address. GitHub sees which repositories a search turned up, and the
  listings are cached by repository in the container (`pulse-listings`), which holds no word.
- Each search spawns `npx`. Nothing bounds how many run at once beyond the transport's limits above.
- A reverse proxy's access log, when on, records each request line: for `POST` the path, never the body;
  for `GET /content/:atomId` the public atom id. Coolify's proxy settings decide whether it is on.
- Whoever chooses the endpoint has ARP in the path of their reads. ADR `0045`'s test still holds for
  everyone else, and for them running the server themselves gives the same reads.
- Not tried with a remote MCP client: the transport is the existing one, unchanged. It answers `POST`
  with a JSON body and a `GET` with an information document, never an event stream, and keeps no session.

**Neutral (worth knowing):**

- `failed_on_this_machine` reads the container's own file, which nothing writes, so it is always empty.
- The search package is fetched into the image at build, so the first search does not wait for it.

## References

- Related rules: `.claude/rules/security.md`, `.claude/rules/claims.md`, `.claude/rules/portability.md`
- Related doc: `apps/web/DEPLOY.md` ("The MCP endpoint"), `docs/22_RUNNING_THE_NODE.md`
- Related ADRs: `0155` (amended), `0045`, `0092`, `0116`, `0149`
- Post-mortem: `.claude/learning/81-a-hosted-read-only-mcp-endpoint.md`
