# 127 — Prune what production does not need; keep the hire loop on `future/hire-loop`

**Task:** `docs/tasks/139-prune-dev-keep-the-hire-loop.md`
**Completed:** 2026-11-11
**Commit:** `d85ab7b0` on `task-139-prune`, over `origin/dev` `4815c2b9`
**Verifier verdict:** PASS (second pass; first FAIL on `.env.example` and the ladder sentence)

## What shipped

- `future/hire-loop` — pushed at `72a62f1c`, nothing added; holds every removed file.
- 109 files, 14,991 lines removed (`git diff --diff-filter=D --numstat 4815c2b9 HEAD`): the web
  delegation flow, `declare/delegated.ts`, `delegation/register.ts` and `state.ts`,
  `endpoint-binding-plan.ts`, `handshake-http.ts`, `apps/node`, `apps/cli/src/node-init.ts`, the
  sponsor's `POST /publish` and its limit, `ReceiptEnforcer`, the hire demos, the dead
  `use-profile`/`account-profile`/`intuition-pin`/`term-labels`/`atom-labels`, `docs/design/cli-v0`
  and `readme-badges`.
- `apps/cli/CHANGELOG.md` "Unreleased" records `arp node` and `arp init --node` as removed; `packaging/`
  regenerated (`packages --check` matches).
- `.claude/rules/security.md` (ten signing sites), `metamask-delegation.md`, `CLAUDE.md` map,
  `FUTURE.md`, `STATE.md`, site docs, `docs/22`, `23`, `26`, `27`, `31`, `33`, `.env.example`.

## Surprises

- `packages/protocol`'s build found Node's types only through `@metamask/smart-accounts-kit`;
  removing `delegated.ts` broke `tsconfig.build.json` until `"types": ["node"]` was added.
- ui-reviewer caught a docs page that lost unrelated sections (`cli.md` init/uninstall/doctor,
  `--version`) during the node section's removal. Diff a pruned page against the base, not just grep it.
- The verifier caught a dead env var (`ARP_DIRECTORY_URL`) in `.env.example`: greps over code missed
  it because the variable was read only inside the deleted file.

## Decisions made

- **`/publish` removed, hire-receipt proof kept** — `/publish` had one client (the web flow); the
  proof shares `sponsor/proof.ts` and `hire-receipt.ts` with production readers. ADR: `.claude/choices/0199-prune-dev-and-keep-the-hire-loop-on-a-branch.md`.
- **Essential = a current doc, a test or production runs it** — kept `demo-loop.ts`/`demo-adopt.ts`,
  `terminal-demo.ts`, `versioned-line-fork.ts`, `agent-declare-used.ts`, `nav-height.ts`, x402 demos.
- **C deleted** with a note in the task file that the user may object; all on the branch.

## Rules touched

- `.claude/rules/security.md` — signing-site list updated, twelve to ten; sufficient.
- `.claude/rules/claims.md` — check 5 (grep the old wording) applied to env vars too; sufficient.

## Suggestions for future tasks

- When deleting a program, grep its `process.env` reads out of the deleted files at the base commit
  and sweep each name through `.env.example` and docs.
- For each docs page edited in a prune, `git diff <base> -- <page>` and read every removed hunk.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Column hire, tier observed: on `dev` it moves ARP down one cell, by the user's choice — the node that
signed the hire receipts behind that cell (`docs/32`, `docs/tasks/65` §8) is on `future/hire-loop`,
while the receipt readers (the sponsor's hire proof, `agent-pulse.ts`) stay, and the skill column's
production path is untouched.
