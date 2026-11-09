import {useEffect, useRef} from "react";

import {sideStars} from "./side-galaxy-geometry";

/**
 * A still, sparse star field at the page's sides, behind everything (`side-galaxy-geometry.ts`).
 *
 * Fixed to the viewport and drawn once per size: nothing moves, nothing answers the pointer
 * (`rules/ui.md`), so reduced motion changes nothing here. Decorative, hidden from assistive tech.
 */
export function SideGalaxy() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const context = canvas?.getContext("2d");
        if (canvas === null || canvas === undefined || context === null || context === undefined) return;
        const draw = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const ratio = window.devicePixelRatio || 1;
            const stars = sideStars(width, height);
            // Below about 1412px nothing shows: an empty canvas would still hold width × height × ratio².
            if (stars.length === 0) {
                canvas.width = 0;
                canvas.height = 0;
                return;
            }
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);
            for (const star of stars) {
                context.globalAlpha = star.alpha;
                context.fillStyle = star.tone;
                context.beginPath();
                context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                context.fill();
            }
            context.globalAlpha = 1;
        };
        draw();
        window.addEventListener("resize", draw);
        return () => window.removeEventListener("resize", draw);
    }, []);

    return <canvas ref={ref} aria-hidden="true" className="arp-side-galaxy" />;
}
