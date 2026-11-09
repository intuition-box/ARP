import {Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode} from "react";

import {cssVars} from "../../lib/css-vars";
import {DeckContext, type DeckState} from "./scene-context";

/**
 * Full-viewport scenes, one at a time, over one backdrop: the landing's camera (task 81).
 *
 * ## What it is
 *
 * A tall spacer (one viewport per scene) with a `sticky` stage inside it, so the page sits at a
 * real scroll offset, the scrollbar is native, and after the last scene the reader scrolls on to
 * the site's footer. The stage holds the backdrop (the galaxy) and every scene, stacked; only the
 * current one is on.
 *
 * ## One gesture, one scene (ADR `0066`)
 *
 * The first wheel notch, swipe or key press of a gesture moves to the next scene and the rest of
 * that gesture is swallowed until the camera has mostly landed. Since task 81 the **scene changes
 * at once and the camera carries the move**: the scroll position jumps to the scene's band, which
 * nobody sees because the stage is sticky, and the backdrop tweens on its own clock. Both ends
 * hand back to native scroll, so the footer is reached by scrolling on, as on every page.
 *
 * ## Scenes do not overlap (ADR `0068`)
 *
 * The leaving scene goes in 200 ms, all at once; the arriving one comes in as the camera settles,
 * piece by piece. That is CSS on `data-on` (`.arp-gx-scene` in `index.css`); this sets the delay.
 *
 * ## Where it pins (ADR `0152`, amending `0066`)
 *
 * On a phone too, and under `prefers-reduced-motion`, because the design gives both a camera stop
 * per scene; reduced motion makes every scene **jump** to its end state instead of travelling. It
 * stacks only where a scene cannot fit — a viewport under {@link MIN_HEIGHT} tall — and before
 * JavaScript runs, so motion never gates content.
 *
 * ## In-page anchors
 *
 * A link to `#id` inside the deck moves to the scene holding that id, since the scene's box is not
 * where the browser would scroll.
 */

/** Below this the deck stacks: a phone held sideways cannot show a scene and its panel. */
const MIN_HEIGHT = 560;

/** At least this long after a step, the rest of the gesture is swallowed (trackpad momentum). */
const LOCK_MIN_MS = 900;

function canPin(): boolean {
    if (typeof window === "undefined") return false;
    return window.innerHeight >= MIN_HEIGHT;
}

function prefersStill(): boolean {
    return (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
    );
}

