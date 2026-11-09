import {useContext, useEffect, useId, useRef, useState, type ReactNode} from "react";
import {Link, useLocation} from "react-router-dom";

import {isCurrentSection, useRetractOnScroll} from "./nav-coin";
import {TrailContext, type Trail} from "./nav-trail";
import {SourceMark} from "./SourceMark";

/**
 * The nav: **the coin**. The Source mark in a circle set into the bar's left corner, the tabs in
 * one track at the centre of the bar, Get started and the chain at the right end, and a path line
 * under it.
 *
 * Chosen by the user on 2026-11-09, after an animated nav (rejected: _« j'aime pas l'animation »_),
 * three static proposals, and two mixes. It **replaces ADR `0057` §3's centred mark**: the centred
 * mark split the bar into two unequal halves (_« ça fait déséquilibré »_), so the mark moved to the
 * left corner and the tabs to the centre. Record that in an ADR.
 *
 * ## The circle and the bar are one outline
 *
 * The coin has the bar's own background and border. A **seam** (a block of the bar's background,
 * inside the coin, under the mark) hides the coin's right arc between the bar's top and bottom
 * edges, so the circle's outline runs straight into the bar's: one shape, a circle drawn out into a
 * bar. The seam's box is measured against the two sizes below; change a size and re-measure it.
 *
 * ## It retracts into the circle when you scroll down
 *
 * The one motion the user asked for (_« elle se rétracte dans le cercle de gauche quand on scroll
 * vers le bas »_): scrolling down past 140px folds the bar back into the coin and the seam fades,
 * so the circle closes. Scrolling up, or pressing the coin, brings it back. Under
 * `prefers-reduced-motion` it switches without easing. Driven by scroll, never by the pointer.
 *
 * ## Phone
 *
 * Below 860px of its own width (a container query), the track folds to the current tab, the
 * actions fold into a Menu button, and the sheet under the bar lists every tab, Get started and the
 * chain. The sheet opens without motion, closes on Escape and on a route change, and moves focus to
 * the current tab when it opens.
 *
 * Styles are plain classes in `index.css` (`.arp-coin*`), because the unlayered `a`, `a:hover` and
 * `button` rules there beat utilities.
 */

export type NavItem = {to: string; label: string};

export function NavTrailProvider({children}: {children: ReactNode}) {
    const [trail, setTrail] = useState<Trail | null>(null);
    return <TrailContext.Provider value={{trail, setTrail}}>{children}</TrailContext.Provider>;
}

/* ---- the component ---------------------------------------------------------------------------- */

function Tab({item, pathname, className}: {item: NavItem; pathname: string; className: string}) {
    const current = isCurrentSection(item.to, pathname);
    return (
        <Link
            to={item.to}
            className={className}
            {...(current ? {"aria-current": "page" as const} : {})}
        >
            {/* The dot renders from `aria-current`: what is seen and what is announced agree. */}
            {current ? <span aria-hidden="true" className="arp-coin-dot" /> : null}
            {item.label}
        </Link>
    );
}

export function NavCoin({
    tabs,
    start,
    end,
}: {
    /** Agents, Tools, Activity, Search, Docs. */
    tabs: readonly NavItem[];
    /** Get started. */
    start: NavItem;
    /** The chain toggle, and anything else that is state rather than a destination. */
    end: ReactNode;
}) {
    const {pathname} = useLocation();
    const {trail} = useContext(TrailContext);
    const [retracted, setRetracted] = useRetractOnScroll();
    // Open for the path it was opened on: a route change closes it without an effect.
    const [openOn, setOpenOn] = useState<string | null>(null);
    const open = openOn === pathname;
    const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);
    const sheetId = useId();
    const menuRef = useRef<HTMLButtonElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const current = tabs.find((tab) => isCurrentSection(tab.to, pathname));

    useEffect(() => {
        if (!open) return;
        const sheet = sheetRef.current;
        (
            sheet?.querySelector<HTMLElement>('[aria-current="page"]') ??
            sheet?.querySelector<HTMLElement>("a")
        )?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setOpenOn(null);
            menuRef.current?.focus();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <header className={`arp-coin ${retracted ? "is-retracted" : ""}`}>
            <div className="arp-coin-bar">
                <Link
                    to="/"
                    className="arp-coin-coin"
                    aria-label={retracted ? "Show the navigation" : "ARP, home"}
                    onClick={(event) => {
                        // Retracted, the coin is the way back to the bar, not a link home.
                        if (!retracted) return;
                        event.preventDefault();
                        setRetracted(false);
                    }}
                >
                    <span className="arp-coin-seam" aria-hidden="true" />
                    {/* Two rings, scaled up by CSS: the look the user approved. */}
                    <span className="arp-coin-mark">
                        <SourceMark size={56} />
                    </span>
                </Link>

                <nav className="arp-coin-track" aria-label="Main">
                    {tabs.map((tab) => (
                        <Tab key={tab.to} item={tab} pathname={pathname} className="arp-coin-tab" />
                    ))}
                </nav>

                {/* Phone: the current tab, as the segment it is in the full track. */}
                {current === undefined ? null : (
                    <span className="arp-coin-track arp-coin-here">
                        <Tab item={current} pathname={pathname} className="arp-coin-tab" />
                    </span>
                )}

                <div className="arp-coin-end">
                    <Link to={start.to} className="arp-coin-start">
                        {start.label}
                    </Link>
                    <span className="arp-coin-state">{end}</span>
                    <button
                        ref={menuRef}
                        type="button"
                        className="arp-coin-menu"
                        aria-expanded={open}
                        aria-controls={sheetId}
                        onClick={() => setOpen(!open)}
                    >
                        <span aria-hidden="true" className="arp-coin-bars">
                            <i />
                            <i />
                        </span>
                        {open ? "Close" : "Menu"}
                    </button>
                </div>
            </div>

            <div ref={sheetRef} id={sheetId} className="arp-coin-sheet" hidden={!open}>
                {tabs.map((tab) => (
                    <Tab key={tab.to} item={tab} pathname={pathname} className="arp-coin-row" />
                ))}
                <Link to={start.to} className="arp-coin-row">
                    {start.label}
                </Link>
                <div className="arp-coin-sheet-end">{end}</div>
            </div>

            {trail === null || trail.steps.length === 0 ? null : (
                <nav className="arp-coin-trail" aria-label="Where you are">
                    {trail.steps.map((step, index) => {
                        const last = index === trail.steps.length - 1;
                        return (
                            <span key={`${index}-${step.label}`} className="arp-coin-step">
                                {index > 0 ? (
                                    <span aria-hidden="true" className="arp-coin-sep">
                                        /
                                    </span>
                                ) : null}
                                {last ? (
                                    <b aria-current="location">{step.label}</b>
                                ) : step.to === undefined ? (
                                    <span>{step.label}</span>
                                ) : (
                                    <Link to={step.to}>{step.label}</Link>
                                )}
                            </span>
                        );
                    })}
                    {trail.kind === undefined ? null : (
                        <span className="arp-coin-kind">
                            <span aria-hidden="true" className="arp-coin-sep">
                                ·
                            </span>
                            {trail.kind}
                        </span>
                    )}
                </nav>
            )}
        </header>
    );
}
