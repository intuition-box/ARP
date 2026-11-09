# Task 85 — The docs have no Limits page

**Status:** built 2026-11-09 on `docs/85-no-limits-page` (worktree `../ARP-tree`), not pushed.
**Rules:** `claims.md`, `workflow.md`. Docs only.

## The user's request, 2026-11-09

« dans doc j'aimerais enlever les limits »: the site's docs lose their Limits page.

## What changed

- `apps/web/public/docs/limits.md` removed, and its entry in `apps/web/src/docs/manifest.ts`.
- The four links to it, in `overview.md`, `architecture.md`, `networks.md`, `no-install.md`, removed; each
  sentence still reads whole.

## What stays

- The disclosure `docs/30` requires, "no third party has reported a result on a skill yet", is in
  `README.md:12` and `apps/web/public/docs/overview.md:14`, untouched.
- The legal page's "Known limits" (`apps/web/src/services/legal.ts`) is a legal notice, not the docs page,
  and is not changed.
