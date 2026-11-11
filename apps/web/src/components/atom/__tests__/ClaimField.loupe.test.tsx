import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import type {EdgeRow, GroupView} from "../../../services/atom-standing-view";
import {ClaimField} from "../ClaimField";
import {LOUPE, MAX_DOTS_PER_RING, MAX_RINGS} from "../claim-field-geometry";
import {nextStop} from "../use-claim-loupe";

/**
 * The loupe tours the field on a clock and holds on the dot a reader points at. `happy-dom` lays
 * nothing out, so the field is given a 100px box and each dot the box position its own style asks
 * for: the loupe then reads exactly the geometry a browser would hand it.
 */

let clock = 0;
let frames: FrameRequestCallback[] = [];
let fieldWidth = 100;
let reducedMotion = false;

function rectOf(el: Element): DOMRect {
    if (el.classList.contains("arp-cf-field")) return new DOMRect(0, 0, fieldWidth, 100);
    if (el instanceof HTMLElement && el.classList.contains("arp-cf-dot")) {
        return new DOMRect(parseFloat(el.style.left), parseFloat(el.style.top), 0, 0);
    }
    return new DOMRect(0, 0, 0, 0);
}

/** Run every frame queued, at `clock`, `count` times, 16ms apart. */
function run(count: number) {
    for (let i = 0; i < count; i += 1) {
        clock += 16;
        const due = frames;
        frames = [];
        act(() => due.forEach((callback) => callback(clock)));
    }
}

beforeEach(() => {
    clock = 0;
    frames = [];
    fieldWidth = 100;
    reducedMotion = false;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
        this: Element,
    ) {
        return rectOf(this);
    });
    vi.spyOn(window, "matchMedia").mockImplementation(
        (query: string) =>
            ({
                matches: reducedMotion && query.includes("reduce"),
                media: query,
                onchange: null,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
                addListener: () => undefined,
                removeListener: () => undefined,
                dispatchEvent: () => false,
            }) satisfies MediaQueryList,
    );
});

afterEach(() => vi.restoreAllMocks());

function row(name: string, over: Partial<EdgeRow> = {}): EdgeRow {
    return {
        tripleId: `0x${name}`,
        name,
        nameIsId: false,
        subjectAtomId: `0xatom-${name}`,
        label: name,
        backing: null,
        positions: 0,
        opposition: null,
        ...over,
    };
}

function group(label: string, rows: EdgeRow[], inverse: string | null = null): GroupView {
    return {
        predicateAtomId: `0x${label}`,
        label,
        labelIsId: false,
        inverse,
        rows,
        backing: null,
        positions: 0,
    };
}

const inner = group("implements", [row("alpha"), row("beta")]);
const outerGroup = group("uses", [
    row("gamma", {backing: "0.5 tTRUST", positions: 1}),
    row("delta", {opposition: "0.1 tTRUST"}),
    row("epsilon", {line: "video · task done"}),
]);

function show(groups: readonly GroupView[], over: {edgeCount?: number; truncated?: boolean} = {}) {
    return render(
        <MemoryRouter>
            <ClaimField
                groups={groups}
                subject="hyperframes"
                edgeCount={over.edgeCount ?? 5}
                truncated={over.truncated ?? false}
            />
        </MemoryRouter>,
    );
}

const card = (container: HTMLElement) => container.querySelector(".arp-cf-card");
const cardSubject = (container: HTMLElement) =>
    container.querySelector(".arp-cf-card .arp-cf-subject")?.textContent ?? null;
const head = (container: HTMLElement) => {
    const circle = container.querySelector(".arp-cf-link circle");
    return {x: Number(circle?.getAttribute("cx")), y: Number(circle?.getAttribute("cy"))};
};
const dotLink = (name: string) => screen.getByRole("link", {name: new RegExp(`^${name} `)});
const dotCentre = (name: string) => {
    const style = dotLink(name).style;
    return {x: parseFloat(style.left) / 100, y: parseFloat(style.top) / 100};
};

