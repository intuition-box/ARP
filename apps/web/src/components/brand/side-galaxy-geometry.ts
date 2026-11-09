import {seededRandom, STAR_TONES, type Star} from "./galaxy-geometry";

/**
 * The faint galaxy at the sides of every page but the landing (the user, 2026-11-09: « un fond sur
 * les côtés comme le fond de galaxy mais plus parsemé […] qui laisse voir tout le site au centre »).
 *
 * Pure geometry, so it is tested without a canvas. Stars are placed in the viewport's own space
 * (fractions of its width and height) and fade to nothing over the content column, so the page in
 * the middle reads on the plain ground.
 */

/** About this many stars per million px² of viewport. Sparse: the landing's disc is far denser. */
export const SIDE_DENSITY = 420;

/** The content column the stars leave clear (`main`'s max width, 1320px, less its own padding). */
export const CLEAR_WIDTH = 1272;

/** Beyond the clear column, the distance over which stars come to full strength. */
export const FADE_PX = 140;

/** The strongest a side star gets: faint, never competing with the page. */
export const MAX_ALPHA = 0.95;

export type SideStar = {x: number; y: number; r: number; alpha: number; tone: string};

/**
 * How strongly a star at `x` shows on a viewport `width` wide: 0 over the clear column, rising to 1
 * over `FADE_PX` beyond it. On a viewport narrower than the column plus its fade, nothing shows.
 */
export function sideStrength(x: number, width: number): number {
    const fromCentre = Math.abs(x - width / 2);
    const edge = CLEAR_WIDTH / 2;
    const t = (fromCentre - edge) / FADE_PX;
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t * t * (3 - 2 * t);
}

/** The stars for a viewport, deterministic for a given size and seed. Those that would not show are left out. */
export function sideStars(width: number, height: number, seed = 23): SideStar[] {
    const rnd = seededRandom(seed);
    const count = Math.round((width * height * SIDE_DENSITY) / 1_000_000);
    const out: SideStar[] = [];
    for (let i = 0; i < count; i += 1) {
        const x = rnd() * width;
        const y = rnd() * height;
        const star: Star = {x, y, s: rnd(), t: rnd() < 0.06 ? 2 : rnd() < 0.4 ? 1 : 0};
        const strength = sideStrength(x, width);
        if (strength === 0) continue;
        out.push({
            x,
            y,
            r: star.t === 2 ? 1.2 + star.s : 0.5 + star.s * 0.9,
            alpha: strength * MAX_ALPHA * (0.45 + star.s * 0.55),
            tone: STAR_TONES[star.t],
        });
    }
    return out;
}
