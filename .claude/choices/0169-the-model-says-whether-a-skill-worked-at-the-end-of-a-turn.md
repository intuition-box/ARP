# 0169 — The model says whether a skill worked, at the end of a turn, once per skill

**Status:** Accepted
**Date:** 2026-11-10
**Triggered by:** `docs/tasks/100-the-model-says-it-worked.md`, the user's decision 2026-11-10: the model decides
"worked", at the end of the task, not a rule. Supersedes ADR `0140`'s "writes `worked` never"; amends the neutral
bullet of ADR `0166` and `FUTURE.md` "What was missing" point 2.

## Context

The hook sees calls. A failure shows in a call (ADR `0140`); a success does not, because no error does not mean the
job was done. So until now `worked` came only from the agent writing `arp line --outcome worked` itself, which
nobody does unprompted, and task 97's `with` (ADR `0166`) could not be offered for a skill that failed for lack of
ffmpeg and later worked once ffmpeg was installed.

The model that did the work is the one party that can say whether a skill did its job. Claude Code has a `Stop`
event that fires when the main agent finishes its turn, and two ways to make the turn continue
(code.claude.com/docs/en/hooks, read 2026-11-10): a command hook returning `{"decision": "block", "reason": …}`,
and a prompt hook (`type: "prompt"`) whose model returns `{ok, reason}`.

## Decision

**A command hook on `Stop`**, the same `hook.js`, not `async`, timeout 10 s (`apps/hook/src/worked.ts`).

1. On `Stop` with `stop_hook_active` false, it reads this session's skills from `.arp/session.jsonl` (the record
   the `PostToolUse` hook already keeps), drops those already asked (`~/.arp/asked.jsonl`) and ARP's own skill,
   takes at most five, marks them asked, and prints
   `{"decision":"block","reason":"ARP asks once per skill: … Reply with one line per skill and nothing else: `arp: <skill> worked`, `arp: <skill> failed` or `arp: <skill> unsure`. … Skills: <names>"}`.
2. The model answers in its message. On the next `Stop`, the hook reads `last_assistant_message` for exactly
   `arp: <skill> worked|failed|unsure`, for the skills asked and no other, and writes one line per answer to
   `~/.arp/outcomes.jsonl`: date, session, skill, source, a domain found as for a failure (the session's search,
   else the person's last words against the tree's closed words, else the skill's node), the answer, and on
   `worked` a `with` name. The message is dropped.
3. **`with`**: the latest earlier `~/.arp/failures.jsonl` record of that skill with a `needs` name, kept only if
   the skill's SKILL.md, read now, still names it (`publishableNeed`, ADR `0166`). No SKILL.md found, no `with`.
4. **Sharing** (task 88): `arp share` reads `outcomes.jsonl` beside `failures.jsonl`. Only a `worked` answer of a
   skill with one known public source becomes a line, `{toolUrl, outcome: "worked", domain?, need?}`, written by
   `arp share send` only when sharing is on. The sponsoring service re-reads the SKILL.md before writing `with`,
   as for any line. `failed` without a reason and `unsure` stay local.

**The loop guard.** It never blocks while `stop_hook_active` is true, so ARP adds at most one continuation per
turn, against Claude Code's cap of eight consecutive continuations. A skill is asked at most once per session,
answered or not, because it is marked asked before the question goes out; if the mark cannot be written, nothing
is asked. Any error lets the turn end. Tests: `apps/hook/test/worked.test.ts` ("the loop guard", "asked once per
session even when the model never answers", "ten Stops in a row block at most once per skill").

## Token cost

The question is **273 characters plus the skills' names, joined by `, ` (two characters between two names)** (asserted in
`apps/hook/test/worked.test.ts`), about 70 tokens by the four-characters-a-token rule of thumb, not measured with a
tokenizer. Each answer line is `arp: <name> worked`, about 5 to 10 tokens. The real cost is the **extra model
turn**: the continuation sends the conversation again, which in Claude Code is mostly a prompt-cache read, plus the
short answer as output. Bound: one continuation per turn that used a skill not yet asked, at most
`ceil(distinct skills / 5)` in a session, and **zero** in a session that used no skill. No tokens are measured on a
real session yet.

## Alternatives considered

- **A prompt hook on `Stop`**: rejected. Its model is the one Claude Code uses for background work, not the one
  that did the task, and it sees the hook input (`last_assistant_message`, the transcript's path) rather than the
  work. Its prompt is fixed in `hooks.json`, so it cannot name the skills of this session, and it cannot write a
  local record. It would also run on every `Stop`, skill or not.
- **The agent runs `arp worked <skill> <answer>`**: rejected. It needs a Bash permission and `arp` on the PATH,
  which a plugin install does not give, and it puts a command in the transcript for a three-word answer.
- **`hookSpecificOutput.additionalContext` instead of `decision: "block"`**: the docs label it hook feedback
  rather than a hook error, with the same loop protections. Not taken because neither was tried in a live
  session here, and `decision: "block"` is the form the task named. A one-line change if the error label bothers
  testers.
- **A rule** (no error after a skill means worked): rejected by the user, and by ADR `0140`'s reason.

## Consequences

**Positive:**
- `worked` exists locally with no action from the person, and a `with` name can follow an earlier `needs`, which
  is the A-failed, B-installed, B-worked sentence task 97 wanted.

**Negative:**
- It is still the model's word about its own work, the bottom rung: `declared`, never `observed`
  (`docs/32`). A model can answer `worked` for a skill that did nothing.
- The person sees one more short exchange at the end of a turn that used a new skill.
- A `Stop` continued by another hook first is not asked; that skill waits for a later turn, or is never asked if
  the session ends.
- Claude Code only. Grok Build reads the same settings and its camelCase keys are read, but whether it honours
  `decision: "block"` on `Stop` is untested; a runtime that ignores it leaves the skill asked and unanswered.
- Runtime behaviour is tested against mocked payloads only (`worked.test.ts`, and the packaged `hook.js` under
  Node), not inside a real Claude Code session.

## References

- Related task: `docs/tasks/100-the-model-says-it-worked.md`
- Related ADRs: `0090`, `0140` (superseded in part), `0145`, `0166` (amended), task 88's sharing
- Related docs: `docs/28_THE_SIGNAL.md`, `docs/22_RUNNING_THE_NODE.md`, `docs/31_HOW_IT_WORKS.md`, `FUTURE.md`
