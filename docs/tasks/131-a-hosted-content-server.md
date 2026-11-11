# Task 131 — A hosted content server

**Status:** built 2026-11-11 on `feat/131-hosted-content-server`, written by arp-97. `task-verifier` PASS on round 2, post-mortem `.claude/learning/119-a-hosted-content-server.md`. Task 131, ADR
`0196`, post-mortem `119`, allocated by the orchestrator. **Not deployed**: the deploy is the user's
(the steps below), then the orchestrator's 0.0.6 release, then the end-to-end check.
**Rules:** `code.md`, `security.md`, `portability.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

From a clean `node:22-bookworm` container with `@arp-protocol/cli@0.0.4`, `arp init --sponsored`, then
`arp_get_skill`: `ARP's content server did not answer at http://127.0.0.1:3002`. `ARP_CONTENT`
defaulted to the loopback (`apps/mcp/src/config.ts`), and the hosted MCP endpoint, which also serves
`/content`, signs nothing (ADR `0161` condition 3). `arp_declare_used` needs the receipt first, so it
failed too. The user, 2026-11-11: do it, all on Coolify.

## What changes

1. `apps/mcp/src/content-server.ts`: `GET /content/:atomId` and `GET /`, nothing else; a key from
   `ARP_RECEIPT_KEY_FILE` (64 hex characters, with or without `0x`); testnet only; its own host and
   loopback only. `isBareHostName` is exported from `hosted.ts` for it.
2. `apps/mcp/Dockerfile.content`, its allowlist, and `apps/mcp/content-entrypoint.sh`, which copies a
   mounted key that is not mode 600 to `/dev/shm`, as the sponsor's entrypoint does.
3. `ARP_CONTENT` defaults to `config.contentDefault` in `apps/cli/package.json`,
   `https://content.arp.intuition.box`, inlined at build (`--define` in `build`, `define` in
   `scripts/packages.ts`); from a checkout, still the loopback. `packaging/` regenerated. CHANGELOG
   "0.0.6 — unreleased"; the version is the orchestrator's to bump.
4. Docs: `apps/web/DEPLOY.md` "The content server"; the default in `docs/22`, `docs/31`,
   `apps/web/public/docs/{architecture,mcp-tools,developers}.md`; `security.md`'s signature list; ADR
   `0161` points to `0196`.

## The deploy, for the user

1. **The key, on your machine.** Writes `~/.arp/content-hosted.key` with mode 600 and prints only the
   address:

   ```bash
   cd apps/mcp && bun -e "import {loadOrCreateKeyFile} from '@arp-protocol/core/node'; import {privateKeyToAccount} from 'viem/accounts'; const {key, created} = loadOrCreateKeyFile(process.env.HOME + '/.arp/content-hosted.key'); console.log(created ? 'created' : 'exists', privateKeyToAccount(key).address)"
   ```

2. **Coolify, a new application** in the ARP project:

   | Setting | Value |
   | --- | --- |
   | Source | the Git repository, branch `main` |
   | Build pack | Dockerfile |
   | Base Directory | `/` (never the Dockerfile's path) |
   | Dockerfile Location | `/apps/mcp/Dockerfile.content` |
   | Ports Exposes | `3003` |
   | Domain | `https://content.arp.intuition.box` (the wildcard DNS already covers it) |
   | Health check | off (the image has its own) |
   | File mount | destination `/run/secrets/receipt.key`, content: the key file's one line |
   | Variables, **Available at Runtime**, not Buildtime | `ARP_PUBLIC_HOST=content.arp.intuition.box`, `ARP_RECEIPT_KEY_FILE=/run/secrets/receipt.key` |

3. **The sponsor**, in Coolify: add the address from step 1 to `SPONSOR_CONTENT_SIGNERS`
   (comma-separated, after any value there), then redeploy the sponsor.
4. **Check:** `curl -s https://content.arp.intuition.box/` names the step-1 address as `signer`;
   `curl -s -o /dev/null -w '%{http_code}\n' -X POST https://content.arp.intuition.box/mcp -H
   'content-type: application/json' -d '{}'` prints `405`.

Then the orchestrator publishes 0.0.6, and the end-to-end check runs from a clean container:
`arp init --sponsored`, `arp_get_skill`, `arp_declare_used`.

## Checked

- `apps/mcp/test/content-server.test.ts`: refusals at start, a key with and without `0x`, a
  world-readable key refused without printing it, the two routes, `/mcp` refused (405, 404), a
  foreign `Host` refused (403). `apps/cli/test/cli.test.ts`: the bundle carries `contentDefault`, and
  never reads `ARP_CONTENT_DEFAULT` at run time.
- `docker build -f apps/mcp/Dockerfile.content`, run with a throwaway key written **without `0x`, mode
  644**, as Coolify stores it: `/` named the key's address; `POST /mcp` 405, `GET /mcp` 404, a
  foreign `Host` 403; a signed request for the `pdf` skill's atom
  (`0x9b3a3cc6…a8ce`) came back 200 with a receipt that `verifyContentReceipt` reads as `valid`,
  signed by the throwaway key, naming the requesting agent; the same with `bundle=1`, as
  `arp_get_skill` asks.

## Do not do in this task

- Give the hosted MCP endpoint a key, or change it.
- Bump the CLI version or publish (the orchestrator ships 0.0.6 with task 127).
- Read, print or copy the receipt key. The user pastes it into Coolify.
