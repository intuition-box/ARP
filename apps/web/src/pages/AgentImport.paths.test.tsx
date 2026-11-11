import {fireEvent, render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router-dom";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../lib/chain-choice";
import {renderWithProviders} from "../test/render";
import type {ImportLinkPlan, OwnershipVerdict} from "../services/agent-import";

/**
 * The import's other roads: the registry says no, a read or a write fails, the wallet is on another
 * chain or not connected, and the link is already public. `AgentImport.test.tsx` and
 * `AgentImport.consent.test.tsx` cover the roads that end in a write. Every action is mocked at the
 * hook, and the wallet at wagmi, so no render reads a registry or opens a wallet.
 */
const OWNER = "0x000000000000000000000000000000000000c0DE";
const OTHER = "0x000000000000000000000000000000000000dEaD";
const ACCOUNT = "0x000000000000000000000000000000000000BEEF";
const ATOM: Hex = `0x${"11".repeat(32)}`;
const SIGNATURE: Hex = `0x${"22".repeat(65)}`;
const TX: Hex = `0x${"33".repeat(32)}`;
const TESTNET = choiceFor(false);

type Wallet = {isConnected: boolean; chainId: number | undefined; address: string | undefined};
const wallet = vi.hoisted(
    (): Wallet => ({
        isConnected: true,
        chainId: 13579,
        address: "0x000000000000000000000000000000000000c0DE",
    }),
);
const switchChainAsync = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => wallet,
    useSwitchChain: () => ({switchChainAsync, isPending: false}),
}));

function owned(tokenId: string): OwnershipVerdict {
    // The page reads only `status`, `caip19` and `owner` off a verdict.
    return {
        status: "owned",
        ref: {chainId: 13579, tokenId},
        caip19: `eip155:13579/erc721:0x/${tokenId}`,
        owner: OWNER,
    } as unknown as OwnershipVerdict;
}

function planWith(totalCost: bigint): ImportLinkPlan {
    // The page and `LinkPlan` read only these fields; the rest is the service's concern.
    return {
        agentAtomId: ATOM,
        operatingAccount: ACCOUNT,
        accountAtomUri: `caip10:eip155:13579:${ACCOUNT}`,
        accountAtomExists: totalCost === 0n,
        predicateId: ATOM,
        tripleExists: totalCost === 0n,
        atomAssets: totalCost,
        tripleAssets: 0n,
        totalCost,
        chain: TESTNET,
    } as unknown as ImportLinkPlan;
}

const verifyOwnership = vi.fn(async (params: {tokenId: string}) => owned(params.tokenId));
const resolveAtom = vi.fn(
    async (): Promise<{atomId: string; label: string | null; caip19: string} | null> => ({
        atomId: ATOM,
        label: "Clawnch",
        caip19: "eip155:13579/erc721:0x/1",
    }),
);
const signConsent = vi.fn(async () => ({signature: SIGNATURE, chainId: 13579}));
const planLink = vi.fn(async () => planWith(2n));
const publishLink = vi.fn(
    async (): Promise<{tripleTx?: Hex; atomTx?: Hex}> => ({
        tripleTx: TX,
        atomTx: TX,
    }),
);
const planIdentity = vi.fn();
const publishIdentity = vi.fn();

vi.mock("../hooks/use-agent-import", () => ({
    useAgentImport: () => ({
        verifyOwnership,
        resolveAtom,
        deriveOperatingAccount: async () => ACCOUNT,
        signConsent,
        planLink,
        publishLink,
        planIdentity,
        publishIdentity,
    }),
}));

import {AgentImport} from "./AgentImport";

function Provider({children}: {children: ReactNode}) {
    return (
        <MemoryRouter>
            <ChainChoiceContext.Provider value={{choice: TESTNET, setMainnet: () => {}}}>
                {children}
            </ChainChoiceContext.Provider>
        </MemoryRouter>
    );
}

