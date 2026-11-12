# Task 139 — Prune what production does not need; keep the hire loop on `future/hire-loop`

**Status:** done 2026-11-11 on a worktree branch from `origin/dev` (`72a62f1c`). `task-verifier` PASS (second round). ADR `0199`,
post-mortem `.claude/learning/127-prune-dev-keep-the-hire-loop.md`.
**Rules:** `code.md`, `workflow.md`, `claims.md`, `security.md`.
**Required skills:** `arp-contributing`.

## Why

The user's decisions of 2026-11-11, on an inventory of what `dev` carries that production does not
use: « on supprime [cli-v0 et les démos ponctuelles] sauf si les démos sont essentielles »;
« B, pour plus tard : le sortir de main sur une branche future/hire-loop ». For C, the dead code, the
orchestrator recommended deletion and the user is of the same mind.

**C is deleted here.** If you want any of it back, say so: every file is on `future/hire-loop` and in
git at `72a62f1c`.

## What was done

1. **`future/hire-loop`** created from `origin/dev` at `72a62f1c9a0b1e97c85228a308cbccf18178d352` and
   pushed, with nothing added.
2. **Removed on the `dev`-bound branch**, every item re-derived from the code (importers and symbol
   use, `grep` across `apps/`, `packages/`, `scripts/`, docs):

| category | what | files | lines |
| --- | --- | --- | --- |
| B | web delegation flow: `DelegationForm`, `use-account-delegations`, `use-stored-delegations`, `use-agent`, `caveat-builder`, `agent-action`, `agent-identity`, `delegation`, `delegation-revoke`, `delegation-store`, `delegation-view`, `native-balance`, their tests. Nothing imported `DelegationForm` or `use-account-delegations`; the rest was imported only from inside the set | 18 | 1,778 |
| C | web: `use-profile`, `account-profile`, `intuition-pin`, their tests (no importer) | 6 | 661 |
| B | protocol: `declare/delegated.ts`, `delegation/register.ts`, `delegation/state.ts`, `declare/endpoint-binding-plan.ts`, `handshake-http.ts`, their tests | 10 | 1,688 |
| C | protocol `term-labels.ts` and its test, graphql `queries/atom-labels.ts` (`getTermLabels` was named only in a comment) | 3 | 144 |
| B | `apps/node` | 14 | 2,233 |
| B | `apps/cli/src/node-init.ts` and its test | 2 | 351 |
| B | `apps/sponsor/src/routes/publish.ts` | 1 | 140 |
| B | `contracts/src/enforcers/ReceiptEnforcer.sol` and its test (in no `data/deployments/*.json`) | 2 | 1,151 |
| B | hire demos: `demo-hire.ts`, `agent-call-handler.ts`, `agent-call-test.sh`, `agent-call-wallet.ts`, `agent-paid-test.sh`, `agent-pulse-handler.ts`, `agent-pulse-read.ts`, `agent-pulse-walk.ts`, `helpers/hire-payment.ts`, `test/hire-payment.test.ts` | 10 | 1,589 |
| D | one-off demos: `pulse-walk.ts`, `pulse-nested-walk.ts`, `scripts/sandbox/setup.ts` | 3 | 658 |
| B | `docs/design/readme-badges/` | 12 | 172 |
| D | `docs/design/cli-v0/` | 28 | 4,426 |
| | **all removed files** | **109** | **14,991** |

