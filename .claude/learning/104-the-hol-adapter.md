# 104 — The HOL adapter, deliverables A and B

**Task:** `docs/tasks/115-the-hol-adapter.md` (A and B only; C, D, E wait for the user's return)
**Completed:** 2026-11-10
**Commit:** `0d89014` (A), `9928180` (B), `98b5c83` (verifier fixes)
**Verifier verdict:** PASS (second pass; first failed on two one-line items)

## What shipped

- `packages/protocol/src/arp-usage.ts` — pure `buildArpUsageFeed` / `arpUsageScore`, the sheet's rule exactly; exported from the core index
- `packages/protocol/test/arp-usage.test.ts` — 11 tests
- `scripts/build/build-arp-usage-feed.ts` — skill lines file to `apps/web/public/feeds/arp-usage.json` (`arp.usage/1`), no network; 10 skills, 0 scored (all lines `arp_test`, snapshot 2026-11-10T10:44:54Z)
- `apps/cli/src/check.ts` + `case 'check'` in `cli.ts` — read-only `arp check <skill>`; `apps/cli/test/check.test.ts`, 5 tests; CHANGELOG; `packaging/` regenerated

## Surprises

- First pass failed on: an uncommented `as unknown as typeof fetch` in a test, and a "what leaves the machine" header that omitted `GITHUB_TOKEN` being sent to GitHub. Both were the exact points the caller flagged for checking.
- `needs` metadata first counted lines, not wallets, while `arp check`'s `neededNames` counted wallets; aligned in `9170844`.

## Decisions made

- **`arp check` also checks names the skill's own files mention** (`contains.programs`, `contains.settings`) — beyond the plan, same read, recorded in the task file. No ADR.

## Rules touched

- `.claude/rules/code.md` — sufficient; the cast-comment rule applies to tests too, and is easy to miss there.
- `.claude/rules/claims.md` — sufficient; a privacy statement in a code comment must list every outbound value, credentials included.

## Suggestions for future tasks

- When a header comment says what leaves the machine, grep the file for `env[` and `fetch` and list each.
- "Value never read" is false for a set-or-not check; say "never printed or returned".
- Commit `aa4a0b2`'s message keeps "value never read"; it is committed and left as is.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: it makes declared lines readable by a third party (HOL) and puts a failure's needs in front of the reader, but every line is still its writer's word and none comes from outside ARP yet, so it does not move ARP up.
