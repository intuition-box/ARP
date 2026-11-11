import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {SceneDeck} from "../SceneDeck";
import {useDeck, useSceneTime} from "../scene-context";

/**
 * The deck is read the way a reader meets it: which scene is on (`data-on`, and the others out of
 * the accessibility tree), where the page was scrolled to, and whether a gesture was kept from the
 * browser. The deck's box is stubbed, since happy-dom lays nothing out: `deckTop` is where its top
 * sits before the deck lifts itself under the nav.
 */

const HEIGHT = 768;
let deckTop = 0;
let clock = 10_000;
let still = false;

function deckBox(this: HTMLElement): DOMRect {
    const lifted = this.classList.contains("arp-deck-pinned")
        ? deckTop + (parseFloat(this.style.marginTop) || 0)
        : 0;
    const height = this.classList.contains("arp-deck-pinned") ? 3 * HEIGHT : 0;
    const r = {top: lifted, left: 0, width: 1200, height, bottom: lifted + height, right: 1200};
    return {...r, x: 0, y: r.top, toJSON: () => r};
}

beforeEach(() => {
    deckTop = 0;
    clock = 10_000;
    still = false;
    Object.defineProperty(window, "innerHeight", {configurable: true, value: HEIGHT});
    Object.defineProperty(window, "innerWidth", {configurable: true, value: 1200});
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(deckBox);
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    vi.spyOn(window, "matchMedia").mockImplementation(
        (query: string) =>
            ({
                matches: still && query.includes("reduce"),
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
                // Only `matches` is read; the rest completes the interface.
            }) as MediaQueryList,
    );
    document.body.dataset.modal = "";
    history.replaceState(null, "", "/");
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

function Probe({index}: {index: number}) {
    const deck = useDeck();
    const time = useSceneTime(index);
    return (
        <p data-testid={`probe-${index}`}>
            {`on ${deck.current} from ${deck.previous} pinned ${deck.pinned} still ${deck.still} settle ${deck.settleMs} t ${time === Infinity ? "end" : time < 0 ? "off" : time.toFixed(1)}`}
        </p>
    );
}

const durationOf = vi.fn<(from: number, to: number, width: number) => number>(() => 1500);

function deck() {
    durationOf.mockClear();
    return render(
        <SceneDeck backdrop={<div data-testid="backdrop" />} durationOf={durationOf}>
            <div>
                <Probe index={0} />
                <a href="#second">to the second</a>
                <button type="button">press</button>
                <input aria-label="query" />
            </div>
            <div>
                <Probe index={1} />
            </div>
            <div>
                <h2 id="second">second</h2>
                <Probe index={2} />
            </div>
        </SceneDeck>,
    );
}

const onScene = () =>
    Array.from(document.querySelectorAll("[data-scene]"))
        .filter((section) => section.getAttribute("data-on") === "true")
        .map((section) => Number(section.getAttribute("data-scene")));

/** Past the gesture lock. */
const later = () => {
    clock += 2000;
};

function wheel(deltaY: number, {ctrlKey = false} = {}): boolean {
    const event = new WheelEvent("wheel", {deltaY, cancelable: true});
    // happy-dom's WheelEvent drops the modifier keys from its init dictionary.
    Object.defineProperty(event, "ctrlKey", {value: ctrlKey});
    act(() => {
        window.dispatchEvent(event);
    });
    return event.defaultPrevented;
}

function key(keyName: string, target: EventTarget = window, init: KeyboardEventInit = {}): boolean {
    const event = new KeyboardEvent("keydown", {
        key: keyName,
        cancelable: true,
        bubbles: true,
        ...init,
    });
    act(() => {
        target.dispatchEvent(event);
    });
    return event.defaultPrevented;
}

describe("SceneDeck", () => {
    it("stacks every scene, without the backdrop, on a viewport too short to pin", () => {
        Object.defineProperty(window, "innerHeight", {configurable: true, value: 500});
        deck();
        expect(onScene()).toEqual([0, 1, 2]);
        expect(screen.queryByTestId("backdrop")).toBeNull();
        expect(screen.getByTestId("probe-1")).toHaveTextContent("pinned false");
        expect(screen.getByTestId("probe-1")).toHaveTextContent("t end");
    });

    it("pins one scene at a time over the backdrop, the others out of reach", () => {
        deck();
        expect(onScene()).toEqual([0]);
        expect(screen.getByTestId("backdrop")).toBeInTheDocument();
        const hidden = document.querySelector("[data-scene='1']");
        expect(hidden).toHaveAttribute("aria-hidden", "true");
        expect(hidden).toHaveAttribute("inert");
        expect(document.querySelector("[data-scene='0']")).not.toHaveAttribute("aria-hidden");
    });

    it("lifts itself to the top of the page, under the nav", () => {
        deckTop = 64;
        deck();
        expect(document.querySelector<HTMLElement>(".arp-deck-pinned")?.style.marginTop).toBe(
            "-64px",
        );
    });

    it("one wheel notch is one scene, and the rest of the gesture is swallowed", () => {
        deck();
        expect(wheel(30)).toBe(true);
        expect(onScene()).toEqual([1]);
        expect(window.scrollTo).toHaveBeenLastCalledWith({top: HEIGHT, behavior: "instant"});
        expect(durationOf).toHaveBeenCalledWith(0, 1, 1200);
        expect(screen.getByTestId("probe-1")).toHaveTextContent("on 1 from 0");
        expect(screen.getByTestId("probe-1")).toHaveTextContent("settle 1500");
        expect(document.querySelector<HTMLElement>("[data-scene='1']")?.style.cssText).toContain(
            "--gx-base: 750ms",
        );
        // Momentum: kept from the browser, but no second step.
        expect(wheel(30)).toBe(true);
        expect(onScene()).toEqual([1]);
        later();
        wheel(30);
        expect(onScene()).toEqual([2]);
    });

    it("hands the wheel back to the browser at both ends, on a pinch, and on a tiny delta", () => {
        deck();
        expect(wheel(-30)).toBe(false);
        expect(wheel(2)).toBe(false);
        expect(wheel(30, {ctrlKey: true})).toBe(false);
        expect(onScene()).toEqual([0]);
        wheel(30);
        later();
        wheel(30);
        later();
        expect(onScene()).toEqual([2]);
        expect(wheel(30)).toBe(false);
    });

    it("leaves the gesture alone when it does not fill the viewport or a modal is open", () => {
        deck();
        deckTop = 200;
        expect(wheel(30)).toBe(false);
        expect(key("ArrowDown")).toBe(false);
        deckTop = 0;
        document.body.dataset.modal = "open";
        expect(wheel(30)).toBe(false);
        expect(onScene()).toEqual([0]);
    });

    it("steps with the keyboard, and keeps typing and pressing for the page", () => {
        deck();
        expect(key("ArrowDown")).toBe(true);
        expect(onScene()).toEqual([1]);
        // Locked: kept, not stepped.
        expect(key("PageDown")).toBe(true);
        expect(onScene()).toEqual([1]);
        later();
        expect(key(" ", window, {shiftKey: true})).toBe(true);
        expect(onScene()).toEqual([0]);
        later();
        expect(key("Tab")).toBe(false);
        expect(key("ArrowDown", screen.getByLabelText("query"))).toBe(false);
        expect(key(" ", screen.getByRole("button", {name: "press"}))).toBe(false);
        expect(onScene()).toEqual([0]);
        // An arrow on a button still means the deck.
        expect(key("ArrowDown", screen.getByRole("button", {name: "press"}))).toBe(true);
        later();
        expect(key(" ")).toBe(true);
        later();
        expect(onScene()).toEqual([2]);
        expect(key("PageUp")).toBe(true);
        later();
        expect(key("ArrowUp")).toBe(true);
        later();
        expect(onScene()).toEqual([0]);
        expect(key("ArrowUp")).toBe(false);
    });

    it("a swipe is one scene; the page scrolls on past either end", () => {
        deck();
        const touch = (type: string, clientY: number) => {
            const event = new TouchEvent(type, {cancelable: true});
            const list = [{clientY}];
            Object.defineProperty(event, type === "touchend" ? "changedTouches" : "touches", {
                value: list,
            });
            act(() => {
                window.dispatchEvent(event);
            });
            return event.defaultPrevented;
        };
        touch("touchstart", 500);
        expect(touch("touchmove", 400)).toBe(true);
        touch("touchend", 400);
        expect(onScene()).toEqual([1]);
        later();
        // A short drag does nothing.
        touch("touchstart", 500);
        touch("touchend", 480);
        expect(onScene()).toEqual([1]);
        // Pulling down at the first scene is the browser's.
        touch("touchstart", 300);
        touch("touchend", 450);
        expect(onScene()).toEqual([0]);
        later();
        touch("touchstart", 300);
        expect(touch("touchmove", 450)).toBe(false);
        // A move with no start is ignored.
        touch("touchend", 450);
        expect(touch("touchmove", 450)).toBe(false);
    });

    it("follows a native scroll into a scene's band", () => {
        deck();
        deckTop = -2 * HEIGHT;
        act(() => {
            window.dispatchEvent(new Event("scroll"));
        });
        expect(onScene()).toEqual([2]);
        expect(screen.getByTestId("probe-2")).toHaveTextContent("on 2 from 0");
    });

    it("an in-page link goes to the scene that holds its target", () => {
        const replace = vi.spyOn(history, "replaceState");
        deck();
        fireEvent.click(screen.getByRole("link", {name: "to the second"}), {metaKey: true});
        expect(onScene()).toEqual([0]);
        fireEvent.click(screen.getByRole("link", {name: "to the second"}));
        expect(onScene()).toEqual([2]);
        expect(replace).toHaveBeenLastCalledWith(null, "", "#second");
        expect(window.scrollTo).toHaveBeenLastCalledWith({top: 2 * HEIGHT, behavior: "instant"});
    });

    it("answers a hash change, and ignores a hash that names nothing in the deck", () => {
        deck();
        act(() => {
            window.location.hash = "#nowhere";
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        });
        expect(onScene()).toEqual([0]);
        act(() => {
            window.location.hash = "#second";
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        });
        expect(onScene()).toEqual([2]);
    });

    it("opens on the scene a hash names", async () => {
        history.replaceState(null, "", "/#second");
        deck();
        await act(async () => {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });
        expect(onScene()).toEqual([2]);
    });

    it("under reduced motion every step jumps: no settle time, every scene at its end", () => {
        still = true;
        deck();
        wheel(30);
        expect(screen.getByTestId("probe-1")).toHaveTextContent("still true settle 0");
        expect(screen.getByTestId("probe-1")).toHaveTextContent("t end");
        expect(durationOf).not.toHaveBeenCalled();
    });

    it("keeps the scenes' copy above the activity bar", () => {
        const bar = document.createElement("div");
        bar.setAttribute("data-bottom-bar", "");
        Object.defineProperty(bar, "offsetHeight", {value: 48});
        document.body.append(bar);
        deck();
        expect(
            document
                .querySelector<HTMLElement>(".arp-deck-pinned")
                ?.style.getPropertyValue("--gx-floor"),
        ).toBe("48px");
        bar.remove();
    });
});

describe("useSceneTime", () => {
    it("is off for a scene not on screen, and counts seconds from the camera's arrival on it", () => {
        vi.useFakeTimers({toFake: ["setTimeout", "setInterval"]});
        deck();
        expect(screen.getByTestId("probe-1")).toHaveTextContent("t off");
        wheel(30);
        // Arrival is 60 % of the 1.5 s move; 2 s after the step that is 1.1 s in.
        clock += 2000;
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(screen.getByTestId("probe-1")).toHaveTextContent("t 1.1");
        expect(screen.getByTestId("probe-0")).toHaveTextContent("t off");
    });
});