Each row re-derives with `git diff --diff-filter=D --numstat 72a62f1c <tip> -- <paths> | awk '{f++; d+=$2} END {print f, d}'`
(`<tip>` the branch's commit); for example `-- apps/node` prints `14 2233` and `-- docs/design/cli-v0`
prints `28 4426`. With no pathspec it prints `109 14991`. Edited files add 335 lines and remove 2,043.

3. **Edited to match**: the sponsor drops `/publish`, `PublishConfig`, `intuitionJsonPinner`,
   `checkPublishLimits` and `publicationsPerDelegatorPerDay` (env `SPONSOR_PUBLICATIONS_PER_DELEGATOR_PER_DAY`)
   and the `publish` field of `GET /`; the ledger's `publish` kind stays so an older ledger reads.
   The CLI drops `case 'node'`, `arp init --node`, `@arp/node`, the `--external
   @metamask/smart-accounts-kit` flag and the test for it, and `check-node.sh`'s node check;
   `apps/cli/CHANGELOG.md` records the removal under "Unreleased"; `packaging/` regenerated.
   `@arp-protocol/core` no longer declares the kit; `tsconfig.build.json` lists `"types": ["node"]`
   (ADR `0199`, neutral consequence). Root `package.json` drops the `apps/node` workspace.
4. **Docs and records**: `docs/22` (the node section and column), `docs/23`, `docs/31`, `docs/15`,
   `docs/26`, `docs/27`, `docs/33`, `docs/design/README.md`; the site's `cli`, `agents-and-nodes`,
   `developers`, `architecture`, `glossary`, `uninstall`, `networks`, `testers`, `what-arp-publishes`
   pages and the manifest summary; `README.md`, `apps/cli/README.md`, `apps/sponsor/README.md`,
   `apps/web/DEPLOY.md`, `packages/protocol/README.md`; `CLAUDE.md`'s directory map;
   `.claude/rules/security.md` (twelve signing sites become ten, the two that left named as on
   `future/hire-loop`), `.claude/rules/metamask-delegation.md`; `FUTURE.md`'s delegation and hire
   entries point at the branch; `contracts/SECURITY_REVIEW.md`; code comments that named a removed
   file. Task files and post-mortems are records and are not edited.

## Decided

- **The sponsor's `/publish` is B, removed.** Its only client was the web delegation flow.
- **The sponsor's hire-receipt proof stays.** `sponsor/proof.ts` checks content and hire receipts in
  one module, and `hire-receipt.ts` is also read by `agent-pulse.ts` and `sponsor/request.ts`.
- **Kept as essential** (a current document tells a reader to run it, a test runs it, or production
  runs it): `x402-e2e.ts`, `x402-fake-seller.ts` and `x402-seller.Dockerfile`; `terminal-demo.ts`
  (`docs/26` §6, `docs/31`); `demo-loop.ts` (`docs/21`) and `demo-adopt.ts`, which it spawns;
  `scripts/sandbox/versioned-line-fork.ts` (behind a measurement `docs/28` cites);
  `scripts/agent/agent-declare-used.ts` (direct mode; it named `toDelegatedCalls` in a comment only).
- **Kept against the inventory**: `demo-adopt.ts` (listed B; direct mode, run by `demo-loop.ts`) and
  `components/brand/nav-height.ts` (listed C; imported by `scripts/measure/landing-fit.ts`).
- **Kept, unsure**: `handshake.ts` whole, though only the endpoint-binding read in `directory.ts`
  uses it on `dev` now; its verifier half (`createHandshakeVerifier`, `memoryChallengeStore`) has no
  caller outside tests. Pruning it inside a module production reads is a separate change.
- Measurements from deleted scripts stay (`data/measurements/pulse-walk-2026-11-05.jsonl`,
  `agent-call-2026-11-05.jsonl`, `agent-pulse-*-2026-11-05.jsonl`): one file per run, never removed
  (ADR `0064`); their scripts are on `future/hire-loop`.

## Gates

Run 2026-11-11 on the branch: `packages/protocol` lint, test (1414 pass, 4 skipped); `packages/graphql`
lint, test (21); `apps/sponsor` lint, test (199); `apps/mcp` lint, test (337); `apps/hook` lint, test
(116); `apps/api` lint, test (31); `apps/probe` lint, test (16); `apps/cli` lint, test (82),
`check:node` PASS, `packages --check` matches; `apps/web` `tsc -b`, lint, test (844 pass, 2
skipped), `check:tokens`; root `bun run check` (`check:scripts`, tokens, contrast) and `test:scripts`
(40); `contracts` `forge test` (63). By hand: `arp node` → `unknown command 'node'`, `arp init --node`
→ `unknown option --node`, exit 2.

## Evidence ladder

Column hire, tier observed: on `dev` it moves ARP down one cell, by the user's choice. The node that
signed the hire receipts behind that cell (`docs/32`, `docs/tasks/65` §8) is on `future/hire-loop`,
while the receipt readers (the sponsor's hire proof, `agent-pulse.ts`) and the receipts already
written stay. The skill column's production path is untouched.

## Do not do in this task

- Push anything but `future/hire-loop`. Merge into `dev` or `main`.
- Edit `future/hire-loop` beyond creating it.
