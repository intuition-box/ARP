# 0152 — The landing is one camera through a galaxy, and the claim field is on it

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** `docs/tasks/81-the-landing-galaxy.md`, the user's design session of 2026-11-09
(`docs/design/landing-galaxy/LANDING-GALAXY.md`)

## Context

The landing was five scenes over `SourceField`: a 70× dive into a Saffron core after the hero, then
four Saffron "seeds" that grew into covers and opened onto the next scene (ADR `0067`'s hand-over).
The deck refused to pin below 900 px wide and under `prefers-reduced-motion` (ADR `0066`).

The user redesigned it on 2026-11-09: the registry is a galaxy, every word of the public graph a star,
and six scenes are six stops of one camera over it. Scenes 1 to 4 draw the atom page's claim field
around one tool, every dot a star pulled into place. The design gives a camera stop for a phone and
says what reduced motion does ("every scene jumps to its end state").

## Decision

1. **The galaxy replaces the Source field's dive and seeds.** `GalaxyField` (Canvas 2D, no
   dependency) draws the stars, the camera and the atoms; `galaxy-geometry.ts` holds the arithmetic.
   `SourceField`, its geometry and `scene-hand-over.ts` are deleted. **No Saffron cover carries a
   hand-over any more**: this amends ADR `0067`. Its other half stands: Saffron still marks the
   subject atom (the claim field's core, the mark, at rest as on the atom page — `rules/ui.md`'s
   accent bullet names it since this ADR), your agent (the viewer's own), and a claim while it is
   being written or read (the selected state). Panel heads and the "Then ask" card are neutral.
2. **The claim field is on the landing**, as the atom page draws it: one ring per predicate, a dot
   per claim, filled when a position stands behind it, sized by `dotDiameter` (positions, never
   amount, ADR `0042`), the loupe's line at 35° then level (`elbowLine`, shared with `loupeLine`).
   The rings turn by the landing's own offsets (`LANDING_RING_OFFSETS`) so no dot sits under the
   ring's name at twelve o'clock. A ring draws at most six dots; the panel states the rest.
3. **A dot never pops.** An atom leaves its star with the star's radius, colour and opacity and
   becomes the claim over the first 60% of a timed glide; the star is not drawn while its atom is
   away, and reappears where it was.
4. **The deck pins on a phone and under reduced motion** (amends ADR `0066`'s bounds and
   `rules/ui.md`). It stacks only below 560 px tall and before JavaScript runs. Under reduced
   motion one gesture still moves one scene, but the camera and the atoms jump to the end state and
   the copy only fades. The scene changes on the gesture and the camera carries the move; the scroll
   position jumps to the scene's band unseen, so the native scrollbar and the footer after the last
   scene still work.
5. **The field reads one real tool**: the most declared tool on the chain the reader chose, ARP's
   test identities left out, its claims and its latest line from `getPulseUsage`, and a paid word
   from its own `SKILL.md`.
6. **While the chain answers with nothing, scenes 0 to 2 show a sample, marked « Sample »**
   (amended 2026-11-09, the user's decision for the landing only: « on peut faire des mock data,
   c'est pas grave »). On 2026-11-09 both chains answer with nothing, because every declarer is one
   of ARP's test identities. The sample is the design reference's shape — its counts, `hyperframes`
   as the tool — with agents named `agent A` to `agent E`. **The reference's own ids are real**:
   `8453:3107`, `8453:5512`, `8453:7720` and `8453:2418` each have an owner on Base's ERC-8004
   registry (`scripts/measure/reference-sample-ids.ts`, 2026-11-09), and a sample line in their name
   would attribute a use to an agent that never declared it. The sample lives in one module, `services/landing-sample.ts`. Every
   panel that shows it says so (« Lines · testnet · sample », « · sample » in a panel head,
   « Sample. » at its foot). Real data replaces it as soon as it exists, decided per panel, and no
   panel mixes the two. A read that **failed** still says it failed: a sample never stands in for a
   failure. This overrides the design file's "no sample data ships" for the landing only.

7. **Scene 1 builds one element at a time; the network is scene 5's** (amended 2026-11-09, the
   user's request after watching it). Scene 1 shows the tool, then the agent and its ring, then
   the context, then the outcome, its panel growing with each; nothing else joins there. Scene 5
   lights one star per agent that declared the tool and invites the reader to join (« Join the
   network », the onboarding). Task 81's addendum has the details. Scene 2 fills the field one
   claim after another once the camera settles, and empties it the same way back to scene 1; the
   line's dots never move (« plein de points qui se réorganisent et ça fait brouillon »).
8. **The sentence glows once it is whole** (amended 2026-11-09, the user: « mettre un effet de
   glow sur la phrase en bas à droite une fois qu'elle est pleinement construite »). When scene 1's
   outcome has landed, the panel's sentence fades in a soft `text-shadow` from `--color-fg` at low
   alpha and keeps it while the scene stays; reduced motion shows it without the fade. Not
   Saffron: the accent stays on the primary action, the selected state and the viewer's own
   position. It relaxes `rules/ui.md`'s "no glow", which the user classed as negotiable on
   2026-11-02, for this one sentence only; the rule names the exception.

## Alternatives considered

- **Keep `SourceField` behind the new copy** — rejected by the design: a scene draws no new
  object, it moves stars that were there.
- **Stack the deck on a phone and under reduced motion, as before** — the design has a camera stop
  per scene at 390 px and an end state per scene under reduced motion; stacked, neither exists.
- **Copy the claim field's geometry into the canvas** — the task says to extend
  `claim-field-geometry.ts`, and two copies of the ring rule would drift.
- **WebGL** — `docs/18` §6: points on circles.

## Consequences

**Positive:**
- The landing shows the product's own figure, read from the chain, instead of an illustration.
- One mechanism for every hand-over (the camera) instead of a dive plus four seeds.

**Negative:**
- Scroll-jacking now runs on phones and under reduced motion; its bounds (both ends hand back to
  native scroll, `Home`/`End`, the scrollbar) are unchanged.
- The landing reads GitHub once per visit for the paid word (cached 15 minutes); when GitHub does
  not answer, that reading is left out.
- Until a real line exists, a first-time visitor sees sample lines by `agent A` to `agent E`. The « Sample » marks are the
  whole of the defence, so a panel that shows the sample without one is a defect.

**Neutral (worth knowing):**
- The reference's scene counter, rail and Next button are not built: the user removed the counter
  and the rail on 2026-10-29, and the design file does not bring them back.
- `scripts/measure/landing-fit.ts` measured the old deck's fit and is stale.
- The scene's copy stays above the fixed activity bar: the deck reads the bar's height
  (`[data-bottom-bar]`) into `--gx-floor`.
- The pulse beats once per real line when scene 0 arrives, then holds still; no line, no beat.
- Your agent reads from the field's upper right, not the reference's lower left, where at the
  desktop stops it covered the heading.

## References

- Related rule: `.claude/rules/ui.md` (the pinned deck bullet)
- Related doc: `docs/design/landing-galaxy/LANDING-GALAXY.md`, `docs/17_THE_ATOM_PAGE.md`
- Related ADR: `0066`, `0067`, `0068`, `0042`
- Post-mortem: `.claude/learning/72-the-landing-galaxy.md`
