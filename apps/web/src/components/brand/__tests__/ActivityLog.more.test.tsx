import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ActivityLog as Panel} from "../ActivityLog";
import {ActivityLog as Store} from "../../../services/activity-log";
import {AgentFeed} from "../../../services/agent-feed";
import {renderWithProviders} from "../../../test/render";

/** The indexer's poll is its own hook; nothing here may reach the chain. */
vi.mock("../../../hooks/use-chain-activity", () => ({useChainActivity: () => undefined}));

const quietFeed = (store: Store) =>
    new AgentFeed(store, {
        url: undefined,
        open: () => ({onopen: null, onmessage: null, onerror: null, close: () => undefined}),
        readReceipt: async () => null,
    });

function show(store = new Store()) {
    return renderWithProviders(<Panel store={store} feed={quietFeed(store)} />);
}

beforeEach(() => {
    try {
        window.localStorage.clear();
    } catch {
        // A browser that refuses storage is a browser this panel still works in.
    }
});

describe("the activity panel, remembered and refused", () => {
    it("remembers it was closed again, so the next page opens it closed", async () => {
        const first = show();
        const toggle = () => screen.getByRole("button", {name: /^activity/i});
        await userEvent.click(toggle());
        first.unmount();
        const second = show();
        expect(toggle()).toHaveAttribute("aria-expanded", "true");
        await userEvent.click(toggle());
        second.unmount();
        show();
        expect(toggle()).toHaveAttribute("aria-expanded", "false");
    });

    it("still opens and closes when the browser refuses storage", async () => {
        const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("denied");
        });
        const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("denied");
        });
        show();
        const toggle = screen.getByRole("button", {name: /^activity/i});
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        get.mockRestore();
        set.mockRestore();
    });

    it("links a transaction that named no chain to testnet's explorer", async () => {
        const store = new Store();
        store.append({
            stream: "mine",
            step: "sent",
            label: "deposit",
            tx: `0x${"ef".repeat(32)}`,
            costWei: (10n ** 15n).toString(),
            at: Date.now(),
        });
        show(store);
        await userEvent.click(screen.getByRole("button", {name: /^activity/i}));
        expect(screen.getByRole("link", {name: /^Transaction 0x/})).toHaveAttribute(
            "href",
            `https://testnet.explorer.intuition.systems/tx/0x${"ef".repeat(32)}`,
        );
    });
});
