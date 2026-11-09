# Task 87 — The 8004 sieve: separate the agents that exist from the ones that answer

**Status:** verified 2026-11-09: `ui-reviewer` PASS (round 2), `task-verifier` PASS (round 2), commit `1339f8b`, post-mortem `learning/74`. Brief written 2026-11-09 from a design session with the user.
**ADR:** `0156`.
**Rules:** `code.md`, `claims.md`, `portability.md`, `workflow.md`, and `ui.md` for the page.
**Read first:** `docs/19_THE_GAP_A_THIRD_PARTY_MEASURED.md` (all of it), `docs/08` §F5, `docs/14`,
`scripts/measure/cohort-coverage.ts`, `cohort-callable.ts`, `cohort-endpoints.ts`, `erc8004-feedback.ts`,
`apps/probe/`, and the `arp_agent_endpoints` / `arp_probe_endpoint` tools in `apps/mcp/src/tools.ts`.

## Why, in the user's words

> « si on peut éclaircir tout ce noise, c'est peut-être utile »

ERC-8004 registers hundreds of thousands of agents, and almost none of them can be called. A
reader cannot tell the few that answer from the shells, and the feedback beside them is mostly
coordinated. ARP already holds the pieces to sort them (the probe, the endpoint reader, the
3-wallet rule). This task turns them into one reproducible sieve, published, so that:

1. an agent looking for another agent sees the ones that answer first;
2. the user can write to the operators of agents that answer (the outreach of the plan's
   "Semer" phase), not to placeholders;
3. ARP has a public number that nobody else publishes, refreshed on a schedule.

## What the outside says (cite, never merge with ours)

From `docs/19` (arXiv 2606.26028, data to 2026-05-13): a valid registration file with at least one
live endpoint on 3% of Ethereum, 4% of BSC and 15% of Base agents; coordinated Sybil reviewers
73.5%, 59.2% and 90.6%. From Datawallet (stats of 2026-09-18, citing 8004scan): about 519,000
agents over 30 networks, 62% on BNB; 8004scan's July 2026 report, about 2.24% passing its A2A or MCP
health check (cited secondhand, not verified). ARP's own Base measure: 3 of 122 parsed documents
answered a handshake, 2.5% (`docs/14`). `claims.md` §2: these measure different things and are never
summed into a range.

## The sieve

Each agent of a chain gets the **highest rung it reaches**, each rung checkable by one request:

| rung | means | read from |
| ---- | ----- | --------- |
| 0 · shell | an identity with no registration URI, or one that does not resolve | the registry |
| 1 · described | a registration file that parses | the file |
| 2 · declares an address | at least one CALLABLE endpoint (http), per `arp_agent_endpoints` | the file |
| 3 · answers | the endpoint answers (`arp_probe_endpoint`: `live`) | the probe |
| 4 · speaks | it serves the protocol it declares (`serves-declared-protocol`, MCP or A2A handshake) | the probe |
| 5 · used | at least one ARP line names it, from a wallet that is not its own (`wallet_controls_declarer` false) | the graph |

`inconclusive`, TLS, DNS and 429 are **not** verdicts (the probe's existing rules): such an agent
stays at the rung below, marked "could not say", and is retried.

Beside the rung, the agent's ERC-8004 **feedback**, split into two counts and never one: feedback
from reviewers who look coordinated (the study's method, or the simplest honest proxy you can
justify and write down) and the rest. Never a score: ADR `0046`.

## Deliverables

1. `scripts/measure/agent-sieve.ts`: reads one chain's registry (Base 8453 first, then BSC and
   Ethereum), writes `data/measurements/agent-sieve-<chain>-<date>.jsonl`, one row per agent with its
   rung, the evidence for it (the request that proves it, so anyone can rerun it with one curl) and
   the feedback split. Resumable, rate-limited per host, as `apps/probe` is.
2. The summary: count per rung per chain, with Wilson intervals where a sample is used, and the
   two definitions `docs/19` §5 asked `cohort-coverage.ts` to report.
3. The agent directory (`AgentDirectory.tsx`) and `arp_find_agents` gain an "answers now" order or
   filter, rung 3 and up first, with the date of the last check beside it. The default view hides
   rung 0 behind a count ("N registered without a description: show them").
4. A public page or a section of the weekly report: "Of N agents registered on Base, X answer and Y
   speak MCP or A2A, checked on <date>." With the method and the rerun command.
5. `data/outreach/agents-that-answer-<date>.csv`: rung 3 and up, with the operator contact the
   registration file states (nothing scraped beyond it). For the user's business-dev agent, which
   drafts emails he validates.
6. An ADR if the directory's default order changes.

## Checks

The usual gates in `apps/web` and `apps/mcp`. For the script: a run on a sample of 500 Base agents,
its summary pasted in the task's completion note, and three rows of each rung rechecked by hand with
the stored curl.

