# 81 — A hosted read-only MCP endpoint

**Task:** `docs/tasks/92-a-hosted-read-only-mcp-endpoint.md`
**Completed:** 2026-11-10
**Commit:** `e94ac2e`, `576224c`, `ce7cdae`, `bdaa1cc` on `feat/92-hosted-mcp-endpoint` (not pushed)
**Verifier verdict:** PASS (round 2; round 1 failed on one unqualified copy of the words claim)

## What shipped

- `apps/mcp/src/hosted.ts`: `hostedRefusal`, `loggable` and `publicHost`. `config.ts` checks them before the receipt key exists.
- `apps/mcp/src/server.ts` and `handlers/pulse.ts`: hosted, the two log sites print the error's class only. Hosted, the instructions leave out the sharing question. `httpPolicy` adds `ARP_PUBLIC_HOST` and `https://<name>`. Hosted refuses stdio.
- `apps/mcp/test/hosted.test.ts`: 13 tests. They cover the refusals and the Host and origin checks. The leak test uses a graph stub that quotes its variables back, plus a non-hosted control that must print both the words and the atom id.
- `apps/mcp/Dockerfile` and `Dockerfile.dockerignore`, an allowlist.
- Docs updated:
  - `apps/web/DEPLOY.md`: the "The MCP endpoint" section.
  - `docs/22` and `docs/23` §5.
  - `skills/arp/SKILL.md` and `apps/mcp/README.md`.
  - The alias table's note.
  - Both `domain-words.ts`.
  - The `constraints` description in `tools.ts` and `apps/web/public/docs/mcp-tools.md`.
  - ADR `0155`'s status line.

## Surprises

- The words claim had more copies than the brief listed. The first sweep qualified the protocol's `domain-words.ts` but missed its twin in `apps/mcp/src/domain-words.ts`, the server that now runs hosted. The fix round then found two more: "Stays local." in `tools.ts`, which the hosted endpoint itself serves, and its copy in the public docs. That is `claims.md` check 5 again: grep the claim's meaning, not one wording.
- The first leak-test control asserted only that the atom id leaked locally, not the words, so the words assertion could have passed with nothing to catch. It was fixed in `bdaa1cc`.

## Decisions made

- **Hosted endpoint, opt-in, read-only, testnet, keeps no argument.** ADR `.claude/choices/0161-a-hosted-read-only-mcp-endpoint.md`, which amends `0155`.
- **`docs/12` not edited**: "never hosts one they have to reach" still holds, because nothing installed routes to the endpoint.
- **Historical records left as written**: learning/75, docs/tasks/84 and docs/tasks/89 keep "never leaves the machine". STATE row 84 is to be qualified at task close.
- **The listing cache stays**: it is keyed by repository, holds no word, and ADR 0161 discloses it.

## Rules touched

- `.claude/rules/claims.md`: sufficient. Check 5 caught the twin, as written.
- `.claude/rules/security.md`: sufficient. No new signature site; the hosted mode holds no key.
- `.claude/rules/portability.md`: sufficient. Hosted mode is forced to testnet, matching the plugin, the CLI and the site.

## Suggestions for future tasks

- When qualifying a privacy claim, grep for its meaning: "stays local", "never leaves", "stay here", "never sent". Also grep tool descriptions and `apps/web/public/docs`, not only the comments the brief names.
- A leak test's control must assert the exact strings the main assertion forbids. Otherwise it can pass on a capture that sees nothing.
- Still untested: a third-party remote MCP client against the deployed endpoint. Try one after deploying on Coolify.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

It serves the skill and agent columns at the declared and observed tiers, as a reader only (it hosts the read tools), and does not move ARP up a tier: it writes no line and adds no record anyone did not write by hand.
