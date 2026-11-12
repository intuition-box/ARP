# Task 145 — The share card is the current landing

**Status:** done 2026-11-12, branch `chore/og-image`, written by arp-97. Task 145, post-mortem `133`, no
ADR, allocated by the orchestrator.
**Rules:** `code.md`, `ui.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`.

## Why

The user, 2026-11-12: a shared link to the site still shows the old site. `og:image` and `twitter:image`,
written into the built page by `apps/web/vite.config.ts:93` from `VITE_SITE_URL`, name
`https://arp.intuition.box/og.png` on the live site; the live file is byte-identical to
`apps/web/public/og.png`, a screenshot added once on 2026-11-09 (`c3833be0`) and never redone. It shows
the landing of that day: another title, "TESTNET · TEST MONEY", "Pulse · 0 on testnet". Not a cache. Of two
options (a fresh capture of the landing's top, or a fixed designed card) the user chose the capture.

## What changes

- `scripts/build/og-image.ts`: captures the built landing's top at 1200×630 into `apps/web/public/og.png`.
  It drives Chromium over the DevTools Protocol with `fetch` and a `WebSocket`, as
  `scripts/measure/landing-fit.ts` does, so no dependency is added. The browser is `ARP_CHROME`, else
  Playwright's cached `chromium-1140` under `/root` or the home. Reduced motion is forced, so the first
  scene is at its end state.
- `apps/web/public/og.png`: redone from `dev` `da6b5da8`'s built site, 144,777 bytes.
- `scripts/test/og-image.test.ts`: the size and the browser's lookup.

## What the card shows

The landing as it renders with no line on testnet: its title, "Open the tool index", the nav, and the
"LINES" card with the design reference's sample rows ("agent 1 · hyperframes · video"…), which the
landing shows while the chain has no line (ADR `0152` §6 amendment). A capture taken after real lines
exist will show them instead.

## Checked

- Run against `vite preview` of `dev`'s build: the card was read back and shows the current title and nav.
- `bun test ./scripts/test/og-image.test.ts` 3 pass; root `bun run check` (scripts typecheck, tokens,
  contrast); web tests 1447.

## Evidence ladder

No column and no tier: the share card is the site's presentation, done at the user's request on
2026-11-12; it puts no evidence on the ladder and moves ARP up nothing. The user's request is the review
`workflow.md` asks of a task that names no tier.

## After deploy

Share previews cache the image: LinkedIn's Post Inspector and Facebook's Sharing Debugger refetch on
demand; X and Discord pick it up on their own over days.
