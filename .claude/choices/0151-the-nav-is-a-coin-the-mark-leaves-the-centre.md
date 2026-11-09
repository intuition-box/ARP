# 0151 — The nav is a coin: the mark leaves the centre

**Status:** Accepted
**Date:** 2026-11-09
**Triggered by:** user request, 2026-11-09 — `docs/design/nav-coin/NAV-COIN.md`, `docs/tasks/80-the-nav-coin.md`

## Context

ADR `0057` §3 put the Source mark at the centre of the nav, with links on both sides (`NavSplit`).
The two sides never held the same weight: five links on the left, then Get started, the chain toggle
and the wallet on the right. So the bar split into two unequal halves around the mark. The user's
words were _« ça fait déséquilibré »_. After rejecting an animated nav, and then reviewing three
static proposals and two mixes, the user chose the coin on 2026-11-09.

## Decision

The nav is `NavCoin`:

- The mark sits in a circle set into the bar's left corner and links home.
- The five tabs sit in one segmented track, centred in the bar.
- Get started, the chain and the wallet sit at the right end.
- Under the bar, a path line shows where a deep page sits in the graph.

Scrolling down past 140 px folds the bar back into the circle. This replaces ADR `0057` §3's centred
mark. The rest of `0057` (tokens, sigils, the one Saffron dot on the current item) stands, with two
exceptions on the coin's own surface, taken from the handoff the user chose:

- **Radii outside the tiers.** The bar is 14 px, a tab 7 px and Get started 9 px, against
  `ui.md`'s 6, 8, 10 and 12. The seam is measured against these exact sizes, and the shape is what
  was approved.
- **A full circle that is not an agent.** `ui.md` keeps `rounded-full` for dots and agent sigils.
  The coin is the Source mark's own circle, the same object as the logo, and it is the only
  exception.

Four adaptations to the handoff, which was built on `b5682d9`, before the current tree:

1. **Get started stays a button that opens the onboarding panel** (task 62, ADR `0125`: one door).
   The handoff took a route. It is still lit on `/start/*`.
2. **The wallet stays**, after the chain, in `end` (user, 2026-11-09).
3. **The coin keeps the mark's behaviour on `/`**: clicking it there scrolls back to the deck's
   first scene and drops the `#scene` hash. On the landing the path does not change, so
   `ScrollToTop` never fires.
4. **The bar's left margin is written out** instead of `auto`. When the bar retracted, an `auto`
   margin dropped to 0 and the coin jumped to the header's edge on any viewport wider than the bar.
   The reference does not jump, because there the container is centred, not the bar.

The path line runs on the agent, skill and repo pages (user, 2026-11-09). On a skill, the middle step
is the repository, not the domain the handoff suggested. The repository has its own page and the
skill page already holds it. The domain is read from the attestor's claims further down, and a skill
may have none.

`NAV_HEIGHT` goes from 64 to 92 (header padding 20 + 14, plus the 58 px bar). The deck pins only
from 900 px wide, and above 860 px the header keeps its desktop padding, so the phone header's
80 px never meets the deck.

**Amended the same day (user, with a screenshot):** retracted, the header kept its full-width
opaque band, which hid the page under it. Now only the coin remains: the retracted header is
transparent and lets clicks through, except on the coin. The landing's Saffron cover reached only
the corners below `NAV_HEIGHT`, because it assumed an opaque nav hid the band above. It left the
top band and the top-left corner dark when a scene swapped, so `SourceField` now reaches the
viewport's real corners. This was checked by reading the cover canvas: alpha 255 at all four
corners for seven frames before the hole opens.

## Alternatives considered

- **Keep `NavSplit` and rebalance the sides.** This was tried twice (2026-10-27): the right side
  wrapped, or pushed the mark off centre. A centred mark needs two equal halves, and the nav has no
  equal halves to give it.
- **The animated nav.** Rejected by the user: _« j'aime pas l'animation »_. Only the retract
  remains, and it follows the scroll, not the pointer.

## Consequences

**Positive:**

- The tabs are centred on the page, which the centred mark only seemed to be.
- A deep page shows where it sits without a second header.

**Negative:**

- The header grows from 64 to 92 px, and to 127 px with a path line. That is vertical space taken
  from every page.
- The seam (the block that joins the circle to the bar) is measured by hand against the sizes. If a
  size changes, the seam has to be measured again.

**Neutral (worth knowing):**

- The handoff's `code/` stays in `docs/design/nav-coin/` as the record. Its patch does not apply
  to the current tree, and its paths say `app/`.
- `ChainToggle` and `WalletConnect` keep their own 28 px height beside Get started's 40 px. The
  reference's chain is 40 px. Neither renders on a testnet-only build with no wallet, so the
  difference is not visible today; restyling them is out of this task (`docs/tasks/80`).
- With the phone sheet and the wallet menu both open, one Escape closes both: each listens for it
  on its own. Left as is.
- `SECTION_PATHS` moved to `nav-coin.ts`; `NavSplit.tsx` and its test are deleted. Their
  behaviours are ported to `nav-coin.test.tsx`: the sheet closes on a link to the open page, on a
  link to another page, on Escape and on Get started; Get started is lit on `/start` and nowhere
  else; the coin goes to the first scene on `/` and leaves other pages to the router.

## References

- Related rule: `.claude/rules/ui.md`
- Related doc: `docs/design/nav-coin/NAV-COIN.md`
- Related ADR: `0057` (§3 amended), `0125`, `0066`
