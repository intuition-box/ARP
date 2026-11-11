import {fireEvent, render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../lib/chain-choice";
import {OnboardingContext} from "../onboarding/onboarding-context";

/**
 * The shell: the nav's tabs and Get started, the page, and the footer naming the chain the reads
 * come from. The canvas, the activity bar and the wallet are mocked at their modules; they have
 * tests of their own.
 */
const shortcut = vi.fn();
vi.mock("../../hooks/use-search-shortcut", () => ({useSearchShortcut: () => shortcut()}));
vi.mock("../brand/SideGalaxy", () => ({SideGalaxy: () => <p>side galaxy</p>}));
vi.mock("../brand/ActivityLog", () => ({ActivityLog: () => <p>activity log</p>}));
vi.mock("../brand/ChainToggle", () => ({ChainToggle: () => <p>chain toggle</p>}));
vi.mock("../WalletConnect", () => ({WalletConnect: () => <p>wallet</p>}));

import {Layout} from "../Layout";

function renderAt(path: string, isMainnet = false) {
    const open = vi.fn();
    const wrap = ({children}: {children: ReactNode}) => (
        <MemoryRouter initialEntries={[path]}>
            <ChainChoiceContext.Provider
                value={{choice: choiceFor(isMainnet), setMainnet: vi.fn()}}
            >
                <OnboardingContext.Provider value={{open, landed: vi.fn()}}>
                    {children}
                </OnboardingContext.Provider>
            </ChainChoiceContext.Provider>
        </MemoryRouter>
    );
    render(
        <Layout>
            <p>the page</p>
        </Layout>,
        {wrapper: wrap},
    );
    return open;
}

describe("Layout", () => {
    it("frames the page with the nav, the footer and the side galaxy", () => {
        renderAt("/tools");
        expect(screen.getByRole("main")).toHaveTextContent("the page");
        for (const tab of ["Agents", "Tools", "Activity", "Search"])
            expect(screen.getAllByRole("link", {name: tab}).length).toBeGreaterThan(0);
        expect(screen.getByRole("contentinfo")).toHaveTextContent(/Intuition Testnet/i);
        expect(screen.getByText("side galaxy")).toBeInTheDocument();
        // The nav sets its end slot twice, for the wide bar and the narrow one.
        expect(screen.getAllByText("chain toggle").length).toBeGreaterThan(0);
        expect(screen.getAllByText("wallet").length).toBeGreaterThan(0);
        expect(screen.getByText("activity log")).toBeInTheDocument();
        expect(shortcut).toHaveBeenCalled();
    });

    it("leaves the side galaxy to the landing, which draws its own", () => {
        renderAt("/");
        expect(screen.queryByText("side galaxy")).toBeNull();
    });

    it("opens the onboarding panel from Get started", () => {
        const open = renderAt("/tools");
        fireEvent.click(screen.getAllByText("Get started")[0] as HTMLElement); // The nav's one entry.
        expect(open).toHaveBeenCalled();
    });

    it("names mainnet in the footer when the reads come from it", () => {
        renderAt("/tools", true);
        expect(screen.getByRole("contentinfo")).not.toHaveTextContent(/Testnet/i);
    });
});
