# 0166 — A line names what was missing, and what made it work, when the skill already says it

**Status:** Accepted
**Date:** 2026-11-10
**Amends:** ADR `0138` (the line's shape gains one level), ADR `0144` and ADR `0162` (the line request's version), `.claude/rules/security.md` (the line request's signing-site entry and the sponsoring table's line row)
**Triggered by:** the user, 2026-11-10, task 97: "agent A's line says failed → missing-program → needs ffmpeg; agent B installs ffmpeg, it works, and B's line says worked → with ffmpeg"

## Context

A form B line (ADR `0138`, `packages/protocol/src/declare/usage-context.ts`) says
`T4 = (T3, because, missing-program)` and stops. The next agent learns a program was missing, not which.
The runtime hook already sees which: the failed command, its error, and the skill's own SKILL.md
(`apps/hook/src/skill-failure.ts`). The obstacle is ADR `0155` and the user's standing rule, "never
collect user text": an error message carries the person's paths, their own programs, their variables.

## Decision

1. **The shape.** One more level, after the reason or the worked outcome:

   ```
   T5 = (T4, needs, ffmpeg)            on a missing-program or missing-key failure
   T4 = (T3, with, ffmpeg)             on a worked line: what the agent had to add
   ```

   The object is a plain text atom holding the name, so `ffmpeg` is one atom every line shares.
   Kind is read from the shape, since the two patterns cannot overlap (one is lower case, the other
   upper), and on a failure from the reason too.

2. **The predicates** are the plain strings `needs` and `with`, as `has outcome` and `because` are.
   Checked on 13579, 2026-11-10 (`scripts/measure/need-level-cost.ts` and an index query): `with` already
   exists as a `TextObject` atom (one triple uses it as predicate, about something else); `needs` does not
   exist as a string atom (`Needs`, a `Thing`, and `requires`, a `Thing` behind an IPFS URI, are different
   atoms with different ids). `requires` was not reused: its id is the IPFS document's, not the word's.

3. **What a name may be** (`packages/protocol/src/declare/line-need.ts`):
   - a program: `^[a-z0-9][a-z0-9._+-]{0,39}$`;
   - an environment variable's **name**: `^[A-Z][A-Z0-9_]{2,63}$`. Never a value; nothing reads one.

   `missing-program` takes a program, `missing-key` a variable's name, and no other reason takes either.
   A worked line takes either.

4. **The privacy guard.** A name is published only when the skill's own SKILL.md names it, whole
   (`publishableNeed`, `namedInSkill`): a word its author already published. A program is matched in any
   case (`FFmpeg` in prose names `ffmpeg`), a variable's name exactly. Otherwise the level is omitted and the
   line stops at the reason. Applied three times:
   - **the hook** extracts the name from the error's own wording (`needOf`: `command not found: X`,
     `spawn X ENOENT`, `X is not set`, …), takes a path's last part, and keeps it in `failures.jsonl` only
     if the guard passes. A name the guard refuses never reaches the file;
   - **the CLI** checks the shape (`lineFromArgs`) before any key is made;
   - **the sponsoring service** reads the SKILL.md again (decision 5) and refuses the whole request when
     the name is not in it.

5. **How the service verifies it** (`skillMarkdownOnGitHub`, `apps/sponsor/src/github.ts`). The tool's URL
   comes from the index (`lineToolUrl`, as ADR `0162`); it must be a skill (`?skill=`). The SKILL.md is found
   by the content server's rule (`resolveContentPath` over GitHub's tree at `HEAD`) and read from
   `raw.githubusercontent.com`, cut at 512 KB, remembered ten minutes per URL. No single SKILL.md, a
   repository URL, or an endpoint: refused (422, `rule: need`). GitHub not answering: 503, nothing written.
   **A refusal refuses the line, it does not strip the level**: the agent signed the name, and writing a
   line it did not sign would be the service's sentence. The agent can sign again without it.

   **SKILL.md only, on both sides**, not "the files it ships": the service verifies one file with one tree
   read and one raw read. A name only a shipped script says is a false negative, never a leak
   (`FUTURE.md`). `HEAD`, not the commit the agent installed: a word the author has since removed is no
   longer theirs to have published, and the hook reads the installed copy, so it can only be stricter.

