import {LANDING_DOTS_PER_RING, type LandingField} from "../../services/landing-field";
import {dotDiameter, landingOffset, ringAngle, type Point} from "../atom/claim-field-geometry";

/**
 * The landing's world, as pure arithmetic: the stars, the camera and its stops, where each atom of
 * the claim field sits, and how a star turns into a claim (task 81, ADR `0152`).
 *
 * Split from `GalaxyField.tsx` for the reason `claim-field-geometry.ts` and `sigil-geometry.ts`
 * are: a dot that pops, a camera that lets its subject drift out of frame or a ring with a dot at
 * twelve o'clock is arithmetic, and arithmetic is testable without a canvas.
 *
 * **World units.** The galaxy's disc has a radius of 520; a camera stop's `span` is how many world
 * units fit across the viewport's short side. The values are the reference's
 * (`docs/design/landing-galaxy/landing-galaxy-reference.html`, the `SCENES` table).
 */

/* -------------------------------------------------------------------------- */
/* The stars                                                                  */
/* -------------------------------------------------------------------------- */

/** One star. `s` is its size in `0..1`, `t` its tone: 0 rule, 1 grey, 2 steel. */
export type Star = {x: number; y: number; s: number; t: 0 | 1 | 2};

/**
 * A seeded generator, so the galaxy is the same on every load and in every test. The reference's
 * own mixer, kept so its composition (where the arms fall, which stars sit near the tool) is the
 * one the user approved.
 */
export function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state =
            Math.imul(state ^ (state >>> 15), 2246822507) ^
            Math.imul(state ^ (state >>> 13), 3266489909);
        return (state >>> 0) / 4294967296;
    };
}

/** The disc, then a sparse halo past it so a close view fills the screen to its corners. */
export const DISC_STARS = 2600;
export const HALO_STARS = 900;
export const DISC_RADIUS = 520;

export function buildStars(seed = 11): Star[] {
    const rnd = seededRandom(seed);
    const stars: Star[] = [];
    for (let i = 0; i < DISC_STARS; i += 1) {
        const r = Math.pow(rnd(), 0.8) * DISC_RADIUS;
        const a = rnd() * Math.PI * 2;
        const arm = rnd() < 0.62 ? Math.sin(2 * a - r * 0.012) * 0.55 : 0;
        const x = r * Math.cos(a + arm);
        const y = r * Math.sin(a + arm) * 0.82;
        const s = rnd();
        const t = rnd() < 0.07 ? 2 : rnd() < 0.45 ? 1 : 0;
        stars.push({x, y, s, t});
    }
    for (let i = 0; i < HALO_STARS; i += 1) {
        const r = DISC_RADIUS + Math.pow(rnd(), 0.7) * 600;
        const a = rnd() * Math.PI * 2;
        const s = rnd() * 0.6;
        stars.push({x: r * Math.cos(a), y: r * Math.sin(a) * 0.82, s, t: rnd() < 0.5 ? 1 : 0});
    }
    return stars;
}

/** A star's tone, as the canvas paints it: the rule-strong, dim-grey and steel colours of `index.css`. */
export const STAR_TONES = ["#43474b", "#6b7075", "#8a9096"] as const;

/** A star's radius in px at this zoom (`near` is 1 at the whole-galaxy view). Capped at 3. */
export function starRadius(star: Star, near: number): number {
    return Math.min(3, (0.7 + star.s * 0.9) * near * 0.9);
}

/** A star's opacity under a scene's dimming. */
export function starAlpha(dim: number): number {
    return 1 - dim * 0.75;
}

/* -------------------------------------------------------------------------- */
/* The subject and the field around it                                        */
/* -------------------------------------------------------------------------- */

/** Where the tool atom sits in the world: the subject of scenes 1 to 4. */
export const SUBJECT: Point = {x: 150, y: -70};

/** One ring per predicate, innermost first: `used by`, `in context of`, `has outcome`. */
export const RING_RADII = [7, 11.5, 15.5] as const;

export const RING_NAMES = ["used by", "in context of", "has outcome"] as const;

/**
 * A claim's place on its ring, in world units. The angle is `claim-field-geometry`'s
 * {@link ringAngle} with the landing's offsets (no dot at twelve o'clock, where the ring's name
 * sits; rings 1 and 2 never on one radius).
 */
export function slotOf(ring: number, position: number, drawn: number): Point {
    const r = RING_RADII[ring] ?? RING_RADII[RING_RADII.length - 1];
    const angle = ringAngle(ring, position, drawn, landingOffset);
    return {x: SUBJECT.x + r * Math.cos(angle), y: SUBJECT.y + r * Math.sin(angle)};
}

