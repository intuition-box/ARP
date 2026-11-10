# Task 110 — Two defects task 108's live run found

**Status:** in progress, on `worktree-agent-af6870f82b8f1c11f`.
**ADR:** none: both fixes are the obvious answer to a wrong output (`workflow.md`, "Things not worth an ADR").
**Rules:** `code.md`, `claims.md`, `workflow.md`. Gates: `packages/protocol` test and lint, `apps/cli`
test, lint, `check:node` and `packages --check`, `apps/web` `tsc -b` and test, root `check` and `test:scripts`.

## Why

Task 108 listed them under "Found, not fixed here" (`docs/tasks/108-live-hook-defects.md`):

1. **False programs.** Task 98's report on anthropics/skills `pptx` listed `lorem`, `ipsum` and `prints`
   as programs the skill runs.
2. **`arp share send` filled a missing source from the global lock only** (`apps/cli/src/share.ts`), while
   the hook reads the project's `skills-lock.json` too since task 108.

## What produced the false programs

Not `readSkillContents` itself: its `runs` programs come from `readRequires`
(`packages/protocol/src/skill-requires.ts`), which cut every line of a shell fence on `|`, `;` and `&&`
wherever they stood, and took each piece's first word as a command. pptx's SKILL.md at
`2c5958ec` has, in two `bash` fences:

```
markitdown output.pptx | grep -iE "\bx{3,}\b|lorem|ipsum|\bTODO|\[insert|this.*(page|slide).*layout"
python scripts/add_slide.py unpacked/ slide2.xml --after slide2.xml   # duplicate a slide (or slideLayoutN.xml); prints the new slide's path
```

The `|` inside the quoted pattern gave `lorem` and `ipsum`; the `;` inside the trailing comment gave
`prints`. The same comment's apostrophe (`slide's`) also opened a quote that hid the fence's remaining
lines.

## Deliverables

1. `skill-requires.ts`: commands split only outside quotes, a `#` at a word's start ends the line, a
   backslash escapes, and the quote tracking that hides an open string's next lines reads the line without
   its comment.
2. Tests: the pptx lines in `packages/protocol/test/skill-contents.test.ts` ("false positives it does not
   report"), and the splitting rules in `scripts/test/skill-requires.test.ts`.
3. `apps/cli/src/share.ts` reads `<cwd>/skills-lock.json` beside the global lock and the receipts, with the
   hook's rule: one known source names the skill, two keep the line on the machine. Two tests in
   `apps/cli/test/share.test.ts`.
4. `packaging/` regenerated (the hook and the CLI bundle `readRequires` and `share.ts`).
5. A new measurement `data/measurements/skill-contents-2026-11-10T1325.json` (the `0938` one is kept, ADR
   `0064`) and `apps/web/src/data/skill-contents.json` rebuilt from it.
6. `docs/22`: `arp share` looks an empty source up again, from the project it runs in.

## The share fix, and what it does not do

The failure line keeps no cwd (`FailureLine`, `apps/hook/src/skill-failure.ts`), so "the project lock of
the session's cwd" is not available to `arp share`. It reads the lock of the project it is run in. Since
task 108 the hook fills the source itself at record time from the session's project lock, so this reaches
only a record whose source was still empty: one written before task 108, or a backfilled one. Recording the
cwd with each failure would change what `failures.jsonl` holds and is not done here.

## Counts, before and after

```
GITHUB_TOKEN=… bun run scripts/measure/skill-contents.ts
bun run scripts/build/build-skill-contents.ts data/measurements/skill-contents-2026-11-10T1325.json
```

| measurement (2026-11-10, the 521 skills of `skill-paths.json`) | `0938` | `1325` |
| -------------------------------------------------------------- | ------ | ------ |
| skills read                                                    | 518    | 518    |
| skills with at least one program                               | 292    | 291    |
| program entries, all skills                                    | 382    | 372    |
| settings, scripts, fetch-and-run, domains, hidden              | 139, 74, 63, 406, 9 | 139, 74, 63, 406, 9 |

Ten program entries left and none was added. 65 of the rows were read at a newer commit the second time,
so each removed name was re-checked by running the old and the new `readRequires` over the same file at the
commit the `1325` run read: all ten are the fix's. Each one and the line that gave it:

| skill | removed | from |
| ----- | ------- | ---- |
| anthropics/skills `pptx` | `lorem`, `ipsum`, `prints` | a quoted grep pattern; a trailing comment |
| cloudflare/skills `cf-cli` | `quote`, `up` | a trailing comment (`# local, no credentials; quote the whole task; up to 5 …`) |
| cloudflare/skills `turnstile-spin` | `or`, `raise` | `;` inside a `python3 -c '…'` string |
| coreyhaines31/marketingskills `image` | `png` | `\|` inside a quoted grep pattern |
| vercel-labs/agent-skills `vercel-cli-with-tokens` | `add` | a comment (`# … by default; add --no-follow …`) |
| heygen-com/hyperframes `changelog-video` | `words` | a comment (`# spoken-layer text only; words JSON …`) |

`skills with at least one program` falls by one: `image` had `png` as its only program.

## Found, not fixed here

- **`data/catalogue/skill-requires.json`** (the MCP server's `requires.runs`) is built from the
  2026-11-04 measurement `data/measurements/skill-requires-2026-11-04T1046.json`, which was read with the
  old splitting and still lists `lorem` and `ipsum`. A new dated `scripts/measure/skill-requires.ts` run and
  `scripts/build/build-skill-requires.ts` would refresh it; that measurement depends on a layouts run and
  was not in this task.

## Evidence ladder

Skill column, declared tier: what a skill's own files say it runs is the declared tier (`docs/32`), and
ten of its entries were words read from example text. This makes the declared reading accurate; it does
not move ARP up the ladder. The share fix is the skill column, observed tier: a failure observed on a
project install can now carry its public source when it is shared.
