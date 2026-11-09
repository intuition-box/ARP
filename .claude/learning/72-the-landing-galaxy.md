# 72 — The landing: one camera through the registry

**Task:** `docs/tasks/81-the-landing-galaxy.md`
**Completed:** 2026-11-09
**Commit:** `9bb9d8b` on `feat/81-landing-galaxy` (worktree `ARP-landing`, not pushed)
**Verifier verdict:** PASS (round 3). Round 1 failed on a stale `docs/design/README.md` row, a stale `ui.md` Saffron premise and an evidence-ladder sentence with no column. Round 2 failed because the sample's agent ids were real Base agents.

## What shipped

- `apps/web/src/components/brand/GalaxyField.tsx` and `galaxy-geometry.ts` (+ test). The galaxy is drawn with Canvas 2D: the camera, the atoms pulled from stars, the loupe and the labels.
- `components/atom/claim-field-geometry.ts` gains `ringAngle`, `LANDING_RING_OFFSETS` and `elbowLine`. `loupeLine` now uses `elbowLine` and gives the same output.
- `services/landing-field.ts` (+ test) and `hooks/use-landing-field.ts`: the most declared tool (hidden identities excluded), its `getPulseUsage` lines, and the paid word from its `SKILL.md`.
- `services/landing-sample.ts`: the marked sample, with agents `agent A` to `agent E`.
- `scripts/measure/reference-sample-ids.ts`: checks that the reference's sample ids are real Base agents.
- `components/brand/SceneDeck.tsx` and `scene-context.ts` rewritten. The deck now pins on phones and under reduced motion.
- `pages/Landing.tsx` and its test hold the six scenes. The `.arp-gx*` rules are in `index.css`.
- Deleted as dead: `SourceField`, `source-field-geometry`, `scene-hand-over`, `Reveal`, `Lines`, `recent-declarations-view`, `use-declaration-cost` and `declaration-cost`.
- `.claude/rules/ui.md` amended (the deck bullet, the Saffron mark item), ADR `0152`, and a `landing-galaxy/` row in `docs/design/README.md`.

## Surprises

- After hiding ARP's test identities, both chains answer with nothing. The landing as specified would have been an empty field everywhere, and that led to the sample decision.
- The design reference's "made-up" ERC-8004 ids are **real agents on Base**. `8453:3107`, `5512`, `7720` and `2418` each have an owner (`ownerOf`, 2026-11-09). The design file's own rule against naming real agents rested on that false premise. Any id shaped `chain:number` has to be checked against the registry before anyone calls it fictitious.
- The screenshots used for the first verification were older than the last two fix commits. Re-render at HEAD before you cite a visual check.
- `elbowLine` clamps its corner at `cornerMaxX`. When the panel row sits far below the field, the "35°" leg becomes close to vertical. That is the atom page's shared rule, not a landing bug.

## Decisions made

- **The galaxy replaces SourceField's dive and seeds; no Saffron cover hand-over.** Amends ADR `0067`. ADR `0152` §1.
- **The deck pins on phones and under reduced motion; scenes jump under reduced motion.** Amends ADR `0066` and `ui.md`. ADR `0152` §4.
- **A marked sample while the chain is empty**, decided by the user (relayed by the coordinator), for the landing only. One panel never mixes sample and real data, and a failed read still says it failed. ADR `0152` §6.
- **Sample agents carry no chain prefix**, because the reference's ids are real agents. ADR `0152` §6.
- Kept from the user and coordinator: the footer after scene 5; the nav does not fold; scene 3's dim line; no pulse panel on phones; `npx -y`; no counter or rail; no `@arp-protocol/core` link; "Your agent" placed upper right.

## Rules touched

- `.claude/rules/ui.md`: the deck bullet and Saffron item 2 amended (ADR `0152`).
- `.claude/rules/claims.md`: sufficient. §3 caught the real-agent attribution, and the fix was a committed script, not a sentence.

## Suggestions for future tasks

- Treat a design handoff's sample ids as possibly real. Run `ownerOf` before they reach a page.
- `scripts/measure/landing-fit.ts` measured the old deck and is stale. Retire it or port it.
- The bottom activity bar collides at 390px on every page. That predates this task; give it its own ticket.

## Evidence ladder

**Which column and tier of the evidence ladder does this serve, and does it move ARP up it?**

Skill column, tier 1 (Declared): the landing reads the most declared tool's `uses` lines from the chain and shows them as declarations. It does not move ARP up the ladder; it presents the first rung honestly.

## Addendum, 2026-11-09 — scene 1 builds, the network moves to scene 5

The user found scene 1 unreadable: everything arrived, then accumulated. Scene 1 now builds one
element at a time (tool, then agent with its ring and the identity row, then context, then
outcome), the panel growing with each; the other claims wait for scene 2; the network effect —
stars lighting up one per agent — moved to scene 5 with « Every line your agent writes, the next
agent reads. » and « Join the network » (onboarding). `2ec0579`, `c7dddd2` on
`fix/81-scene1-build`.

- **What the review caught.** The invitation pushed scene 5's copy into the comparison panel on
  phones 667–736 px tall (up to 196 px of overlap at 360×600, measured by the reviewer), and the
  network stars showed the sample's five agents without saying so. Both fixed: the comparison
  keeps one half on a phone and gives way below 760 px tall; « Lit stars: sample. » marks it.
- **What it teaches.** A panel that mounts pieces as they arrive cannot be asserted in a DOM test
  where the deck never leaves scene 0: the content tests run under reduced motion (the end state),
  and one test asserts that nothing of the line is drawn in advance. The build-up itself is
  checked in a browser.
- **Frame check**: 0 pops in 0→1, 1→2, 4→5 at 1280 and 390, with the sample and with real data.
