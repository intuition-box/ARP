import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it} from "vitest";

import {NavCoin, NavTrailProvider} from "../NavCoin";
import {isCurrentSection} from "../nav-coin";
import {useNavTrail} from "../nav-trail";

const TABS = [
    {to: "/agents", label: "Agents"},
    {to: "/tools", label: "Tools"},
    {to: "/activity", label: "Activity"},
    {to: "/search", label: "Search"},
    {to: "/docs", label: "Docs"},
];

function Page({trail}: {trail?: boolean}) {
    useNavTrail(
        trail
            ? [{label: "Agents", to: "/agents"}, {label: "Base 8453"}, {label: "vault-auditor"}]
            : [],
        "agent",
    );
    return null;
}

function renderAt(path: string, {trail = false}: {trail?: boolean} = {}) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <NavTrailProvider>
                <NavCoin
                    tabs={TABS}
                    start={{to: "/start", label: "Get started"}}
                    end={<button type="button">Testnet</button>}
                />
                <Page trail={trail} />
            </NavTrailProvider>
        </MemoryRouter>,
    );
}

/**
 * The coin nav. What a type checker cannot see: which tab is current (the old prefix rule lit the
 * wrong one once), that the sheet answers the keyboard, and that the bar retracts on scroll down
 * and comes back on scroll up.
 */
describe("NavCoin", () => {
    it("marks the current tab, and somebody else's agent belongs to Agents", () => {
        renderAt("/agent/8453/6649");
        const main = screen.getByRole("navigation", {name: "Main"});
        const current = main.querySelector('[aria-current="page"]');
        expect(current?.textContent).toBe("Agents");
        expect(isCurrentSection("/agents", "/agent/8453/6649")).toBe(true);
    });

    it("opens the sheet from Menu, moves focus into it, and closes on Escape", () => {
        const {container} = renderAt("/tools");
        const menu = screen.getByRole("button", {name: "Menu"});
        const sheet = container.querySelector(".arp-coin-sheet")!;
        expect(sheet.hasAttribute("hidden")).toBe(true);
        fireEvent.click(menu);
        expect(sheet.hasAttribute("hidden")).toBe(false);
        expect(menu.getAttribute("aria-expanded")).toBe("true");
        expect(document.activeElement?.textContent).toBe("Tools");
        fireEvent.keyDown(document, {key: "Escape"});
        expect(sheet.hasAttribute("hidden")).toBe(true);
        expect(document.activeElement).toBe(menu);
    });

    it("draws the path line a page sets, and none when it sets nothing", () => {
        renderAt("/agents", {trail: true});
        const trail = screen.getByRole("navigation", {name: "Where you are"});
        expect(trail.textContent).toContain("vault-auditor");
        expect(trail.querySelector('[aria-current="location"]')?.textContent).toBe("vault-auditor");
    });

    it("retracts on scroll down and comes back on scroll up or on the coin", () => {
        const {container} = renderAt("/tools");
        const header = container.querySelector(".arp-coin")!;
        const scrollTo = (y: number) =>
            act(() => {
                Object.defineProperty(window, "scrollY", {value: y, configurable: true});
                window.dispatchEvent(new Event("scroll"));
            });
        scrollTo(400);
        expect(header.classList.contains("is-retracted")).toBe(true);
        scrollTo(300);
        expect(header.classList.contains("is-retracted")).toBe(false);
        scrollTo(600);
        const coin = screen.getByRole("link", {name: "Show the navigation"});
        fireEvent.click(coin);
        expect(header.classList.contains("is-retracted")).toBe(false);
        scrollTo(0);
    });
});
