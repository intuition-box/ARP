# The landing: one camera through the registry

**Status:** design, decided by the user on 2026-11-09 in a design session. Not built.
**Reference:** `landing-galaxy-reference.html` in this folder. Open it in a browser: it is the
behaviour to reproduce, scene by scene, on desktop and at 390 px. Its names, ids and counts are
samples (see "Data" below). It must never be served by the site: it stays in `docs/design/`.
**Task:** `docs/tasks/81-the-landing-galaxy.md`.

## The idea, in the user's words

> « l'agent a une identité qui lui sert à écrire une action, qui se voit être jointe par un registre
> de mots, et qui permet la traversée de l'information, pour qu'un agent puisse savoir en avance ce
> qui est utile ou non, payant, fonctionnel, ou d'autres use cases. »

The registry is a galaxy. Every word of the public graph is a star in it. A scene does not draw
new objects: it pulls existing stars out of the galaxy and sets them in place, like atoms, then
lets them go back.

## The six scenes

One canvas, one camera. Each scene is a camera stop over the same world. The HTML copy and panels
sit above the canvas and swap without overlapping (ADR `0068`). One gesture plays one scene
(ADR `0066`). The order is the user's and is not to be changed.

| # | Name | Camera | Copy (exact) | Panel |
| - | ---- | ------ | ------------ | ----- |
| 0 | Pulse | the whole galaxy, centred, `span` 880 (560 on a phone) | H1 **The public pulse for tools and autonomous agents.** CTA "Open the agent index", link "or build against it →" | recent lines, top left (desktop only) |
| 1 | Written | on the tool atom, `span` 60 | H2 **An agent writes down what it used.** dim: *With its identity, into words every agent shares.* | "A line, word by word": the sentence, then identity / action / context / outcome |
| 2 | Travels | same atom, `span` 64 | H2 **The next agent knows before it chooses.** dim: *Useful or not, paid or free, working or not, and what for.* | "What your agent reads": useful, for what, working, paid |
| 3 | Plug in | same atom, `span` 70, atom to the right | H2 **Plug in and participate.** dim: *Your agent discovers what others already use, and adds what it uses.* | three cards: Claude Code commands, any other runtime, an example request |
| 4 | No grade | same atom, `span` 56 | H2 **No grade. No stars.** then the lines *Just what agents declared.* / *On the record, for anyone to check.* | none |
| 5 | Build | the whole galaxy again | H2 **Plug in without asking anyone.** dim: *It lives on a public chain, not on our servers.* | "The usual way" against "With ARP", bottom right |

**Removed by the user, do not reintroduce:** every kicker line above a heading ("Fig. 01 · …",
"ARP · Agent Reputation Protocol", "What ARP never adds"), the hero's lede sentence, worked/failed
as the main message, the four tool circles of an earlier draft, a score.

The camera values per scene are the `SCENES` table in the reference's script (`cam` for desktop,
`m` for a phone, at ≤ 820 px). `span` is how many world units fit across the short side; `ox`,
`oy` place the subject on screen as fractions of the viewport.

## The figure: the claim field, from stars

Scenes 1 to 4 draw the **claim field of the atom page** (`ClaimField.tsx`,
`claim-field-geometry.ts`, `docs/17`), on the canvas, around one tool atom:

- the atom at the centre, Saffron;
- one ring per predicate, innermost first: `used by`, `in context of`, `has outcome`; each ring's
  name is written on the field at twelve o'clock;
- one dot per claim; **filled** when a position stands behind it, **hollow** when none does; its
  diameter is `dotDiameter(positions)` (by position count, never amount, ADR `0042`);
- the rings are rotated so no dot sits at twelve o'clock and rings 1 and 2 never share a radius
  (offsets 0.5, 0.5 and 0.25 of a step);
- few dots: in the reference, 5 agents, 3 contexts, 3 outcomes. **Fewer is the point** (the user:
  « on n'a pas besoin d'autant de points, ça perturbe plus qu'autre chose »). Cap a ring at about
  6 drawn dots and state the rest in the panel, as `ClaimField` does with `MAX_DOTS_PER_RING`.

**Every dot is a real star of the galaxy.** At build time each atom is assigned the nearest unused
star around the tool. When the atom moves out, that star is not drawn; the atom is drawn instead,
starting with **the star's exact radius, colour and opacity**, and turns into the claim's look
during the first 60% of its trip. Leaving, it does the reverse and the star reappears where it
was. No pop, ever: this was the user's last correction (« l'ajout et le retrait de points n'est
pas très fluide »).

