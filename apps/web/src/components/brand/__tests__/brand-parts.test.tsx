import {act, fireEvent, render, renderHook, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../../lib/chain-choice";
import {ChainToggle} from "../ChainToggle";
import {Hint} from "../Hint";
import {NAV_HEIGHT} from "../nav-height";
import {isCurrentSection} from "../nav-coin";
import {TrailContext, useNavTrail, type Trail} from "../nav-trail";
import {Sigil} from "../Sigil";
import {SourceMark} from "../SourceMark";

describe("Hint", () => {
    it("opens its sentence on hover and closes it when the pointer leaves", () => {
        render(<Hint label="What declared means">Somebody said so.</Hint>);
        const button = screen.getByRole("button", {name: "What declared means"});
        expect(screen.queryByRole("tooltip")).toBeNull();
        fireEvent.mouseEnter(button);
        const tip = screen.getByRole("tooltip");
        expect(tip).toHaveTextContent("Somebody said so.");
        expect(button).toHaveAttribute("aria-expanded", "true");
        expect(button.getAttribute("aria-describedby")).toBe(tip.id);
        fireEvent.mouseLeave(button);
        expect(screen.queryByRole("tooltip")).toBeNull();
        expect(button).not.toHaveAttribute("aria-describedby");
    });

    it("opens on keyboard focus and closes on blur, anchored right when asked", () => {
        render(
            <Hint label="Why" align="right">
                One sentence.
            </Hint>,
        );
        const button = screen.getByRole("button", {name: "Why"});
        fireEvent.focus(button);
        expect(screen.getByRole("tooltip").className).toContain("right-0");
        fireEvent.blur(button);
        expect(screen.queryByRole("tooltip")).toBeNull();
    });
});

describe("ChainToggle on a build that allows mainnet", () => {
    afterEach(() => vi.unstubAllEnvs());

    function show(isMainnet: boolean) {
        vi.stubEnv("VITE_ALLOW_MAINNET", "1");
        const setMainnet = vi.fn();
        render(
            <ChainChoiceContext.Provider value={{choice: choiceFor(isMainnet), setMainnet}}>
                <ChainToggle />
            </ChainChoiceContext.Provider>,
        );
        return setMainnet;
    }

    it("names mainnet when on it, and switches to testnet", () => {
        const setMainnet = show(true);
        const button = screen.getByRole("button", {name: /Switch to Testnet/});
        expect(button).toHaveTextContent(choiceFor(true).label);
        fireEvent.click(button);
        expect(setMainnet).toHaveBeenCalledWith(false);
    });

    it("switches to mainnet from testnet", () => {
        const setMainnet = show(false);
        fireEvent.click(screen.getByRole("button", {name: /Switch to Mainnet/}));
        expect(setMainnet).toHaveBeenCalledWith(true);
    });
});

describe("SourceMark", () => {
    const dots = (container: HTMLElement) => container.querySelectorAll("circle").length;

    it("drops its rings from the outside in as it gets smaller, and always keeps the core", () => {
        expect(dots(render(<SourceMark size={80} />).container)).toBe(6 + 12 + 18 + 1);
        expect(dots(render(<SourceMark size={40} />).container)).toBe(6 + 12 + 1);
        expect(dots(render(<SourceMark size={16} />).container)).toBe(6 + 1);
    });

    it("is an image with a name only when it is given one", () => {
        render(<SourceMark title="ARP, home" />);
        expect(screen.getByRole("img", {name: "ARP, home"})).toBeInTheDocument();
        const {container} = render(<SourceMark />);
        expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });
});

describe("Sigil", () => {
    it("fills its centre with the accent when the viewer holds a position", () => {
        const core = (viewerStaked: boolean) => {
            const {container, unmount} = render(
                <Sigil agentId="0xa" modules={[]} viewerStaked={viewerStaked} />,
            );
            const fill = [...container.querySelectorAll("circle")].at(-1)?.getAttribute("fill");
            unmount();
            return fill;
        };
        expect(core(true)).toBe("var(--color-accent)");
        expect(core(false)).toBe("var(--color-fg)");
    });
});

describe("Sigil, small", () => {
    it("draws a declared dot hollow, with a heavier ring below the large size", () => {
        const {container} = render(
            <Sigil agentId="0xa" modules={[{name: "pptx", state: "declared"}]} size={24} />,
        );
        const hollow = container.querySelector("circle[stroke]");
        expect(hollow?.getAttribute("fill")).toBe("var(--color-ground)");
        expect(hollow?.getAttribute("stroke-width")).toBe("1.6");
    });
});

describe("the nav's pieces", () => {
    it("reserves the header's padding and its bar", () => {
        expect(NAV_HEIGHT).toBe(20 + 14 + 58);
    });

    it("lights Home only on the landing itself", () => {
        expect(isCurrentSection("/", "/")).toBe(true);
        expect(isCurrentSection("/", "/tools")).toBe(false);
    });

    it("sets a path line without a kind, and clears it on unmount", () => {
        const setTrail = vi.fn<(trail: Trail | null) => void>();
        const wrapper = ({children}: {children: ReactNode}) => (
            <TrailContext.Provider value={{trail: null, setTrail}}>
                {children}
            </TrailContext.Provider>
        );
        const {unmount} = renderHook(() => useNavTrail([{label: "Tools"}]), {wrapper});
        expect(setTrail).toHaveBeenLastCalledWith({steps: [{label: "Tools"}]});
        act(() => unmount());
        expect(setTrail).toHaveBeenLastCalledWith(null);
    });
});
