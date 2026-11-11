import {describe, expect, it, vi} from "vitest";

/** `VITE_WALLETCONNECT_PROJECT_ID` is read at module load, so it is stubbed before the import. */
vi.hoisted(() => {
    vi.stubEnv("VITE_WALLETCONNECT_PROJECT_ID", "test-project");
});

const {wagmiConfig} = await import("../wagmi");

describe("wagmiConfig with a WalletConnect project id", () => {
    it("offers WalletConnect beside the injected wallet", () => {
        expect(wagmiConfig.connectors.map((connector) => connector.type)).toEqual(["injected", "walletConnect"]);
    });

    it("addresses the three chains the app writes to", () => {
        expect(wagmiConfig.chains.map((chain) => chain.id)).toEqual([13579, 1155, 8453]);
    });
});