describe("the claim field's loupe", () => {
    it("rests on the outer ring's claim nearest its resting place, unlit, before anything moves", () => {
        const {container} = show([inner, outerGroup]);
        expect(card(container)?.getAttribute("data-claim-sentence")).toBe("one");
        expect(card(container)?.className).not.toContain("is-lit");
        expect(["gamma", "delta", "epsilon"]).toContain(cardSubject(container));
    });

    it("holds on a focused dot, sits exactly on it, and names its claim on the card", () => {
        const {container} = show([inner, outerGroup]);
        run(1);
        act(() => fireEvent.focus(dotLink("alpha")));
        run(60);
        expect(cardSubject(container)).toBe("alpha");
        expect(card(container)?.className).toContain("is-lit");
        const at = dotCentre("alpha");
        expect(head(container).x).toBeCloseTo(at.x, 3);
        expect(head(container).y).toBeCloseTo(at.y, 3);
    });

    it("after a release, keeps the claim until the next stop, then tours to another", () => {
        const {container} = show([inner, outerGroup]);
        run(1);
        act(() => fireEvent.focus(dotLink("beta")));
        run(10);
        act(() => fireEvent.blur(dotLink("beta")));
        run(30);
        expect(cardSubject(container)).toBe("beta");
        run(Math.ceil(LOUPE.tourMs / 16) + 30);
        expect(cardSubject(container)).not.toBe("beta");
        expect(card(container)?.className).toContain("is-lit");
    });

    it("holds on a dot under the pointer, as it does on one with focus", () => {
        const {container} = show([inner, outerGroup]);
        run(1);
        act(() => fireEvent.mouseEnter(dotLink("beta")));
        run(40);
        expect(cardSubject(container)).toBe("beta");
    });

    it("still tours where the browser has no matchMedia", () => {
        const own = Object.getOwnPropertyDescriptor(window, "matchMedia");
        Object.defineProperty(window, "matchMedia", {value: undefined, configurable: true});
        try {
            const {container} = show([inner, outerGroup]);
            run(Math.ceil(LOUPE.tourMs / 16) + 60);
            expect(card(container)?.className).toContain("is-lit");
        } finally {
            if (own === undefined) Reflect.deleteProperty(window, "matchMedia");
            else Object.defineProperty(window, "matchMedia", own);
        }
    });

    it("ignores a release from a dot it is not holding", () => {
        const {container} = show([inner, outerGroup]);
        run(1);
        act(() => fireEvent.focus(dotLink("alpha")));
        act(() => fireEvent.mouseLeave(dotLink("beta")));
        run(40);
        expect(cardSubject(container)).toBe("alpha");
    });

    it("holds on the claim under the pointer while the pointer is on the card", () => {
        const {container} = show([inner, outerGroup]);
        run(1);
        act(() => fireEvent.focus(dotLink("delta")));
        run(10);
        act(() => fireEvent.blur(dotLink("delta")));
        const theCard = card(container);
        if (theCard === null) throw new Error("no card");
        act(() => fireEvent.mouseEnter(theCard));
        run(Math.ceil(LOUPE.tourMs / 16) + 30);
        expect(cardSubject(container)).toBe("delta");
        act(() => fireEvent.mouseLeave(theCard));
        run(Math.ceil(LOUPE.tourMs / 16) + 30);
        expect(cardSubject(container)).not.toBe("delta");
    });

    it("tours on its own every few seconds when nobody points, and lands on a dot", () => {
        const {container} = show([inner, outerGroup]);
        const before = head(container);
        run(Math.ceil(LOUPE.tourMs / 16) + 60);
        const now = head(container);
        expect(now).not.toEqual(before);
        expect(card(container)?.className).toContain("is-lit");
        const name = cardSubject(container) ?? "";
        expect(now.x).toBeCloseTo(dotCentre(name).x, 3);
        expect(now.y).toBeCloseTo(dotCentre(name).y, 3);
    });

    it("never tours under reduced motion: the loupe and its card stay where they rest", () => {
        reducedMotion = true;
        const {container} = show([inner, outerGroup]);
        const before = head(container);
        const resting = cardSubject(container);
        run(Math.ceil((LOUPE.tourMs * 3) / 16));
        expect(head(container)).toEqual(before);
        expect(cardSubject(container)).toBe(resting);
    });

    it("stays at rest when the field has no width to measure", () => {
        fieldWidth = 0;
        const {container} = show([inner, outerGroup]);
        const before = head(container);
        run(1);
        act(() => fireEvent.focus(dotLink("alpha")));
        run(40);
        expect(head(container)).toEqual(before);
    });

    it("picks the first stop at random when it has none yet", () => {
        expect(nextStop(null, 4, () => 0.6)).toBe(2);
    });
});

