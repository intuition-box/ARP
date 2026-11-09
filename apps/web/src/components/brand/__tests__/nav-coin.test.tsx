import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";

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

function scrollTo(y: number) {
    act(() => {
        Object.defineProperty(window, "scrollY", {value: y, configurable: true});
        window.dispatchEvent(new Event("scroll"));
    });
}

function renderAt(
    path: string,
    {trail = false, onStart = () => undefined}: {trail?: boolean; onStart?: () => void} = {},
) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <NavTrailProvider>
                <NavCoin
                    tabs={TABS}
                    start={{label: "Get started", section: "/start", onClick: onStart}}
                    end={<button type="button">Testnet</button>}
                />
                <Page trail={trail} />
            </NavTrailProvider>
        </MemoryRouter>,
    );
}

/**
 * The coin nav. What a type checker cannot see: which tab is current (the old prefix rule lit the
 * wrong one once), that the sheet answers the keyboard, and that the bar stays put on scroll.
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

    it("opens the onboarding from Get started, lit on the pages it leads to", () => {
        const onStart = vi.fn();
        const {container} = renderAt("/start/agent", {onStart});
        const start = container.querySelector<HTMLButtonElement>(".arp-coin-start")!;
        expect(start.getAttribute("aria-current")).toBe("page");
        fireEvent.click(start);
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("closes the sheet when Get started is chosen from it", () => {
        const onStart = vi.fn();
        const {container} = renderAt("/tools", {onStart});
        fireEvent.click(screen.getByRole("button", {name: "Menu"}));
        fireEvent.click(container.querySelector<HTMLButtonElement>("button.arp-coin-row")!);
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(container.querySelector(".arp-coin-sheet")!.hasAttribute("hidden")).toBe(true);
    });

    it("draws the path line a page sets", () => {
        renderAt("/agents", {trail: true});
        const trail = screen.getByRole("navigation", {name: "Where you are"});
        expect(trail.textContent).toContain("vault-auditor");
        expect(trail.querySelector('[aria-current="location"]')?.textContent).toBe("vault-auditor");
    });

    it("draws no path line on a page that sets none", () => {
        renderAt("/agents");
        expect(screen.queryByRole("navigation", {name: "Where you are"})).toBeNull();
    });

    it("leaves Get started unlit away from the pages it leads to", () => {
        const {container} = renderAt("/tools");
        for (const start of container.querySelectorAll(".arp-coin-start, button.arp-coin-row"))
            expect(start.hasAttribute("aria-current")).toBe(false);
    });

    it("closes the sheet when one of its links opens another page", () => {
        const {container} = renderAt("/tools");
        fireEvent.click(screen.getByRole("button", {name: "Menu"}));
        const sheet = container.querySelector(".arp-coin-sheet")!;
        const agents = Array.from(sheet.querySelectorAll("a")).find(
            (a) => a.textContent === "Agents",
        )!;
        fireEvent.click(agents);
        expect(sheet.hasAttribute("hidden")).toBe(true);
        expect(
            screen.getByRole("navigation", {name: "Main"}).querySelector('[aria-current="page"]')
                ?.textContent,
        ).toBe("Agents");
    });

    it("shows ARP beside the mark, and nothing moves on scroll", () => {
        const {container} = renderAt("/tools");
        expect(screen.getByRole("link", {name: "ARP, home"})).toBeTruthy();
        expect(container.querySelector(".arp-coin-bar .arp-coin-name")!.textContent).toBe("ARP");
        const before = container.querySelector(".arp-coin")!.className;
        scrollTo(400);
        expect(container.querySelector(".arp-coin")!.className).toBe(before);
        scrollTo(0);
    });

    it("closes the sheet on a link to the page already open", () => {
        const {container} = renderAt("/tools");
        fireEvent.click(screen.getByRole("button", {name: "Menu"}));
        const sheet = container.querySelector(".arp-coin-sheet")!;
        const tools = Array.from(sheet.querySelectorAll("a")).find(
            (a) => a.textContent === "Tools",
        )!;
        fireEvent.click(tools);
        expect(sheet.hasAttribute("hidden")).toBe(true);
    });

    it("takes the reader back to the landing's first scene from the coin", () => {
        const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
        renderAt("/");
        fireEvent.click(screen.getByRole("link", {name: "ARP, home"}));
        expect(scroll).toHaveBeenCalledWith({top: 0, left: 0, behavior: "instant"});
        scroll.mockRestore();
    });

    it("leaves the coin to the router on another page", () => {
        const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
        renderAt("/tools");
        fireEvent.click(screen.getByRole("link", {name: "ARP, home"}));
        expect(scroll).not.toHaveBeenCalledWith({top: 0, left: 0, behavior: "instant"});
        scroll.mockRestore();
    });
});
