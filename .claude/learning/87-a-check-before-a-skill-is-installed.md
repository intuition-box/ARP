# 87 — a check before a skill is installed

**Task:** `docs/tasks/98-a-check-before-a-skill-is-installed.md`
**Completed:** 2026-11-10
**Commit:** `99be2ce`, `a6a3395`, `f667f78` on `feat/98-check-before-install` (over `main` `bbd1040`)
**Verifier verdict:** PASS

## What shipped

- `packages/protocol/src/skill-install.ts` — `skillInstallOf` (the `skills` CLI's `add`/`a`/`install`/`i`, six launchers, the CLI's GitHub source forms, `--skill`/`--all`/`'*'`, `--list` refused, other sources `elsewhere`), `readSkillInstall` (at most 3 skills through `readPulse`, a deadline promise), `skillInstallReport`. Exported from the core index for task 86.
- `apps/hook/src/pre-install.ts` — `PreToolUse` on `Bash`: `systemMessage` + `hookSpecificOutput.additionalContext`, no `permissionDecision`; 6 s budget; `GITHUB_TOKEN`/`GH_TOKEN` to `api.github.com` only; imports by path.
- `apps/hook/src/hook.ts` — `ROUTES` table keyed on `eventOf` (`payload.ts`), read before `toolCallOf`; unrouted events fall through to the unchanged recording.
- `apps/cli/src/install/edits.ts` — `HookEvent` rows (`matcher`, `sync`, `timeout`, `if`), several per event; `withHooks`/`hooksOf`/`hasHooks` per event name. `CLAUDE_HOOKS` gains `PreToolUse`/`Bash`, waited on, `timeout: 15`, `if: "Bash(*skills*)"`. `packages.ts`, `targets.ts`, `check-node.sh`, `packaging/` follow.
- Retraction of "the hook makes no network call" across README, CLAUDE.md, `apps/hook/README.md`, `docs/22` (hook, outbound, env), `docs/31`, `apps/web/public/docs/*`; the failure record's notes now say *the failure record* reads no network.

## Surprises

- `docs/22`'s old proof `grep -cE "fetch\(|createPublicClient\("` still prints `0` after the change, because `githubPulseSource` names `fetch` as `get`. A negative check that matches a spelling is not a check of behaviour; it was replaced by one that lists request sites (re-run by the verifier: 2 `api.github.com`, 1 `raw.githubusercontent.com`).
- An `async` Claude Code hook's `systemMessage` is not shown, so a pre-install check has to be waited on; the `if` rule is what keeps every other `Bash` call from paying Node's start.

## Decisions made

- **Route by event in one hook file** — one `ROUTES` line plus one `CLAUDE_HOOKS` row per future event (tasks 99, 100). ADR `.claude/choices/0167-the-hook-reads-a-skill-before-a-skills-install.md`.
- **`Bash(*skills*)` rather than the brief's `Bash(npx skills add *)`** — the install has many spellings and one rule per handler; the parser decides. ADR `0167`.
- **No `permissionDecision: "ask"`** — a verdict in all but name (ADR `0165`). ADR `0167`.
- **A ref is reported, not followed** — `readPulse` reads `HEAD`. ADR `0167`.

## Rules touched

- `.claude/rules/claims.md` — sufficient; check 5 (grep the old wording) and check 6 (the command ships with the claim) both applied to the retraction.
- `.claude/rules/code.md` — sufficient; the two `as` casts in the hook test carry comments.
- `.claude/rules/security.md` — sufficient; no new signature site, so its list is unchanged. It holds no list of outbound hosts; `docs/22` is that record.
- `.claude/rules/portability.md` — not engaged: no chain is touched.

## Suggestions for future tasks

- When a capability changes (here: network), grep by meaning across phrasings (`no network`, `locally`, `offline`, `nothing leaves`), not only the sentence remembered.
- The `if` matcher on `Bash(*skills*)` is untested in a live Claude Code runtime; the tester round should confirm the check appears on `npx -y skills add`.
- Tasks 99/100: add the event row and the route together; `hasHooks` counts rows, so `arp doctor` flags an install missing the new row until `arp init` is re-run.
- `.claude/STATE.md` gets the task 98 row on close (workflow step 8).

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, declared tier: the check reads the skill's own files, its word about itself, so it moves nothing up the ladder by itself; it widens who carries the hook whose recording feeds the skill column's observed tier.
