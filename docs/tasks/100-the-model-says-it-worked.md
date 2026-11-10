# Task 100 — The model says whether a skill worked

**Status:** in progress.
**ADR:** `0169`.
**Rules:** `code.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`. No atom or triple is written by this task, so no `intuition-integrator`.

## Why

The hook can see a failure and cannot tell a worked use (ADR `0140`), so `worked`, and task 97's `with`, came only
from an agent writing `arp line` itself. The user decided on 2026-11-10 that the model decides "worked", at the end
of the task, not a rule.

## Deliverables

1. A `Stop` hook (`apps/hook/src/worked.ts`, one routing branch in `hook.ts`): for each skill used this session,
   asked once, one closed question; the answer `arp: <skill> worked|failed|unsure` read on the next `Stop` from
   `last_assistant_message`, written to `~/.arp/outcomes.jsonl`. Command hook with `decision: "block"`, chosen over a
   prompt hook in ADR `0169`.
2. Loop guard: never block while `stop_hook_active`; each skill asked at most once per session
   (`~/.arp/asked.jsonl`); at most five per question.
3. `with`: a worked answer carries the name of the latest earlier local `needs` record of that skill, only when its
   SKILL.md names it (`publishableNeed`, ADR `0166`).
4. Sharing: `arp share` offers a `worked` answer as a worked line, with `with` as `need`, only when sharing is on
   and the skill has one public source (`packages/protocol/src/share-failures.ts`, `local-outcomes.ts`).
5. `arp init` and the plugin wire `Stop`, not `async` (`apps/cli/src/install/edits.ts`, one `Stop` entry);
   packaging regenerated.
6. ADR `0169`; ADR `0140` and `0166` amended in place; `FUTURE.md` "What was missing" point 2; `docs/28`, `docs/22`,
   `docs/23`, `docs/31`, the site's `local-memory`, `cli`, `uninstall` and `architecture` pages; `STATE`.

## Do not do in this task

Write on chain, sign with a real key, deploy, publish or push. Change how `hook.ts` routes other events (task 98).

## Gates

`apps/hook` test and lint; `packages/protocol` test and lint; `apps/cli` test, `check:node`, `packages --check`;
root `bun run check`, `bun run test:scripts`.
