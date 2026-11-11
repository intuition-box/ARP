# 0191 — Sharing is asked once, after the first skill result, with "always"

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** the user, 2026-11-11, choosing among three options: « Une fois, avec « toujours » ». Task 126.

## Context

Sharing a machine's results as public lines (`arp share`, task 70) is off by default. ADR `0157` offered it
once per install: `arp init` asks `[y/N]`, Desktop has a checkbox, and the plugin, which has no install
screen, had its MCP server ask the agent to put the question at the start of each session while no answer was
on file, the person answering by typing `/arp:share-on` or `/arp:share-off`. Turned on, nothing was sent until
the person ran `arp share send`.

So a person who said yes still sent nothing unless they knew a second command, and the question came before
there was any result to share.

Two constraints shape the mechanism. The hook cannot prompt the person: it can only add `additionalContext`
to what the model reads, and its `Stop` route must never block or continue the turn (ADR `0179`). And nothing
the person writes may be collected (ADR `0155`): an answer has to come back in closed words.

## Decision

**The agent asks once, after the first skill result, and the answer comes back as a closed line.**

1. While `<arpHome>/sharing.json` does not exist, the first skill with a public source to load in a session
   carries one more request with its `arp:` line: if that line says `worked` or `failed`, ask the person
   whether to share the result, "yes, this once", "always" or "no", say what would leave, do not choose for
   them, and end the reply to their answer with `arp-share: once`, `arp-share: always` or `arp-share: no`.
2. `Stop` reads that line only from a later message of the same session than the one that put the question.
   A line in the same message is the model answering for the person, and is ignored. Two different answers in
   one message are no answer. An answer is read only while nothing is on file.
3. `always` writes `{"failures": true, "at", "how": "asked-always"}`. `once` writes `failures: false`,
   `asked-once`. Both write one row of `share-once.jsonl` (the session and the skill the question was about):
   under `once` that result alone may go; under `always`, that result and every row kept on or after the
   choice's `at`. **What was kept before "always" stays here**: the person was asked about this result and the
   ones after it, never shown the history (outcomes since task 109, `arp backfill`'s import). `arp share`
   counts it, and `arp share on`, which prints every line first, includes it. `no` writes `asked-no`. Every way of choosing now records its date and `how` (`init`, `command`,
   `desktop`, `asked-*`); a file without them still reads as decided.
4. The question is put once per machine: a question put (the `arp:` line said worked or failed) is not put
   again, answered or not. A result of `unsure`, or a skill with no public source, leaves it for later.
5. **Sharing on means sent automatically.** On `SessionEnd`, with sharing on, or a `once` from that session,
   the hook starts `arp share send --auto` detached, with no output, and returns. That program takes a lock
   (`share-send.lock`, `wx`, stale after ten minutes), sends, and writes what it did to `share-log.jsonl`.
   One race is accepted: two sends that both find the same stale lock can both take it and both send. It needs
   a send that died first, and then a line can be sent twice. The
   hook finds it beside itself, in `send.json` (written by `arp init`), or in `ARP_CLI`.
6. The plugin's MCP server no longer asks in its instructions: asking there and in the hook would ask twice.
7. `ARP_SHARE_AUTO=off` stops the question and the background send. `arp share` still prints exactly what would
   be public, now with how sharing was chosen.

## Alternatives considered

- **Ask at every result** — rejected by the user: a question each time a skill runs is noise, and a person
  who answers it every time stops reading it.
- **On by default, opt-out** — rejected by the user, and by ADR `0157`: it publishes before anyone agreed.
- **The person answers with `/arp:share-on`, as ADR `0157` had it** — the answer would be the person's own
  act, but "yes, this once" has no command, and a three-way question answered by typing a slash command
  differs from the one the user chose. ADR `0157` rejected "the agent turns it on when the person says yes"; this
  ADR accepts it in a narrow form: the agent transcribes an answer the person gave to a question put in an
  earlier message, in closed words, and an answer in the question's own message is ignored.
- **Read the person's reply in `UserPromptSubmit`** — the hook would match the person's own words, which
  ADR `0155` keeps on the machine and never parsed beyond the tree's closed words, and a free-text yes in any
  language is guesswork. Not wired.
- **Send at `Stop`, after each turn** — the user said « à la fin de la session », and a send per turn spawns
  a process per turn. `SessionEnd` it is; a line that failed is tried again at the next one.

## Consequences

**Positive:**
- A person is asked when there is a result to share, once, and "always" makes sharing do something without a
  second command.
- No turn waits for a network: the hook only spawns; the measured `SessionEnd` with a sender that sleeps three
  seconds returned in under three seconds (`apps/hook/test/share-ask.test.ts`).

**Negative:**
- The answer is the model's transcription. A model, or a skill's text steering it, could write
  `arp-share: always` in a later message the person never answered. Bounded: only after a question put in an
  earlier message of the same session, only while undecided, and what can leave stays closed vocabulary that
  `arp share` shows.
- A person who turned sharing on before this ADR (`arp init`'s yes, `/arp:share-on`) now has lines sent
  automatically at the end of a session, where before they had to run `arp share send`. Their yes was to the
  lines being public; the change is when they go.
- A `once` line that failed to send waits for `arp share send`: `SessionEnd` retries only the session that
  agreed.
- A background send that fails (the sponsoring service down, a cap reached) says so only in
  `share-log.jsonl`. Since CLI 0.0.4 the default sponsor is the hosted one (task 117); a successful background
  send through it was not tested here.

**Neutral (worth knowing):**
- Claude Desktop runs no hooks, so it keeps its checkbox and is never asked.
- Grok Build reads the same hooks file; whether it fires `SessionEnd` is untested.

## References

- Related rule: `.claude/rules/claims.md`, `.claude/rules/workflow.md`
- Related doc: `apps/web/public/docs/local-memory.md` (Sharing), `docs/22_RUNNING_THE_NODE.md`
- Related ADR: `0157` (amended: the plugin row, and the alternative it rejected), `0155`, `0169`, `0179`
- Task: `docs/tasks/126-ask-once-to-share.md`; post-mortem `.claude/learning/114-ask-once-to-share.md`
