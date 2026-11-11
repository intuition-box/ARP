import {describe, expect, it, vi} from "vitest";

const getWalletClient = vi.hoisted(() => vi.fn());
vi.mock("@wagmi/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@wagmi/core")>()),
    getWalletClient,
}));

const {connectedWalletClient} = await import("../wallet-client");

describe("connectedWalletClient", () => {
    it("returns the wallet when one is connected with an account", async () => {
        const wallet = {account: {address: "0x000000000000000000000000000000000000c0DE"}};
        getWalletClient.mockResolvedValue(wallet);
        expect(await connectedWalletClient()).toBe(wallet);
    });

    it("refuses with a sentence the page can show when there is no wallet or no account", async () => {
        getWalletClient.mockResolvedValue(null);
        await expect(connectedWalletClient()).rejects.toThrow("No wallet client — reconnect your wallet and try again.");
        getWalletClient.mockResolvedValue({account: undefined});
        await expect(connectedWalletClient()).rejects.toThrow(/No wallet client/);
    });
});
