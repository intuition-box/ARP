import {screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../../test/render";
import {ToolWallets} from "./ToolWallets";

const state = vi.hoisted(
    (): {data: {account: string; deposits: number; assets: bigint}[] | undefined} => ({
        data: undefined,
    }),
);
vi.mock("../../hooks/use-tool-wallets", () => ({
    useToolWallets: () => ({data: state.data}),
}));
/** The tool's row in the catalogue: Signals it shows, unless a test sets none (task 74). */
const signals = vi.hoisted((): {count: number} => ({count: 2}));
vi.mock("../../hooks/use-tool-catalog", () => ({
    useToolCatalog: () => ({data: {rows: [{key: "0xaa", sponsoredDeposits: signals.count}]}}),
}));

const ACCOUNT = "0x56BC52C2A0B863C39dBcBE9aC853f301D79bec42";

describe("ToolWallets", () => {
    beforeEach(() => {
        state.data = undefined;
        signals.count = 2;
    });

    it("shows nothing when the catalogue shows no Signal for the tool, as when only ARP's tests wrote them", () => {
        state.data = [{account: ACCOUNT, deposits: 2, assets: 1n}];
        signals.count = 0;
        const {container} = renderWithProviders(<ToolWallets atomId="0xaa" />);
        expect(container.textContent).toBe("");
    });

    it("lists each wallet with its amount, linked to the explorer", () => {
        state.data = [{account: ACCOUNT, deposits: 2, assets: 1_980_000_000_000_000n}];
        renderWithProviders(<ToolWallets atomId="0xaa" />);
        expect(screen.getByRole("heading", {name: "Wallets"})).toBeInTheDocument();
        expect(screen.getByRole("link")).toHaveAttribute(
            "href",
            expect.stringContaining(`/address/${ACCOUNT}`),
        );
        expect(screen.getByText(/0\.00198/)).toBeInTheDocument();
    });

    it("shows nothing while the read runs or after it fails", () => {
        const {container} = renderWithProviders(<ToolWallets atomId="0xaa" />);
        expect(container.textContent).toBe("");
    });

    it("shows nothing when nobody received a sponsored deposit", () => {
        state.data = [];
        const {container} = renderWithProviders(<ToolWallets atomId="0xaa" />);
        expect(container.textContent).toBe("");
    });

    it("shows nothing for a tool the catalogue does not list", () => {
        state.data = [{account: ACCOUNT, deposits: 2, assets: 1n}];
        const {container} = renderWithProviders(<ToolWallets atomId="0xbb" />);
        expect(container.textContent).toBe("");
    });
});