6. **The request.** `LineRequest` version 4 adds `need: string` (`""` for none), signed. A version 3
   request no longer verifies, the convention of ADRs `0159` and `0162`; the desktop loop signer
   (`apps/mcp/src/desktop/loop.ts`) changes in the same commit. A need beside a payment is malformed: an
   endpoint has no SKILL.md.

7. **The read.** `getPulseUsage` reads `with` in the reason query and `needs` in one more query over the
   reasons a declarer stands behind, under the same rule as every level (ADR `0138`): it counts for a
   wallet that created it or holds a position on it, and stands behind the levels below; anybody else's
   goes to `byOthers`. A name of the wrong shape for its reason is ignored, whoever wrote it. `arp_pulse`
   shows `needs` / `with` on a line and `by_need` / `by_with` beside `by_reason`, in the chain's words.
   **It moves no score.** The 3-wallet threshold (ADR `0143`) governs ranking only, and these levels are
   not ranked on.

## Cost, read from the chain

`scripts/measure/need-level-cost.ts`, testnet 13579, 2026-11-10: `getAtomCost` 1,000,000,001,000,000 wei,
`getTripleCost` 1,000,000,002,000,000 wei, `minDeposit` 1,000,000,000,000,000 wei. So the level costs one
triple, **0.002000000002 tTRUST** (cost plus `minDeposit`, what the planner sends); a name no line used
before one more atom, **0.002000000001**; and `needs`, the first time on 13579, one more atom of the same
price. On a sponsored line the service adds its deposit in the agent's name on the level
(`SPONSOR_DEPOSIT_WEI`), as on every level. Mainnet costs are 100 times these (`portability.md`) and are
read there before any port; nothing here is tuned on them.

## Alternatives considered

- **Typed atoms (`program:ffmpeg`, `env:OPENAI_API_KEY`).** One more convention nobody else reads; the
  patterns already tell the two apart, and a plain `ffmpeg` is the same atom for every line.
- **A free name, guarded by shape alone.** A shape lets `acme-client-renderer` or `ACME_PROD_TOKEN`
  through, which are the person's. The SKILL.md check is the part that makes it a published word.
- **Strip the level server-side instead of refusing.** The service would write a sentence the agent did
  not sign.
- **Read every file the skill ships.** One request per file against GitHub's 60 an hour unauthenticated,
  for a gain nobody measured.

## Consequences

**Positive:**
- The next agent reads "failed, missing-program, needs ffmpeg" and "worked, with ffmpeg".
- No text from the person's machine can reach the chain through this level; three tests say so
  (`packages/protocol/test/line-need.test.ts`, `apps/hook/test/skill-failure.test.ts`,
  `apps/sponsor/test/service.test.ts`).

**Negative:**
- One more paid level per line that names it, and one more read of GitHub per sponsored line that names
  it (cached ten minutes).
- A version 3 client is refused by a version 4 service, as before: the CLI and the sponsor ship together.
- The direct path (`arp_declare_used`) does not take a name yet (`FUTURE.md`).

**Neutral (worth knowing):**
- ~~The hook cannot tell a worked use (ADR `0140`), so `with` is written by the agent, with `arp line --with`.~~
  Struck 2026-11-10: the hook asks the model on `Stop` and writes `with` from an earlier `needs` record (ADR `0169`).
- `needs` and `with` are ARP's words, read by nobody else until published (`docs/28`, Open).

## References

- Related rules: `.claude/rules/security.md`, `.claude/rules/claims.md`, `.claude/rules/portability.md`
- Related docs: `docs/28_THE_SIGNAL.md`, `docs/32_THE_EVIDENCE_LADDER.md`, `docs/tasks/97-a-line-names-what-was-missing.md`
- Related ADRs: `0138`, `0140`, `0143`, `0144`, `0155`, `0159`, `0162`
