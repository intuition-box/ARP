import {fireEvent, render, renderHook, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ProviderNotFoundError} from "wagmi";

import {useOnboarding} from "../onboarding-context";

/**
 * The one door to a wallet: it connects the injected wallet directly and says under the button
 * why it could not.
 */
type Connector = {id: string};
const wagmi: {connectors: Connector[]; isPending: boolean; error: Error | null} = {
    connectors: [],
    isPending: false,
    error: null,
};
const connect = vi.fn();

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useConnect: () => ({...wagmi, connect}),
}));

import {ConnectPrompt} from "../ConnectPrompt";

beforeEach(() => {
    wagmi.connectors = [{id: "walletConnect"}, {id: "injected"}];
    wagmi.isPending = false;
    wagmi.error = null;
    connect.mockReset();
});

describe("ConnectPrompt", () => {
    it("connects the injected wallet over any other connector", () => {
        render(<ConnectPrompt label="Connect a wallet" />);
        fireEvent.click(screen.getByRole("button", {name: "Connect a wallet"}));
        expect(connect).toHaveBeenCalledWith({connector: {id: "injected"}});
    });

    it("falls back to the first connector, and waits while it connects", () => {
        wagmi.connectors = [{id: "walletConnect"}];
        wagmi.isPending = true;
        render(<ConnectPrompt label="Connect a wallet" />);
        const button = screen.getByRole("button", {name: "Connecting…"});
        expect(button).toBeDisabled();
    });

    it("says no wallet was detected when there is no connector, and clicking does nothing", () => {
        wagmi.connectors = [];
        render(<ConnectPrompt label="Connect a wallet" />);
        expect(screen.getByText("No wallet detected")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Connect a wallet"}));
        expect(connect).not.toHaveBeenCalled();
    });

    it("says no wallet was detected when the provider is missing", () => {
        wagmi.error = new ProviderNotFoundError();
        render(<ConnectPrompt label="Connect a wallet" />);
        expect(screen.getByText("No wallet detected")).toBeInTheDocument();
    });

    it("prints wagmi's short message, or a plain error's message", () => {
        wagmi.error = Object.assign(new Error("long text with docs link"), {
            shortMessage: "User rejected",
        });
        const {unmount} = render(<ConnectPrompt label="Connect a wallet" />);
        expect(screen.getByText("User rejected")).toBeInTheDocument();
        unmount();
        wagmi.error = new Error("plain failure");
        render(<ConnectPrompt label="Connect a wallet" />);
        expect(screen.getByText("plain failure")).toBeInTheDocument();
    });
});

describe("useOnboarding outside its provider", () => {
    it("is inert rather than throwing", () => {
        const {result} = renderHook(() => useOnboarding());
        expect(result.current.open()).toBeUndefined();
        expect(result.current.landed()).toBeUndefined();
    });
});
