# 0175 — The CLI's sponsor default is a committed build setting; the registry name is the user's namespace

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/105-cli-0.0.3.md`; the namespace decided by the coordinating session on the
user's delegation, 2026-11-10

## Context

Two choices in preparing `@arp-protocol/cli` 0.0.3.

1. **The sponsoring service's default address.** `apps/mcp/src/config.ts` defaulted `ARP_SPONSOR` to
   `http://127.0.0.1:3200`. Once the sponsor is hosted on Coolify (ADR `0149`), a published CLI should
   reach it without each tester setting `ARP_SPONSOR`, and the user should set it without editing code.
   The value is bundled into two artefacts: `apps/cli/dist` (what npm ships, built by `package.json`'s
   `build`) and `packaging/claude/arp/bin/arp.js` (what the plugin ships, built by `scripts/packages.ts`
   and guarded by `packages --check`).
2. **The MCP Registry name.** Task 102 wrote `io.github.intuition-box/arp` in `server.json`. Publishing
   under `io.github.<org>/*` needs an owner of that org, and the user (GitHub login `Wieedze`) is a member,
   not an owner, of `intuition-box`. The registry's interactive `login github` cannot grant an org namespace
   today either (its `docs/modelcontextprotocol-io/authentication.mdx`, issue #1468).

## Decision

1. The default lives in `apps/cli/package.json` as `config.sponsorDefault`, empty today. Both builds inline
   it as `process.env.ARP_SPONSOR_DEFAULT`: `build` with `ARP_SPONSOR_DEFAULT=$npm_package_config_sponsorDefault
   bun build --env 'ARP_SPONSOR_DEFAULT*'`, `packages.ts` with `Bun.build`'s `define`. Empty falls back to the
   loopback. `ARP_SPONSOR` still overrides at run time. The user's step, once he has the URL, is one
   command: `npm pkg set config.sponsorDefault=https://<host> --prefix apps/cli`, then regenerate
   `packaging/` and commit both.
2. `mcpName` in `apps/cli/package.json` and `name` in `server.json` are `io.github.Wieedze/arp`, case as the
   login has it: the registry builds the grant as `io.github.<login>/*` from GitHub's own `login`, with no
   case folding, and matches names by exact prefix (`internal/api/handlers/v0/auth/github_at.go`
   `buildPermissions`, `internal/auth/jwt.go` `isResourceMatch`, read 2026-11-10 at `main`).

## Alternatives considered

- **An environment variable read at bundle time only** (`ARP_SPONSOR_DEFAULT=… bun run build`) — what the
  task proposed first. Tried and dropped: the committed `packaging/bin/arp.js` must carry the hosted URL for
  plugin installs from GitHub, and then every later `packages --check` run without the variable fails.
  A committed value keeps every gate reproducible.
- **A constant in `config.ts`** — a code edit for an operational value, which the user asked to avoid.
- **Leaving the read at run time when unset** (`bun build --env` leaves `process.env.X` in place when `X`
  is not set) — would give the bundle a second run-time name for `ARP_SPONSOR`. Both builds always define
  it, empty when unset, and a CLI test checks the bundle holds no `ARP_SPONSOR_DEFAULT`.
- **`io.github.intuition-box/arp`** — not publishable by the user (above).

## Consequences

**Positive:**
- Setting the hosted sponsor is one committed line; npm's tarball and the plugin carry the same default.
- The registry entry is publishable by the person who publishes the npm package.

**Negative:**
- Moving to an org namespace later (`io.github.intuition-box/arp`, or `com.<domain>/arp` by DNS) is a
  **new registry entry**, not a rename; the old one would be deprecated by hand, and `mcpName` changes
  with a new npm version.
- Run from source (`bun run apps/mcp/src/server.ts`), `ARP_SPONSOR_DEFAULT` is an ordinary variable. Only
  the bundles fix it.

**Neutral (worth knowing):**
- `prepublishOnly` runs `bun run build`, so `npm publish` cannot ship a `dist/` built from another tree.

## References

- Related rule: `.claude/rules/workflow.md`, `.claude/rules/claims.md`
- Related doc: `docs/tasks/102-be-read-where-agents-are.md` §2a, `apps/web/DEPLOY.md`
- Related ADR: `0149` (the hosted sponsor), `0171` (the registry listing), `0166` (`needs`/`with`)