/**
 * Where your agent stands to read the field: outside it, upper right. The reference had it lower
 * left, where at the desktop stops it lands on the scene's heading.
 */
export const READER_SLOT: Point = {
    x: SUBJECT.x + 21 * Math.cos(-Math.PI * 0.22),
    y: SUBJECT.y + 21 * Math.sin(-Math.PI * 0.22),
};

/** How many atoms can be drawn at once: the tool, three capped rings, and your agent. */
export const ATOM_SLOTS = 1 + RING_RADII.length * LANDING_DOTS_PER_RING + 1;

/** The slot your agent always takes, so its star does not move when the data changes. */
export const READER_INDEX = ATOM_SLOTS - 1;

/**
 * The star each atom slot leaves from: the nearest unused star around the tool, each slot looking
 * in its own direction (the golden angle), further out as `k` grows. The reference's rule.
 *
 * @returns for each slot `k`, the index of its star in `stars`.
 */
export function assignStars(stars: readonly Star[], count = ATOM_SLOTS): number[] {
    const used = new Set<number>();
    const out: number[] = [];
    for (let k = 0; k < count; k += 1) {
        const want = 12 + k * 2.2;
        const angle = k * 2.399;
        const tx = SUBJECT.x + Math.cos(angle) * want * 1.4;
        const ty = SUBJECT.y + Math.sin(angle) * want;
        let best = -1;
        let distance = Infinity;
        stars.forEach((star, index) => {
            if (used.has(index)) return;
            const d = (star.x - tx) ** 2 + (star.y - ty) ** 2;
            if (d < distance) {
                distance = d;
                best = index;
            }
        });
        used.add(best);
        out.push(best);
    }
    return out;
}

/* -------------------------------------------------------------------------- */
/* The camera                                                                 */
/* -------------------------------------------------------------------------- */

/** Where a camera looks, how much fits (`span`), and where its subject sits on screen. */
export type CameraStop = {x: number; y: number; span: number; ox: number; oy: number};

/** What a scene does to the world besides the camera. */
export type SceneLook = {
    /** How much the stars dim, `0..1`. */
    dim: number;
    /** The field turns grey: no Saffron, no lit claim. Scene 4. */
    mono: boolean;
};

export type SceneStop = {name: string; cam: CameraStop; phone: Partial<CameraStop>} & SceneLook;

const WHOLE: CameraStop = {x: 0, y: 0, span: 880, ox: 0, oy: 0};
const WHOLE_PHONE: Partial<CameraStop> = {span: 560, ox: 0, oy: 0};

/** The six stops, in the user's order. Not to be reordered (task 81). */
export const SCENE_STOPS: readonly SceneStop[] = [
    {name: "Pulse", cam: WHOLE, phone: WHOLE_PHONE, dim: 0.3, mono: false},
    {
        name: "Written",
        cam: {x: SUBJECT.x, y: SUBJECT.y, span: 60, ox: 0.08, oy: -0.09},
        phone: {span: 52, ox: 0, oy: 0.02},
        dim: 0.7,
        mono: false,
    },
    {
        name: "Travels",
        cam: {x: SUBJECT.x, y: SUBJECT.y, span: 64, ox: 0.06, oy: -0.09},
        phone: {span: 58, ox: 0, oy: 0.065},
        dim: 0.62,
        mono: false,
    },
    {
        name: "Plug in",
        cam: {x: SUBJECT.x, y: SUBJECT.y, span: 70, ox: 0.2, oy: -0.1},
        phone: {span: 80, ox: 0, oy: -0.05},
        dim: 0.78,
        mono: false,
    },
    {
        name: "No grade",
        cam: {x: SUBJECT.x, y: SUBJECT.y, span: 56, ox: 0.2, oy: -0.06},
        phone: {span: 60, ox: 0, oy: -0.2},
        dim: 0.85,
        mono: true,
    },
    {name: "Build", cam: WHOLE, phone: WHOLE_PHONE, dim: 0.3, mono: false},
];

/** At or under this width, the phone's stops and layout apply (the reference's breakpoint). */
export const PHONE_MAX_WIDTH = 820;

/** A camera in the form it is tweened in: the span as a logarithm, so a zoom is even. */
export type Camera = {x: number; y: number; ls: number; ox: number; oy: number; dim: number};

