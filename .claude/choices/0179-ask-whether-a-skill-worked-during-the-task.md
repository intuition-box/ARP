# 0179 — Ask whether a skill worked during the task, not at Stop

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/109-ask-during-the-task.md`, the user's decision 2026-11-10 ("option 4"), after task
108's live run. Amends ADR `0169`: its decision points 1 and 2, its loop guard and its token cost; its `with` (point
3) and sharing (point 4) stand.

## Context

ADR `0169` asked on `Stop` with `{"decision": "block", "reason": …}`, which starts one more model turn. Task 108 ran
it for the first time in a real session (Claude Code 2.1.318, `claude -p`): that extra turn's answer replaced the
session's final result, which became `arp: pdf failed` (`docs/tasks/108`, "Found, not fixed here"). A script or a CI
job reading the result got ARP's line instead of the work.

`hookSpecificOutput.additionalContext` on `Stop` is no way out: the hooks docs (code.claude.com/docs/en/hooks, read
2026-11-10) say Stop "also accept[s] `hookSpecificOutput.additionalContext` for non-error feedback that continues
the conversation", so it continues the turn too. The docs name no marker a hook could read to tell a headless
session from an interactive one.

## Decision

**Ask when the skill loads; read at `Stop`; never continue the turn.**

1. `PostToolUse` on `Skill`, waited on (timeout 5 s): after the call is recorded as before, a skill not yet asked
   this session, and not ARP's own, is marked in `~/.arp/asked.jsonl` and answered with
   `hookSpecificOutput.additionalContext`: "ARP: at the end of your final reply, add one line saying whether the
   skill <name> did its job: `arp: <name> worked`, `arp: <name> failed` or `arp: <name> unsure`. Kept on this
   machine unless `arp share` is on." (`requestFor`, `apps/hook/src/worked.ts`). Once per skill per session; a
   request that cannot be marked is not sent.
2. `Stop` (waited on, timeout 10 s, so `claude -p` does not cancel it at exit as it does async hooks) reads
   `last_assistant_message` for that line, for the skills asked this session and not answered yet, and writes the
   same `~/.arp/outcomes.jsonl` record as before (`with` unchanged). It prints nothing, ever. The `decision: "block"`
   path, `stop_hook_active`, `MAX_ASKED` and the question at Stop are removed.
3. **If the model leaves the line out, nothing is recorded.** The skill stays asked, so it is not asked again in that
   session; an answer written on a later turn of the same session is still read.
4. **Two `PostToolUse` rows, so no call runs the hook twice** (`CLAUDE_HOOKS`, `apps/cli/src/install/edits.ts`):
   matcher `^(?!Skill$)` in the background, as before for every other tool, and matcher `Skill` waited on. An async
   hook's `additionalContext` reaches the model "on the next conversation turn" (the same docs, "How async hooks
   execute"), too late for the reply. The first matcher is a JavaScript regular expression by the docs' rule (any
   character outside letters, digits, `_`, `-`, spaces, `,` and `|`).

## Token cost

The request is **185 characters plus four times the skill's name** (asserted in `apps/hook/test/worked.test.ts`),
about 50 tokens by the four-characters-a-token rule of thumb, not measured with a tokenizer, once per skill per
session. The answer is one line, `arp: <name> worked`, about 5 to 10 tokens of output. **No extra turn.** A session
that loads no skill pays nothing.

## Live check (one run each, 2026-11-10)

Claude Code 2.1.318, `claude -p --setting-sources project --plugin-dir packaging/claude/arp`, `ARP_HOME` in a scratch
directory, a project skill `word-count`:

- Result: `"'the quick brown fox' has **4** words.\n\narp: word-count worked"` — the real answer, then the line.
  `outcomes.jsonl`: `{"skill":"word-count","source":null,"outcome":"worked"}`.
- With a Bash call first, the debug log: `PostToolUse:Bash … moved to the background`, `PostToolUse:Skill … finished
  with status 0 (39ms)`, `Stop … finished with status 0 (38ms)`. `session.jsonl` held one line for the skill call,
  so the background row did not also fire on `Skill`.

## Alternatives considered

- **`additionalContext` on `Stop`**: continues the turn, per the docs; the same defect.
- **Keep the block, skip it when headless**: the docs name no headless marker in a hook's input.
- **One `PostToolUse` row, made waited on for every tool**: every tool call would wait for Node to start.
- **The `Skill` row waited on beside the `*` row in the background**: the skill call runs the hook twice, and the
  background copy's answer would reach the model a turn later, a second time.
- **The `if` field (`Skill(*)`) instead of a matcher**: a permission rule for the Skill tool was not documented in
  what was read; the matcher is.

## Consequences

**Positive:**
- `claude -p` returns the real answer, with the closed line at its end. No extra turn, in any mode.
- No continuation, so no loop to guard: `Stop` prints nothing.

**Negative:**
- The line is in the person's reply. In an interactive session it is one visible line per skill, at the end of the
  final reply.
- A model that forgets the line, or writes it in another form, records nothing.
- Still the model's word about its own work, the bottom rung (`declared`, `docs/32`), as in ADR `0169`.
- Grok Build reads the same settings: whether it reads a negative-lookahead matcher, and `additionalContext` on
  `PostToolUse`, is untested. If it reads `^(?!Skill$)` as an exact name, its background row matches nothing.

## References

- Related task: `docs/tasks/109-ask-during-the-task.md`
- Related ADRs: `0169` (amended), `0168` (the same `additionalContext` form on `PostToolUseFailure`), `0167`
- Related docs: `docs/22_RUNNING_THE_NODE.md`, `docs/28_THE_SIGNAL.md`, `docs/31_HOW_IT_WORKS.md`
