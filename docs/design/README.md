# docs/design

One folder per thing designed. Every reference page is a self-contained HTML file to open in a
browser; everything marked `sample` in one must never ship — with one exception, the landing's
sample, shown and marked « Sample » while the chain has nothing (ADR `0152`). Marked `sample` is
not the same as invented: `landing-galaxy/`'s sample agent ids are real agents on Base
(`scripts/measure/reference-sample-ids.ts`), which is why the landing renames them.

| folder            | what it is                                                                              | state                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `brand/v1/`       | "The Source" identity: tokens, logo, sigils, radii. `HANDOFF.md` is the contract        | built, ADR `0057` (its §8, screens and routes, deliberately not)                                 |
| `brand/v2/`       | the same handoff five days later: final landing, `agent-page.html`                      | reference                                                                                        |
| `motion/`         | the landing's scene sequence, `MOTION-V2.md` + `index.html`                             | built, task 29, ADRs `0066`-`0070`; superseded by task 81, ADR `0152`                            |
| `claim-field/`    | the shared `ClaimField`: `v1-handoff.md`, `v2/` (loupe), `v2-ring-names/` (no legend)   | built, `53c022c`; the repo is ahead of `v2-ring-names/`                                          |
| `pages/`          | the atom pages `tool/`, `skill/`, `repo/`, and `agent/` (docs/16's order)               | skill and repo built; tool and agent not — `docs/tasks/34`                                       |
| `cli-surfaces/`   | `arp status`, `arp init`, the session line, the badge spec                              | not built — `docs/tasks/34`                                                                      |
| `cli-v0/`         | `packages/cli` week 1: hook, SQLite, `arp status`, as a patch and as plain files        | not applied — `docs/tasks/34`, and task 33 names the same package                                |
| `readme-badges/`  | the README badge SVG generator, tested                                                  | deferred to the production release                                                               |
| `nav-coin/`       | the nav: the mark in a coin at the bar's left, tabs centred, path line. `NAV-COIN.md`   | built, task 80, ADR `0151` (replaces ADR `0057` §3's centred mark)                               |
| `landing-galaxy/` | the landing as one camera through a galaxy, six scenes. `LANDING-GALAXY.md` + reference | built, task 81, ADR `0152`; its sample shows only while the chain has nothing, marked « Sample » |

`claim-field/*/` and `cli-v0/` were built against `feat/agent-panel-tabs` at `b5682d9`, before
`app/` became `apps/web/`: their patches do not apply to the current tree as they are.
