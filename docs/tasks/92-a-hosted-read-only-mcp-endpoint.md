# Task 92 — A hosted read-only MCP endpoint

**Status:** built 2026-11-10, awaiting `task-verifier`.
**ADR:** `0161` (amends `0155`).
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

The user decided on 2026-11-10 that ARP offers a hosted MCP endpoint, so a marketplace or an agent can use
ARP's reads by pointing at a URL, without installing anything. The user deploys it on Coolify beside the
site and the sponsor (`apps/web/DEPLOY.md`). This task prepares it; it does not deploy, publish or push.

A hosted endpoint receives the caller's tool arguments, the words of a search among them, which ADR `0155`
point 3 kept from ARP (« je ne veux jamais récupérer le texte de l'utilisateur »). ADR `0161` records the
conditions under which it may.

## Deliverables

1. **Hosted mode**, `ARP_HOSTED=1` (`apps/mcp/src/hosted.ts`, checked first in `apps/mcp/src/config.ts`):
   refuses to start unless `ARP_TOOLS=read`, `ARP_TARGET=testnet` and a bare `ARP_PUBLIC_HOST` are set,
   with no `ARP_RECEIPT_KEY`, `ARP_AGENT_PRIVATE_KEY` or `ARP_ALLOW_PRIVATE_PROBE`, and over HTTP only. No
   receipt key is generated or read. A public name without `ARP_HOSTED=1` is refused.
2. **No argument in a log**: hosted, a failed call's line and `arp_pulse`'s usage-read line give the
   error's class, not its message (`loggable`). The `initialize` instructions leave out the sharing
   question, which is about the caller's own machine.
3. **Host checks**: `httpPolicy` (`apps/mcp/src/server.ts`) adds the public name as `Host` and
   `https://<name>` as origin, nothing else; loopback behaviour is unchanged.
4. **Image**: `apps/mcp/Dockerfile` (Node 22 for `npx`, Bun copied in, the search package fetched at
   build) and an allowlist `apps/mcp/Dockerfile.dockerignore`.
5. **Test**: `apps/mcp/test/hosted.test.ts`, the refusals, the host checks, and the leak test (a graph stub
   that quotes its variables back; a non-hosted control that must print them).
6. **Docs**: `apps/web/DEPLOY.md` "The MCP endpoint" with the exact variables; `docs/22` (the hosted note,
   the two variables, "your words stay here" qualified); `docs/23` §5; `skills/arp/SKILL.md`;
   `apps/mcp/README.md`; the alias table's note and `packages/protocol/src/domain-words.ts` qualified;
   ADR `0155`'s status line.

## Do not do in this task

Rate limiting beyond what exists, authentication, a new tool, changing the installed CLI's default
transport, npm publish, deploying, pushing.

## Gates

- `bun run --cwd apps/mcp test`, `bun run --cwd apps/mcp lint` (tsc over `apps/mcp`)
- `bun run check` at the root
- `bun run --cwd apps/cli test`, `bun run --cwd apps/cli packages --check`, `bun run --cwd apps/cli check:node`
- `docker build -f apps/mcp/Dockerfile .`, then a run answering its public name and refusing another
