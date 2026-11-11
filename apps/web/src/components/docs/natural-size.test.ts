import {describe, expect, it} from "vitest";

import {atNaturalSize} from "./natural-size";

describe("atNaturalSize", () => {
    it("sets the width from the viewBox and swaps the fit-to-container cap for a legibility floor", () => {
        const svg =
            '<svg id="m" width="100%" style="max-width: 1612.5px;" viewBox="-50 -10 1612.5 590">';
        expect(atNaturalSize(svg)).toBe(
            '<svg id="m" width="1613" style="min-width: 968px;" viewBox="-50 -10 1612.5 590">',
        );
    });
});

describe("atNaturalSize without a viewBox", () => {
    it("leaves the drawing as Mermaid made it", () => {
        const svg = '<svg width="100%" style="max-width: 10px;">';
        expect(atNaturalSize(svg)).toBe(svg);
    });
});
