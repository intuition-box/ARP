# 63 — The docs on the site

**Task:** `docs/tasks/72-the-docs.md`
**Completed:** 2026-11-09
**Commit:** `uncommitted` (branch `feat/72-docs`)
**Verifier verdict:** PASS (second round; first round failed on one visible `docs/NN` link text)

## What shipped

- `apps/web/public/docs/*.md` — 18 pages. Each file is the only copy of its page: the site renders it and serves it raw at `/docs/<slug>.md`
- `apps/web/src/docs/manifest.ts` — the sidebar and the page order. `llms.test.ts` keeps it in step with the files
- `apps/web/src/docs/llms.ts` + `apps/web/vite.config.ts` — the plugin that serves `/llms.txt` and `/llms-full.txt` in dev and emits them at build. They are generated, never committed
- `apps/web/src/pages/DocsPage.tsx`, `apps/web/src/components/docs/` — react-markdown + remark-gfm. Mermaid loads lazily, takes its colours from `:root` and is drawn at its natural width. Copy buttons, and the contents fold on phones
- `apps/web/src/hooks/use-doc.ts`, `apps/web/src/services/docs.ts` — fetches a page and rejects the SPA's `index.html` fallback. Builds heading ids
- Tests:
  - manifest against the files, titles, `/docs` links and every `#anchor`
  - every Mermaid block parses
  - RTL tests for DocsPage, DocMarkdown and CopyButton
  - services
- `data/measurements/proof-of-work-2026-11-09T0833.json` — the measurement behind the dated claim in `limits.md`

## Surprises

- The 18 pages need a test that checks links and anchors. Without it they drift away from each other within a single session.
- Two independent fact-checks of the 18 pages against the code found 48 errors. Hand-written docs are wrong at about that rate. That is the case for `claims.md`.
- A "no docs/NN references" rule can be broken by the visible text of a link even when the link itself is legitimate. One of three links to the same file showed the filename.
- `check:tokens` does not cover token names read through `getComputedStyle` (the Mermaid theme). The verifier checked them by hand.
- The test run prints happy-dom `AbortError` stacks. They come from other test files, not from this task.

## Decisions made

- **One Markdown file per page, served raw** — the page, the "Copy as Markdown" button and an agent's fetch all get the same bytes.
- **llms files generated at build, not committed** — so the text has one copy.
- **Mermaid themed from the tokens, no accent** — a diagram is a resting state (`ui.md`).
- **The link to `docs/22` is kept, with descriptive text** — the full operator account lives only there.
- Code defects found outside the docs went to the session that owns those files, not fixed here: `apps/mcp` tool sets in desktop mode, id naming in `tools.ts`, `minDeposit` in `SKILL.md`, and the repository URL in `plugin.json`.

## Rules touched

- `.claude/rules/ui.md` — sufficient. The gap: the `check:tokens` gate does not see `token("--…")` strings, and nothing flags them either.
- `.claude/rules/claims.md` — sufficient. Each dated figure in the docs names its script.
- `.claude/rules/code.md`, `.claude/rules/workflow.md` — sufficient.

## Suggestions for future tasks

- Any change to a feature named in `apps/web/public/docs/` updates the page in the same commit. The anchor and link tests catch structure, not facts.
- For a public page, grep the rendered text, not only the URLs, for `docs/[0-9]`, `ADR` and `task [0-9]`.
- Set the Mermaid theme with one token-name list that a test can check against `index.css`.

## Evidence ladder

**Which tier of the evidence ladder does this serve, and does it move ARP up it?**

It serves the honesty of the "asserted" tier and does not move ARP up on its own. It explains lines, score and support to testers so that third parties can write the first lines, which is what would move ARP to "staked".
