# Task 78 — The sponsor, hosted beside the site

**Status:** built and verified, 2026-11-09; waits on the new key's address.
**Decision:** the user, 2026-11-09: « le sponsor et la landing iront dans un seul project coolify »;
the public host name is a variable filled in Coolify; the hosted sponsor gets **a new key**, not the
deployer's (which holds real TRUST on mainnet 1155). ADR `0149`.
**Rules:** `code.md`, `security.md`, `portability.md`, `workflow.md`, `claims.md`.
**Reviewers:** `contract-reviewer` is for contracts and none changes; a security review of the
container and the listener by `task-verifier` with `security.md` loaded.

## What ships

1. `apps/sponsor/Dockerfile`, `Dockerfile.dockerignore` and `docker-entrypoint.sh`: the image holds
   no key and no ledger; the key is a file mounted at run time, copied to `/dev/shm` with mode 600
   when it is not already.
2. `SPONSOR_LISTEN` and `SPONSOR_PUBLIC_HOST` (`apps/sponsor/src/listen.ts`): every interface inside
   the container, one more accepted `Host`, both or neither.
3. `lockFile` takes over a lock left under its own pid, and the service exits on `SIGTERM`, so a
   container restarts after a hard stop.
4. The line payers read `arp.deployer` and `arp.sponsor` (web and MCP).
5. `apps/web/DEPLOY.md`, "The sponsor": the Coolify settings, the variables, what bounds a loss, the
   rotation, the testers' `ARP_SPONSOR`.

## Waits on the user

- The new key, created on the user's machine with the command in `DEPLOY.md`; its **address** goes
  in `data/deployments/13579.json` `arp.sponsor` and in `ARP_DOMAIN_ATTESTORS`. The key is never
  read by an agent.
- Funding the new address with a few days of budget, 3 tTRUST or less.
- The Coolify setup and the host name.

## Do not do in this task

- No mainnet: the service refuses any chain but 13579.
- No change to the caps, the budget or the routes.
- No new default for `ARP_SPONSOR` in the plugin and the CLI before the host name exists.
- No change to the listing query that reads one sponsor address for Usage.

## Completion note, 2026-11-09

`task-verifier` FAIL on round 1 (a denylist build context that let an untracked `.dev.vars` in on a
local build; a comment claiming every route verifies a signature; the key-mode check described as
the service's when it is the entrypoint's), all three fixed, PASS on round 2. Post-mortem
`.claude/learning/69-the-sponsor-hosted.md`. Not committed: the follow-up with the new address
(`arp.sponsor`, `ARP_DOMAIN_ATTESTORS`, `docs/31:159`) goes with it.

Checked: protocol vitest 1163 passed, 4 skipped; sponsor tsc and 135 tests; MCP tsc and 240; web
`tsc -b`, eslint, 842 passed, 2 skipped; `packages --check` after regenerating `packaging/`. The image
was built and run with a throwaway unfunded key: the public `Host` answered 200, another 403; files
planted in the context (`.dev.vars`, `.wrangler`, `.agents`, a `.key`) were absent from it; the
service restarted after `docker stop` and after `docker kill`.
