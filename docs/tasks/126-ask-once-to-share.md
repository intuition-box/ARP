# Task 126 — Ask once whether to share, with "always"

**Status:** verified 2026-11-11 (round 2; round 1 failed on "always" publishing history). Post-mortem `.claude/learning/114-ask-once-to-share.md`.
**ADR:** `0191` (amends `0157`).
**Rules:** `code.md`, `claims.md`, `workflow.md`. Gates: `apps/hook` test and lint, `apps/cli` test, lint,
`check:node` and `packages --check`, `packages/protocol` test and lint, `apps/mcp` test and lint, root
`bun run check` and `test:scripts`, `apps/web` `tsc -b`, lint, test and `check:tokens` (its public docs changed).
**Required skills:** `arp-contributing`.

## The user's decision, 2026-11-11

Chosen among three options: « Une fois, avec « toujours » ». After the first skill result (`worked` or
`failed`) on a machine where sharing is undecided, the agent asks the person: share this result? "yes, this
once", "always" or "no". "Always" turns sharing on, and from then on lines are sent automatically at the end of
the session, in the background. "Yes, this once" sends that one. "No" records the refusal, and the question
never comes back until `arp share on`. Nothing leaves without an explicit yes.

Rejected: asking at every result; sharing on by default.

## Deliverables

1. `packages/protocol/src/sharing-state.ts`, pure: the file's choice with its date and `how`, the three
   answers, and `shareAnswerIn`, which reads `arp-share: once|always|no` on its own line. Tests in
   `packages/protocol/test/sharing-state.test.ts`.
2. `apps/hook/src/share-ask.ts`: the question on the first skill with a public source while undecided
   (`offerShare`), the answer read on a later `Stop` of the same session (`onStopShare`), and `SessionEnd`
   starting `arp share send --auto` detached (`sessionEnd`, `senderOf`). `ARP_SHARE_AUTO=off` stops both.
   Wired in `worked.ts` and `hook.ts`. Tests in `apps/hook/test/share-ask.test.ts`, on the real hook.
3. `apps/cli/src/share.ts` and `cli.ts`: the file written with its date and `how`; a "yes, this once" sends
   that session's result alone; one send at a time (`share-send.lock`); `--auto` prints nothing and writes
   `share-log.jsonl`; `arp share` says how sharing was chosen. Tests in `apps/cli/test/share.test.ts`.
4. `arp init`: `how: init`, and `~/.arp/bin/send.json` beside the hook, removed with it. The hooks gain
   `SessionEnd` (`CLAUDE_HOOKS`), and `packaging/` is regenerated.
5. The plugin's server no longer asks in its instructions (`apps/mcp/src/share-ask.ts`); Desktop writes
   `how: desktop`.
6. Docs: `apps/web/public/docs/local-memory.md` (Sharing), `install.md`, `cli.md`, `uninstall.md`,
   `testers.md`, `what-arp-publishes.md`, `apps/hook/README.md`, `apps/cli/README.md`, `README.md`,
   `docs/22`, `docs/28`, `docs/31`, the `apps/hook` line of `CLAUDE.md`, the plugin commands' descriptions.

## The live run

Claude Code 2.1.318, `claude -p` with `--plugin-dir packaging/claude/arp`, `--setting-sources project`,
`ARP_HOME` in a scratch directory, a project skill `haiku-maker` whose `skills-lock.json` names
`example-owner/haiku-skills`. Turn 1, "Use the haiku-maker skill to write a haiku about rain.", then the same
session resumed with the answer.

- Turn 1: the reply ended `arp: haiku-maker worked`, then the question with the three choices and what would
  leave. `share-question.json` was `put`; no `sharing.json`.
- Turn 2, "always": the reply ended `arp-share: always`. `sharing.json` became
  `{"failures":true,"at":"2026-11-11T14:47:50.248Z","how":"asked-always"}`, and 232 ms later
  `share-log.jsonl` held `sent 0, failed 1`, the error naming the sponsoring service at
  `http://127.0.0.1:3200`, which was not running. `arp share` printed `sharing is on, chosen 2026-11-11
  answering "always"` and the one worked line.
- A second run, turn 2 in French, « oui, juste cette fois »: `arp-share: once`, `how: asked-once`, one
  `share-once.jsonl` row, the same failed send in `share-log.jsonl`, and `arp share` showed the line under
  `agreed once`.

These runs were made before verification round 1, which found that "always" sent everything kept before the
choice. Since the fix, "always" also writes the asked result to `share-once.jsonl`, and sends that result and
what is kept on or after the choice, nothing older (`apps/cli/test/share.test.ts`, `apps/hook/test/share-ask.test.ts`).
The live runs above are not repeated for it: their one recorded result is the asked one, which goes either way.

Not run: a send that succeeds. The runs above were made before the rebase onto CLI 0.0.4, when the default
sponsor was the local `127.0.0.1:3200`. Since 0.0.4 the default is the hosted
`https://sponsor.arp.intuition.box` (task 117), which is live, but a successful send there would write a
permanent testnet line about a made-up skill, so it was deliberately not run.

## Do not do in this task

- Change the default sponsor (`config.sponsorDefault`, task 117).
- Ask at every result, or turn sharing on by default.
- Let the hook block or continue a turn, or reach a network itself.
