# Task 72 — The docs on the site

**Status:** in progress, 2026-11-09.
**Decision:** the user, 2026-11-09: « une documentation solide et compréhensible de tout ce qui existe avec ARP sur le site ; copiable pour un agent ; des schémas qui expliquent tout ça ». In English, like the rest of the site (the user's answer, same day).
**Rules:** `code.md`, `ui.md`, `claims.md`, `workflow.md`.
**Reviewers:** `ui-reviewer`, then `task-verifier`.

## What ships

1. A `/docs` section in `apps/web`: a sidebar of pages, each rendered from one Markdown file.
2. **One source per page**: `apps/web/public/docs/<slug>.md`. The page renders it; the same file is served raw at `/docs/<slug>.md`, so an agent reads exactly what a person reads.
3. **Copyable for an agent**: a "Copy as Markdown" button on every page, a raw link, and `/llms.txt` (the index) and `/llms-full.txt` (every page in one file), generated from the same files at build and in dev.
4. **Diagrams** as Mermaid blocks inside the Markdown: drawn on the page in the site's tokens, and left as text for an agent, which reads Mermaid.
5. A "Docs" link in the nav.

## Do not do in this task

- No new claim that is not checked against the code or a committed script (`claims.md`).
- No internal reasoning on the public pages: no ADR numbers, task numbers or `docs/NN` references. The repository keeps those.
- No hosting or domain work.

## Dependencies added

`react-markdown`, `remark-gfm` (GitHub tables) and `mermaid`. All three load only on `/docs`; Mermaid only when a page has a diagram. Their sizes are in the completion note.

## Completion note, 2026-11-09

Done on `feat/72-docs`, not committed (the user has not asked yet). `ui-reviewer` FAIL then fixed, two fact-checks over all 18 pages applied (48 findings), `task-verifier` PASS on round 2. Post-mortem `.claude/learning/63-the-docs.md`.

18 pages: the 15 written here, and `testers`, `uninstall`, `developers` from the public-site session, adapted. The pages describe the MCP tool sets as fixed in `acfe6f8` on `feat/agent-pulse` (desktop and sponsored serve 7 tools): merge that branch before or with this one.

Sizes, from `bun run build` on 2026-11-09, gzip not counted. All of it loads only on `/docs`:

| chunk | size | loads when |
| --- | --- | --- |
| `DocsPage` (react-markdown, remark-gfm, the page) | 172.64 kB | any docs page |
| `mermaid.core` + `mermaid-parser.core` | 35.0 + 16.6 kB | a page with a diagram |
| `flowDiagram` + `dagre` (two chunks) | 0.6 + 11.0 + 36.9 kB | a flowchart |
| `sequenceDiagram` | 115.9 kB | a sequence diagram |

Mermaid's other chunks (`katex` 258.9 kB, `cytoscape` 435.7 kB and the rest) are emitted but loaded only by diagram types these pages do not use. Mermaid is not in the entry chunk (`task-verifier`, round 1).