describe("the claim field's words", () => {
    it("says what stands behind each claim, and who took the other side", () => {
        show([inner, outerGroup]);
        expect(
            dotLink("gamma").textContent?.includes(
                "gamma uses hyperframes, 0.5 tTRUST behind it, 1 support",
            ),
        ).toBe(true);
        expect(dotLink("delta").textContent).toContain("nothing behind it, 0.1 tTRUST against");
        expect(dotLink("epsilon").textContent).toContain(", video · task done");
        expect(screen.getByText("someone took the other side")).toBeInTheDocument();
    });

    it("puts the backing, the opposition and the line on the card", () => {
        const {container} = show([inner, outerGroup]);
        run(1);
        act(() => fireEvent.focus(dotLink("gamma")));
        run(20);
        expect(container.querySelector(".arp-cf-figure")?.textContent).toContain(
            "0.5 tTRUST · 1 support",
        );
        act(() => fireEvent.focus(dotLink("delta")));
        run(20);
        expect(container.querySelector(".arp-cf-figure")?.textContent).toBe("nothing behind it");
        expect(container.querySelector(".arp-cf-against")?.textContent).toBe("0.1 tTRUST against");
        act(() => fireEvent.focus(dotLink("epsilon")));
        run(20);
        expect(container.querySelector(".arp-cf-line")?.textContent).toBe("video · task done");
        expect(container.querySelector(".arp-cf-card-head")?.textContent).toBe("uses");
    });

    it("names each ring and its count, with a floor on the last when the read was cut short", () => {
        show([inner, outerGroup], {edgeCount: 5, truncated: true});
        expect(screen.getByText("5+")).toBeInTheDocument();
        expect(screen.getByText("implements: 2 declarations")).toBeInTheDocument();
        expect(screen.getByText("uses: 3+ declarations")).toBeInTheDocument();
    });

    it("counts one declaration in the singular", () => {
        const {container} = show([group("uses", [row("0x12…ab", {nameIsId: true})], "used by")], {
            edgeCount: 1,
        });
        expect(cardSubject(container)).toBe("0x12…ab");
        expect(screen.getByText(/^declaration about hyperframes$/)).toBeInTheDocument();
        expect(screen.getByText("used by: 1 declaration")).toBeInTheDocument();
        expect(screen.queryByText("someone took the other side")).toBeNull();
    });

    it("folds kinds past the cap into one ring that lists them", () => {
        const many = Array.from({length: MAX_RINGS + 1}, (_, i) =>
            group(`kind${i}`, [row(`n${i}`)]),
        );
        const {container} = show(many, {edgeCount: MAX_RINGS + 1});
        expect(screen.getByText("+2 other kinds: 2 declarations")).toBeInTheDocument();
        const names = [...container.querySelectorAll(".arp-cf-name")];
        expect(names.at(-1)?.getAttribute("title")).toBe(
            `kind${MAX_RINGS - 1} 1, kind${MAX_RINGS} 1`,
        );
        expect(names[0]?.getAttribute("title")).toBeNull();
    });

    it("stipples the claims past what a ring can draw", () => {
        const rows = Array.from({length: MAX_DOTS_PER_RING + 4}, (_, i) => row(`r${i}`));
        const {container} = show([group("uses", rows)], {edgeCount: rows.length});
        expect(screen.getAllByRole("link", {name: / uses hyperframes/}).length).toBeGreaterThan(
            MAX_DOTS_PER_RING - 1,
        );
        expect(container.querySelectorAll(".arp-cf-grain circle").length).toBeGreaterThan(0);
    });

    it("shows an empty card when the outer ring has no claim to read", () => {
        const {container} = show([group("uses", [])], {edgeCount: 0});
        expect(card(container)?.getAttribute("data-claim-sentence")).toBe("none");
    });

    it("draws the empty field and says so when nothing points at the atom", () => {
        show([], {edgeCount: 0});
        expect(
            screen.getByText(
                "Nothing points at hyperframes yet. A declaration about it appears here as a dot.",
            ),
        ).toBeInTheDocument();
    });
});