## Do not do in this task

- Publish a score, a grade, or a single "quality" figure (ADR `0046`).
- Write any line or position on chain about an agent from this sieve. It reads and probes; it does
  not attest (ADR `0045`: ARP is never on the request path, and nothing here vouches).
- Merge the outside figures with ours into one number (`claims.md` §2).
- Mainnet writes without the user's confirmation.
- Contact anyone. The CSV is for the user to decide.

## What was built (2026-11-09)

| deliverable | where |
| --- | --- |
| 1. the sieve | `packages/protocol/src/sieve.ts` (the rung, pure, tested), `scripts/measure/agent-sieve.ts` (the walk: `--population registry --chain <id> --count N`, `--population directory`, `--ids`, `--retry`, `--workers`, `--summary`, `--outreach`), `scripts/helpers/registration-document.ts` (shared with `verify-cohort.ts`) |
| 2. the summary | `--summary`: per chain, count per rung, Wilson 95%, could-not-say, the hosts and owners behind rungs 3-4 and the figures without the largest host, both definitions `docs/19` §5 asked for, the feedback split |
| 3. directory and MCP | `data/catalogue/agent-sieve-13579.json` (`scripts/build/build-agent-sieve.ts`), read by `/agents` (Reachable is rung 3+, shells hidden behind a count under All) and by `arp_find_agents` (`order: answers-now`, and a `rung` on listed agents). It replaces task 82's `agents-reachable.json` |
| 4. the public page | `/docs/the-sieve` (`apps/web/public/docs/the-sieve.md`) |
| 5. the outreach list | `data/outreach/agents-that-answer-2026-11-09.csv`, git-ignored: 40 agents at rung 3+, 1 of which states an email in its own file |
| 6. the ADR | `0156` |

Not walked in this task: BSC 56 and Ethereum 1 as whole registries. The script reads both (`--chain 56`, `--chain 1`);
the directory's five BNB agents and three X Layer agents were read through `--population directory`.

## Completion note: the summaries

`bun run scripts/measure/agent-sieve.ts --summary data/measurements/agent-sieve-8453-2026-11-09.jsonl`, a uniform
sample of 500 Base token ids (largest drawn 1,171,620) out of a registry whose highest minted id was 1,175,637 at
2026-11-09T18:39Z, after the draw (`agent-sieve.ts --highest --chain 8453`):

```
0 shell 11 · 1 described 36 · 2 declares 1 · 3 answers 0 · 4 speaks 452 · 5 used 0     could not say 2
rungs 3-4 come from 2 hosts and 452 owners; largest: centralcity.ai 451, fracture-alpha.vercel.app 1
without the largest host: n = 49, rung 3+ 1, rung 4 1
broad (any declared URL alive): 457/500, 95% 88.6%–93.6%   ARP's (MCP or A2A, rung 4+): 452/500, 95% 87.5%–92.7%
```

`--summary data/measurements/agent-sieve-directory-2026-11-09T2000.jsonl`, ARP's directory on testnet 13579, every
agent read (283 with an identity that resolves), per identity chain:

```
Base 8453 n=244: 0:33 1:121 2:50 3:0 4:40 5:0, could not say 43; rungs 3-4 from 36 hosts and 39 owners, largest 4
13579 n=31: 0:30 1:1 (ARP's own test identities, minted with no registration file)
BNB 56 n=5: 1:5            X Layer 196 n=3: 1:1 2:2, could not say 2
```

**Read it with its concentration.** On Base, 451 of 500 sampled agents are A2A cards served by one platform,
centralcity.ai, each under its own owner. Without it, 1 of 49 speaks (0.4% to 10.7%). "Speaks A2A" means the card was
served, not that a task was handled.

## Completion note: three rows per rung, rechecked by hand with the stored request (2026-11-09)

| rung | agents (Base) | rechecked | holds |
| --- | --- | --- | --- |
| 0 | 3143, 3146, 15364 | `tokenURI` is an HTML page (the EIP's), twice, and an empty string | yes |
| 1 | 9, 35013, 1743 | each file parses; 9 declares one `web` link, 35013 and 1743 (`data:` URIs) declare no endpoint | yes |
| 2 | 35304, 35306, 17666 | the two A2A cards do not answer (curl 000), the MCP answers 502 | yes |
| 4 | 22383, 22426, 22419 | MCP `initialize` returns a JSON-RPC `result` | yes |

The recheck found one reader defect, fixed before this note: a `tokenURI` holding the JSON itself (agents 16666 and
50992) was read as a shell. Both now read at rung 1.

No agent reached rung 3 without rung 4, nor rung 5: the directory's agents carry no line from a wallet that is neither
the owner's nor ARP's. Rung 5's logic is covered by `packages/protocol/test/sieve.test.ts`.
