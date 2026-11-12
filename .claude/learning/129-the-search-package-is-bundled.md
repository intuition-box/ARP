# 129 — The search package is bundled, so `arp_pulse` searches in Claude Desktop

**Task:** `docs/tasks/141-the-search-package-is-bundled.md`
**Completed:** 2026-11-12
**Commit:** `6be1d4b8` on `feat/pulse-vendored-search` (after `dfd45832`)
**Verifier verdict:** PASS (second round; the first failed on the record, not the code)

## What shipped

- `apps/cli/package.json` — `skills` 1.7.6 as an exact devDependency; `build` bundles it to `dist/skills-cli.js` and writes `dist/skills-cli.LICENSE.txt`.
- `apps/cli/scripts/vendor-licenses.ts` + test — the eight bundled packages' licences, and the eight versions asserted.
- `apps/cli/scripts/packages.ts`, `mcpb.ts` — the bundle and its licence in the plugin's `bin/` and the `.mcpb`'s `server/`.
- `apps/mcp/src/handlers/pulse.ts` — `vendoredSearchCli`, `searchLabel`, the vendored `searchInvocation`; `canSearch` allows the key-keeping modes only with the bundle.
- `apps/cli/scripts/check-node.sh` — the plugin's search must run the bundle, not `npx`.
- ADR `0201`; `docs/22`, `mcp-tools.md`, `skills/arp/SKILL.md`, CHANGELOG; amendment notes on ADRs `0134` and `0144`.

## Surprises

- The bundled CLI reads `../package.json` beside itself as its version, so inside ARP's npm package it reports ARP's 0.0.6. Bundling "unmodified" still changes behaviour once the file is moved.
- The rule being amended lived in ADR `0134` point 5 (written there by `ada72614`), not only in a commit. The first draft amended the commit and left the ADR stating the old rule.
- Bun reports no branch coverage, so a "90% branches" gate cannot be met with `bun test` alone.

## Decisions made

- **Bundle the official CLI rather than call skills.sh's API or drop `arp_pulse` from Desktop** — the user's choice; `robots.txt` disallows `/api/`. ADR: `.claude/choices/0201-the-search-package-is-bundled-and-runs-beside-the-key.md`.
- **Commit the bundle under `packaging/`** — the plugin installs from the repository; `apps/cli/dist` stays ignored.

## Rules touched

- `.claude/rules/claims.md` — sufficient; check 5 caught three stale sites (`tools.ts:707`, ADR `0134`, ADR `0144`) and a misplaced JSDoc.
- `.claude/rules/security.md` — sufficient; the residual risk (bundled code can read `~/.arp/agent-key` by absolute path) is in ADR `0201`'s Negative section.

## Suggestions for future tasks

- When a decision is amended, grep the ADRs for its sentence, not just the commit that introduced it.
- A size figure in a task file is taken after the last text change, or it drifts (4,078,684 → 4,079,030 across one round).
- A trace of a third-party CLI should hook `child_process` and `dns` too, not only `fetch` and sockets; here it showed none.
- Task file's gate line still says `apps/cli` 89 tests; it is 90 after the version-pin test.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, observed tier: `arp_pulse` is where an agent reads what others recorded about a skill and where a person sees a skill's contents before installing, and making it work in Claude Desktop puts that read before a new population, which feeds observed and corroborated lines without by itself moving a tier.
