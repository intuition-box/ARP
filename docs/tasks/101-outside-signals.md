# Task 101 — don't start empty: outside signals as dated, sourced facts

**Status:** verified 2026-11-10, post-mortem `.claude/learning/90-outside-signals.md`, ADR `0170`.
**ADR:** `0170`.
**Rules:** `code.md`, `ui.md`, `security.md`, `claims.md`, `portability.md`, `workflow.md`.
**Required skills:** `arp-contributing`. No atom or triple, nothing on chain, so no `intuition-integrator`.

## Why

Feature D of the user's list, 2026-11-10: a skill or an agent with no line shows nothing ARP wrote, and
most have none. Public figures already say something about them. Import them as dated, sourced facts,
the way the probe is treated (ADR `0093`): never on chain, never ARP's figure, never in a score or an
order (ADR `0143`). `FUTURE.md` "x402: check before paying", point 2, is the x402 half.

## Deliverables

1. **One pure module**, `packages/protocol/src/outside-signals.ts`: the file's shape (`OutsideSignals`),
   the failure-issue query and its GitHub search URL, a whole-word skill-name match on a title, the
   Trust Index summariser, and `repoFacts` / `endpointFacts`, which return `{says, per, on, check,
   licence?}` and nothing for what was not read. Tested in `packages/protocol/test/outside-signals.test.ts`.
2. **Three measurements, one build** (one dated file per run, ADR `0064`):

   | Script | Writes | Reads |
   | --- | --- | --- |
   | `scripts/measure/repo-liveness.ts`, extended to every repository `skill-paths.json` names | `data/measurements/repo-liveness-2026-11-10.json` | `api.github.com/repos/{repo}`, one request each |
   | `scripts/measure/repo-failure-issues.ts` (new) | `data/measurements/repo-failure-issues-2026-11-10.json` | GitHub search, `repo:{repo} is:issue in:title error OR fail OR failed OR broken OR crash`, paced for 10 a minute without a token. Counts, numbers, states and days only; no title or body is kept |
   | `scripts/measure/x402-trust-index.ts` (new) | `data/measurements/x402-trust-index-2026-11-10.json` | `huggingface.co/datasets/x402Fizzl/x402-trust-index` at the commit read first and recorded, CC BY 4.0, only the rows for the endpoints of ARP's directory (the sieve's walk) and `remote-endpoints.json`, by URL and by host |
   | `scripts/build/build-outside-signals.ts` (new) | `data/catalogue/outside-signals.json` (25,692 bytes) | the three, newest by default |

3. **Where an agent looks.** `apps/mcp/src/outside.ts`: `arp_pulse` adds `outside` to every skill result
   whose repository was read; `arp_find_tools` (full detail) adds it to each tool or skill;
   `arp_agent_endpoints` adds it to each callable endpoint whose host the Trust Index reading asked
   about. Each answer that carries one says once what `outside` is (`OUTSIDE_NOTE`).
4. **Where a person looks.** The skill page's facts column gets an `On GitHub` panel
   (`apps/web/src/components/atom/SkillOutside.tsx`): State (not archived, archived, not found, linked
   to the API request), Failure issues (count and open, linked to GitHub's search), and either the
   newest issue numbers or, in a repository of several skills, those naming this skill. Date beside
   the label, the caveat in a `Hint`, "not read" for a repository the reading did not cover. The agent
   page's facts column gets an `x402 Trust Index` panel under Identity
   (`apps/web/src/components/agent/AgentTrustIndex.tsx`), shown only when one of the agent's hosts was
   read, with the credit and licence as a visible link. The lines layout is untouched.

## The figures, each with its script

Read 2026-11-10.

- **Trust Index** (`x402-trust-index.ts`): dataset commit `96a3e722c575`, scan 2026-11-10, 40,806 rows:
  35,756 go, 3,265 caution, 1,392 no_go, 393 `error` (not on the dataset card: an endpoint that did not
  answer). Asked 324 URLs on 107 hosts. **0 exact URLs found; 6 hosts listed**, one of them with 19
  endpoints all `no_go`.
- **Repository state** (`repo-liveness.ts`): 53 read of 53. 2 archived, both MCP servers
  (`browserbase/mcp-server-browserbase`, `prisma/mcp`), 0 not found. Every skill repository was already
  in `tools.json`, so the extension added none on this run.
- **Failure issues** (`repo-failure-issues.ts`): 53 repositories, 52 read, 1 unread
  (`stripe/agent-toolkit`, HTTP 422 from search). 33 with at least one matching title, 30 with at least
  one open. `build-outside-signals.ts`: 50 skills of several-skill repositories are named by at least one
  title among the newest read.

## Do not do in this task

Anything on chain; a score or an order that reads these figures; copying issue text; Doctor's live API
from the MCP server; the Bazaar (terms not read); the agent page's lines layout; `apps/hook`,
`apps/cli/src/install`, task 102's feeds and listings; deploying, publishing, pushing.

## Gates

`packages/protocol` test and lint; `apps/mcp` test and lint; `apps/web` `bunx tsc -b`, `bun run lint`,
`bun run test`, `bun run check:tokens`; `apps/cli` test, `packages --check`, `check:node`; root
`bun run check` and `bun run test:scripts`. `ui-reviewer` before `task-verifier`.
