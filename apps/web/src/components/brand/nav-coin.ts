import {useEffect, useRef, useState} from "react";

/**
 * Which paths light a nav tab, where a prefix cannot decide it.
 *
 * The old rule was `pathname.startsWith(`${to}/`)`, and `/agent/8453/2340` starts with `/agent/`,
 * so somebody else's agent lit "Your agent" (now `/start/agent`). The colliding tab says which
 * paths are its own; everything else keeps the prefix rule, which is right for `/tools`, `/start`
 * and `/activity`.
 */
export const SECTION_PATHS: Record<string, (pathname: string) => boolean> = {
    // An agent detail is `/agent/<numeric chain>/<token>`; `/agent/import` is not.
    "/agents": (pathname) => pathname === "/agents" || /^\/agent\/\d+\//.test(pathname),
};

/** Whether `to` is the section `pathname` belongs to. Same rule as the old nav. */
export function isCurrentSection(to: string, pathname: string): boolean {
    const section = SECTION_PATHS[to];
    if (section !== undefined) return section(pathname);
    if (to === "/") return pathname === "/";
    return pathname === to || pathname.startsWith(`${to}/`);
}

export const RETRACT_AFTER_PX = 140;
const SCROLL_NOISE_PX = 6;

/**
 * Down past the threshold retracts; any move up expands. Small jitters are ignored.
 *
 * `canRetract` is asked at each scroll down. The nav refuses while its phone sheet is open (hiding
 * the sheet shrinks the header, the page jumps up, that reads as a scroll up and expands it again,
 * every frame) and while focus is inside it (retracting hides the focused tab and drops focus to the
 * body).
 */
export function useRetractOnScroll(
    canRetract: () => boolean = () => true,
): [boolean, (retracted: boolean) => void] {
    const [retracted, setRetracted] = useState(false);
    // The latest predicate, read by a listener registered once.
    const allow = useRef(canRetract);
    useEffect(() => {
        allow.current = canRetract;
    });
    useEffect(() => {
        let last = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            const delta = y - last;
            if (Math.abs(delta) < SCROLL_NOISE_PX) return;
            if (delta > 0 && y > RETRACT_AFTER_PX) {
                if (allow.current()) setRetracted(true);
            } else if (delta < 0) setRetracted(false);
            last = y;
        };
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return [retracted, setRetracted];
}