export function cameraFor(scene: number, viewportWidth: number): Camera {
    const stop =
        SCENE_STOPS[Math.max(0, Math.min(SCENE_STOPS.length - 1, scene))] ?? SCENE_STOPS[0];
    const c = viewportWidth > PHONE_MAX_WIDTH ? stop.cam : {...stop.cam, ...stop.phone};
    return {x: c.x, y: c.y, ls: Math.log(c.span), ox: c.ox, oy: c.oy, dim: stop.dim};
}

/** 1.1 to 2.2 s, by how far the camera goes: a dive from the whole galaxy takes the longest. */
export const CAMERA_MS = {min: 1100, max: 2200} as const;

export function cameraDuration(from: Camera, to: Camera): number {
    const far = Math.abs(to.ls - from.ls) / 2.5 + Math.hypot(to.x - from.x, to.y - from.y) / 300;
    return Math.min(CAMERA_MS.max, Math.max(CAMERA_MS.min, CAMERA_MS.min + far * 700));
}

/** A CSS `cubic-bezier`, solved for `y` at `x` by Newton's method. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
    const a = (p: number, q: number) => 1 - 3 * q + 3 * p;
    const b = (p: number, q: number) => 3 * q - 6 * p;
    const c = (p: number) => 3 * p;
    const at = (t: number, p: number, q: number) => ((a(p, q) * t + b(p, q)) * t + c(p)) * t;
    const slope = (t: number, p: number, q: number) => 3 * a(p, q) * t * t + 2 * b(p, q) * t + c(p);
    return (x) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i += 1) {
            const d = slope(t, x1, x2);
            if (Math.abs(d) < 1e-6) break;
            t -= (at(t, x1, x2) - x) / d;
        }
        return at(clamp(t), y1, y2);
    };
}

/**
 * The camera's curve, `cubic-bezier(.45,0,.15,1)`: it leaves without a long wind-up, so the move
 * answers the gesture at once, and settles slowly. Atoms glide on the same curve.
 */
export const cameraEase = cubicBezier(0.45, 0, 0.15, 1);

/**
 * The camera `e` of the way (eased) from one stop to the next.
 *
 * **Position follows the zoom**, not the clock: on a dive the camera is where the zoom says it is,
 * so the subject never drifts out of frame half way down. Panning without zooming falls back to `e`.
 */
export function cameraAt(from: Camera, to: Camera, e: number): Camera {
    const ls = lerp(from.ls, to.ls, e);
    const s0 = Math.exp(from.ls);
    const s1 = Math.exp(to.ls);
    const pe = Math.abs(s0 - s1) > 1 ? clamp((s0 - Math.exp(ls)) / (s0 - s1)) : e;
    return {
        x: lerp(from.x, to.x, pe),
        y: lerp(from.y, to.y, pe),
        ls,
        ox: lerp(from.ox, to.ox, e),
        oy: lerp(from.oy, to.oy, e),
        dim: lerp(from.dim, to.dim, e),
    };
}

/** World to screen, for one camera in one viewport. */
export function projection(camera: Camera, width: number, height: number) {
    const scale = Math.min(width, height) / Math.exp(camera.ls);
    return {
        scale,
        x: (wx: number) => width / 2 + camera.ox * width + (wx - camera.x) * scale,
        y: (wy: number) => height / 2 + camera.oy * height + (wy - camera.y) * scale,
        /** 1 at the whole-galaxy view, larger closer in: how much a star grows. */
        near: Math.sqrt(scale / (Math.min(width, height) / 1100)),
    };
}

/* -------------------------------------------------------------------------- */
/* From a star to a claim                                                     */
/* -------------------------------------------------------------------------- */

/** The glide: 1.3 s in, 1.1 s out, leaving one after another, the last written first. */
export const GLIDE = {inMs: 1300, outMs: 1100, staggerMs: 55} as const;

/**
 * How far an atom on its trip `e` (0 at its star, 1 in its slot) looks like a claim rather than
 * the star it was. It changes during the first 60% of the trip, so it lands already itself.
 */
export function claimLook(e: number): number {
    return smooth(clamp((e - 0.05) / 0.6));
}

/**
 * An atom's drawn radius in px: the star's exact radius at `e = 0`, the claim's at the end. A
 * claim's full size is `dotDiameter(positions)` (by position count, never amount, ADR `0042`),
 * grown 1.6× while it is lit.
 */
export function atomRadius(
    e: number,
    star: number,
    claim: {kind: "tool" | "reader" | "claim"; positions: number; lit: number; zoom: number},
): number {
    const full =
        claim.kind === "tool"
            ? 7 * claim.zoom
            : claim.kind === "reader"
              ? 5 * claim.zoom
              : (dotDiameter(claim.positions) / 2) * claim.zoom * (1 + 0.6 * claim.lit);
    return lerp(star, full, claimLook(e));
}

