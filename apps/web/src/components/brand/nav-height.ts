/**
 * The nav's height in px (`NavCoin`), and the one place it is written.
 *
 * The nav is `sticky top-0 z-20`, opaque while expanded and transparent once retracted (only the
 * coin remains). The landing's scene deck is built around it: the stage reserves this band and the
 * field centres below it. The Saffron cover no longer stops at it, since the band shows through
 * when the nav is retracted (`SourceField`).
 *
 * 92 since the coin (ADR `0151`): the header's padding 20 + 14 and the bar's 58, from
 * `.arp-coin` in `index.css`. Change one, change this. It holds above 860px, where the header
 * keeps its desktop padding, and the deck only pins from 900px (`SceneDeck`'s `MIN_WIDTH`), so
 * the phone header's 80 never meets it. The landing sets no path line, which would add to it.
 * It was 64 under `NavSplit`, and 88 before that.
 */
export const NAV_HEIGHT = 92;
