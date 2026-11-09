/**
 * The nav's height in px (`NavCoin`), and the one place it is written.
 *
 * The nav is `sticky top-0 z-20`. Only its bar and circle carry a background, glass since
 * 2026-11-09; the header around them is transparent. The landing's scene deck is built around it:
 * the stage reserves this band and the field centres below it.
 *
 * 92: the header's padding 20 + 14 and the bar's 58, from `.arp-coin` in `index.css`, measured in
 * Chromium at 1457px. Change one, change this. It holds above 860px; the deck only pins from 900px
 * (`SceneDeck`'s `MIN_WIDTH`), so the phone header's 80 never meets it. The landing sets no path
 * line, which would add to it. It was 64 under `NavSplit`, and 88 before that.
 */
export const NAV_HEIGHT = 92;
