# 0194 — The import is on testnet 13579, whatever the toggle says

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** `docs/tasks/129-the-import-after-a-mint.md`, the user's decision that importing an
agent from Base, BSC or Ethereum is "soon to be released", and `ui-reviewer`'s round 1 on that task

Narrows ADR `0061` for one page. `0061`'s rule stands everywhere else.

## Context

ADR `0061` makes the chain toggle govern writes: a MultiVault write lands on the chain the reader
chose, and the chain rides on the quote. On 2026-11-11 the user made the import testnet-only: the
agent it names is on ARP's registry on 13579, the one a testnet mint lands in, and the other chains
are listed and not offered.

With the toggle on mainnet the import would then price and write a testnet registry agent's record
on 1155, at the mainnet atom cost (`portability.md` rule 3), for an agent that exists only in a
rehearsal registry (`portability.md` rule 4). `ui-reviewer` found the path on task 129. Nothing had
used it.

## Decision

**Every read and write of the import is on Intuition testnet 13579, whatever the toggle says.** The
page and `use-agent-import` take `choiceFor(false)`. Step 3 names the chain the write lands on, so a
reader with the toggle on mainnet sees where it goes.

## Alternatives considered

- **Follow the toggle, and block the steps when it is on mainnet** — rejected. It adds a dead end to
  a path the user has just asked to be unblocked, and it blocks the only chain the import offers.
- **Follow the toggle as `0061` says** — rejected above: a mainnet fee for an agent in a rehearsal
  registry.

## Consequences

**Positive:**
- No path in the import spends on mainnet.

**Negative:**
- One write in the app ignores the toggle, and `0061`'s "the toggle governs writes" now has an
  exception to remember.

**Neutral (worth knowing):**
- When the import opens Base, BSC or Ethereum, this ADR is the one to revisit: those agents' records
  belong on mainnet's graph.

## References

- Related ADR: `.claude/choices/0061-the-toggle-governs-writes.md`
- Related rule: `.claude/rules/portability.md`
- Related task: `docs/tasks/129-the-import-after-a-mint.md`
