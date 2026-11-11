import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";

/**
 * A URL that would publish a value is answered before the wallet is asked to sign it and before anything
 * leaves the page (task 123, ADR `0190`).
 */
const connectedWalletClient = vi.fn(async () => {
    throw new Error("the wallet must not be opened");
});
const fetchSpy = vi.fn(async () => new Response("{}", {status: 500}));

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => ({address: "0x000000000000000000000000000000000000c0DE"}),
}));
vi.mock("../wallet-client", () => ({connectedWalletClient}));
vi.mock("../../services/sponsor-url", () => ({SPONSOR_URL: "http://127.0.0.1:3200"}));

const {useListTool} = await import("../use-list-tool");

function wrapper({children}: {children: ReactNode}) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useListTool", () => {
    it("neither signs nor sends a URL that carries a key", async () => {
        vi.stubGlobal("fetch", fetchSpy);
        const {result} = renderHook(() => useListTool(), {wrapper});
        act(() => result.current.submit("https://mcp.example.com/mcp?api_key=sk_live_51Hq9d2eZvKYlo2C8xY7Qw3"));
        await waitFor(() => expect(result.current.result).not.toBeNull());
        expect(result.current.result).toEqual({
            status: "private",
            listable: "https://mcp.example.com/mcp?api_key=",
        });
        expect(connectedWalletClient).not.toHaveBeenCalled();
        expect(fetchSpy).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });

    it("sends a GitHub URL rebuilt, without its other parameters", async () => {
        const sent: string[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (_url: string, init: RequestInit) => {
                sent.push(String(init.body));
                return new Response(JSON.stringify({atomId: "0xabc", created: false}), {status: 200});
            }),
        );
        const {result} = renderHook(() => useListTool(), {wrapper});
        act(() => result.current.submit("github.com/a/b?skill=c&token=abc123def456"));
        await waitFor(() => expect(result.current.result).not.toBeNull());
        expect(sent).toEqual([JSON.stringify({url: "https://github.com/a/b?skill=c"})]);
        vi.unstubAllGlobals();
    });
    it("signs with the connected wallet, on testnet, and sends the signed request", async () => {
        const account = {address: "0x000000000000000000000000000000000000c0DE"};
        const switchChain = vi.fn(async () => {});
        const signTypedData = vi.fn(async () => `0x${"5".repeat(130)}`);
        connectedWalletClient.mockResolvedValueOnce({
            account,
            getChainId: async () => 1155,
            switchChain,
            signTypedData,
        } as never); // The mock's declared type is a thrower; the hook reads only these four members.
        const sent: unknown[] = [];
        vi.stubGlobal(
            "fetch",
            vi.fn(async (_url: string, init: RequestInit) => {
                sent.push(JSON.parse(String(init.body)));
                return new Response(JSON.stringify({atomId: "0xabc", created: true}), {status: 200});
            }),
        );
        const {result} = renderHook(() => useListTool(), {wrapper});
        act(() => result.current.submit("https://mcp.example.com/mcp"));
        await waitFor(() => expect(result.current.result).not.toBeNull());
        expect(switchChain).toHaveBeenCalledWith({id: 13579});
        expect(signTypedData).toHaveBeenCalledWith(expect.objectContaining({account}));
        expect(sent).toEqual([
            expect.objectContaining({
                url: "https://mcp.example.com/mcp",
                request: expect.objectContaining({chainId: 13579, signature: `0x${"5".repeat(130)}`}),
            }),
        ]);
        vi.unstubAllGlobals();
    });
});
