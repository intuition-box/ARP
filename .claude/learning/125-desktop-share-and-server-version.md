# 125 — Desktop's share setting stops overwriting, and the server names its version

**Task:** `docs/tasks/137-desktop-share-and-server-version.md`
**Completed:** 2026-11-11
**Commit:** uncommitted (on top of `af27f507`)
**Verifier verdict:** PASS

## What shipped

- `apps/mcp/src/share-ask.ts` — `applyDesktopShare` writes `sharing.json` only with no choice on file, a `how: desktop` choice, or a checkbox changed since last start; last value kept in `~/.arp/desktop-share.json`.
- `apps/mcp/src/config.ts`, `server.ts` — `SERVER_VERSION` (`ARP_PACKAGE_VERSION`, else `source`) replaces the hard-coded `0.2.0`.
- `apps/cli/package.json` build script and `apps/cli/scripts/packages.ts` — inline `version` like `sponsorDefault`/`contentDefault` (ADR `0175`); `packaging/claude/arp/bin/arp.js` regenerated (`SERVER_VERSION = "0.0.6"`).
- Tests: `apps/mcp/test/share-ask.test.ts` (5 cases), `apps/mcp/test/server.test.ts` (`source`), `apps/cli/test/mcpb.test.ts` (bundle under Node: version and on/unchanged/changed sequence), `apps/cli/test/cli.test.ts` (`dist/cli.js mcp`).
- Docs: `docs/22`, `apps/web/public/docs/uninstall.md`, `local-memory.md`, `apps/cli/CHANGELOG.md` (Unreleased), task 135 note, `STATE.md` row 137.

## Surprises

- The `0.2.0` was invisible to every test: `server.test.ts` used `toMatchObject({name})`, so the field was never asserted. Now `toEqual`.

## Decisions made

- **Unseen checkbox = manifest default (unticked)** — with no `desktop-share.json`, an unticked box over a Claude Code choice changes nothing, and a first tick turns sharing on even over "no". Recorded in the task file; no ADR.

## Rules touched

- `.claude/rules/code.md` — sufficient (the `as` casts carry their comment).
- `.claude/rules/claims.md` — sufficient; the version claim is checked against the built bundle, not source.

## Suggestions for future tasks

- When a build inlines a value, assert it from the built artifact (bundle or `.mcpb`), never only from source.
- Two writers to one shared file (`~/.arp/sharing.json`): give each a record of what it last wrote, rather than a precedence rule.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, observed tier: the share fix stops Desktop from silently reverting a machine's choice to publish its observed skill outcomes, so lines Claude Code was set to write keep being written; the version fix is hygiene that names the release behind a line or a report, and does not move ARP up the ladder by itself.
