# 69 — The sponsor, hosted beside the site

**Task:** `docs/tasks/78-the-sponsor-hosted.md`
**Completed:** 2026-11-09
**Commit:** uncommitted (worktree `ARP-sponsor-host`, branch `feat/78-sponsor-hosted`, on `bacb075`)
**Verifier verdict:** PASS (round 2)

## What shipped

- `apps/sponsor/Dockerfile`, `Dockerfile.dockerignore`, `docker-entrypoint.sh` — image with no key or ledger; build context is an allowlist; key mounted at run time, copied to `/dev/shm` 600 unless already 600 and owned by uid 1000.
- `apps/sponsor/src/listen.ts` (+ test) — `SPONSOR_LISTEN` / `SPONSOR_PUBLIC_HOST`, both or neither; wired in `main.ts`, which exits on SIGTERM/SIGINT.
- `packages/protocol/src/node/local-state.ts` — `lockFile` takes over a lock naming its own pid that this process did not take (container pid 1 after a hard stop).
- Line payers read `arp.deployer` and `arp.sponsor` (web `use-pulse.ts`, MCP `config.ts`, regenerated `packaging/`).
- `apps/web/DEPLOY.md` "The sponsor", `.env.example`, `apps/sponsor/README.md`.

## Surprises

- Round 1 failed on a denylist `.dockerignore`: `apps/api/.dev.vars` (GitHub token, refresh secret) would have entered an image built from the main checkout. The worktree had no such file, so the container test could not see it. Latent for Coolify (builds from git), live for a local build.
- A header comment claimed "every route verifies a signature"; `/gas` and `/identity` check only agent ownership and `/list-tool` takes unsigned listings. Exposing the service publicly is what made that sentence load-bearing.
- `readKeyFile` checks only `mode & 077`, not the owner; the docs had credited the service with the entrypoint's stricter check.

## Decisions made

- **A key of its own, file-mounted, balance as the bound** — ADR: `.claude/choices/0149-the-sponsor-is-hosted-with-its-own-key.md`.
- **Consistent Container Names on, one replica** — the ledger lock cannot see across pid namespaces (ADR `0149` item 3; Coolify's rolling-update page confirms the behaviour).

## Rules touched

- `.claude/rules/security.md` — sufficient; operational security covered the image, but only an allowlist enforces it.
- `.claude/rules/claims.md` — sufficient; check 6 caught the signature sentence and the key-owner wording.

## Suggestions for future tasks

- A Dockerfile build context is an allowlist from the first commit; test it by planting untracked secrets (`.dev.vars`, `.wrangler`, `*.key`) and `find`ing them in the image.
- `apps/web/Dockerfile.dockerignore` is still a denylist with the same `.dev.vars` gap; worth the same fix.
- When a localhost service goes public, re-read every comment that argues its safety, route by route.
- `HELD_HERE` is keyed by the unnormalised path string; latent with one caller (`apps/sponsor/src/ledger.ts:99`).

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: a hosted sponsor lets a tester outside ARP's machine write a declared line, the precondition for any line ARP did not write; it does not move the tier by itself.
