import {createContext, useContext, useEffect, useState} from "react";

/**
 * What a {@link import("./SceneDeck").SceneDeck} tells everything inside it: which scene is on,
 * which one it came from, and when the camera settles there.
 *
 * Its own module because a file exporting both a component and a context breaks React Fast
 * Refresh, which eslint enforces here.
 */
export type DeckState = {
    /** Whether the deck is pinning scenes rather than stacking them. */
    pinned: boolean;
    /** The scene on screen. Changes the moment a gesture asks for the next one. */
    current: number;
    /** The scene before it, so a scene can play differently by where the reader came from. */
    previous: number;
    /** `performance.now()` when `current` last changed. */
    changedAt: number;
    /** How long the camera takes to reach `current`, in ms. 0 under reduced motion. */
    settleMs: number;
    /** `prefers-reduced-motion`: every scene jumps to its end state. */
    still: boolean;
};

export const DeckContext = createContext<DeckState>({
    pinned: false,
    current: 0,
    previous: 0,
    changedAt: 0,
    settleMs: 0,
    still: true,
});

export function useDeck(): DeckState {
    return useContext(DeckContext);
}

/**
 * The moment a scene's own sequence starts: when the camera is most of the way there, as the
 * reference times it (60% of the move).
 */
export function arrivalOf(deck: DeckState): number {
    return deck.changedAt + (deck.still ? 0 : deck.settleMs * 0.6);
}

/**
 * Seconds since scene `index` arrived, ticking ten times a second while it is on screen, `-1`
 * while it is not. Stacked, or under reduced motion, a scene is at its end state: `Infinity`.
 */
export function useSceneTime(index: number): number {
    const deck = useDeck();
    const on = deck.current === index;
    const ended = !deck.pinned || deck.still;
    const arrival = arrivalOf(deck);
    const [now, setNow] = useState(() => performance.now());
    useEffect(() => {
        if (!on || ended) return;
        const tick = () => setNow(performance.now());
        const first = window.setTimeout(tick, 0);
        const id = window.setInterval(tick, 100);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(id);
        };
    }, [on, ended, arrival]);
    if (ended) return Infinity;
    if (!on) return -1;
    return Math.max(0, (now - arrival) / 1000);
}
