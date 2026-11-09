# 65 — The public site, and everything around it

**Task:** `docs/tasks/74-the-public-site.md`
**Completed:** 2026-11-09
**Commit:** `19d4cb4` on `release/72-74` (not pushed; task 73 merged in at `fa05dc0`)
**Verifier verdict:** PASS (round 3)

## What shipped

- `apps/web/src/services/test-identities.ts`, `apps/web/src/data/arp-test-identities.json`, `pages/TestIdentitiesPage.tsx` — ARP's own test agents (1–38 on 13579) and wallets hidden through one public list; a failed read of the test atoms fails the read it filters
- `apps/web` — testnet only unless `VITE_ALLOW_MAINNET=1`, self-hosted Archivo and Geist Mono, meta, robots, sitemap, 404, footer, legal pages in French with visible placeholders, onboarding for a stranger, Dockerfile with the SPA fallback for Coolify
- `apps/web/public/docs/{testers,uninstall,developers}.md` — the guides, one copy each; `docs/guide/` removed, README links to them
- `packages/graphql/src/queries/same-as-subjects.ts` — the test-identity join as a generic query, read through the shared transport
- `scripts/build/build-skill-facts.ts`, `build-skill-requires.ts`, `scripts/measure/skill-requires.ts` — ARP's skill known under `intuition-box/ARP` and `Wieedze/ARP`; data and packaging regenerated
- Part C: `.env.example`, `.gitignore`, `.claude/settings.json` untracked, MCP mode and tool-description fixes

## Surprises

- Three verifier rounds. Round 1: `docs/guide/` duplicated the site's pages and disagreed with them; the repository move left ARP's own skill unknown under its new label. Round 2: the one GraphQL read written in `apps/web` hand-rolled its own query and transport, outside `packages/graphql` (ADR `0082`).
- `check:contrast` caught `--color-grey` on list markers in body prose; steel instead.

## Decisions made

- **Hide test identities by a public list, not by deletion** — user decision 2026-11-09; the list is served on `/test-identities` so a visitor reads what the filter reads.
- **Held by, not signed by** — a sponsor-signed deposit in a tester's name stays visible (ADR `0144`).
- **Part B partially absorbed by task 72's pages** — `getting-started.md` and `how-it-works.md` not written; recorded in the task file.

## Rules touched

- `.claude/rules/code.md`, `ui.md`, `claims.md`, `workflow.md` — sufficient.
- ADR `0082` — sufficient, but only the directory map in `CLAUDE.md` states "every query document"; the round-2 failure suggests an app-side check.

## Suggestions for future tasks

- Before writing a GraphQL read in an app, put the document in `packages/graphql` first; `grep -rlE "query [A-Z]" apps/*/src` should return nothing.
- When a repository is renamed, grep every generator for the old owner/repo string, not just the data.
- A task that writes guides must check whether another open task already owns that text.

## Evidence ladder

**Which tier of the evidence ladder does this serve, and does it move ARP up it?**

None directly: it makes the tester round possible, and a third party's line is the only route to tier 3 (staked, `docs/09` §3).
