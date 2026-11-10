# Task 104 — the site's open gaps

**Status:** built 2026-11-10 on `feat/104-the-site-gaps`; review and verification below.
**ADR:** none — every choice follows task 96's hand-over and task 94's rules.
**Rules:** `code.md`, `ui.md`, `claims.md`, `workflow.md`.
**Required skills:** `arp-contributing`. No atom, triple or contract.

## Why

Three gaps that earlier tasks recorded and left open (`.claude/STATE.md` rows 94 and 96):

1. the agent side of task 96's Contains (`useAgentContents`) was ready and on no page;
2. `/pulse` receives `contains` from `arp_pulse`'s reader and did not display it;
3. `/list-tool` refusals `not-a-tool`, `unreachable` and `private-address` (task 94, ADR `0163`)
   fell through to "It could not be added."

## Deliverables

1. **Agent page, facts column.** `apps/web/src/components/agent/AgentContains.tsx`, below task 101's
   x402 Trust Index in `pages/AgentTrustPanel.tsx`: a `Contains` panel with Endpoints (name and host,
   or the `notCheckable` code), Protocols, x402 (`declared` / `not declared`), Auth (names, or
   "none named") and Answers (`answered · <protocols>` with the proving endpoint, `no answer`,
   `no verdict` for `couldNotSay`, `not read`), dated by the sieve's reading, the caveat in a `Hint`.
   `none` reads "no registration document"; `unreadable` keeps its link. The lines layout (task 95)
   is untouched. Tested in `components/agent/__tests__/AgentContains.test.tsx`.
2. **`/pulse` shows Contains.** `SkillContains` is reused as is: `services/pulse.ts`
   `pulseContentsEntry` converts the pulse's `contains` with `services/skill-contents.ts`
   `entryOfContains` (the conversion `build-skill-contents.ts` makes), `usePulse` returns it dated by
   the read, and the page puts the panel in its right column. GitHub's file list gives a tree, not a
   commit, so matched lines link at `HEAD` (`HEAD_REF`) and the panel's Hint says "read at the
   repository's head". No panel when no file was read: the page already says so.
3. **`/list-tool` refusals.** `services/list-tool.ts` `listToolMessage`: `not-a-tool` → "No skill,
   plugin, MCP server, A2A agent or x402 endpoint found there.", `unreachable` → "That URL did not
   answer.", `private-address` → "That URL is not a public address." Tested.

## Do not do in this task

Touch `apps/cli`, `apps/hook`, `packaging` (tasks 105–107); change what the readers read; the lines
layout of the agent page; deploy, publish or push.

## Gates

`apps/web`: `bunx tsc -b`, `bun run lint`, `bun run test`, `bun run check:tokens`; root
`bun run check`. `ui-reviewer` before `task-verifier`.