/**
 * An atom's opacity: the star's at `e = 0`. Zoomed out (`visible` below 1) an atom never fades
 * below the star it was, so it can never vanish into the galaxy it came from.
 */
export function atomAlpha(e: number, starA: number, visible: number): number {
    return lerp(starA, lerp(starA, 1, visible), claimLook(e));
}

/** The field's visibility at this zoom: whole up close, gone once the camera is far out. */
export function fieldVisibility(camera: Camera): number {
    return clamp(1 - Math.max(0, camera.ls - Math.log(220)) / 0.7);
}

/* -------------------------------------------------------------------------- */
/* Scene 1's schedule, and scene 2's tour                                     */
/* -------------------------------------------------------------------------- */

/**
 * Scene 1 builds the line one element at a time, 2.2 s apart (slowed from 1.2 s, the user,
 * 2026-11-09: « plus lent entre chaque point »), in seconds after the camera
 * settles: the tool alone at the centre, then the agent that used it (with the `used by` ring),
 * then the context (its ring), then the outcome (its ring). Nothing else joins in scene 1: the
 * user, 2026-11-09, « je ne veux pas l'accumulation à la fin ». The other claims join in scene 2.
 */
export const WORDS_AT = {tool: 0.4, agent: 2.6, context: 4.8, outcome: 7.0} as const;

/**
 * Scene 5, the network: agents join the galaxy one after another, a star lighting up for each and
 * staying lit. Seconds after the camera settles.
 */
/** `most` is a visual cap on the stars drawn, not a count: no figure is printed from it. */
export const NETWORK = {from: 0.4, every: 0.45, most: 24} as const;

/** When the `j`-th agent joins in scene 5. */
export function networkAt(j: number): number {
    return NETWORK.from + j * NETWORK.every;
}

/**
 * The star each joining agent lights in scene 5: spread over the disc, the same on every load.
 * Indices into `buildStars()`'s disc stars.
 */
export function networkStars(count: number, seed = 29): number[] {
    const rnd = seededRandom(seed);
    const out: number[] = [];
    while (out.length < Math.min(count, NETWORK.most)) {
        const index = Math.floor(rnd() * DISC_STARS);
        if (!out.includes(index)) out.push(index);
    }
    return out;
}

/** A word lights in the panel this long after its atom leaves its star. */
export const WORD_LIGHTS_AFTER = 0.9;

/** Scene 2: the loupe starts reading after this, and holds each claim this long. */
export const READ = {startS: 0.6, forS: 2.8} as const;

/**
 * Which reading the loupe is on, or -1 when none. Under reduced motion the end state is every
 * reading at once, so the loupe tours nothing and no claim stays lit.
 */
export function readingAt(
    since: number,
    count: number,
    still: boolean,
    start: number = READ.startS,
): number {
    if (count === 0 || still) return -1;
    if (since < start) return -1;
    return Math.floor((since - start) / READ.forS) % count;
}

/**
 * Scene 2 fills the field the line left: the claims that are not the line's words join one after
 * another once the camera settles, each from its star, and leave the same way back to scene 1,
 * the last in first out. The line's dots never move: their slots are already their final ones.
 * The user, 2026-11-09: « plein de points qui se réorganisent et ça fait brouillon ».
 */
export const FILL = {everyS: 0.35, outEveryS: 0.18} as const;

/** How many claims join in scene 2: every drawn claim that is not one of the line's words. */
export function fillCount(field: LandingField | null): number {
    if (field === null) return 0;
    const line = field.line;
    const own = new Set([line?.keys.agent, line?.keys.context, line?.keys.outcome]);
    return field.rings.reduce(
        (sum, ring) => sum + ring.claims.filter((c) => !own.has(c.key)).length,
        0,
    );
}

/** When the loupe starts reading in scene 2: once the last joining claim has landed. */
export function readStart(joining: number): number {
    if (joining === 0) return READ.startS;
    return (joining - 1) * FILL.everyS + GLIDE.inMs / 1000 + 0.2;
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

export function clamp(value: number, low = 0, high = 1): number {
    return Math.min(high, Math.max(low, value));
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function smooth(t: number): number {
    return t * t * (3 - 2 * t);
}

/** Two `#rrggbb` colours mixed, as an `rgb()` the canvas takes. */
export function mixHex(a: string, b: string, t: number): string {
    const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const pa = parse(a);
    const pb = parse(b);
    return `rgb(${pa.map((v, i) => Math.round(v + ((pb[i] ?? v) - v) * t)).join(",")})`;
}
