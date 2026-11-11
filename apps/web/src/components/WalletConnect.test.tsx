import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";

/**
 * The wallet menu (`docs/tasks/35` §0): copy the address, disconnect (`/account` left on 2026-11-10). wagmi is
 * mocked to a connected account, because the real config never connects under `happy-dom`.
 */
const disconnect = vi.fn();
const account = {
    address: "0x000000000000000000000000000000000000c0DE" as string | undefined,
    isConnected: true,
    status: "connected",
};
vi.mock("wagmi", () => ({
    useAccount: () => account,
    useConnect: () => ({connectors: [], connect: vi.fn(), isPending: false}),
    useDisconnect: () => ({disconnect}),
}));

import {WalletConnect} from "./WalletConnect";

function renderMenu() {
    render(
        <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route path="/" element={<WalletConnect />} />
            </Routes>
        </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", {name: /0x0000…c0DE/}));
}

describe("the wallet button", () => {
    it("says it is connecting while wagmi reconnects", () => {
        account.status = "reconnecting";
        render(<WalletConnect />);
        expect(screen.getByRole("button", {name: "Connecting…"})).toBeDisabled();
        account.status = "connected";
    });

    it("renders nothing without a connected account", () => {
        account.isConnected = false;
        const {container} = render(<WalletConnect />);
        expect(container).toBeEmptyDOMElement();
        account.isConnected = true;
    });
});

describe("the wallet menu", () => {
    it("closes on Escape and on a click outside it, not on a click inside", () => {
        renderMenu();
        fireEvent.keyDown(window, {key: "Enter"});
        expect(screen.getByRole("menu")).toBeInTheDocument();
        fireEvent.keyDown(window, {key: "Escape"});
        expect(screen.queryByRole("menu")).toBeNull();

        fireEvent.click(screen.getByRole("button", {name: /0x0000…c0DE/}));
        fireEvent.mouseDown(screen.getByRole("menuitem", {name: "Disconnect"}));
        expect(screen.getByRole("menu")).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("offers copy and disconnect, in that order", () => {
        renderMenu();
        expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
            "Copy address",
            "Disconnect",
        ]);
    });

    it("disconnects from Disconnect", () => {
        renderMenu();
        fireEvent.click(screen.getByRole("menuitem", {name: "Disconnect"}));
        expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it("closes the menu once the address is copied", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {value: {writeText}, configurable: true});
        renderMenu();
        fireEvent.click(screen.getByRole("menuitem", {name: "Copy address"}));
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
        expect(writeText).toHaveBeenCalledWith("0x000000000000000000000000000000000000c0DE");
    });

    it("keeps the menu open and says so when the copy is refused", async () => {
        const writeText = vi.fn().mockRejectedValue(new Error("denied"));
        Object.defineProperty(navigator, "clipboard", {value: {writeText}, configurable: true});
        renderMenu();
        fireEvent.click(screen.getByRole("menuitem", {name: "Copy address"}));
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("Copy failed");
        const menu = screen.getByRole("menu");
        // A menu owns menu items only; the alert sits beside it.
        expect(menu).not.toContainElement(alert);
        expect(menu.children).toHaveLength(2);
    });
});
