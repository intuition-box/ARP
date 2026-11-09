# Task 74 — The public site, and everything around it

**Status:** started 2026-11-09. Testnet 13579 for the whole test phase.
**Decisions, the user's, 2026-11-09:** host the web app on the user's Coolify, with his domain; legal notice as an individual; ARP's own test identities and their lines hidden through a public list, with a clear empty state; the hosted site on testnet only; fonts served by the site, not Google; and say plainly that an agent reaches for ARP when ARP is named (« il faudra notifier que ARP a besoin d'être nommé pour que le tool soit appelé »).
**Audits it answers:** the repository, what people install, and the web app, 2026-11-09 (reports kept outside the repository).
**Rules:** `code.md`, `ui.md`, `claims.md`, `workflow.md`, `security.md` for the CLI part.
**Reviewers:** `ui-reviewer`, `task-verifier`.

## Three parts, three owners, no shared file

| Part | Files | What |
| --- | --- | --- |
| A, the site | `apps/web/**` | test identities hidden by a public list and empty states; testnet only; self-hosted fonts; onboarding that works for a stranger; 404; every page reachable; footer; meta, robots, sitemap; legal pages; `/docs` pages rendering `docs/guide/`; a Dockerfile and server config Coolify runs, with the SPA fallback |
| B, the guides | `docs/guide/**` | `getting-started.md`, `how-it-works.md`, `testers.md`, `developers.md`, `uninstall.md` |
| C, the package and repository | `apps/cli/**`, `apps/mcp/**`, `packages/**`, `packaging/**`, `.claude-plugin/**`, `README.md`, `LICENSE`, `NOTICE` files, `docs/01`, `docs/12`, `docs/22`, `docs/30`, `docs/31`, `.gitignore`, `.claude/settings.json`, `.env.example` | the audits' fixes outside the site |

**Part B, as it landed (2026-11-09):** task 72 already wrote the site's pages, each the only copy of its text in `apps/web/public/docs/`. Its `quickstart.md`, `overview.md` and `concepts.md` cover what `getting-started.md` and `how-it-works.md` were to say, so those two were not written. `testers.md`, `uninstall.md` and `developers.md` were written here and handed to task 72's pages; `docs/guide/` was then removed so no second copy survives.

## What is never written here

The user's name, address or e-mail, and the host's identity: the legal pages hold visible placeholders until the user gives them, and the site is not put online before.

## Evidence ladder

None directly: it makes the test round possible, which is the only way a third party's line, and so tier 3, can happen.
