# 0149 — The sponsor is hosted, beside the site, with a key of its own

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** the user, 2026-11-09: « le sponsor et la landing iront dans un seul project
coolify »; then, asked which key, « Nouvelle clé ». Task `docs/tasks/78`.

## Context

`apps/sponsor` holds ARP's testnet treasury key and signs with it automatically, within its caps and
a daily budget (`security.md`'s signing table: ADRs `0092`, `0094`, `0110`, `0123`, `0124`, `0144`,
all testnet 13579 only). Until now it ran on the user's machine only: it listened on 127.0.0.1 and
answered loopback `Host` names only (ADR `0116`), and task 37 said it "must run locally first".
Without a hosted sponsor a tester can search but cannot write a line.

Three facts, read before deciding:

- **The key the sponsor used is also ARP's deployer**, on 13579 and on mainnet 1155
  (`data/deployments/1155.json` `deployedBy`). Its balance read 19.9999 TRUST on 1155 and
  4.2853 tTRUST on 13579, 2026-11-09 11:08 UTC (`eth_getBalance` on each chain's public RPC).
  Hosting that key would put real TRUST on a public server.
- **The ledger's lock compares pids in one namespace.** In a container the service is pid 1 at every
  start, so a lock left by a stop that ran no exit handler named the new process's own pid and was
  read as held: the service would never restart. And two containers on one volume do not see each
  other's pids.
- **Coolify replaces a container by a rolling update by default**, starting the new one before
  stopping the old, unless *Consistent Container Names* is on or a host port is mapped
  (coolify.io/docs/applications/deployments/rolling-updates, read 2026-11-09).

## Decision

The sponsor runs in the **same Coolify project as the site**, from `apps/sponsor/Dockerfile`,
behind Coolify's proxy, **on testnet 13579 only**, with **a key of its own** that is used for
nothing else.

1. **Where the key lives.** A file the host mounts at run time (`/run/secrets/sponsor.key`, a
   Coolify file mount), named by `SPONSOR_KEY_FILE`. Never in the image (its `.dockerignore` is an
   allowlist, so an untracked `.env`, `.dev.vars` or key file in a checkout stays out), never in git, never in an environment variable
   (ADR `0089` §3 stands). When the mounted file is not mode 600 and owned by the container's user,
   the entrypoint copies it to `/dev/shm` with mode 600 and the service reads the copy. The file
   mount's content is kept by Coolify, in its database and on the server's disk: that is the
   exposure accepted, and item 4 is what bounds it.
2. **What it answers.** `SPONSOR_LISTEN=0.0.0.0` inside the container, and `SPONSOR_PUBLIC_HOST`,
   one bare host name, added to the accepted `Host` names. Every other name is still refused, and
   the service refuses to start with one setting and not the other (`apps/sponsor/src/listen.ts`).
   The rest of ADR `0116` is unchanged: a browser `Origin` outside the list is refused, a `POST` is
   JSON or nothing, and only `/list-tool` and `/propose-category` answer the site's origin.
3. **One process on one ledger.** The ledger and the category log are on a persistent volume at
   `/data`. *Consistent Container Names* is on, so Coolify stops the old container first; one
   replica. `lockFile` takes over a lock that names its own pid when this process did not take it,
   and the service exits on `SIGTERM`, which releases the lock.
4. **What bounds a loss.** With the key safe, the caps and the daily budget (1 tTRUST a day by
   default, ADR `0092`). With the key taken, **the address's balance and nothing else**: so it holds
   a few days of budget, 3 tTRUST or less, topped up by small sums from a wallet not on the server.
   A taken key can also file categories as one of ARP's attestors until its address leaves
   `ARP_DOMAIN_ATTESTORS`.
5. **Rotation.** A new key, its address in `arp.sponsor` and `ARP_DOMAIN_ATTESTORS`, the file
   mount replaced, the volume kept (the ledger is keyed by what was paid for), what is left on the
   old address moved off it. The steps are in `apps/web/DEPLOY.md`, "Rotating the key".
6. **The new address is read where the old one was.** The line payers (ADR `0144`) are read from
   `arp.deployer` and `arp.sponsor` together, in the web app and in the MCP server, so lines the
   deployer paid for before and lines the new key pays for are both left uncounted.

Mainnet stays out: the service refuses any chain but 13579, and a mainnet sponsor needs a new ADR.

## Alternatives considered

- **Host the deployer's key, after emptying its mainnet balance.** No code to change, but the key
  that deployed on mainnet would sit on a public server, and the service's deposits would stay mixed
  with the deployer's in Usage. The user chose a new key.
- **The key in a Coolify secret environment variable, written to a file by the entrypoint.** Coolify
  stores it the same way as a file mount, and an environment is inherited by every child and dumped
  by crash reporters, which ADR `0089` §3 rules out. A file mount reaches the same place with no
  variable holding the key.
- **A database for the ledger.** The ledger is one append-only file read once at start (task 37
  asked for no database); a volume keeps it across deploys, which is all that was missing.
- **Keep it local, with a tunnel.** It would depend on the user's machine being on, which is what a
  tester round cannot rely on.

## Consequences

**Positive:**

- A tester can write a line without a wallet of their own, from any machine.
- The service's deposits come from an address used by it alone, which closes `STATE.md`'s defect
  "Usage on `/tools` counts every deposit from the sponsor's address", from the new key on.
- The lock no longer refuses a container's restart after a hard stop.

**Negative:**

- The treasury key is on a server that is not the user's machine, and Coolify keeps it at rest.
  The balance is the bound, so the balance has to be kept low by hand.
- **Usage restarts from the new address.** `/tools` reads one sponsor address; the deposits the old
  address sent (6 proof-gated, 2026-11-03, `scripts/measure/sponsor-deposit-provenance.ts`) stop
  counting there. Reading both addresses is a change to the listing query, not made here.
- A plugin or CLI built before this change reads the line payers from `arp.deployer` alone: it
  would count the new key as a writer of every line the sponsor pays for, until it is rebuilt.
  Whether the npm package (0.0.1, read 2026-11-09) reads line payers at all was not checked.
- A redeploy stops the service for as long as the new container takes to start.

**Neutral (worth knowing):**

- The plugin and the CLI reach the sponsor at `ARP_SPONSOR`, defaulting to `http://127.0.0.1:3200`.
  Until a release changes the default, a tester sets it.
- The old address stays in `ARP_DOMAIN_ATTESTORS`, so the categories and tags it filed for the
  service stay in ARP's index.

## References

- Related rule: `.claude/rules/security.md` (the signing table, operational security)
- Related ADRs: `0089` §3 (key files), `0092`, `0094`, `0110`, `0116`, `0123`, `0124`, `0144`
- Deployment: `apps/web/DEPLOY.md`, "The sponsor"
- Task: `docs/tasks/78-the-sponsor-hosted.md`
