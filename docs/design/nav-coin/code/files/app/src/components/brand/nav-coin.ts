import {useEffect, useState} from "react";

import {SECTION_PATHS} from "./NavSplit";

/** Whether `to` is the section `pathname` belongs to. Same rule as the old nav. */
export function isCurrentSection(to: string, pathname: string): boolean {
    const section = SECTION_PATHS[to];
    if (section !== undefined) return section(pathname);
    if (to === "/") return pathname === "/";
    return pathname === to || pathname.startsWith(`${to}/`);
}

export const RETRACT_AFTER_PX = 140;
const SCROLL_NOISE_PX = 6;

/** Down past the threshold retracts; any move up expands. Small jitters are ignored. */
export function useRetractOnScroll(): [boolean, (retracted: boolean) => void] {
    const [retracted, setRetracted] = useState(false);
    useEffect(() => {
        let last = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            const delta = y - last;
            if (Math.abs(delta) < SCROLL_NOISE_PX) return;
            if (delta > 0 && y > RETRACT_AFTER_PX) setRetracted(true);
            else if (delta < 0) setRetracted(false);
            last = y;
        };
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return [retracted, setRetracted];
}
