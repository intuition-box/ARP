# 115 — A line names what its subject is, which version was used, and what backs it

**Task:** `docs/tasks/127-a-line-names-type-version-evidence.md`
**Completed:** 2026-11-11
**Commit:** `a921d7aa` (on `c637dbf8`), branch `worktree-agent-afa63b92970a1ae3b`, plus an uncommitted one-line typing fix in `packages/protocol/test/atom-standing.test.ts`
**Verifier verdict:** PASS (sections 1 to 3; section 4 and the 13579 write deferred, as the task file records)

## What shipped

- `packages/protocol/src/sponsor/list-tool.ts`: `subjectTypeOf` and `onlyType`. `(skill, has type, Skill)` and `(MCP endpoint, has type, MCP Server)` are planned with the listing. `scripts/seed/list-originals.ts` gets them through `planToolListing`.
- `packages/protocol/src/sources/intuition/terms.ts`: `SKILL_TYPE`, `MCP_SERVER_TYPE` and `VERSION`, chosen by `scripts/measure/subject-type-atoms.ts`.
- `packages/protocol/src/skill-version.ts` and `declare/versioned-use.ts`: `V = (skill, version, sha256:<digest>)` and `T1 = (agent, uses, V)`.
- `apps/sponsor/src/routes/line.ts` and `github.ts`: a version is written only when it is the digest at `HEAD` or the digest of an accepted receipt. Otherwise the answer is 422 `version`.
- `packages/protocol/src/line-evidence.ts`: `checkReceiptEvidence`. `apps/sponsor/src/line-receipts.ts` serves `GET /receipt`. `declare/usage-context.ts` writes `(T3, has evidence, content-receipt:<hash>)`.
- `packages/protocol/src/sponsor/line.ts`: line request v6. The x402 feed still reads archived v5 requests.
- Readers, the hook digest (`node/skill-directory.ts`), `arp share send` and `arp line --skill-dir`.
- Tests: `packages/protocol/test/line-version-evidence.test.ts` and the sponsor's service tests.

## Surprises

- The evidence word changed during the build. The plain-string `backed by` would have shared a label with an IPFS-pinned `backed by` that means "financial or moral support". It became `has evidence`, which already exists on 13579. The fork run predates the change. The ADR says so.
- The spec's duplicate type atoms are not empty on 13579. They carry 68 and 104 edges under a plain-string `has type`. This was corrected in the task file and the ADR.
- `intuition-integrator` needed five rounds. Most of the findings were `uses` readers that missed versioned edges, which turned T1's object into a triple.

## Decisions made

- **The version hangs from the skill, not from the line.** The user decided this. ADR `.claude/choices/0192-a-line-names-its-subjects-type-version-and-evidence.md`, amending `0185`.
- **The evidence goes on T3, with `has evidence`**, the same place `paid with` goes. The receipt is kept by the sponsor and served by hash. ADR `0192`.
- **Section 4 (signed MCP response) is deferred.** The hosted MCP server holds no key, and the hook cannot see `_meta`. The task file scopes the follow-up.
- **The 13579 write is deferred to the v6 release** (orchestrator). An anvil fork run stands in until then.

## Rules touched

- `.claude/rules/security.md`: the signing list now covers line request v6 and the content receipt as line evidence. The rule is sufficient.
- `.claude/rules/claims.md`: sufficient. Every count in the task file and the ADR names its script and measurement file.

## Suggestions for future tasks

- When a triple can stand where an atom stood (T1's object), list every reader of that predicate before review. The reader sweep is what took five review rounds here.
- Before minting a plain-string predicate, check whether an IPFS atom already uses the label with another meaning.
- At the v6 release, write one real versioned line backed by a receipt on 13579. Then rerun `intuition-integrator` and fix the known `registered-tools.ts` undercount.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

This is the skill column, and it opens the observed tier for access only. A versioned line backed by a receipt cites a record the agent did not write by hand: a signature from ARP's node over the digest, which a stranger can check. It attests access, not use, so it never reaches corroborated. It does not move ARP up yet, because no versioned line exists on 13579 until the v6 release.
