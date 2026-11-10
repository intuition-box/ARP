# 102 — One search makes far too many requests

**Task:** `docs/tasks/113-fewer-requests-per-search.md`
**Completed:** 2026-11-10
**Commit:** `ecf9946f..7345c267` on `29161787`
**Verifier verdict:** PASS (second pass; the first failed on four claims, no code)

## What shipped

- `scripts/measure/pulse-requests.ts` — counts one `arp_pulse` call's requests by host, GitHub kind, GraphQL operation and RPC method, output written beside the counts
- `data/catalogue/pulse-readings.json` (via `scripts/measure/pulse-readings.ts` → `scripts/build/build-pulse-readings.ts`), read by `apps/mcp/src/pulse-readings.ts` — catalogued skills answered from a dated reading, `dated_reading` in the answer
- `packages/protocol/src/pulse.ts` — name search capped at 12 nearest `SKILL.md`, else `incomplete`; scripts capped (5 files, 256 KB each, 512 KB total, none under examples/assets); one read per file per source plus a caller `FileCache`
- `packages/protocol/src/directory.ts` — `contextsQuery`: one aliased query for an agent's proofs, one field and limit per claim
- `apps/mcp/src/{line-words,binding-chain,domain-tree,pulse-cache}.ts` — predicates from the graph (no RPC), `ownerOf` once per token, local signature recovery first, domain tree 5 min, file cache 10 min in memory
- `apps/cli/assets/plugin-skill.md` + `apps/cli/scripts/packages.ts` — plugin and Gemini packages ship a tools-only skill; the build refuses one with a GraphQL query

## Surprises

- The 173 of 215 requests were one function: `locate` reading every other `SKILL.md` when a directory does not carry the skill's name.
- The 19 RPC calls were 7 `ownerOf` + 7 ERC-6492 validator calls for one agent's 7 proofs, 4 `calculateAtomId`, 1 `eth_chainId`.
- The plugin shipped the no-install procedure, which calls raw GraphQL "the source of truth", so a connected agent ran `curl` in the user's terminal.
- Plain `bun test` in `packages/protocol` and `apps/mcp` shows false failures; their gate is `bun run test` (vitest).

## Decisions made

- **Dated reading for catalogued skills, caps and caches for the rest, tools-only packaged skill** — ADR: `.claude/choices/0183-a-search-reads-a-dated-reading-and-the-packaged-skill-names-tools.md` (amends `0052`).

## Rules touched

- `.claude/rules/claims.md` — sufficient; it caught a cited measurement file that did not exist (`T1438` for `T143830`) and a bundle byte count that a later commit had changed.
- `.claude/rules/code.md` — sufficient; two uncommented `as` casts in `scripts/` that no linter sees.

## Suggestions for future tasks

- Cite a measurement file by its full stamp; grep the path before committing.
- Give a size that a later rebuild changes as a command (`wc -c`), not a number.
- After task 112 changes the reader, rerun `pulse-readings.ts` and the build; `apps/mcp/test/pulse-readings.test.ts` fails until you do.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

It serves the skill column's read path at the declared and observed tiers (`arp_pulse` reading what agents wrote and what a skill's files show). It does not move ARP up the ladder: it adds no new evidence, it only makes the existing read cheap enough to use (215 → 22 requests on one phrase, testnet 13579, n = 1).
