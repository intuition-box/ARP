import {fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";

import {NavCoin, NavTrailProvider} from "../NavCoin";
import {useNavTrail} from "../nav-trail";

const TABS = [
    {to: "/agents", label: "Agents"},
    {to: "/tools", label: "Tools"},
];

function Page({steps}: {steps: {label: string; to?: string}[]}) {
    useNavTrail(steps);
    return null;
}

function renderAt(path: string, steps: {label: string; to?: string}[] = []) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <NavTrailProvider>
                <NavCoin
                    tabs={TABS}
                    start={{label: "Get started", section: "/start", onClick: () => undefined}}
                    end={null}
                />
                <Page steps={steps} />
            </NavTrailProvider>
        </MemoryRouter>,
    );
}

describe("NavCoin, the cases around the main ones", () => {
    it("closes the sheet from Menu a second time", () => {
        const {container} = renderAt("/tools");
        const menu = screen.getByRole("button", {name: "Menu"});
        fireEvent.click(menu);
        fireEvent.click(menu);
        expect(container.querySelector(".arp-coin-sheet")?.hasAttribute("hidden")).toBe(true);
    });

    it("focuses the sheet's first link on a page no tab owns, and ignores keys other than Escape", () => {
        const {container} = renderAt("/");
        fireEvent.click(screen.getByRole("button", {name: "Menu"}));
        const sheet = container.querySelector(".arp-coin-sheet");
        expect(document.activeElement).toBe(sheet?.querySelector("a"));
        fireEvent.keyDown(document, {key: "Enter"});
        expect(sheet?.hasAttribute("hidden")).toBe(false);
    });

    it("drops a scene's hash when the coin takes the landing back to the top", () => {
        const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
        window.history.replaceState(null, "", "/#scene-3");
        renderAt("/");
        fireEvent.click(screen.getByRole("link", {name: "ARP, home"}));
        expect(window.location.hash).toBe("");
        expect(scroll).toHaveBeenCalledWith({top: 0, left: 0, behavior: "instant"});
        scroll.mockRestore();
    });

    it("leaves a modified click on the coin to the browser", () => {
        const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
        renderAt("/");
        fireEvent.click(screen.getByRole("link", {name: "ARP, home"}), {metaKey: true});
        expect(scroll).not.toHaveBeenCalled();
        scroll.mockRestore();
    });

    it("draws a path line with a plain step and a linked one, and no kind when none was set", () => {
        const {container} = renderAt("/agents", [
            {label: "Agents", to: "/agents"},
            {label: "Base 8453"},
            {label: "vault-auditor"},
        ]);
        const trail = screen.getByRole("navigation", {name: "Where you are"});
        expect(trail.querySelector("a")?.textContent).toBe("Agents");
        expect(trail.textContent).toContain("Base 8453");
        expect(container.querySelector(".arp-coin-kind")).toBeNull();
    });
});
