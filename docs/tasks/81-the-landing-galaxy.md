# Task 81 — The landing: one camera through the registry

**Status:** done 2026-11-09, verified (PASS, round 3), `9bb9d8b` on `feat/81-landing-galaxy`
(not pushed), post-mortem `.claude/learning/72-the-landing-galaxy.md`, ADR `0152`.
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

## Addendum, 2026-11-09 — scene 1 builds, the network moves to scene 5

The user, after watching it: « sur la scène 1 on a du mal à voir tout ce qui est affiché d'un
coup … À chaque nouvel élément qui arrive dans le schéma, un nouveau morceau du bloc apparaît …
Je ne veux pas l'accumulation à la fin … Il faut juste comprendre l'effet de réseau en dernière
page, en les invitant à joindre le réseau. » Built on `fix/81-scene1-build` (`2ec0579`,
`c7dddd2`):

- **Scene 1 builds one element at a time**, 2.2 s apart after the camera settles (1.2 s until the user asked for slower, 2026-11-09): the tool
  alone, and the panel appears holding only its name; the agent lands on the `used by` ring,
  drawn as it arrives (ring first, whole by half the dot's trip), and the panel grows by « used
  by agent 1 » and the *identity* row; then *context* and its ring; then *outcome* and its ring.
  A piece appears as its dot lands, never as an empty slot. The *action* row is gone: the action,
  « used by », arrives with the identity. Reduced motion shows the end state.
- **No accumulation in scene 1**: the other claims join in scene 2 (which still starts from the
  four-element field), and « N agents writing into them » is gone.
- **Scene 5 carries the network**: one star per agent that declared the tool lights up after
  another and stays lit (« Lit stars: sample. » while the field is the sample). The copy keeps
  the design's heading and dim line and adds « Every line your agent writes, the next agent
  reads. » The primary button is « Join the network » and opens the onboarding; « Open the agent
  index » is the second button, « Read the skill » a quiet link. On a phone the comparison keeps
  its « With ARP » half, and below 760 px tall it gives way to the copy.
- Frame check at 1280 and 390, with the sample and with real data: 0 pops in 0→1, 1→2 and 4→5.

## Addendum, 2026-11-09 — no accumulation in scenes 2 to 4

The user: « plein de points qui se réorganisent et ça fait brouillon », then « sur la page 2 ou 3,
ça s'accumule, plein de points arrivent, je trouve ça bizarre ». The line's dots already held their
final slots; what moved was every other claim joining at once. Now:

- **Scene 2 adds only what the loupe reads.** A read claim that is not one of scene 1's dots leaves
  its star so that it lands as the loupe gets there (`readJoinAt`); the loupe starts at 1.9 s so
  the first can land. Scene 2 ends with the line, at most four read claims, and your agent outside
  the field. A claim no reading points at stays a star.
- **Scene 3** adds only your agent, gliding into the field (onto the `used by` ring); **scene 4**
  greys the same field.
- **Back** 2→1 and 3→2: what joined leaves one by one, last first; the rest stays put.
- Every atom's progress is computed before the stars are drawn, which closed a one-frame gap where a
  returning dot and its star were both missing.
- Scene 1's sentence glows once whole (ADR `0152` §8).
