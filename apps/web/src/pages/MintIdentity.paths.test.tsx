import {fireEvent, screen} from "@testing-library/react";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {TESTNET_MINT, type MintQuote, type MintResult} from "../services/identity-mint";
import {renderWithProviders} from "../test/render";

/**
 * The mint from the reader's side: no wallet, a wallet on another chain, the quote, the cost line,
 * the receipt and both failures. The quote and the submit are mocked at the hook, the wallet at
 * wagmi; `draftToAgentUri` is the real one, so the draft a quote receives is what would be stored.
 */
const OWNER = "0x000000000000000000000000000000000000c0DE";
const HASH: Hex = `0x${"44".repeat(32)}`;

type Wallet = {isConnected: boolean; chainId: number | undefined; address: string | undefined};
const wallet = vi.hoisted(
    (): Wallet => ({
        isConnected: true,
        chainId: 13579,
        address: "0x000000000000000000000000000000000000c0DE",
    }),
);
const switchChainAsync = vi.hoisted(() => vi.fn(async () => {}));
const mint = vi.hoisted(() => ({
    quote: vi.fn<(owner: string, agentUri: string) => Promise<MintQuote>>(),
    submit: vi.fn<(quote: MintQuote) => Promise<MintResult>>(),
}));

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => wallet,
    useSwitchChain: () => ({switchChainAsync, isPending: false}),
}));

vi.mock("../hooks/use-identity-mint", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../hooks/use-identity-mint")>()),
    useIdentityMint: () => ({target: TESTNET_MINT, ...mint}),
}));

import {MintIdentity} from "./MintIdentity";

function quoteOf(agentUri: string, maxFeePerGas: bigint | null): MintQuote {
    return {
        predictedTokenId: "44",
        agentUri,
        uriBytes: 1234,
        owner: OWNER,
        chainId: 13579,
        registry: TESTNET_MINT.registry,
        gas: 200_000n,
        maxFeePerGas,
    };
}

function decodeDraft(agentUri: string): Record<string, unknown> {
    const json = atob(agentUri.slice(agentUri.indexOf(",") + 1));
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not a registration file");
    return {...parsed};
}

async function quoteDraft(fields: {name: string; description?: string; endpoint?: string}) {
    fireEvent.change(screen.getByLabelText("Name"), {target: {value: fields.name}});
    if (fields.description !== undefined)
        fireEvent.change(screen.getByLabelText("Description"), {
            target: {value: fields.description},
        });
    if (fields.endpoint !== undefined)
        fireEvent.change(screen.getByLabelText("Endpoint"), {target: {value: fields.endpoint}});
    fireEvent.click(screen.getByRole("button", {name: "Check what it costs"}));
}

beforeEach(() => {
    wallet.isConnected = true;
    wallet.chainId = 13579;
    wallet.address = OWNER;
    mint.quote.mockReset();
    mint.submit.mockReset();
    switchChainAsync.mockClear();
    mint.quote.mockImplementation(async (_owner, agentUri) => quoteOf(agentUri, 1_500_000_000n));
});

