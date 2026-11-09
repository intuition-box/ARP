import {describe, expect, it} from "vitest";

import {LEGAL, LEGAL_SLUGS, remainingPlaceholders} from "../legal";

describe("the legal pages (task 74)", () => {
    it("has one page per slug, each with a French title and an English line", () => {
        for (const slug of LEGAL_SLUGS) {
            expect(LEGAL[slug].title.length).toBeGreaterThan(0);
            expect(LEGAL[slug].english).toMatch(/in French\.$/);
        }
    });

    it("finds every placeholder, which is what blocks a release build", () => {
        const left = remainingPlaceholders();
        expect(left.length).toBeGreaterThan(0);
        expect(left.every((entry) => entry.startsWith("[") && entry.endsWith("À COMPLÉTER]"))).toBe(true);
    });
});
