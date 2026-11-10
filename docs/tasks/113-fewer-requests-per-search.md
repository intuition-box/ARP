# Task 113 — One search makes far too many requests

**Status:** in progress.
**ADR:** `0183` (amends `0052`).
**Rules:** `code.md`, `claims.md`, `portability.md`, `workflow.md`. Gates: `apps/mcp` test and lint,
`packages/protocol` test and lint, `apps/cli` test, `check:node` and `packages --check`, `apps/hook` test,
root `check` and `test:scripts`. `intuition-integrator` on the changed queries.

## Why

Measured by the coordinator 2026-11-10 (testnet 13579, cold cache, one query "smart contract audit", n = 1):
252 requests in 23.5 s — 189 raw.githubusercontent.com, 28 api.github.com, 19 testnet RPC, 16 GraphQL.
The user's own session ran four phrasings, about a thousand. The user approved five changes, and added a
sixth: "je ne veux pas voir les requêtes GraphQL dans mon terminal".

## Do not do in this task

Change the reader's logic or its output shape (`packages/protocol/src/skill-contents.ts`): task 112 does.
This task changes when and how much the reader is fed.

## Deliverables

1. `scripts/measure/pulse-requests.ts`: the before/after gate. Counts one `arp_pulse` call's requests by
   host, GitHub kind, GraphQL operation and RPC method, and writes the call's output beside the counts.
2. Catalogued skills from a dated reading: `scripts/measure/pulse-readings.ts` →
   `data/measurements/pulse-readings-<stamp>.json` → `scripts/build/build-pulse-readings.ts` →
   `data/catalogue/pulse-readings.json`, read by `apps/mcp/src/pulse-readings.ts`; the answer says
   `dated_reading: {read_at, by}`.
3. Unknown skills: the name search reads at most 12 other `SKILL.md`, nearest the name first, else
   `incomplete`; scripts within 5 files, 256 KB each, 512 KB in all, none under examples or assets
   (`packages/protocol/src/pulse.ts`).
4. Dedupe: one read per file per call, ten minutes per process in memory (`memoryFileCache`).
5. GraphQL: an agent's `has endpoint` proofs in one aliased query (`contextsQuery`); the line predicates
   folded into the search's `PulseAtoms` query.
6. RPC: the predicates no longer read on chain; `ownerOf` once per token per read; a signature recovered
   locally before the chain is asked (`apps/mcp/src/binding-chain.ts`).
7. The packaged skill: `apps/cli/assets/plugin-skill.md` in the Claude Code plugin and the Gemini
   extension, refused by `packages.ts` if it holds a GraphQL query; `skills/arp/SKILL.md` gains one
   paragraph sending a connected agent to the tools.

## What the 19 RPC calls were

Read from `data/measurements/pulse-requests-2026-11-10T1438.json` (`byRpc`), one phrase, testnet:

| count | call | from |
| --- | --- | --- |
| 7 | `eth_call` to `0xC165…0d5A` `0x6352211e` = `ownerOf(uint256)` on ARP's testnet IdentityRegistry | `offersForNeed` → `getAgentEndpoints`, one per proof, all for one agent's token |
| 7 | `eth_call` with no `to` and bytecode `0x6080…` = viem's deployless ERC-6492 signature validator | the same proofs' `verifyMessage` |
| 4 | `eth_call` to the MultiVault `0x2Ece…AB91` `0x6828caa6` = `calculateAtomId` | the four line predicates in `arp_pulse` |
| 1 | `eth_chainId` | `multiVaultReads`' check before its first read |

## Results

`bun run scripts/measure/pulse-requests.ts [phrases…]`, testnet 13579, cold file-list cache, the search
package cached, n = 1 per row. Time includes the search package (about 1.6–1.8 s before the first request).
GitHub's quota is per address and shared with every other session on it: a run that meets the limit
reads `read_file_only` and counts fewer requests, so a row is valid only when its output has no
`github_limit_reached` (none of these does).

| run | phrases | requests | raw | api | GraphQL | RPC | ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| before, `…T143830` | smart contract audit | 215 | 175 | 5 | 16 | 19 | 9,279 |
| after, `…T154122` | smart contract audit | 22 | 6 | 5 | 10 | 1 | 6,808 |
| after, `…T154133` | four phrasings | 26 | 6 | 5 | 14 | 1 | 10,836 |
| after, `…T154140` | powerpoint slides | 38 | 18 | 6 | 13 | 1 | 6,516 |
| after, `…T154147` | frontend design | 36 | 16 | 5 | 14 | 1 | 7,611 |

The coordinator's figure of 252 is the same query on an earlier run; the search's results vary between
runs, so only the two rows of this table are a before and an after.

**What the user sees, before and after on the same query:** `scripts/measure/pulse-requests.ts` writes the
output beside the counts, and the two files' outputs are equal field for field, every skill and `agents`
included. Elsewhere it can differ, and these are the differences:

- a catalogued skill carries `dated_reading` and its facts are of 2026-11-10 (`anthropics/skills`
  `frontend-design` in `…T154147`);
- a name not among the 12 files read is `incomplete`, where reading every file said `absent`
  (`openai/skills` `slides` in `…T154140`, 44 skill files, none named so);
- a script under `examples/` or `assets/`, or over the cap, is named as not fetched.

**After on the domain queries**: 13–14 GraphQL, of which 3 are the domain tree (read once per five
minutes in a process now, so a second search saves them), 2 `PulseDomainEdges` and 1 `FindAgents` for the
declared tools and agents in that domain. The `powerpoint slides` run's 18 raw files are the 12 name
reads for `openai/skills` `slides` and one `SKILL.md` per other result.

## The packaged skill

`packaging/claude/arp/skills/arp/SKILL.md` and `packaging/gemini/arp/ARP.md` now come from
`apps/cli/assets/plugin-skill.md`: no GraphQL block, no endpoint URL, the three tools named, and "Never
query ARP's sources yourself". `apps/cli/test/cli.test.ts` checks both files; `packages.ts` refuses the
source if a query creeps in. `arp init` writes no skill, so nothing else ships one.