describe("MintIdentity", () => {
    it("asks for a wallet and shows no owner when none is connected", () => {
        wallet.isConnected = false;
        wallet.address = undefined;
        renderWithProviders(<MintIdentity />);
        expect(screen.getByRole("button", {name: "Connect a wallet to mint"})).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("offers a switch when the wallet is on another chain", () => {
        wallet.chainId = 1;
        renderWithProviders(<MintIdentity />);
        expect(screen.getByText("1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: `Switch to ${TESTNET_MINT.chain.name}`}));
        expect(switchChainAsync).toHaveBeenCalledWith({chainId: TESTNET_MINT.chain.id});
    });

    it("says the wallet's chain is unknown when it reports none", () => {
        wallet.chainId = undefined;
        renderWithProviders(<MintIdentity />);
        expect(screen.getByText("unknown")).toBeInTheDocument();
    });

    it("keeps the quote disabled until the agent has a name", () => {
        renderWithProviders(<MintIdentity />);
        expect(screen.getByRole("button", {name: "Check what it costs"})).toBeDisabled();
        fireEvent.change(screen.getByLabelText("Name"), {target: {value: "   "}});
        expect(screen.getByRole("button", {name: "Check what it costs"})).toBeDisabled();
    });

    it("stores the description and endpoint it was given, and prices the mint", async () => {
        renderWithProviders(<MintIdentity />);
        await quoteDraft({
            name: "Probe",
            description: "Reads the chain.",
            endpoint: "https://probe.example/mcp",
        });
        expect(await screen.findByText("Confirm before your wallet opens")).toBeInTheDocument();

        const [owner, agentUri] = mint.quote.mock.calls[0] ?? [];
        expect(owner).toBe(OWNER);
        const draft = decodeDraft(agentUri ?? "");
        expect(draft.name).toBe("Probe");
        expect(draft.description).toBe("Reads the chain.");
        expect(JSON.stringify(draft)).toContain("https://probe.example/mcp");

        expect(screen.getByText("1,234 bytes, public")).toBeInTheDocument();
        expect(screen.getByText("200,000")).toBeInTheDocument();
        expect(screen.getByText(/^0\.0003 .* at current fees$/)).toBeInTheDocument();
        expect(screen.getByText(/^44/)).toBeInTheDocument();
    });

    it("says the fees are unavailable when the chain gave none", async () => {
        mint.quote.mockImplementation(async (_owner, agentUri) => quoteOf(agentUri, null));
        renderWithProviders(<MintIdentity />);
        await quoteDraft({name: "Probe"});
        expect(
            await screen.findByText("fees unavailable — your wallet will show them"),
        ).toBeInTheDocument();
    });

    it("prints a whole-number cost without a fraction", async () => {
        mint.quote.mockImplementation(async (_owner, agentUri) => ({
            ...quoteOf(agentUri, 5_000_000_000_000n),
        }));
        renderWithProviders(<MintIdentity />);
        await quoteDraft({name: "Probe"});
        expect(await screen.findByText(/^1 .* at current fees$/)).toBeInTheDocument();
    });

    it("goes back to the form on Cancel, with the name kept", async () => {
        renderWithProviders(<MintIdentity />);
        await quoteDraft({name: "Probe"});
        fireEvent.click(await screen.findByRole("button", {name: "Cancel"}));
        expect(screen.getByLabelText("Name")).toHaveValue("Probe");
        expect(screen.queryByText("Confirm before your wallet opens")).toBeNull();
    });

    it("shows the minted id, its transaction and the next step", async () => {
        mint.submit.mockResolvedValue({
            agentUri: "data:,",
            tokenId: "45",
            hash: HASH,
            owner: OWNER,
            chainId: 13579,
        });
        renderWithProviders(<MintIdentity />);
        await quoteDraft({name: "Probe"});
        fireEvent.click(await screen.findByRole("button", {name: "Mint"}));

        const status = await screen.findByRole("status");
        expect(status).toHaveTextContent("13579:45");
        expect(screen.getByRole("link", {name: /↗/})).toHaveAttribute(
            "href",
            `${TESTNET_MINT.explorerUrl}/tx/${HASH}`,
        );
        expect(screen.getByRole("link", {name: "Now link your agent wallet →"})).toHaveAttribute(
            "href",
            "/start/agent?have=yes&chain=13579&id=45",
        );
    });

    it("shows a refused signature and offers the form again", async () => {
        mint.submit.mockRejectedValue(new Error("User rejected the request."));
        renderWithProviders(<MintIdentity />);
        await quoteDraft({name: "Probe"});
        fireEvent.click(await screen.findByRole("button", {name: "Mint"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("User rejected the request.");
        expect(screen.getByRole("button", {name: "Check what it costs"})).toBeEnabled();
    });

    it("shows a quote that failed, including a non-Error rejection", async () => {
        mint.quote.mockRejectedValue("registry offline");
        renderWithProviders(<MintIdentity />);
        await quoteDraft({name: "Probe"});
        expect(await screen.findByRole("alert")).toHaveTextContent("registry offline");
    });
});
