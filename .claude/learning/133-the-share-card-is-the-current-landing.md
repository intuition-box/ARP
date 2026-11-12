# 133 — The share card is the current landing

**Task:** `docs/tasks/145-the-share-card-is-the-current-landing.md`
**Completed:** 2026-11-12
**Commit:** `301545e4`, `17f4f738` (branch `chore/og-image` on `dev` `da6b5da8`)
**Verifier verdict:** PASS (round 2)

## What shipped

- `scripts/build/og-image.ts`: captures the built landing's top at 1200×630 over the DevTools Protocol (the same pattern as `scripts/measure/landing-fit.ts`, no new dependency). Chrome comes from `ARP_CHROME`, else Playwright's cached chromium-1140 under `/root` or the home directory. It forces reduced motion and removes its profile directory when it finishes.
- `apps/web/public/og.png`: a fresh capture, 144,777 bytes, replacing the 156,205-byte screenshot from 2026-11-09 (`c3833be0`). The live file was still the old one when verified (cmp).
- `scripts/test/og-image.test.ts`: tests the card size and the browser lookup order (3 tests).

## Surprises

- The capture is deterministic: rerun against `vite preview` of the same build, it came out byte-identical to the committed file.
- `og:image` and `twitter:image` are not in `apps/web/index.html`. `transformIndexHtml` in `apps/web/vite.config.ts:93` writes them into the built page, and only when `VITE_SITE_URL` is set. Round 1 failed because of a citation to the source `index.html`.

## Decisions made

- **A capture, not a designed card**: the user's choice. No ADR.
- **The card shows the sample LINES rows** (the ADR `0152` §6 amendment) while testnet has no line. A capture taken later shows real lines.

## Rules touched

- `.claude/rules/claims.md`: sufficient. Check 3 (cite the right file and line) caught the `index.html` citation.
- `.claude/rules/code.md`: sufficient.

## Suggestions for future tasks

- Before citing where a built page gets a tag, grep `vite.config.ts` as well as the source HTML.
- Rerun `scripts/build/og-image.ts` whenever the landing's top changes. After deploy, refetch with LinkedIn's and Facebook's debuggers.

## Evidence ladder

No column and no tier. The share card is how the site presents itself, made at the user's request on 2026-11-12. It puts no evidence on the ladder and moves ARP up nothing. The user's request is the review `workflow.md` asks of a task that names no tier.
