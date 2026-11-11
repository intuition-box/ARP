import {act, render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {SideGalaxy} from "../SideGalaxy";
import {sideStars} from "../side-galaxy-geometry";

/** The side field is a canvas: the test reads back the dots painted and the canvas's own size. */

let dots: {x: number; y: number; r: number; fill: string}[] = [];

function recorder() {
    let pending = {x: 0, y: 0, r: 0};
    const ctx = {
        globalAlpha: 1,
        fillStyle: "",
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        arc(x: number, y: number, r: number) {
            pending = {x, y, r};
        },
        fill() {
            dots.push({...pending, fill: String(ctx.fillStyle)});
        },
    };
    return ctx;
}

function viewport(width: number, height: number, ratio = 1) {
    Object.defineProperty(window, "innerWidth", {configurable: true, value: width});
    Object.defineProperty(window, "innerHeight", {configurable: true, value: height});
    Object.defineProperty(window, "devicePixelRatio", {configurable: true, value: ratio});
}

beforeEach(() => {
    dots = [];
    const ctx = recorder();
    // The recorder has every member SideGalaxy calls, and nothing else is read from it.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
        () => ctx as unknown as CanvasRenderingContext2D,
    );
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("SideGalaxy", () => {
    it("paints every side star of a wide viewport, at the screen's pixel ratio", () => {
        viewport(1920, 1080, 2);
        const {container} = render(<SideGalaxy />);
        const canvas = container.querySelector("canvas");
        const stars = sideStars(1920, 1080);
        expect(stars.length).toBeGreaterThan(0);
        expect(dots).toHaveLength(stars.length);
        expect(dots[0]).toEqual({
            x: stars[0]?.x,
            y: stars[0]?.y,
            r: stars[0]?.r,
            fill: stars[0]?.tone,
        });
        expect(canvas?.width).toBe(3840);
        expect(canvas?.height).toBe(2160);
        expect(canvas).toHaveAttribute("aria-hidden", "true");
    });

    it("holds no pixels at all where no star would show, and redraws on resize", () => {
        viewport(1000, 800, 0);
        const {container, unmount} = render(<SideGalaxy />);
        const canvas = container.querySelector("canvas");
        expect(dots).toHaveLength(0);
        expect(canvas?.width).toBe(0);
        expect(canvas?.height).toBe(0);

        viewport(1920, 1080, 0);
        act(() => {
            window.dispatchEvent(new Event("resize"));
        });
        // A ratio of 0 is read as 1.
        expect(canvas?.width).toBe(1920);
        expect(dots).toHaveLength(sideStars(1920, 1080).length);

        unmount();
        dots = [];
        act(() => {
            window.dispatchEvent(new Event("resize"));
        });
        expect(dots).toHaveLength(0);
    });

    it("draws nothing without a 2D context", () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
        viewport(1920, 1080);
        render(<SideGalaxy />);
        expect(dots).toHaveLength(0);
    });
});
