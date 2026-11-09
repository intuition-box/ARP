import {
    useContext,
    useEffect,
    useId,
    useRef,
    useState,
    type MouseEvent,
    type ReactNode,
} from "react";
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
 * left corner and the tabs to the centre. ADR `0151`.
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

/**
 * Get started opens the onboarding panel rather than going somewhere (task 62, ADR `0125`: one
 * door). `section` is the path it is lit on, `/start`, which the panel leads to.
 */
export type NavAction = {label: string; section: string; onClick: () => void};

function StartButton({
    action,
    current,
    className,
}: {
    action: NavAction;
    current: boolean;
    className: string;
}) {
    return (
        <button
            type="button"
            className={className}
            onClick={action.onClick}
            {...(current ? {"aria-current": "page" as const} : {})}
        >
            {action.label}
        </button>
    );
}

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
    start: NavAction;
    /** The chain toggle, and anything else that is state rather than a destination. */
    end: ReactNode;
}) {
    const {pathname} = useLocation();
    const {trail} = useContext(TrailContext);
    // Open for the path it was opened on: a route change closes it without an effect.
    const [openOn, setOpenOn] = useState<string | null>(null);
    const open = openOn === pathname;
    const sheetOpenRef = useRef(open);
    useEffect(() => {
        sheetOpenRef.current = open;
    });
    const headerRef = useRef<HTMLElement>(null);
    // Read from a scroll listener, so through refs: the open sheet and the focus as they are then.
    // Keyboard focus only: a tab clicked with the mouse keeps focus too, and that must not pin the
    // bar open for the rest of the visit.
    const [retracted, setRetracted] = useRetractOnScroll(
        () => !sheetOpenRef.current && headerRef.current?.querySelector(":focus-visible") == null,
    );
    const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);
    const sheetId = useId();
    const menuRef = useRef<HTMLButtonElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const current = tabs.find((tab) => isCurrentSection(tab.to, pathname));
    const startCurrent = isCurrentSection(start.section, pathname);
    const onCoin = (event: MouseEvent<HTMLAnchorElement>) => {
        // Retracted, the coin is the way back to the bar, not a link home.
        if (retracted) {
            event.preventDefault();
            setRetracted(false);
            return;
        }
        // Home on the page already open: the path does not change, so `ScrollToTop` never fires
        // and the reader stayed at the deck's last scene (user, 2026-11-09). Back to the top, and
        // any `#scene` hash dropped so a reload does not glide back down.
        if (
            pathname !== "/" ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.button !== 0
        ) {
            return;
        }
        event.preventDefault();
        if (window.location.hash !== "") history.replaceState(null, "", "/");
        window.scrollTo({top: 0, left: 0, behavior: "instant"});
    };

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
        <header
            ref={headerRef}
            className={`arp-coin ${retracted ? "is-retracted" : ""}`}
            // Focus arriving in the nav (Shift+Tab from the page) brings the bar back, so the
            // next Tab reaches a tab rather than nothing.
            // Keyboard only: a mouse press on the retracted coin also focuses it, and expanding
            // then would turn the click that follows into a trip home.
            onFocus={(event) => {
                if (event.target instanceof Element && event.target.matches(":focus-visible"))
                    setRetracted(false);
            }}
        >
            <div className="arp-coin-bar">
                <Link
                    to="/"
                    className="arp-coin-coin"
                    aria-label={retracted ? "Show the navigation" : "ARP, home"}
                    // Retracted, it discloses the bar, so it says the bar is collapsed.
                    {...(retracted ? {"aria-expanded": false} : {})}
                    onClick={onCoin}
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
                    <StartButton action={start} current={startCurrent} className="arp-coin-start" />
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

            <div
                ref={sheetRef}
                id={sheetId}
                className="arp-coin-sheet"
                hidden={!open}
                // A link in it closes it, including one to the page already open, which the
                // per-path state above would otherwise leave open.
                onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest("a") !== null)
                        setOpenOn(null);
                }}
            >
                {tabs.map((tab) => (
                    <Tab key={tab.to} item={tab} pathname={pathname} className="arp-coin-row" />
                ))}
                <StartButton
                    action={{
                        ...start,
                        onClick: () => {
                            setOpenOn(null);
                            start.onClick();
                        },
                    }}
                    current={startCurrent}
                    className="arp-coin-row"
                />
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
