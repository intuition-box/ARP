# Task 125 — The hook tells x402's first 402 from a refusal, and a refusal from paid with nothing back

**Status:** in progress 2026-11-11, on the worktree branch, for the orchestrator to push.
**ADR:** none. The outcome list in ADR `0090` is amended by this task (its header says so).
**Rules:** `code.md`, `claims.md`, `workflow.md`. Gates: `apps/hook` test and lint, `apps/cli` test,
`check:node`, `packages --check`, root `bun run check`, `packages/protocol` test (its `activity.ts` reads
the outcomes).
**Required skills:** `arp-contributing`.

## Why

Task 119's review, finding (a) (`docs/tasks/119-an-endpoint-url-without-its-values.md`): the runtime hook
(`apps/hook/src/classify.ts`) had one local outcome, `payment`, for "a 402 or a refused payment". It
probably also caught the ordinary first 402 of every x402 call (untested), and "paid, nothing received"
had no local class. Everything here stays on the machine: the hook records locally (ADRs `0167`–`0169`,
`0179`).

## Do not do in this task

- Add a closed reason for "refused before payment" to the on-chain vocabulary
  (`packages/protocol/src/declare/usage-words.ts`). Not without the user.
- Touch `packages/protocol/src/sponsor/line.ts` (task 122).
- Invent evidence: a class is written only from what one payload shows.

## Measured first: today's classifier on four x402 payloads

A throwaway test (`apps/hook/test/probe-402.test.ts`, deleted after it ran) fed today's `classifyCall`
four payloads, on 2026-11-11 at `440cfd1f`:

| payload | today | right |
| --- | --- | --- |
| A — the MCP transport's challenge as Claude Code delivers it: `PostToolUseFailure`, `error` = the `PaymentRequired` JSON (`x402Version`, `accepts`) | `payment` | the challenge, not a failure |
| B — a call that paid and answered, its text naming the 402 | `ok` | `ok` |
| C — a failure whose text shows a settlement (`success: true`, a transaction) and then a `502` | `payment`, code `402` | paid, nothing delivered, `502` |
| D — `x402 fetch: request timed out` | `payment` | `timeout` |

So the first 402 **was** misclassified, whenever it reached the hook as a failed call. That is the MCP
transport's design: the server answers `isError: true` with the `PaymentRequired` object
(coinbase/x402, `specs/transports-v2/mcp.md`, section "Payment Required Signaling"), and Claude Code
fires `PostToolUseFailure` on an `isError` result. A paying client that handles the 402 inside one tool
call (B) never showed the hook a failure, and was already right. The word `x402` alone also made any
failure a `payment` (D).

**Reachability.** Latent on this machine's evidence: the session log feeds no line (below), and no
captured payload of a real x402 call exists in `apps/hook/test/fixtures/`. Nothing measured how many
recorded `payment` lines exist on users' machines; the hook sends none of them anywhere.

## What the hook can observe

- Claude Code hands the hook an MCP result's **content blocks** (`tool_response` is an array of
  `{type, text}`, `apps/hook/test/fixtures/claude/mcp-post-tool-use.json`), and on an `isError` result
  only an `error` string (`mcp-post-tool-use-failure.json`). Not `_meta`, which is where the MCP transport
  returns the settlement (`_meta["x402/payment-response"]`, same spec, "Settlement Response Delivery").
- So a settlement is seen only when it is in the payload: a tool that writes it in its result or error,
  a `SettleResponse` object (`success`, `transaction`, `network`) anywhere in a structured response, or
  an HTTP `PAYMENT-RESPONSE` / `X-PAYMENT-RESPONSE` header's base64 JSON written in a text
  (`specs/transports-v2/http.md`, "Settlement Response Delivery").
- One payload is one call. Whether a challenge was then paid is a **later** call, and the session log is
  appended, never rewritten.

## What shipped

`apps/hook/src/classify.ts`: `payment` is replaced by three outcomes, and `isFailure(outcome)`.

| outcome | written when | a failure? |
| --- | --- | --- |
| `payment_required` | a `402`, or a `PaymentRequired` object (`x402Version` with `accepts`), or `payment required`, with no other status, no timeout or network error, no refusal and no settlement | no |
| `payment_refused` | `insufficient funds`/`insufficient_funds`, a payment failed/refused/rejected/declined/invalid, `Settlement failed`, a `SettleResponse` with `success: false`; and in a text about x402 or a payment, `"success": false`, an `errorReason`, an `invalid_*signature/payload/payment*` code | yes |
| `paid_no_delivery` | a settlement with `success: true`, a `network` and a transaction (EVM hash or base58 signature) is in the payload, and the call failed or its content is all blank | yes |

- In `paid_no_delivery` the code is the status that ended the call, never the 402 that was paid.
- Without a settlement in the payload there is no paid class: a paid call that failed is what failed
  (`tool_error`, `timeout`...), and an empty answer is `ok`. A response shape whose content the hook
  cannot point at (no string, no content blocks) stays `ok`.
- `x402` in a text is no longer a payment.
- The transaction is read to decide and never returned or written.
- `apps/hook/src/hook.ts`: `response.failed` is `isFailure(outcome)`, so a challenge line is not marked
  failed. `apps/hook/src/skill-failure.ts` uses the same test, so a shell command's 402 challenge does
  not start a skill-failure record.
- `packages/protocol/src/activity.ts` reads the three, and still reads `payment` on older lines.
- Tests: `apps/hook/test/units.test.ts` (`x402 (task 125)`, eight tests, the four probe payloads among
  them), `apps/hook/test/hook.test.ts` (a challenge line is `failed: false`, a settled call that failed
  is `failed: true`, the transaction is not in the log), `packages/protocol/test/activity.test.ts`.
- Docs: `apps/hook/README.md`, `docs/22_RUNNING_THE_NODE.md`, `apps/web/public/docs/local-memory.md`,
  `apps/web/public/docs/x402-feed.md`; ADR `0090`'s header. `packaging/claude/arp/bin/hook.js`
  regenerated.

## How the classes feed a failure answer or a suggested line

They feed none, checked in the code:

- The session log's `outcome` is read by `packages/protocol/src/activity.ts` (an event stream; no
  page renders the outcome: `grep -n outcome apps/web/src/services/activity-log.ts
  apps/web/src/components/brand/ActivityLog.tsx apps/web/src/hooks/use-activity-log.ts` prints nothing).
- A failure answer (`failure-answer.ts`) and `~/.arp/failures.jsonl` come only from a failed `Bash`
  command a skill asked for, with a reason from `failureReason` (`missing-key`, `missing-program`,
  `missing-file`). The suggested line (`worked.ts`) is the model's `worked|failed|unsure` about a skill.
  `arp share` sends those two files' lines. None reads `session.jsonl`'s outcome.
- `grep -rn "no-delivery" apps/hook/src apps/cli/src` prints nothing: no local class becomes the closed
  reason. `paid_no_delivery` means what `no-delivery` means (paid, nothing back), and is not wired to it.

## Open

- A real x402 call's payload is not captured as a fixture; the shapes above are the spec's.
- Whether to join a `payment_required` line to the next line of its tool, in a reader, is not done.
- Whether `paid_no_delivery` should propose a `no-delivery` line is the user's decision (it would carry
  no payment proof unless the payload's transaction were kept, which the hook never does today).
