# Task 111 — The tester round

**Status:** plan, 2026-11-10. Nothing run. Written on the user's request after the sweep (ADR `0172`), which
folded tasks 38 and 70, the second half of 33i and task 50's walk in Desktop into this one task.
**ADR:** none yet. Phase B's sponsor address is a decision (below).
**Rules:** `workflow.md`, `claims.md`, `security.md` (phase B: the sponsor signs).

## Why

Every line on testnet 13579 with an outcome is written by ARP's own wallets (`scripts/measure/line-writers.ts`,
2026-11-09: 10 of 10). The product's claim, a record written by agents for agents, has no independent writer
yet. A tester round is the first time strangers use ARP, and the user decided it comes before any official
release or mainnet step (the user, 2026-11-06).

## What changed on 2026-11-10, and why phase A can start without hosting

- **0.0.3 is on npm** and in the official MCP Registry (task 105, `9453522`).
- **The tester page and form exist**: `apps/preview/index.html`, Tally form `laqJGN`
  (`apps/preview/README.md`). The page is published by `.github/workflows/preview-page.yml` once a repository
  admin enables GitHub Pages; `https://intuition-box.github.io/ARP/` answered 404 on 2026-11-10.
- **The testers' guide already works without the sponsor**: `apps/web/public/docs/testers.md` §"Sharing is not
  available yet" says `/arp:share-send` and `/arp:line` fail until the service is online, and asks nothing of a
  tester that needs it.
- **Tasks 98, 99 and 100 were run live** for the first time (task 108): the check before install, the
  answer at a failure (it reads Intuition's public index, not the sponsor) and the question at task end all
  work on a local install. Two defects it found are fixed on `main`.
- **Hosting is on hold**: the site, the sponsor and the MCP endpoint wait for the intuition.box admin's Coolify
  (the user, 2026-11-10); `apps/web/DEPLOY.md` is ready for them.

So the round splits in two.

## Phase A — local, now

What a tester gets with nothing hosted: the check before install (98), the search, the local failure memory,
the answer at a failure (99), the question at task end (100) and `/arp:share`'s preview.

1. **The user** enables GitHub Pages (Settings, Pages, Source: GitHub Actions) and shares the page.
2. **Who**: up to ten people from the form, chosen for spread, not volume: at least two on macOS, two on
   Windows, two on Linux; Claude Code first (the user, 2026-11-06). Desktop is out of this
   phase (`testers.md`: its extension file is not downloadable yet).
3. **The walk**, one week, as `testers.md` says. One line to add there, learned live in task 108: **a skill
   installed during a session is loaded only in the next one**; a use in the same session gets
   `Unknown skill`. (`testers.md` is not edited here: task 109, running, changes the Stop question's wording
   there. Add the line after it lands.)
4. **What a tester sends back**: GitHub issues, one per problem (the guide's list), plus, at the end, the
   output of `/arp:share` pasted into one issue, so the round sees what would have been shared.
5. **What this phase measures**, each with how it is read:
   | question | read from |
   | --- | --- |
   | does the hook record what happened, on each OS and shell | the `/arp:share` previews and the issues |
   | does the check before install show what mattered | the issues, by the guide's second item |
   | does the agent use ARP when the person names it, and not otherwise | the issues, third item |
   | does the hook capture another runtime's payload (33i, second half) | `arp hook --capture` files a tester sends, redacted, only on their choice |
   | does uninstall leave nothing behind | the issue the guide's step 5 asks for |
6. **Done when** the issues are triaged: each one fixed, refused with a reason, or moved to `FUTURE.md`.

## Phase B — lines, once a sponsor is reachable

The only measure that moves ARP up the ladder: **do testers write lines?** (the user,
2026-11-09). Read with `bun run scripts/measure/line-writers.ts` on 13579, before and after.

- **Needs** a sponsor testers can reach, at the address the plugin's `ARP_SPONSOR` points to.
- **Decision for the user**, not taken here: wait for the intuition.box Coolify, or run the sponsor on the
  user's machine behind a tunnel for the round, on testnet 13579 only, with the daily budget and caps of
  `apps/web/DEPLOY.md` §"What bounds a loss". The second starts phase B now; it makes the user's machine a
  public endpoint for the round, and the key file stays on it. The hosted key `0x7793…7ec9` held
  10.4 tTRUST on 2026-11-10 (read by `eth_getBalance` on `https://testnet.rpc.intuition.systems/http`).
- **The corroborated tier** (`docs/32`): at least 3 wallets not ARP's on one skill, same outcome, same domain.
  Report the count whatever it is; with ten testers, zero is a likely and useful answer.

## Do not do in this task

- Start phase B's tunnel without the user's decision.
- Collect anything from testers beyond what they send themselves (the user, 2026-11-09).
- Mark any tester line as a test: testnet lines need no marking (the user, 2026-11-05).
- Publish anything new on npm or GitHub releases: 0.0.3 is the round's version.

## Evidence ladder

Skill column. Phase A serves the observed tier: the hook's records on machines that are not ARP's. Phase B is
the first chance at the corroborated tier, which no column has reached. This task moves ARP up only if
testers write lines; phase A alone checks that what they would write is right.
