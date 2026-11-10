# Task 113 — FUTURE.md, sorted into an order the orchestrator can run

**Status:** plan, 2026-11-10. Nothing run. Written for the orchestrator on the user's request (« un plan pour
le reste pour mon orchestrateur »). Each entry below becomes its own task file before work starts; this file
only orders them.
**Not in here:** what HOL needs, which is task 112 (this session): `arp-usage`, `arp check`, a version on the
line, the Sybil answer. Recipes (`FUTURE.md`, "Recipes") wait on 112's version work and on data.
**Rules:** `workflow.md` (every entry is a scope expansion until the user says otherwise), `claims.md`.

## How to read it

Three waves. A wave starts when the one before it is done or blocked. Inside a wave, the order is the
order of the list. **Nothing in waves 2 and 3 starts without the user's decision**, quoted in the task file.
Task 111 (the tester round) comes before all of it: it is the one thing that gives ARP a writer who is
not ARP.

The user is away 2026-11-12 to early December. Wave 1 can run then; waves 2 and 3 wait.

## Wave 1 — no decision, no hosting, no chain write

| # | `FUTURE.md` section | What the task does | Check first |
| --- | --- | --- | --- |
| 1 | "What was missing, beyond the sponsored path", point 1 | Done by task 105 (`apps/mcp/src/handlers/declare-need.ts:2`, "`needs` and `with` on the direct `arp_declare_used`"); `FUTURE.md` still lists it as open. Strike it there | — |
| 2 | same section, point 3 | Read the names a skill's other files say, not only `SKILL.md`, on both sides (hook and sponsor) | that the sponsor can verify more than one file per request within its read budget |
| 3 | "`/list-tool` records what it lists" | A skill listed by the sponsor reaches `data/catalogue/`, so the content server stops answering `unknown-atom` (ADR `0132`) | which process writes the catalogue today; no chain write is needed |
| 4 | "Record the 61 missing atom ids in the catalogue" | Re-record the ids in the catalogue. `FUTURE.md` says all 61 atoms already exist (`isTermCreated` true), so it is a catalogue re-record, not an atom write | re-measure: stop if any atom must be created, that is a chain write |
| 5 | "Left by the sweep" | The `SessionStart` line and a shorter `arp_pulse` answer. `arp check` is task 112 | task 68 phase 5 waited on task 67, which the user excluded: ask whether a shorter answer still stands alone |
| 6 | "A gate for the Tailwind utility that does not exist" | The static check `ui.md` §Gates says is missing | — |
| 7 | "A script for the claim that exists at N sites and gets fixed at N−1" | The sweep `claims.md` check 5 does by hand | needs its own ADR (it changes how the repo checks itself) |

## Wave 2 — one decision of the user's each

| # | Section | The decision |
| --- | --- | --- |
| 8 | "Register ARP's own skill and MCP as tools" | The permanent URL (the `arp-protocol` organisation proposed). Comes before listing ARP in any registry, HOL's included, because the URL is the identity |
| 9 | "One install for Claude Desktop and Claude Code, with one agent" | Which key is the agent's when both are installed. The user called it important (2026-11-02) |
| 10 | "Search by meaning, through skills.sh" | Whether it is still "later". It widens coverage, which task 112's adapter needs |
| 11 | "An agent that arrives with no wallet" | The funder's bound: how much, how often, to whom (ADR `0085`) |
| 12 | "The attestor is one wallet, and one key" | What the attestor is (multisig, curators). Before mainnet, not before |
| 13 | "Who may speak for an agent's identity" | Deferred to the mainnet port by the user (« inutile en démo ») |

## Wave 3 — blocked on something outside the repo

| # | Section | Blocked on |
| --- | --- | --- |
| 14 | "x402: check before paying", "x402 as a feature" | Paused behind skills (the user, 2026-11-09); the feed is built (task 89), a real payer is the gap |
| 15 | "Who pays on mainnet", "A demo where one agent pays another", "The delegation register, read side", "`/account`" | Delegations later (the user, relaying Jer, 2026-11-10), except for hiring (ADR `0147`) |
| 16 | "A market on whether it worked" | "pas le focus" (the user, 2026-11-05) |
| 17 | "Smart contracts as modules" | "full orienté web2" (the user, 2026-11-02) |
| 18 | "A profile page", "One screen for register and declare", "A 'How it works' tab" | The site's hosting, and the agent surface first (the user, 2026-10-21) |

**Already done, kept as record:** "Decide what a refused redirect means to the probe" (task 60).

## Do not do in this task

Build anything. This file orders; each row gets a task file, and waves 2 and 3 get the user's word first.

**Evidence ladder:** none by itself. Rows 2 and 3 serve the skill column at the declared tier (more lines
can carry what was needed; a listed skill becomes readable); row 8 is a precondition of every column.
