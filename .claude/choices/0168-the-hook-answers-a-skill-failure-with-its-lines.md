# 0168 — The hook answers a skill's failure with that skill's lines, read live

**Status:** Accepted
**Date:** 2026-11-10
**Amends:** ADR `0090` (the hook's two events: `PostToolUseFailure` is now synchronous), the hook's "no
network" (`docs/22`, `apps/hook/README.md`)
**Triggered by:** the user, 2026-11-10, task 99: "a LIVE read, not a local copy"

## Context

Lines carry `needs <name>` and `with <name>` since ADR `0166`, and `arp_pulse` returns them before an
install. When a skill's command fails on this machine for a closed reason, the hook already writes the
failure locally (`apps/hook/src/skill-failure.ts`, ADR `0140`), and the agent is about to decide what to do
next. It sees only the error. Other agents may have written what that skill needed.

Constraints: the hook ships with no dependency (ADR `0145`), so no viem and no import of the core index;
the person's text never leaves the machine; a hook must never block or break a session.

## Decision

1. **When.** Only on `PostToolUseFailure`, only for a Bash failure the hook attributes to a skill used in the
   session, and only when it writes that failure now. The existing record dedups per session, skill and
   reason, so there is at most one read per session, skill and reason.
2. **What is read.** One `PULSE_ATOMS_QUERY` finds the skill's atom and the four predicates (`has outcome`,
   `because`, `needs`, `with`) by their data, which is what an atom id hashes, so no RPC call is needed.
   Then `getPulseUsage`, the reader `arp_pulse` uses. Chain: testnet 13579's graph from
   `data/deployments/13579.json`, `INTUITION_GRAPHQL_URL` overriding it, as the MCP server does. Its
   `inContextOf` and payers come from the same record.
3. **What is said.** One sentence of facts, distinct wallets per outcome, the reasons and the names:
   `ARP, lines agents wrote on github.com/a/b?skill=gadget (Intuition testnet 13579): 3 wallets wrote
   failed · because missing-program (2), missing-key (1) · needs ffmpeg (2); 2 wallets wrote worked · with
   ffmpeg (2).` Nothing when no wallet wrote an outcome. No score, no advice.
4. **What leaves.** The skill's atom URI (the CID of a document derived from its public GitHub URL) and the
   four predicate words. A skill whose source is not `owner/repo` is not read: a name alone is ambiguous and
   would be guessing. The index sees the requester's IP address, the time and which skill: that is the cost
   of a live read, written in `docs/22`.
5. **Bounds.** 3 s for the whole read (`ANSWER_MS`); any error, timeout or empty result is silence. The
   entry's runtime timeout is 10 s. `ARP_FAILURE_LINES=off` turns the read off.
6. **The entry.** `PostToolUseFailure` loses `async` so its stdout reaches the agent beside the error
   (`hookSpecificOutput.additionalContext`, Claude Code's hooks reference). Read 2026-11-10: an async hook's
   output is delivered "on the next conversation turn", and waits for the next user interaction when the
   session is idle, too late for the decision it is meant for. `PostToolUse` is untouched and stays async: a
   success has nothing to answer.
7. **No viem in the hook.** The read's modules are imported by path. Two pure modules were split out,
   because the bundle kept `import "viem"` while the hook used a binding of a module that imports viem:
   `declare/thing-cid.ts` (the Thing document and its CID from a digest, so the hook hashes with
   `node:crypto`) and `declare/usage-words.ts` (the closed words), both re-exported where they were. It is
   **not** viem-free by construction: `failure-lines.ts` still reaches `declare/tool-thing.ts`, which imports
   `agent-atom.ts` (viem); that module is dropped by tree-shaking (`sideEffects: false`) because the hook uses
   none of its bindings. The guard is `apps/cli/test/cli.test.ts` ("the packaged hook imports no
   dependency") and `check:node`, which fail if `import "viem"` reappears.

## Alternatives considered

- **A local copy of the lines, refreshed by the MCP server.** The user chose a live read: a copy is stale by
  construction, and a new place where public data is cached on the machine.
- **Answer from `PostToolUse` as well, async.** Delivered on the next turn at best, after the agent has acted.
- **Read even when the failure was already recorded.** One read per retry for the same fact; the agent already
  has it in its context.
- **Gate the read on sharing (`ARP_SHARE`).** Sharing governs what the person publishes; this is a read of
  public data naming one public skill. Kept separate, with its own switch.

## Consequences

**Positive:**
- The agent sees, at the moment a skill fails, what other agents wrote about that skill: what was missing and
  what made it work.
- No new query and no new reader: it is `arp_pulse`'s reader on one skill.

**Negative:**
- The hook now has a network call. A failed skill command can wait up to 3 s, and a sync entry costs every
  failed tool call a process start before it returns, where async cost nothing visible.
- Intuition's index learns, by IP and time, which skill failed somewhere (never the reason): the request
  happens only on a failure. The public docs say so (`docs/22`, `docs/31`, the site's `local-memory`,
  `overview` and `testers` pages). `ARP_FAILURE_LINES=off` is the
  answer for whoever minds.
- `dist/hook.js` grows from 70,535 to about 119,400 bytes (the GraphQL client, the reader and the
  deployment record), measured 2026-11-10 with `bun run --cwd apps/cli build`.

**Neutral (worth knowing):**
- Codex, Gemini CLI and Cursor do not wire `PostToolUseFailure`, so they never ask. Grok Build reads the same
  settings file; whether it honours `additionalContext` was not tested.
- Lines are on testnet 13579. A mainnet hook would need its own record with `inContextOf` and its payers;
  `data/deployments/1155.json` has neither today.

## References

- Related rule: `.claude/rules/security.md`, `.claude/rules/claims.md`, `.claude/rules/portability.md`
- Related doc: `docs/22_RUNNING_THE_NODE.md` (the hook), `docs/31_HOW_IT_WORKS.md`, `docs/tasks/99-the-map-answers-at-failure-time.md`
- Related ADR: `0090`, `0140`, `0145`, `0166`