export function SceneDeck({
    children,
    backdrop,
    durationOf,
}: {
    children: ReactNode;
    /** Drawn behind every scene, inside the stage. */
    backdrop: ReactNode;
    /** How long the camera takes from one scene to another, in ms, at this viewport width. */
    durationOf: (from: number, to: number, width: number) => number;
}) {
    const scenes = Children.toArray(children);
    const ref = useRef<HTMLDivElement | null>(null);
    const [pinned, setPinned] = useState(false);
    const [lift, setLift] = useState(0);
    const [deck, setDeck] = useState<Omit<DeckState, "pinned">>({
        current: 0,
        previous: 0,
        changedAt: 0,
        settleMs: 0,
        still: true,
    });

    /** Read by the listeners, which are bound once per pin, not on every scene. */
    const live = useRef({current: 0, count: scenes.length, durationOf, lockedUntil: 0});
    useEffect(() => {
        live.current.count = scenes.length;
        live.current.durationOf = durationOf;
    });

    useEffect(() => {
        const update = () => setPinned(canPin());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // The deck starts at the very top of the page, under the nav, so the backdrop fills the
    // viewport behind it. Measured rather than written: the nav is not the same height on a phone.
    useLayoutEffect(() => {
        const node = ref.current;
        if (!pinned || node === null) return;
        const measure = () => {
            const natural = node.getBoundingClientRect().top + window.scrollY + lift;
            if (Math.abs(natural - lift) > 0.5) setLift(natural);
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [pinned, lift]);

    useEffect(() => {
        const node = ref.current;
        if (node === null || !pinned) return;
        const still = prefersStill();

        const show = (index: number): number => {
            const from = live.current.current;
            if (index === from) return 0;
            const settleMs = still ? 0 : live.current.durationOf(from, index, window.innerWidth);
            live.current.current = index;
            setDeck({
                current: index,
                previous: from,
                changedAt: performance.now(),
                settleMs,
                still,
            });
            return settleMs;
        };

        const bandTop = (index: number) =>
            window.scrollY + node.getBoundingClientRect().top + index * window.innerHeight;

        /** The deck owns the gesture while its stage fills the viewport. */
        const owns = (): boolean => {
            // A modal sheet over the page (the onboarding, ADR `0114`) owns the gesture: these
            // listeners are on `window`, so `inert` on the page does not stop them.
            if (document.body.dataset.modal === "open") return false;
            const box = node.getBoundingClientRect();
            return box.top <= 1 && box.bottom >= window.innerHeight - 1;
        };

        const locked = () => performance.now() < live.current.lockedUntil;

        const go = (index: number) => {
            const settle = show(index);
            live.current.lockedUntil = performance.now() + Math.max(LOCK_MIN_MS, settle * 0.7);
            window.scrollTo({top: bandTop(index), behavior: "instant"});
        };

        /** One scene on. Returns false at either end, where native scroll takes over. */
        const step = (direction: number): boolean => {
            const target = live.current.current + direction;
            if (target < 0 || target > live.current.count - 1) return false;
            go(target);
            return true;
        };

        const onScroll = () => {
            if (locked()) return;
            const raw = -node.getBoundingClientRect().top / window.innerHeight;
            show(Math.round(Math.min(live.current.count - 1, Math.max(0, raw))));
        };

        const onWheel = (event: WheelEvent) => {
            if (!owns() || event.ctrlKey || Math.abs(event.deltaY) < 4) return;
            if (locked()) {
                event.preventDefault();
                return;
            }
            if (step(Math.sign(event.deltaY))) event.preventDefault();
        };

        let touchStart: number | null = null;
        const onTouchStart = (event: TouchEvent) => {
            touchStart = event.touches[0]?.clientY ?? null;
        };
        const onTouchMove = (event: TouchEvent) => {
            if (!owns() || touchStart === null) return;
            const dy = touchStart - (event.touches[0]?.clientY ?? touchStart);
            const here = live.current.current;
            const atEnd = (here >= live.current.count - 1 && dy > 0) || (here <= 0 && dy < 0);
            if (locked() || !atEnd) event.preventDefault();
        };
        const onTouchEnd = (event: TouchEvent) => {
            const from = touchStart;
            touchStart = null;
            if (from === null || !owns() || locked()) return;
            const dy = from - (event.changedTouches[0]?.clientY ?? from);
            if (Math.abs(dy) > 40) step(Math.sign(dy));
        };

        /** Anything with its own meaning for Space or an arrow key keeps it. */
        const OWN_KEYS = "input,textarea,select,[contenteditable],button,a,summary,[role='button']";
        const onKeyDown = (event: KeyboardEvent) => {
            if (!owns()) return;
            const target = event.target;
            if (target instanceof Element && target.closest(OWN_KEYS) !== null) return;
            const down =
                event.key === "ArrowDown" ||
                event.key === "PageDown" ||
                (event.key === " " && !event.shiftKey);
            const up =
                event.key === "ArrowUp" ||
                event.key === "PageUp" ||
                (event.key === " " && event.shiftKey);
            if (!down && !up) return;
            if (locked()) {
                event.preventDefault();
                return;
            }
            if (step(down ? 1 : -1)) event.preventDefault();
        };

        const toHash = (hash: string): boolean => {
            if (hash === "" || hash === "#") return false;
            const target = node.querySelector(`[id="${CSS.escape(hash.slice(1))}"]`);
            const index = Number(
                target?.closest("[data-scene]")?.getAttribute("data-scene") ?? "-1",
            );
            if (!Number.isInteger(index) || index < 0) return false;
            go(index);
            return true;
        };
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) {
                return;
            }
            const target = event.target;
            if (!(target instanceof Element)) return;
            const href = target.closest("a[href^='#']")?.getAttribute("href");
            if (href === undefined || href === null) return;
            if (toHash(href)) {
                event.preventDefault();
                // Not the router: a same-path navigation re-runs the route transition.
                history.replaceState(null, "", href);
            }
        };
        const onHashChange = () => {
            toHash(window.location.hash);
        };

        setDeck((before) => ({...before, still}));
        if (window.location.hash !== "") requestAnimationFrame(() => toHash(window.location.hash));
        else onScroll();

        window.addEventListener("scroll", onScroll, {passive: true});
        window.addEventListener("wheel", onWheel, {passive: false});
        window.addEventListener("touchstart", onTouchStart, {passive: true});
        window.addEventListener("touchmove", onTouchMove, {passive: false});
        window.addEventListener("touchend", onTouchEnd);
        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("click", onClick);
        window.addEventListener("hashchange", onHashChange);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("click", onClick);
            window.removeEventListener("hashchange", onHashChange);
        };
    }, [pinned]);

    if (!pinned) {
        // Stacked: every scene on, in the flow, no backdrop. Before JavaScript and on a short
        // viewport, the whole page rather than one screen of it.
        return (
            <DeckContext.Provider value={{...deck, pinned: false, current: -1}}>
                <div className="arp-gx arp-gx-stacked">
                    {scenes.map((scene, index) => (
                        <section
                            key={index}
                            data-scene={index}
                            data-on="true"
                            className="arp-gx-scene"
                        >
                            {scene}
                        </section>
                    ))}
                </div>
            </DeckContext.Provider>
        );
    }

    const base = deck.still ? 0 : Math.round(deck.settleMs * 0.5);

    return (
        <DeckContext.Provider value={{...deck, pinned: true}}>
            <div
                ref={ref}
                className="arp-gx arp-deck-pinned"
                // `svh`, so a phone's toolbar does not make a band taller than what is visible.
                style={{height: `${scenes.length * 100}svh`, marginTop: -lift}}
            >
                <div className="arp-gx-stage">
                    {backdrop}
                    {scenes.map((scene, index) => {
                        const on = index === deck.current;
                        return (
                            <section
                                key={index}
                                data-scene={index}
                                data-on={on}
                                className="arp-gx-scene"
                                style={on ? cssVars({"--gx-base": `${base}ms`}) : undefined}
                                // A scene nobody can see is out of the tab order and the
                                // accessibility tree.
                                aria-hidden={on ? undefined : true}
                                inert={on ? undefined : true}
                            >
                                {scene}
                            </section>
                        );
                    })}
                </div>
            </div>
        </DeckContext.Provider>
    );
}
