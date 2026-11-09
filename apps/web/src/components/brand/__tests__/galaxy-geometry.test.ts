import {describe, expect, it} from "vitest";

import {dotDiameter} from "../../atom/claim-field-geometry";
import {SAMPLE_FIELD} from "../../../services/landing-sample";
import {
    assignStars,
    atomAlpha,
    atomRadius,
    ATOM_SLOTS,
    buildStars,
    cameraAt,
    cameraDuration,
    cameraFor,
    claimLook,
    fillCount,
    FILL,
    networkAt,
    readStart,
    networkStars,
    NETWORK,
    WORDS_AT,
    projection,
    readingAt,
    RING_RADII,
    SCENE_STOPS,
    slotOf,
    starAlpha,
    starRadius,
    SUBJECT,
} from "../galaxy-geometry";

/**
 * The landing's world (task 81). The three assertions the user's corrections turn on: a dot never
 * pops (it starts as its star, exactly), the subject never leaves the frame during a dive, and no
 * dot sits at twelve o'clock, where its ring's name is written.
 */
describe("the stars", () => {
    it("are the same galaxy on every load", () => {
        expect(buildStars()).toEqual(buildStars());
        expect(buildStars()).toHaveLength(3500);
    });

    it("give every atom slot its own star, near the tool", () => {
        const stars = buildStars();
        const slots = assignStars(stars);
        expect(slots).toHaveLength(ATOM_SLOTS);
        expect(new Set(slots).size).toBe(ATOM_SLOTS);
        for (const index of slots) {
            const star = stars[index]!;
            expect(Math.hypot(star.x - SUBJECT.x, star.y - SUBJECT.y)).toBeLessThan(120);
        }
    });
});

describe("from a star to a claim", () => {
    const star = buildStars()[0]!;

    it("leaves with the star's exact radius and opacity, so nothing pops", () => {
        const near = 3.4;
        const r = starRadius(star, near);
        expect(atomRadius(0, r, {kind: "claim", positions: 4, lit: 0, zoom: 1})).toBe(r);
        expect(atomAlpha(0, starAlpha(0.7), 1)).toBe(starAlpha(0.7));
    });

    it("lands as the claim: dotDiameter by positions, grown 1.6x when lit", () => {
        expect(atomRadius(1, 1, {kind: "claim", positions: 4, lit: 0, zoom: 1})).toBe(
            dotDiameter(4) / 2,
        );
        expect(atomRadius(1, 1, {kind: "claim", positions: 4, lit: 1, zoom: 1})).toBeCloseTo(
            (dotDiameter(4) / 2) * 1.6,
        );
    });

    it("turns into the claim during the first 60% of the trip", () => {
        expect(claimLook(0)).toBe(0);
        expect(claimLook(0.65)).toBe(1);
        expect(claimLook(0.3)).toBeGreaterThan(0);
        expect(claimLook(0.3)).toBeLessThan(1);
    });

    it("never fades below the star it was when the camera is far out", () => {
        for (const e of [0, 0.25, 0.5, 1]) expect(atomAlpha(e, 0.4, 0)).toBeGreaterThanOrEqual(0.4);
    });
});

describe("the field", () => {
    it("puts no dot at twelve o'clock and rings 1 and 2 never on one radius", () => {
        for (let ring = 0; ring < RING_RADII.length; ring += 1) {
            for (const drawn of [1, 2, 3, 5, 6]) {
                for (let position = 0; position < drawn; position += 1) {
                    const p = slotOf(ring, position, drawn);
                    const angle = Math.atan2(p.y - SUBJECT.y, p.x - SUBJECT.x);
                    // Twelve o'clock is -90°; nothing within 10° of it.
                    expect(Math.abs(angle + Math.PI / 2)).toBeGreaterThan((10 * Math.PI) / 180);
                }
            }
        }
        const one = slotOf(1, 0, 3);
        const two = slotOf(2, 0, 3);
        const angle = (p: {x: number; y: number}) => Math.atan2(p.y - SUBJECT.y, p.x - SUBJECT.x);
        expect(angle(one)).not.toBeCloseTo(angle(two));
    });

    it("builds scene 1 one element at a time, 2.2 s apart, the tool first", () => {
        const times = [WORDS_AT.tool, WORDS_AT.agent, WORDS_AT.context, WORDS_AT.outcome];
        for (let i = 1; i < times.length; i += 1) {
            expect(times[i]! - times[i - 1]!).toBeCloseTo(2.2);
        }
    });

    it("lets the network's agents join one after another, each on its own star", () => {
        expect(networkAt(1) - networkAt(0)).toBeCloseTo(NETWORK.every);
        const stars = networkStars(10);
        expect(new Set(stars).size).toBe(10);
        expect(networkStars(10)).toEqual(stars);
        expect(networkStars(500)).toHaveLength(NETWORK.most);
    });

    it("tours the readings 2.8 s each, and tours nothing under reduced motion", () => {
        expect(readingAt(0.1, 4, false)).toBe(-1);
        expect(readingAt(0.7, 4, false)).toBe(0);
        expect(readingAt(0.6 + 2.8 * 5 + 0.1, 4, false)).toBe(1);
        expect(readingAt(99, 4, true)).toBe(-1);
        expect(readingAt(5, 0, false)).toBe(-1);
    });
});

describe("the camera", () => {
    it("has six stops in the user's order", () => {
        expect(SCENE_STOPS.map((stop) => stop.name)).toEqual([
            "Pulse",
            "Written",
            "Travels",
            "Plug in",
            "No grade",
            "Build",
        ]);
    });

    it("uses the phone's stops at 820px and below", () => {
        expect(Math.exp(cameraFor(0, 1280).ls)).toBeCloseTo(880);
        expect(Math.exp(cameraFor(0, 390).ls)).toBeCloseTo(560);
    });

    it("takes 1.1 to 2.2 s, the dive the longest", () => {
        const dive = cameraDuration(cameraFor(0, 1280), cameraFor(1, 1280));
        const step = cameraDuration(cameraFor(1, 1280), cameraFor(2, 1280));
        expect(dive).toBeGreaterThan(step);
        expect(step).toBeGreaterThanOrEqual(1100);
        expect(dive).toBeLessThanOrEqual(2200);
    });

    it("keeps the subject in frame all the way down a dive", () => {
        const from = cameraFor(0, 1280);
        const to = cameraFor(1, 1280);
        for (let i = 0; i <= 20; i += 1) {
            const view = projection(cameraAt(from, to, i / 20), 1280, 800);
            const x = view.x(SUBJECT.x);
            const y = view.y(SUBJECT.y);
            expect(x).toBeGreaterThan(0);
            expect(x).toBeLessThan(1280);
            expect(y).toBeGreaterThan(0);
            expect(y).toBeLessThan(800);
        }
    });
});

describe("scene 2's fill", () => {
    it("counts every drawn claim that is not one of the line's words", () => {
        // The sample: 5 + 3 + 3 drawn claims, three of them the line's words.
        expect(fillCount(SAMPLE_FIELD)).toBe(8);
        expect(fillCount(null)).toBe(0);
    });

    it("starts the loupe only once the last claim has landed", () => {
        const joining = 8;
        expect(readStart(joining)).toBeGreaterThan((joining - 1) * FILL.everyS + 1.3);
        expect(readStart(0)).toBe(0.6);
    });

});
