import {act, render} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {EMPTY_FIELD, type LandingField} from "../../../services/landing-field";
import {SAMPLE_FIELD} from "../../../services/landing-sample";
import {GalaxyField} from "../GalaxyField";
import {DeckContext, type DeckState} from "../scene-context";

/**
 * The galaxy is a canvas: what a reader gets is what is painted on it. So the 2D context is a
 * recorder, and the tests read back the words it was asked to write, the dashes it drew and the
 * colours its dots were filled with, frame by frame on a clock the test turns.
 */

type Paint = {text: string; alpha: number};

function recorder() {
    const texts: Paint[] = [];
    const fills: string[] = [];
    const dashes: number[][] = [];
    const lines: {x: number; y: number}[] = [];
    let clears = 0;
    const ctx = {
        globalAlpha: 1,
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        font: "",
        textAlign: "",
        textBaseline: "",
        letterSpacing: "",
        save: vi.fn(),
        restore: vi.fn(),
        setTransform: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        roundRect: vi.fn(),
        moveTo: vi.fn(),
        lineTo(x: number, y: number) {
            lines.push({x, y});
        },
        stroke: vi.fn(),
        fill() {
            fills.push(String(ctx.fillStyle));
        },
        fillRect() {
            clears += 1;
        },
        setLineDash(segments: number[]) {
            dashes.push(segments);
        },
        measureText: (text: string) => ({width: text.length * 6}),
        fillText(text: string) {
            texts.push({text, alpha: ctx.globalAlpha});
        },
    };
    return {
        ctx,
        texts,
        fills,
        dashes,
        lines,
        clears: () => clears,
        reset() {
            texts.length = 0;
            fills.length = 0;
            dashes.length = 0;
            lines.length = 0;
            clears = 0;
        },
        /** Words written legibly in the last frames recorded. */
        written: () => new Set(texts.filter((t) => t.alpha > 0.5).map((t) => t.text)),
    };
}

let paint = recorder();
let queue: FrameRequestCallback[] = [];
let clock = 1000;
let box = {top: 0, left: 0, width: 1200, height: 800, bottom: 800, right: 1200};

/** Runs the frames queued so far at `clock`, `count` times, `stepMs` apart. */
function frames(count: number, stepMs = 50) {
    for (let i = 0; i < count; i += 1) {
        clock += stepMs;
        const now = queue;
        queue = [];
        act(() => now.forEach((callback) => callback(clock)));
    }
}

/** One fresh frame, its paint alone. */
function frame() {
    paint.reset();
    frames(1);
}

function rect(r: typeof box): DOMRect {
    return {...r, x: r.left, y: r.top, toJSON: () => r};
}

beforeEach(() => {
    paint = recorder();
    queue = [];
    clock = 1000;
    box = {top: 0, left: 0, width: 1200, height: 800, bottom: 800, right: 1200};
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
        queue.push(callback);
        return queue.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
        queue = [];
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockImplementation(() =>
        rect(box),
    );
    // The recorder is a structural stand-in for the 2D context: it has every member GalaxyField
    // calls, and nothing else is ever read from it.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
        () => paint.ctx as unknown as CanvasRenderingContext2D,
    );
    Object.defineProperty(window, "innerWidth", {configurable: true, value: 1200});
});

afterEach(() => {
    vi.restoreAllMocks();
});

const still = (current: number, previous = 0): DeckState => ({
    pinned: true,
    current,
    previous,
    changedAt: clock,
    settleMs: 0,
    still: true,
});

const moving = (current: number, previous: number): DeckState => ({
    pinned: true,
    current,
    previous,
    changedAt: clock,
    settleMs: 1200,
    still: false,
});

function Deck({deck, children}: {deck: DeckState; children: ReactNode}) {
    return <DeckContext.Provider value={deck}>{children}</DeckContext.Provider>;
}

function galaxy(
    deck: DeckState,
    field: LandingField | null = SAMPLE_FIELD,
    options: {beats?: number; readRow?: (index: number) => HTMLElement | null} = {},
) {
    const readRow = options.readRow ?? (() => null);
    const view = render(
        <Deck deck={deck}>
            <GalaxyField field={field} beats={options.beats ?? 0} readRow={readRow} />
        </Deck>,
    );
    return {
        ...view,
        to(next: DeckState, nextField: LandingField | null = field) {
            view.rerender(
                <Deck deck={next}>
                    <GalaxyField field={nextField} beats={options.beats ?? 0} readRow={readRow} />
                </Deck>,
            );
        },
    };
}

