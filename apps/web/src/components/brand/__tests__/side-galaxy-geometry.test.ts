import {describe, expect, it} from "vitest";

import {CLEAR_WIDTH, FADE_PX, MAX_ALPHA, sideStars, sideStrength} from "../side-galaxy-geometry";

describe("the side galaxy", () => {
    it("leaves the content column clear, and is at full strength past the fade", () => {
        const width = 1920;
        expect(sideStrength(width / 2, width)).toBe(0);
        expect(sideStrength(width / 2 - CLEAR_WIDTH / 2 + 1, width)).toBe(0);
        expect(sideStrength(0, width)).toBe(1);
        const mid = sideStrength(width / 2 + CLEAR_WIDTH / 2 + FADE_PX / 2, width);
        expect(mid).toBeGreaterThan(0);
        expect(mid).toBeLessThan(1);
    });

    it("draws no star over the content column, and none brighter than the cap", () => {
        const width = 1600;
        const stars = sideStars(width, 900);
        expect(stars.length).toBeGreaterThan(0);
        for (const star of stars) {
            expect(Math.abs(star.x - width / 2)).toBeGreaterThan(CLEAR_WIDTH / 2);
            expect(star.alpha).toBeLessThanOrEqual(MAX_ALPHA);
        }
    });

    it("shows nothing on a window narrower than the content column", () => {
        expect(sideStars(1200, 900)).toEqual([]);
    });

    it("is the same field for the same size", () => {
        expect(sideStars(1600, 900)).toEqual(sideStars(1600, 900));
    });
});
