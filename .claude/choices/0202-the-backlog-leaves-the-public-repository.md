# 0202 — The backlog leaves the public repository

**Status:** Accepted
**Date:** 2026-11-12
**Triggered by:** the user's decision, 2026-11-12, carried out by `docs/tasks/142-the-backlog-leaves-and-a-short-readme.md`

## Context

`.claude/rules/workflow.md` sent every out-of-scope idea to a `FUTURE.md` at the repository root, so
an ask was neither lost nor smuggled into an unrelated change. This repository is public (ADR
`0142`), and by 2026-11-12 the file held 795 lines of plans, waves of work, third-party notes and
open decisions, readable by anyone.

## Decision

The backlog is kept outside this repository, in a private one. `FUTURE.md` was copied there as it
stood on `dev` `314dd77f` and deleted here. The scope-discipline rule in `.claude/rules/workflow.md`
now sends a deferred idea to that backlog. Public files say the backlog is kept outside this
repository and name no path.

## Alternatives considered

- **Keep `FUTURE.md` public** — the user decided against it: the file is internal planning.
- **Delete it without a copy** — loses every deferred ask, which is what the rule exists to prevent.
- **Rewrite git history to remove it** — not asked for. The file stays in the history of this
  repository; the decision is about what the current tree publishes.

## Consequences

**Positive:**

- The public tree no longer publishes plans and notes the user keeps private.

**Negative:**

- A reader of this repository can no longer follow a pointer to a backlog section. Append-only
  records (older ADRs, task files, post-mortems) keep their `FUTURE.md` citations, which now point
  at a file that is not here. Comments that cited it as a source for a third party's behaviour
  (`packages/protocol/src/arp/x402-networks.ts`, `packages/protocol/src/x402-feed.ts`,
  `docs/33_THE_HIRE_LOOP.md`) now cite a source a stranger cannot read.

**Neutral (worth knowing):**

- `FUTURE.md` remains in this repository's git history up to `314dd77f`.

## References

- Related rule: `.claude/rules/workflow.md` (scope discipline)
- Related ADR: `.claude/choices/0142-the-message-is-not-the-argument.md` (this repository is public)
- Task: `docs/tasks/142-the-backlog-leaves-and-a-short-readme.md`
- Post-mortem: `.claude/learning/130-the-backlog-leaves-and-a-short-readme.md`
