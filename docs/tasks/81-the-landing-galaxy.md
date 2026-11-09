# Task 81 — The landing: one camera through the registry

**Status:** to do.
**Rules:** `code.md`, `ui.md`, `workflow.md`, `claims.md`.
**Design:** `docs/design/landing-galaxy/LANDING-GALAXY.md` and `landing-galaxy-reference.html`.
Read both before writing code; open the reference at 1280 and 390 px and play every scene.

## The user's decisions, 2026-11-09

1. The landing becomes one camera through a galaxy of stars; its six scenes are camera stops, in
   the order of the design file.
2. Scenes 1 to 4 draw the atom page's claim field, with few dots, and every dot is a star of the
   galaxy pulled into place. Adding and removing dots must be seamless.
3. Scene 2 uses the claim field's loupe to read four claims, each tied to a row of the panel.
4. No kicker line above any heading, no lede under the hero heading.
5. The copy is exactly the design file's.
6. **Amended the same day:** while the chain answers with nothing (on testnet every real line is
   one of ARP's hidden test identities), scenes 0 to 2 show the reference's sample, with its agents renamed `agent A` to `agent E` (its
   ids are real Base agents, `scripts/measure/reference-sample-ids.ts`), and every
   panel showing it says « Sample ». Real data replaces it as soon as it exists; no panel mixes the
   two; a failed read still says it failed. The samples live in `services/landing-sample.ts`. This
   overrides deliverable 4's "real data only" and the first "Do not do" item for the landing's
   sample (ADR `0152` §6).

## Deliverables

1. A galaxy canvas component in `apps/web/src/components/brand/` that replaces `SourceField` on
   the landing: the stars, the camera, the atoms. Pure geometry (star field, camera, atom slots,
   the star-to-claim look) in a separate `*-geometry.ts`, tested, as `source-field-geometry.ts`
   and `claim-field-geometry.ts` are.
2. The atom slots and dot sizes come from `claim-field-geometry.ts` (`dotDiameter`, the ring
   rotation); the loupe's line from `loupeLine` or the same rule (35°, then level). Extend those
   files rather than copy them.
3. `Landing.tsx`: the six scenes in `SceneDeck`, with the design file's copy and panels. The
   scene's camera stop is driven by the deck's current scene.
4. Real data only (design file, "Data"): recent lines, the most declared tool's claims and its
   latest line, with the empty states when the chain has none.
5. An ADR for: the galaxy replacing the Source field's dive and seeds (it amends ADR `0067`'s
   hand-over), and the claim field appearing on the landing.
6. `Landing.test.tsx` updated: the copy, the empty states, reduced motion.

## Checks

`bunx tsc -b`, `bun run lint`, `bun run test` and `bun run check:tokens` in `apps/web`. Then render
at 1280 and 390 px every scene, and record frames during the hand-overs 0→1, 1→2 and 4→5: no dot
may appear or vanish from one frame to the next.

## Do not do in this task

- Ship the reference HTML or any of its sample names, ids or counts.
- Add a WebGL dependency: Canvas 2D, as `SourceField` (`docs/18` §6).
- React to the pointer (`rules/ui.md`), except the loupe's existing keyboard and pointer reading on
  the atom page.
- Change the nav (task 80) beyond folding it past the first scene, if `NavCoin` does not already.
