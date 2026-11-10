# Task 115 — The HOL adapter: a usage score HOL can read, and "will it work here"

**Status:** A and B done 2026-11-10, verified (`.claude/learning/104-the-hol-adapter.md`, commits `0d89014`, `9928180`, `98b5c83`) (below, "What was built"); C, D, E after the user's return. Run by this session (the user: « un plan pour HOL c'est toi »).
**ADR:** one for deliverable C (a new level on a line), not before. A and B need none if they stay inside
the shapes below.
**Rules:** `code.md`, `workflow.md`, `claims.md`, `portability.md`. `feedback_hook_cli_gates`: touching the
CLI or the hook runs `apps/cli` tests and `check:node`.
**Required skills:** `arp-contributing`.

## Why

HOL Guard scores skills with the HCS-28 baseline (`hashgraph-online/hol-guard`,
`docs/trust/skill-trust-local.md`, read 2026-11-10): publication, metadata, upvotes, a scan, repository
health. Nothing in it says whether a skill did the job when agents used it. ARP's lines do. The adapter
sheet is written (`outreach/drafts/hol-arp-usage-adapter-2026-11-10.md` in `Wieedze/ARP-business-dev`).
The user chose to arrive with something that runs rather than a sheet alone (2026-11-10).

## Deliverables

### A. The adapter output, computed (before 2026-11-12)

- `packages/protocol/src/arp-usage.ts`: a pure function from the skill-lines feed (`arp.skill-lines/1`) to one
  record per skill, in the sheet's shape: `arp-usage.score` or no output, plus `n`, `W`, `F`, `confidence`
  and `needs` as metadata. Rules exactly as the sheet: drop `arp_test`, latest outcome per wallet, a
  `missing-key` / `missing-program` / `missing-file` failure not counted, silent below 3 wallets,
  `rate = (W+1)/(n+2)`, `confidence = 1 - exp(-n/20)`, `score = 100·(0.5 + confidence·(rate − 0.5))`,
  rounded to 2 decimals, clamped to `[0,100]`.
- `scripts/build/build-arp-usage-feed.ts` writes `apps/web/public/feeds/arp-usage.json` (schema
  `arp.usage/1`), keyed by the subject mapping in the sheet (`repo`, `skill`, `atom_id`, `url`).
- Tests: every rule above, including a wallet that repeats itself, a missing-key failure, and n = 2 → no output.

### B. `arp check <skill>`: will it work here (before 2026-11-12)

Task 86's deliverable 1, reduced to a skill (no "need in words" form):

- Read-only, no wallet, no key, nothing written. Prints what the skill's files mention
  (`skillInstallReport`, already exported), the lines about it with their outcomes, and **what others
  needed** (`by_need`) checked against this machine: a program on `PATH`, an environment variable **set
  or not** (its value is never printed or returned). One line each: `ffmpeg: missing here`, `OPENAI_API_KEY: set`.
- Nothing about the machine leaves it (`feedback_never_collect_user_text`).
- Tests: a fixture skill whose lines need a program absent from a fake `PATH`, and one present.

### C. A version on the line (decided 2026-11-10, ADR `0185`; code after the user's return)

`FUTURE.md`, "One score per version of a skill": the directory digest the content receipt computes,
carried by the line, a score per digest. Needs the user's decision on the new level.

### D. An answer on Sybil (done 2026-11-10, in the sheet)

Section "Several wallets, one person" of the adapter sheet (business-dev `9614589`): what bounds a
writer today (one wallet one vote, three wallets, a slow score, attribution), what does not (a free key,
agreeing ~50× cheaper than writing on 13579 per ADR `0138`, receipts proving two keys), and what would,
cheapest first (the reader weighs the writer with HOL's own identity adapters, a paid line counts more,
registered agents only). The score figures are `arpUsageScore`'s: 3 → 54.18, 10 → 66.39, 20 → 78.73,
50 → 94.13. Prose only, no code.

### E. Contact (after the user's return)

The hol-guard issue and the message from the business-dev draft, with the A feed's URL and a recorded
`arp check` run. The user posts; nothing is posted from here.

## What was built, 2026-11-10

- **A.** `packages/protocol/src/arp-usage.ts` (`buildArpUsageFeed`, `arpUsageScore`), exported from the core
  index; `scripts/build/build-arp-usage-feed.ts` reads the skill lines feed file, no network; output
  `apps/web/public/feeds/arp-usage.json`, schema `arp.usage/1`. Built once from the skill lines snapshot of
  2026-11-10T10:44:54Z: 10 skills, **0 with a score**, because all 10 lines are ARP's own tests
  (`arp_test`), which the rule drops. `packages/protocol/test/arp-usage.test.ts`, 11 tests (a need counted by distinct wallets added after the first verification).
- **B.** `apps/cli/src/check.ts`, `arp check` in `cli.ts`. Beyond the plan, one addition inside the same
  read: the programs and variables **the skill's own files name** (`contains.programs`,
  `contains.settings`) are checked too, so the block says something before any line exists. Live,
  2026-11-10, with `GITHUB_TOKEN`: `anthropics/skills/pptx` → `markitdown: missing here`,
  `pdftoppm: found on PATH`, both named in its files, one `worked` line; `softaworks/agent-toolkit/
  web-to-markdown` → `web2md: missing here`, one `failed · missing-program` line, which names no program.
  Without a token, GitHub's hourly limit was hit and the block said so. `apps/cli/test/check.test.ts`,
  5 tests. `packaging/claude/arp/bin/arp.js` regenerated (`bun run packages`).

**Gates, 2026-11-10:** `packages/protocol` `bun run test` 1364 passed, 4 skipped; `tsc` clean;
`check:scripts` exit 0 (`scripts/**/*.ts`); `apps/cli` `bun test` 79 passed after `bun run packages`,
`lint` (tsc) clean; `check:node` PASS.

## Do not do in this task

- Publish anything, post on GitHub, or contact anyone.
- Write on chain. Mainnet.
- Change how `arp_pulse` scores. `arp-usage` is HOL's rule proposal, beside ARP's own score.
- Read an environment variable's value in `arp check`.

## Verification

`bun run test` in `packages/protocol` and `apps/cli`, `check:node`, `check:scripts`; the feed built once and
its figures re-derived by hand on one skill. Then `task-verifier`.

**Evidence ladder:** skill column, declared tier. It does not move ARP up: it makes the declared tier
readable by a third party, and B is the first use of a failure reason for the person reading it.
