# 119 — A hosted content server

**Task:** `docs/tasks/131-a-hosted-content-server.md`
**Completed:** 2026-11-11 (built and verified; not deployed)
**Commit:** `493a5725` on `0140b158`, branch `feat/131-hosted-content-server`, rebased on `a956c58a`
**Verifier verdict:** PASS (second pass; the first failed on three stale doc copies)

## What shipped

- `apps/mcp/src/content-server.ts` — `GET /content/:atomId` and `GET /` only; key from `ARP_RECEIPT_KEY_FILE` (64 hex, with or without `0x`); refuses `ARP_RECEIPT_KEY`, `ARP_AGENT_PRIVATE_KEY`, any target but testnet, any `Host` but its own and loopback
- `apps/mcp/Dockerfile.content`, `Dockerfile.content.dockerignore` (allowlist), `content-entrypoint.sh` — copies a key file that is not mode 600 and owned by uid 1000 to `/dev/shm`, as the sponsor's does
- `apps/mcp/src/config.ts`, `apps/cli/package.json`, `apps/cli/scripts/packages.ts` — `ARP_CONTENT` defaults to `config.contentDefault` (`https://content.arp.intuition.box`), inlined at build; loopback from a checkout. No version bump; CHANGELOG "0.0.6 — unreleased"
- `apps/mcp/test/content-server.test.ts` (12), `apps/cli/test/cli.test.ts` (+1) — refusals, key shapes, routes, `/mcp` refused, foreign host refused, default inlined
- `apps/web/DEPLOY.md` "The content server" — key command (prints the address only), Coolify fields, runtime variables, `SPONSOR_CONTENT_SIGNERS` step
- Docs `22`, `31`, README, `apps/web/public/docs/*`, `security.md` signature list, ADR `0161` header

## Surprises

- The first pass left three stale copies: `docs/22:164` ("both local by default", contradicting line 380 of the same file, and already false for the sponsor since 0.0.4), `DEPLOY.md` pointing "below" to a section above, and the README's unqualified "a content server you run yourself". Check 5 again: the edit landed in the tables and missed the prose.
- `node-outbound.ts` reads source, so it cannot see a default injected at build. That was already true of the sponsor's default; `docs/22:322` now says a release replaces both loopback literals.
- One unexplained 85/1 CLI test run reported by the caller; four runs here were 86/0.

## Decisions made

- **A second hosted process with a key, not a key on the hosted MCP endpoint**, so ADR `0161` conditions 1 and 3 hold. ADR: `.claude/choices/0196-a-hosted-content-server-that-signs-receipts.md`.

## Rules touched

- `.claude/rules/security.md` — signature list amended (content receipt now also signed by the hosted content server); accurate.
- `.claude/rules/claims.md` — sufficient; check 5 caught the stale copies.

## Suggestions for future tasks

- When a default changes, grep the old value **and** the adjective describing it ("local by default", "run yourself"), not only the literal.
- The deploy (user) and the end-to-end check from a clean container after 0.0.6 remain; this post-mortem verifies the build, not a live endpoint.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, observed tier: the content receipt is a second party's signature that a skill was served to an agent, and this makes it obtainable off the user's machine, so it moves ARP up once deployed and 0.0.6 ships.
