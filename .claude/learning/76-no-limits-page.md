# 76 — The docs have no Limits page

**Task:** `docs/tasks/85-no-limits-page.md`
**Completed:** 2026-11-09
**Commit:** `ea598e4` on `docs/85-no-limits-page` (not pushed)
**Verifier verdict:** PASS

## What shipped

- `apps/web/public/docs/limits.md` — removed (47 lines).
- `apps/web/src/docs/manifest.ts` — the `limits` entry removed.
- `overview.md`, `architecture.md`, `networks.md`, `no-install.md` — one link each removed; each sentence
  still reads whole.

## Surprises

none worth recording

## Decisions made

- **Nothing from the page moved elsewhere** — `docs/30` "What may be said today" requires only the
  "no third party has reported a result on a skill" disclosure, in the README and an introduction; it is at
  `README.md:12` and `apps/web/public/docs/overview.md:14`. The other limits were the page's own choice to
  publish, not a rule's.

## Rules touched

- `.claude/rules/claims.md` — sufficient; the grep for `docs/limits` and the `limits` slug over `apps/`,
  `packages/`, `skills/`, `scripts/`, `README.md`, `docs/` found no reference left.

## Suggestions for future tasks

- Removing a page that collected caveats: check `docs/30` for the ones that must stay public before deleting.
- Some caveats now live nowhere on the site (e.g. mainnet `previewTripleCreate` "cause not established",
  the hook seeing failures only); if a reader needs one, it goes on the page it qualifies, not back on a
  limits page.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

No column or tier: a docs page removed at the user's request; it changes no signal and no position, so ARP
does not move.
