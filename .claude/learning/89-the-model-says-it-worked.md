# 89 — The model says whether a skill worked

**Task:** `docs/tasks/100-the-model-says-it-worked.md`
**Completed:** 2026-11-10
**Commit:** `b250962`, `121ea5a`, `95c8572`
**Verifier verdict:** PASS (second run; the first failed on two stale inventories and one ADR wording)

## What shipped

- `apps/hook/src/worked.ts` — Stop hook: one closed question per skill used, asked once (`~/.arp/asked.jsonl`), at most 5, never while `stop_hook_active`; answer read on the next Stop into `~/.arp/outcomes.jsonl`, `with` only via `publishableNeed`.
- `apps/hook/src/hook.ts` — one Stop branch before `toolCallOf`; other routing unchanged.
- `packages/protocol/src/local-outcomes.ts` — pure `answersIn`, `parseLocalOutcomes`; imported by path.
- `packages/protocol/src/share-failures.ts` — `SharedLine` union; only `worked` answers shared; a failure keeps its old key.
- `apps/cli/src/install/edits.ts`, `scripts/packages.ts` — per-event `entry`; Stop not async; `packaging/` regenerated.
- ADR `0169`; ADR `0140`, `0166` struck in place; `FUTURE.md`, `docs/22`, `23`, `28`, `31`, `README.md`, site pages.

## Surprises

- First verification failed on claims.md check 5: `README.md`'s "What it writes" and `architecture.md:15` still listed only `failures.jsonl`. The task's doc list named the site pages but not the README, and the architecture page was edited at line 128 while line 15 was missed.

## Decisions made

- **Command hook with `decision: "block"` over a prompt hook** — the model that did the work answers, and the hook can name this session's skills and write a local record. ADR: `.claude/choices/0169-the-model-says-whether-a-skill-worked-at-the-end-of-a-turn.md`.
- **Mark asked before asking** — an unwritable mark means no question, so no skill is asked twice.

## Rules touched

- `.claude/rules/claims.md` — sufficient; check 5 caught the miss. Grep the file name (`failures.jsonl`), not the sentence.
- `.claude/rules/code.md` — sufficient.
- `.claude/rules/security.md` — sufficient; no new signature site.

## Suggestions for future tasks

- A task that adds a file under `~/.arp/` greps `failures.jsonl` (or the nearest sibling) across `README.md`, `apps/web/public/docs/`, `docs/22` and lists every inventory in its deliverables.
- The Stop flow is tested on mocked payloads only; the tester round should confirm Claude Code honours `decision: "block"` on Stop and record the real token cost.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

The skill column at the declared tier: the model's word about its own use; it fills that tier with the worked lines that were missing and does not move ARP up a tier.