function check(tokenId: string) {
    fireEvent.change(screen.getByLabelText("Token id"), {target: {value: tokenId}});
    fireEvent.click(screen.getByRole("button", {name: "Check ownership"}));
}

async function proveAndPrice() {
    check("1");
    await screen.findByText("Clawnch is yours.");
    fireEvent.click(screen.getByRole("button", {name: "Sign the statement"}));
    fireEvent.click(await screen.findByRole("button", {name: "Price the link"}));
}

beforeEach(() => {
    vi.clearAllMocks();
    wallet.isConnected = true;
    wallet.chainId = 13579;
    wallet.address = OWNER;
});

describe("AgentImport step 1", () => {
    it("says a token id must be decimal and keeps the check disabled", () => {
        render(<AgentImport />, {wrapper: Provider});
        fireEvent.change(screen.getByLabelText("Token id"), {target: {value: "12a"}});
        expect(screen.getByText("Token ids are decimal, for example 2340.")).toBeInTheDocument();
        expect(screen.getByLabelText("Token id")).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByRole("button", {name: "Check ownership"})).toBeDisabled();
    });

    it("does not read the registry when the form is submitted without a valid token", () => {
        render(<AgentImport />, {wrapper: Provider});
        fireEvent.submit(screen.getByRole("button", {name: "Check ownership"}));
        expect(verifyOwnership).not.toHaveBeenCalled();
    });

    it("asks for the owner's wallet when none is connected", () => {
        wallet.isConnected = false;
        wallet.address = undefined;
        // `ConnectPrompt` reads wagmi's config, so this one render needs the real provider.
        renderWithProviders(<AgentImport />);
        expect(
            screen.getByRole("button", {name: "Connect the wallet that owns the agent"}),
        ).toBeInTheDocument();
    });

    it("says a token was never minted", async () => {
        verifyOwnership.mockResolvedValueOnce({
            status: "not-found",
            ref: {chainId: 13579, tokenId: "9", registry: OWNER},
            caip19: "eip155:13579/erc721:0x/9",
        });
        render(<AgentImport />, {wrapper: Provider});
        check("9");
        expect(await screen.findByText("No such agent in that registry.")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Sign the statement"})).toBeDisabled();
    });

    it("names the owner when the agent belongs to another address", async () => {
        verifyOwnership.mockResolvedValueOnce({
            status: "owner-mismatch",
            ref: {chainId: 13579, tokenId: "9", registry: OWNER},
            caip19: "eip155:13579/erc721:0x/9",
            owner: OTHER,
            connected: OWNER,
        });
        render(<AgentImport />, {wrapper: Provider});
        check("9");
        expect(
            await screen.findByText("That agent belongs to another address."),
        ).toBeInTheDocument();
        expect(screen.getByText(OTHER)).toBeInTheDocument();
    });

    it("shows a registry read that failed, including a non-Error rejection", async () => {
        verifyOwnership.mockRejectedValueOnce("registry offline");
        render(<AgentImport />, {wrapper: Provider});
        check("1");
        expect(await screen.findByText("registry offline")).toBeInTheDocument();
    });

    it("drops a proof when the chain is changed", async () => {
        render(<AgentImport />, {wrapper: Provider});
        check("1");
        await screen.findByText("Clawnch is yours.");
        fireEvent.change(screen.getByLabelText("Registry chain"), {target: {value: "13579"}});
        expect(screen.queryByText("Clawnch is yours.")).toBeNull();
    });
});

