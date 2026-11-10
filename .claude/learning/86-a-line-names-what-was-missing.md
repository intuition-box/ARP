# 86 — A line names what was missing, and what made it work

**Task:** `docs/tasks/97-a-line-names-what-was-missing.md`
**Completed:** 2026-11-10
**Commit:** `225dfb1`, `15dff86`, `3a9b101`, `23b0bf8`, `89b5890`, `dd99149` on `worktree-agent-a16676273d265c55d`
**Verifier verdict:** PASS (first pass)

## What shipped

- `packages/protocol/src/declare/line-need.ts` — the guard: program `^[a-z0-9][a-z0-9._+-]{0,39}$`, variable name `^[A-Z][A-Z0-9_]{2,63}$`, published only when the skill's SKILL.md names it whole (`publishableNeed`, `namedInSkill`); pure, imported by path from the hook.
- `packages/protocol/src/declare/usage-context.ts` — `needTripleId`: `(T4, needs, name)` on missing-program/missing-key, `(T3, with, name)` on worked; shape refusal `need_shape`.
- `packages/protocol/src/sponsor/line.ts` — line request EIP-712 version 4 signs `need`; v3 no longer verifies; `need` never beside a payment. Desktop loop signs it in the same commit (`15dff86`).
- `apps/sponsor/src/github.ts`, `routes/line.ts` — `skillMarkdownOnGitHub` (tree at `HEAD`, content server's rule, 512 KB, 10 min cache); `checkNeed` refuses the whole request (422 `need`, 503 when GitHub is down) before spending; nonce checked before the GitHub read.
- `apps/hook/src/skill-failure.ts` — `needOf` extracts the name from the error wording, takes a path's last part, keeps it in `failures.jsonl` only if the guard passes.
- `packages/protocol/src/local-failures.ts`, `share-failures.ts`, `apps/cli/src/share.ts`, `cli.ts`, `apps/mcp/src/line.ts` — `arp share` shows and sends `need`; `arp line --needs/--with`.
- `packages/protocol/src/pulse-usage.ts`, `apps/mcp/src/handlers/pulse.ts` — levels read per wallet, `by_need`/`by_with`; no score change.
- `scripts/measure/need-level-cost.ts` — 13579 costs and predicate existence.
- Docs: ADR `0166`, `docs/28`, `docs/32`, `security.md` signing-site entry, `FUTURE.md`, `apps/web/public/docs/lines.md` and `cli.md`.

## Surprises

- `with` already existed on 13579 as a TextObject atom; `needs` did not, and `Needs`/`requires` are different atoms (ids differ by case or by IPFS URI). Checking the chain before choosing the word mattered.
- The reviewer's remark that `arp share` did not send `need` was wrong: `SharedLine` carries it and `writeLineHere` takes it as `LineInput`. A reviewer reading types in isolation can miss a structural pass-through; the share test (`apps/cli/test/share.test.ts:97`) is what settles it.

## Decisions made

- **Plain-string predicates `needs` and `with`** — same pattern as `has outcome`, `because`. ADR: `.claude/choices/0166-a-line-names-what-was-missing-and-what-made-it-work.md`.
- **The guard is "the skill's SKILL.md names it"**, applied at the hook, the CLI (shape only) and the sponsor — a word the author already published, never one from the user's machine. Same ADR.
- **A refused name refuses the line, not just the level** — the agent signed it; writing a different line would be the service's sentence. Same ADR.

## Rules touched

- `.claude/rules/security.md` — updated in place (line request v4 in the signing-site entry); site count unchanged.
- `.claude/rules/claims.md` — sufficient; every copy of the line shape (`docs/28`, `docs/32`, `lines.md`, `usage-context.ts`) and of the request version was updated. Older ADRs and post-mortems naming v3 are append-only record.
- `.claude/rules/code.md` — sufficient; the one non-test `as` (GitHub tree JSON) carries its comment.

## Suggestions for future tasks

- The hook reads the installed SKILL.md and the sponsor reads `HEAD`; a skill that drops a name between the two refuses a shared line. Watch for it in the tester round.
- The direct path (`arp_declare_used`) cannot write `needs` yet — FUTURE.md, task 97 section.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column: the name comes from a runtime record the person did not type (the hook's error read, checked against the skill's own file) but is published as the agent's declared line, so it does not lift a line's tier by itself; it makes lines name the same atom, so three wallets saying `needs ffmpeg` can be counted per wallet (`by_need`) toward corroborated.
