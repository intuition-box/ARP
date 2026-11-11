# 113 — The hook tells x402's first 402 from a refusal, and a refusal from paid with nothing back

**Task:** `docs/tasks/125-a-402-is-not-a-refusal.md`
**Completed:** 2026-11-11
**Commit:** `44a539a3` (code), `9ef887b5` (doc fixes after the first verifier FAIL); rebased onto `f6c2cec7` (task 124), was `db25388c` and `ae323bb0`
**Verifier verdict:** PASS (second pass; the first failed on two doc sites)

## What shipped

- `apps/hook/src/classify.ts` — `payment` split into `payment_required` (not a failure), `payment_refused`, `paid_no_delivery`; `isFailure`; `x402` in a text is no longer a payment; a transaction is read, never returned.
- `apps/hook/src/hook.ts`, `skill-failure.ts` — `response.failed` and the skill-failure gate use `isFailure`.
- `packages/protocol/src/activity.ts` (+ test) — reads the three, still reads `payment` on older lines.
- Tests: `apps/hook/test/units.test.ts` (eight, the four probe payloads among them), `hook.test.ts` (challenge `failed: false`, the transaction is not in the log).
- Docs: `apps/hook/README.md`, `docs/22` ~707, `apps/web/public/docs/local-memory.md`, `x402-feed.md`; ADR `0090` header and body (struck in place). `packaging/claude/arp/bin/hook.js` regenerated.

## Surprises

- The probe confirmed the brief's suspicion: the MCP transport's challenge reaches Claude Code's hook as `PostToolUseFailure`, so every x402 call over MCP was logged `payment`, failed. Latent: nothing reads the outcome into a line.
- Claude Code passes an MCP result's content and not its `_meta`, where x402 puts the settlement, so `paid_no_delivery` fires only when the tool writes its settlement in the result.

## Decisions made

- **Class (1) recorded as `payment_required`, not "challenge then paid"** — one payload cannot show the payment that follows; the next line of that tool does, and the log is append-only. No ADR: splitting one outcome changes neither what the hook records nor where it goes (ADR `0090`'s substance), so a header amendment plus an in-place strike was enough.

## Rules touched

- `.claude/rules/claims.md` — sufficient. Check 5 caught both FAIL items: a public doc (`x402-feed.md`) gave an unpaid 402 the wrong class, and ADR `0090`'s body still listed `payment` under a header that amended it.

## Suggestions for future tasks

- When a task renames or splits an enum value, grep the old value in ADR bodies as well as headers, and read every doc sentence that maps a case to a class against the code's own branch order.
- Capture a real x402 call's payload as a fixture before anyone wires `paid_no_delivery` to a `no-delivery` line.
- A non-x402 `402` in a shell command is now not a failure (latent, in the task file's Open section); revisit if a fixture shows a skill-failure lost that way.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Column agent (and hire, the x402 call), tier observed: the hook's runtime record of a paid call is now accurate (a challenge is no longer a failure, a refusal and a paid-nothing-back are apart), but it publishes nothing, so it does not move ARP up the ladder by itself; it keeps a future `no-delivery` line from resting on a misread 402.