describe("AgentImport step 3, the link", () => {
    it("publishes the priced link and shows both transactions", async () => {
        render(<AgentImport />, {wrapper: Provider});
        await proveAndPrice();
        fireEvent.click(await screen.findByRole("button", {name: /Publish the link — /}));

        expect(await screen.findByText("The link is public.")).toBeInTheDocument();
        expect(screen.getByText("Wallet record")).toBeInTheDocument();
        for (const link of screen.getAllByRole("link", {name: /0x3333/})) {
            expect(link).toHaveAttribute("href", `${TESTNET.explorerUrl}/tx/${TX}`);
        }
        expect(screen.queryByRole("button", {name: /Publish the link/})).toBeNull();
    });

    it("shows a failed publish and keeps the button to try again", async () => {
        publishLink.mockRejectedValueOnce(new Error("execution reverted"));
        render(<AgentImport />, {wrapper: Provider});
        await proveAndPrice();
        fireEvent.click(await screen.findByRole("button", {name: /Publish the link — /}));

        expect(await screen.findByText("execution reverted")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /Publish the link — /})).toBeEnabled();
    });

    it("shows a failed pricing and lets the reader price again", async () => {
        planLink.mockRejectedValueOnce(new Error("graph timeout"));
        render(<AgentImport />, {wrapper: Provider});
        await proveAndPrice();

        expect(await screen.findByText("graph timeout")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Price the link"})).toBeEnabled();
    });

    it("says there is nothing to send when the link is already public", async () => {
        planLink.mockResolvedValueOnce(planWith(0n));
        render(<AgentImport />, {wrapper: Provider});
        await proveAndPrice();

        expect(
            await screen.findByText("This link is already public. There is nothing to send."),
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /Publish the link/})).toBeNull();
    });

    it("offers a switch when the wallet is on another chain, and says why it failed", async () => {
        wallet.chainId = 1;
        switchChainAsync.mockRejectedValueOnce(new Error("User rejected the switch."));
        render(<AgentImport />, {wrapper: Provider});
        await proveAndPrice();

        expect(await screen.findByText(/Your wallet is on chain 1\./)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: `Switch to ${TESTNET.chain.name}`}));
        expect(switchChainAsync).toHaveBeenCalledWith({chainId: 13579});
        expect(await screen.findByText("User rejected the switch.")).toBeInTheDocument();
    });

    it("says the wallet chain is unknown when it reports none", async () => {
        wallet.chainId = undefined;
        render(<AgentImport />, {wrapper: Provider});
        await proveAndPrice();
        expect(await screen.findByText(/Your wallet is on chain unknown\./)).toBeInTheDocument();
    });
});

describe("AgentImport step 3, an agent the graph does not mirror", () => {
    it("shows a failed pricing of the public record", async () => {
        resolveAtom.mockResolvedValueOnce(null);
        planIdentity.mockRejectedValueOnce(new Error("pin service down"));
        render(<AgentImport />, {wrapper: Provider});
        check("1");
        await screen.findByText("Agent 13579:1 is yours.");
        fireEvent.click(screen.getByRole("button", {name: "Price the public record"}));
        expect(await screen.findByText("pin service down")).toBeInTheDocument();
    });

    it("shows a write of the record that failed, with the plan kept", async () => {
        resolveAtom.mockResolvedValueOnce(null);
        planIdentity.mockResolvedValueOnce({
            caip19: "eip155:13579/erc721:0x/1",
            identityAtom: ATOM,
            tripleId: ATOM,
            existing: {
                identityAtom: false,
                caipAtom: false,
                triple: false,
                typeTriple: false,
                implementTriple: false,
            },
            uris: {identity: "ipfs://identity", caip: "ipfs://caip"},
            calls: [{kind: "identity atom", to: ATOM, data: "0x", value: 1n}],
            totalValue: 1n,
        });
        publishIdentity.mockRejectedValueOnce(new Error("User rejected the request."));
        render(<AgentImport />, {wrapper: Provider});
        check("1");
        await screen.findByText("Agent 13579:1 is yours.");
        fireEvent.click(screen.getByRole("button", {name: "Price the public record"}));
        fireEvent.click(await screen.findByRole("button", {name: /Write the public record/}));

        expect(await screen.findByText("User rejected the request.")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /Write the public record/})).toBeEnabled();
    });
});
