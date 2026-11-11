# 0196 — A hosted content server that signs receipts, and serves nothing else

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** the user, 2026-11-11 (« on fait tout sur coolify … vazy fait ça »), task 131
(`docs/tasks/131-a-hosted-content-server.md`)

Amends ADR `0161` on one point: the CLI names a hosted URL, this one, which receives no search.
`0161`'s endpoint is unchanged and still holds no key.

## Context

The sponsored setup (`arp init --sponsored`, the Desktop extension) fetches a skill through a content
server, which signs a receipt naming the agent that asked (ADR `0080`). The sponsoring service pays for
a declaration only against such a receipt from a signer it lists (`SPONSOR_CONTENT_SIGNERS`, ADR
`0094`). The CLI defaulted `ARP_CONTENT` to `http://127.0.0.1:3002`, so outside a machine that runs
`arp mcp --http` itself, `arp_get_skill` and `arp_declare_used` failed. Walked on 2026-11-11 from a
clean `node:22-bookworm` container with `@arp-protocol/cli@0.0.4`: `ARP's content server did not answer
at http://127.0.0.1:3002`.

ARP's hosted MCP endpoint serves `GET /content/:atomId` too, unsigned: ADR `0161` condition 3 keeps it
keyless, and condition 1 keeps every installed path from naming it, because it receives searches.

## Decision

**A second hosted process, `apps/mcp/src/content-server.ts`, at `content.arp.intuition.box`, serves
`GET /content/:atomId` and `GET /` and nothing else, and signs receipts with a key of its own.** The CLI
names it as `ARP_CONTENT`'s default from 0.0.6 (`config.contentDefault`, the pattern of ADR `0175`).

- **No MCP, no tool, no search.** A request names an atom id, a nonce, the agent's address and its
  signature. The agent's declaration makes the first and the third public anyway. No word of a search
  can reach this process, which is why naming it in the CLI does not reopen ADR `0161` condition 1.
- **One key, from a file, that signs receipts.** `ARP_RECEIPT_KEY_FILE` only; `ARP_RECEIPT_KEY` and
  `ARP_AGENT_PRIVATE_KEY` are refused. It holds no funds and its address is never funded.
- **Testnet 13579 only**, answering `ARP_PUBLIC_HOST` and loopback, and refusing any other `Host`.
- It imports `content.ts` and never `config.ts`, so none of the MCP server's settings load in it.

## Alternatives considered

- **Give the hosted MCP endpoint the key.** One process fewer, and it breaks `0161` condition 3, and with
  the CLI naming its URL, condition 1: searches would reach the process the CLI calls by default.
- **Keep the loopback default and document `arp mcp --http`.** Every tester would run a server to fetch
  a skill; the sponsor would still refuse their receipts, from a signer it does not list.
- **Accept unsigned content in the sponsor.** Removes the proof of use the sponsor pays against (ADR
  `0094`).

## Consequences

**Positive:**
- `arp_get_skill` and `arp_declare_used` work from any machine once deployed and 0.0.6 is published.

**Negative:**
- ARP learns which skill an agent fetched before the agent declares it, and Coolify's proxy log, when
  on, holds the request line (a path with the atom id and the agent's address).
- One more key on Coolify. Taken, it forges receipts under this signer until it is removed from
  `SPONSOR_CONTENT_SIGNERS`; it moves no value.

**Neutral (worth knowing):**
- The content route's code is unchanged; the same `serveContentRequest` runs in both servers.

## References

- Related ADR: `.claude/choices/0161-a-hosted-read-only-mcp-endpoint.md`
- Related ADR: `.claude/choices/0080-the-node-signs-for-what-it-served-and-for-nothing-else.md`
- Related ADR: `.claude/choices/0175-cli-sponsor-default-and-registry-namespace.md`
- Related rule: `.claude/rules/security.md`
- Related doc: `apps/web/DEPLOY.md`, "The content server"