The trip is a timed glide, not a chase: 1.3 s in, 1.1 s out, on the camera's curve
`cubic-bezier(.45,0,.15,1)`. Going out, atoms leave one after another, the last written first,
55 ms apart. Zoomed out, an atom never fades below the star it was.

## Scene 1: one line, word by word

On the way in from the pulse only (coming back from scene 2, the words are already written):

| t (s after the camera settles) | what moves | panel |
| --- | --- | --- |
| 0.4 | the agent's identity atom (ERC-8004 id) leaves its star for the `used by` ring | `8453:3107` lights; *identity* row lights |
| 1.6 | the tool atom moves to the centre | `uses hyperframes`; *action* |
| 2.8 | `video` to the `in context of` ring | `in context of video`; *context* |
| 4.0 | `worked` to the `has outcome` ring | `has outcome worked`; *outcome* |
| 5.4 to 8.8 | other agents' identities and words join, about one every half second | "N agents writing into them" counts up |

The atom just written is lit in Saffron for about a second (the claim field's selected state).
Each word is a label beside its dot.

## Scene 2: the traversal, through the loupe

The claim field's **loupe** (`use-claim-loupe.ts`, `LOUPE` in the geometry) tours four claims,
2.8 s each: an agent (useful), a context (for what), a failure with its reason (working), a word
from the tool's files with no position (paid). The claim under the loupe lights in Saffron and
grows 1.6×; the loupe's line leaves its rim, rises (or falls) at 35°, then runs level to the row of
the panel that says it, which stops it. Never a straight line (the user, 2026-10-29). The loupe and
its line fade in and out (no pop). Your agent, Saffron, stands outside the field, reading.

## Scene 3: plug in

Your agent's atom joins the field. The three cards, from `docs/23` and the README:

```
claude plugin marketplace add intuition-box/ARP
claude plugin install arp@arp
```
```
npx @arp-protocol/cli init
```
and the request: *Find a skill to transcribe this podcast, **with ARP**.* Each command card has a
Copy button (all lines of the card).

## Motion rules kept from the session

From Emil Kowalski's `emil-design-eng` and `review-animations` skills (found through ARP):

- A scene leaves in 200 ms, all at once; it arrives as the camera settles, piece by piece (heading,
  dim line, actions, then the panel), 75 ms apart, each rising 14 px and going from 5 px of blur
  to none, with `cubic-bezier(.23,1,.32,1)`. Movement uses `translate`, so panels keep their own
  transform.
- Camera: `cubic-bezier(.45,0,.15,1)`, 1.1 to 2.2 s by distance; position follows the zoom so the
  subject never drifts out of frame during a dive.
- Buttons scale to 0.97 on press; hover effects only under `(hover:hover) and (pointer:fine)`.
- `prefers-reduced-motion`: every scene jumps to its end state; text only fades.
- The nav coin (`NavCoin`, task 80) folds into the coin past the first scene, and the coin
  brings it back.

## Data: what is real, what is not

The reference is **all sample** except the tool's name, hyperframes, a real catalogue entry
(testnet 13579, read 2026-11-09). The standing rule holds: **no sample data ships**.

- The pulse panel reads `useRecentDeclarations`, as the landing does today, and shows
  `NoActivityYet` when the chain is empty.
- The claim field reads one real atom: the tool with the most declarations on the chain the
  reader chose. Its rings and dots are its real claims (`ClaimField`'s own data path). If no tool
  has a claim, scenes 1 and 2 show the empty field (`arp-cf-zero`) and their copy stays.
- Scene 1's word-by-word sentence is that atom's most recent line, read from the chain.
- Scene 2's four readings come from what `arp_pulse` and the atom's claims actually hold. A
  reading with nothing behind it is left out, not invented.
- ERC-8004 ids are shown as the chain gives them. Never put a real agent's name beside a use it
  did not declare (the reference uses made-up ids for that reason).

## Copy rules this design respects (`docs/30`)

Not used anywhere: "shows who used it", "ranked by real use", "written by the agents
themselves", "score", "best", "verified". The README of `ARP-business-dev` still uses "Stars show
who looked. ARP shows who used it."; `docs/30` forbids it in public text. The user is to align
the two; until then this page follows `docs/30`.

## Open, for the user

1. Scene 3's dim line says "adds what it uses", which promises the hook. Keep it only if the
   plugin installs the hook by default.
2. Whether the pulse panel stays on the phone (hidden in the reference).
