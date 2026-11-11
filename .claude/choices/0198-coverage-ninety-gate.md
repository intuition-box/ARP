# 0198 — A 90 % coverage gate in every workspace

**Status:** Accepted
**Date:** 2026-11-11
**Triggered by:** user request, `docs/tasks/136-coverage-ninety.md`

## Context

`code.md` asked for 100 % on contracts and "every public function has a unit test" elsewhere, and
nothing measured the second. On 2026-11-11 the four vitest workspaces could not be measured at all; once
measured, the workspaces ranged from 52 % (`packages/graphql`) to 99 % (`apps/node`) of lines — task 136 holds
the table. The user decided: 90 % everywhere, CI blocks, unit tests only.

## Decision

Each workspace's `test` script runs with coverage and fails under 90 %. Vitest workspaces gate lines,
branches, functions and statements over `src/**`. Bun workspaces gate lines and functions — bun measures
no branches, and applies the threshold to each file rather than to the total, which is stricter — and
carry one test importing every `src/` module, because bun otherwise ignores a file no test loads. Each
bun workspace also ignores `../../packages/**`, which it imports and which its own workspace gates. Contracts keep their 100 % rule. A file excluded from the measurement carries its reason in
the config.

## Alternatives considered

- **80 %** — offered first; the user chose 90.
- **Measure first, set the threshold after** — offered; the user chose a blocking gate now.
- **Live tests against testnet** — declined by the user for this task.
- **Switch bun workspaces to vitest to get branches** — a test-runner migration across six workspaces
  for one metric; not asked for.

## Consequences

**Positive:**
- A coverage drop fails `bun run test`, locally and in CI.

**Negative:**
- Bun workspaces have no branch gate; their 90 % is weaker than the vitest one.
- `scripts/` stays outside every gate (7 test files for 166 `.ts`, 2026-11-11).
- **A recorded departure from `code.md`'s "mock at the network boundary only"**: about half of
  `apps/mcp`'s new tests mock `@arp-protocol/core`'s readers, and five mock an ARP module that does
  the I/O (`readWindow`, `agents.js`, `runSearch`, `needProblemInSkill`, `agentSender`), as the
  workspace's existing tests already did. Each mocked module has direct tests of its own.
- Excluded entrypoints (`apps/hook/src/hook.ts`, `apps/sponsor/src/main.ts` among them) hold logic
  reached only by child-process tests, which bun does not count.
- Coverage proves code ran under a test, not that the test asserts the right thing, and every test
  mocks the network: the live GraphQL schema, the chain and the deployed services stay unverified.

**Neutral (worth knowing):**
- Coverage roughly doubles the test run time in the vitest workspaces.

## References

- Related rule: `.claude/rules/code.md`
- Task: `docs/tasks/136-coverage-ninety.md`