describe("GalaxyField", () => {
    it("is decoration: a canvas hidden from assistive tech", () => {
        const {container} = galaxy(still(0));
        expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
    });

    it("scene 0 is the galaxy alone: stars, and not one word", () => {
        galaxy(still(0));
        frame();
        expect(paint.clears()).toBe(1);
        expect(paint.fills.length).toBeGreaterThan(1000);
        expect(paint.written().size).toBe(0);
    });

    it("scene 1, still, names the tool and the line's own words and its rings", () => {
        galaxy(still(1));
        frames(3);
        frame();
        const words = paint.written();
        expect(words).toContain("hyperframes");
        expect(words).toContain("agent 1");
        expect(words).toContain("video");
        expect(words).toContain("task done");
        expect(words).toContain("USED BY");
        expect(words).toContain("HAS OUTCOME");
        // A claim that is not one of the line's words is not named in scene 1.
        expect(words).not.toContain("agent 2");
        expect(words).not.toContain("Your agent");
    });

    /** A panel holding one row, both boxes fixed, on the page for `readRow` to return. */
    function panelRow(panelBox: typeof box, rowBox: typeof box) {
        const panel = document.createElement("div");
        panel.setAttribute("data-panel", "");
        const row = document.createElement("p");
        panel.append(row);
        document.body.append(panel);
        vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(rect(panelBox));
        vi.spyOn(row, "getBoundingClientRect").mockReturnValue(rect(rowBox));
        return {row, remove: () => panel.remove()};
    }

    it("scene 2, still, names your agent and lights no reading", () => {
        const readRow = vi.fn(() => null);
        galaxy(still(2, 1), SAMPLE_FIELD, {readRow});
        frames(3);
        frame();
        const words = paint.written();
        expect(words).toContain("Your agent");
        expect(words).toContain("hyperframes");
        expect(words).not.toContain("agent 2");
        expect(readRow).not.toHaveBeenCalled();
    });

    it("scene 2 in motion reads one claim, names it, and runs the loupe's line to its row", () => {
        const {row, remove} = panelRow(
            {top: 100, left: 900, width: 280, height: 400, bottom: 500, right: 1180},
            {top: 200, left: 900, width: 280, height: 20, bottom: 220, right: 1180},
        );
        const readRow = vi.fn(() => row);
        const {to} = galaxy(still(1), SAMPLE_FIELD, {readRow});
        frames(3);
        to(moving(2, 1));
        // 3.5 s after the change: the camera has arrived and the loupe is on the first reading.
        frames(70);
        frame();
        const words = paint.written();
        expect(words).toContain("Your agent");
        expect(words).toContain("agent 2");
        expect(words).not.toContain("video");
        expect(readRow).toHaveBeenLastCalledWith(0);
        // The elbow ends level with the row, at the panel's left edge.
        expect(paint.lines.at(-1)).toEqual({x: 900, y: 210});
        // Three seconds on, the second reading.
        frames(58);
        frame();
        expect(paint.written()).toContain("video");
        expect(paint.written()).not.toContain("agent 2");
        expect(readRow).toHaveBeenLastCalledWith(1);
        remove();
    });

    it("on a phone the loupe's line rises to the panel's lower edge when the panel is above", () => {
        Object.defineProperty(window, "innerWidth", {configurable: true, value: 400});
        box = {top: 0, left: 0, width: 400, height: 800, bottom: 800, right: 400};
        const {row, remove} = panelRow(
            {top: 0, left: 0, width: 400, height: 40, bottom: 40, right: 400},
            {top: 10, left: 0, width: 400, height: 20, bottom: 30, right: 400},
        );
        const {to} = galaxy(still(1), SAMPLE_FIELD, {readRow: () => row});
        frames(3);
        to(moving(2, 1));
        frames(70);
        frame();
        expect(paint.lines.at(-1)?.y).toBe(40);
        remove();
    });

    it("draws the loupe without a line when the row is not on the page", () => {
        const {to} = galaxy(still(1));
        frames(3);
        to(moving(2, 1));
        frames(70);
        frame();
        expect(paint.lines).toHaveLength(0);
        expect(paint.written()).toContain("agent 2");
    });

    it("scene 3 puts your agent in the field and names no claim", () => {
        galaxy(still(3, 2));
        frames(3);
        frame();
        const words = paint.written();
        expect(words).toContain("Your agent");
        expect(words).not.toContain("agent 1");
        expect(words).not.toContain("video");
    });

    it("on a phone, scene 3 leaves your agent unnamed and only the outcome ring named", () => {
        Object.defineProperty(window, "innerWidth", {configurable: true, value: 400});
        galaxy(still(3, 2));
        frames(3);
        frame();
        const words = paint.written();
        expect(words).not.toContain("Your agent");
        expect(words).not.toContain("USED BY");
    });

    it("scene 4 keeps the tool's name and drops the rings' names", () => {
        galaxy(still(4, 3));
        frames(3);
        frame();
        const words = paint.written();
        expect(words).toContain("hyperframes");
        expect(words).not.toContain("USED BY");
        expect(words).not.toContain("Your agent");
    });

    it("scene 5 lights one star per agent that declared the tool", () => {
        galaxy(still(5, 4));
        frames(2);
        frame();
        // A lit star is its tone mixed all the way to paper; the galaxy's own tones never are.
        const fg = paint.fills.filter((colour) => colour === "rgb(230,232,230)");
        expect(fg).toHaveLength(SAMPLE_FIELD.agents);
        expect(paint.written().size).toBe(0);
    });

    it("an answered but empty field draws one dashed ring, and no field draws none", () => {
        const {to} = galaxy(still(1), EMPTY_FIELD);
        frames(3);
        frame();
        expect(paint.dashes).toContainEqual([3, 4]);
        expect(paint.written().size).toBe(0);
        to(still(1, 0), null);
        frames(19);
        frame();
        expect(paint.dashes).toHaveLength(0);
    });

    it("scene 1 in motion names each of the line's words while it is written, then lets it go", () => {
        const {to} = galaxy(still(0));
        frames(2);
        to(moving(1, 0));
        // 3.9 s after arrival: the agent's word has landed and is still being written.
        frames(93);
        frame();
        let words = paint.written();
        expect(words).toContain("hyperframes");
        expect(words).toContain("agent 1");
        expect(words).not.toContain("task done");
        // 8.3 s after arrival: the outcome's turn, and the agent's name has gone.
        frames(88);
        frame();
        words = paint.written();
        expect(words).toContain("task done");
        expect(words).not.toContain("agent 1");
        // 11.8 s: the line is written; only the tool and the rings stay named.
        frames(70);
        frame();
        words = paint.written();
        expect(words).toContain("hyperframes");
        expect(words).toContain("USED BY");
        expect(words).not.toContain("task done");
    });

    it("scene 2 in motion tours the readings, and back in scene 1 your agent leaves", () => {
        const {to} = galaxy(still(1));
        frames(3);
        to(moving(2, 1));
        paint.reset();
        frames(200);
        const toured = paint.written();
        expect(toured).toContain("Your agent");
        expect(toured).toContain("agent 2");
        expect(toured).toContain("video");
        to(moving(3, 2));
        frames(100);
        to(moving(1, 3));
        frames(150);
        frame();
        expect(paint.written()).not.toContain("Your agent");
        expect(paint.written()).toContain("hyperframes");
    });

    it("reaching scene 4 straight from scene 0 brings every reading in, late, one after another", () => {
        const {to} = galaxy(still(0));
        frames(2);
        to(moving(4, 0));
        frames(150);
        frame();
        expect(paint.written()).toContain("hyperframes");
        to(moving(0, 4));
        frames(150);
        frame();
        expect(paint.written().size).toBe(0);
    });

    it("beats once per real line when scene 0 arrives, and never without one", () => {
        const quiet = galaxy(moving(0, 1), SAMPLE_FIELD, {beats: 0});
        paint.reset();
        frames(38);
        expect(paint.fills.filter((colour) => colour === "#e6e8e6")).toHaveLength(0);
        quiet.unmount();

        galaxy(moving(0, 1), SAMPLE_FIELD, {beats: 3});
        paint.reset();
        frames(38);
        expect(paint.fills.filter((colour) => colour === "#e6e8e6").length).toBeGreaterThan(0);
    });

    it("a new field lets the old tool go and names the new one", () => {
        const other: LandingField = {
            ...SAMPLE_FIELD,
            tool: {atomId: "0xabc", name: "pptx", label: null},
            line: null,
            readings: [],
            rings: [SAMPLE_FIELD.rings[0] ?? {name: "used by", total: 0, claims: []}],
        };
        const {to} = galaxy(moving(1, 0));
        frames(100);
        to(moving(1, 0), other);
        frames(100);
        frame();
        const words = paint.written();
        expect(words).toContain("pptx");
        expect(words).not.toContain("hyperframes");
    });

    it("paints nothing while scrolled out of view, and refits when its box changes", () => {
        const {container} = galaxy(still(0));
        const canvas = container.querySelector("canvas");
        frame();
        expect(canvas?.width).toBe(1200);
        box = {...box, width: 600, right: 600};
        frame();
        expect(canvas?.width).toBe(600);
        box = {...box, bottom: 0};
        frame();
        expect(paint.clears()).toBe(0);
    });

    it("stops its frames when it leaves the page", () => {
        const {unmount} = galaxy(still(0));
        expect(queue).toHaveLength(1);
        unmount();
        expect(queue).toHaveLength(0);
    });

    it("draws nothing at all without a 2D context", () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
        galaxy(still(1));
        expect(queue).toHaveLength(0);
    });
});
