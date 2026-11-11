import {act, fireEvent, render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router-dom";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../lib/chain-choice";
import type {ImportLinkPlan, OwnershipVerdict} from "../services/agent-import";

/**
 * Steps 1 and 2 against an agent the graph mirrors, so step 3 can price and publish the link.
 * `AgentImport.test.tsx` covers the unmirrored agent, whose step 3 writes the identity record.
 */
const OWNER = "0x000000000000000000000000000000000000c0DE";
const ACCOUNT = "0x000000000000000000000000000000000000BEEF";
const ATOM: Hex = `0x${"11".repeat(32)}`;
const SIGNATURE: Hex = `0x${"22".repeat(65)}`;
const TESTNET = choiceFor(false);

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => ({address: OWNER, isConnected: true, chainId: 13579}),
    useSwitchChain: () => ({switchChainAsync: vi.fn(), isPending: false}),
}));

function owned(params: {chainId: number; tokenId: string}): OwnershipVerdict {
    // The page reads only `status`, `caip19` and `owner` off a verdict.
    return {
        status: "owned",
        ref: {chainId: params.chainId, tokenId: params.tokenId},
        caip19: `eip155:${params.chainId}/erc721:0x/${params.tokenId}`,
        owner: OWNER,
    } as unknown as OwnershipVerdict;
}

// The page and `LinkPlan` read only these fields; the rest is the service's concern.
const PLAN = {
    agentAtomId: ATOM,
    operatingAccount: ACCOUNT,
    accountAtomUri: `caip10:eip155:13579:${ACCOUNT}`,
    accountAtomExists: false,
    predicateId: ATOM,
    tripleExists: false,
    atomAssets: 1n,
    tripleAssets: 1n,
    totalCost: 2n,
    chain: TESTNET,
} as unknown as ImportLinkPlan;

const verifyOwnership = vi.fn(async (params: {chainId: number; tokenId: string}) => owned(params));
const resolveAtom = vi.fn(
    async (): Promise<{atomId: string; label: string | null; caip19: string} | null> => ({
        atomId: ATOM,
        label: null,
        caip19: "eip155:13579/erc721:0x/1",
    }),
);
const planIdentity = vi.fn();
const publishIdentity = vi.fn();
const signConsent = vi.fn(async () => ({signature: SIGNATURE, chainId: 13579}));
const publishLink = vi.fn(async () => ({tripleTx: SIGNATURE}));

vi.mock("../hooks/use-agent-import", () => ({
    useAgentImport: () => ({
        verifyOwnership,
        resolveAtom,
        deriveOperatingAccount: async () => ACCOUNT,
        signConsent,
        planLink: async () => PLAN,
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

beforeEach(() => {
    vi.clearAllMocks();
});

async function proveToken(tokenId: string) {
    fireEvent.change(screen.getByLabelText("Token id"), {target: {value: tokenId}});
    fireEvent.click(screen.getByRole("button", {name: "Check ownership"}));
    await screen.findByText(`Agent 13579:${tokenId} is yours.`);
}

describe("AgentImport after a rejected re-sign", () => {
    it("keeps the earlier signature, so the priced link still publishes", async () => {
        render(<AgentImport />, {wrapper: Provider});
        await proveToken("1");

        fireEvent.click(screen.getByRole("button", {name: "Sign the statement"}));
        fireEvent.click(await screen.findByRole("button", {name: "Price the link"}));
        await screen.findByRole("button", {name: /Publish the link/});

        signConsent.mockRejectedValueOnce(new Error("User rejected the request."));
        fireEvent.click(screen.getByRole("button", {name: "Sign the statement"}));
        await screen.findByText("User rejected the request.");

        const publish = screen.getByRole("button", {name: /Publish the link/});
        expect(publish).toBeEnabled();
        fireEvent.click(publish);

        expect(publishLink).toHaveBeenCalledTimes(1);
        expect(publishLink.mock.calls[0]).toMatchObject([
            {imported: {signature: SIGNATURE, agentAtomId: ATOM}, plan: PLAN},
        ]);
    });
});

describe("AgentImport when the token is edited during the ownership check", () => {
    it("drops the reply for the token no longer on screen", async () => {
        render(<AgentImport />, {wrapper: Provider});

        let resolve: (verdict: OwnershipVerdict) => void = () => {};
        verifyOwnership.mockImplementationOnce(
            () => new Promise<OwnershipVerdict>((done) => (resolve = done)),
        );
        fireEvent.change(screen.getByLabelText("Token id"), {target: {value: "1"}});
        fireEvent.click(screen.getByRole("button", {name: "Check ownership"}));
        await screen.findByRole("button", {name: "Reading the registry…"});

        fireEvent.change(screen.getByLabelText("Token id"), {target: {value: "2"}});
        await act(async () => resolve(owned({chainId: 13579, tokenId: "1"})));

        expect(screen.queryByText(/is yours\./)).toBeNull();
        expect(screen.getByRole("button", {name: "Sign the statement"})).toBeDisabled();
    });
});

describe("AgentImport after a mint (task 129)", () => {
    it("opens on the minted agent, reads ARP's testnet registry, and offers no other chain yet", async () => {
        render(
            <MemoryRouter initialEntries={["/start/agent?have=yes&chain=13579&id=40"]}>
                <ChainChoiceContext.Provider value={{choice: TESTNET, setMainnet: () => {}}}>
                    <AgentImport />
                </ChainChoiceContext.Provider>
            </MemoryRouter>,
        );
        expect(screen.getByLabelText("Token id")).toHaveValue("40");
        const chain = screen.getByLabelText("Registry chain");
        expect(chain).toHaveValue("13579");
        for (const soon of ["Base (8453)", "BSC (56)", "Ethereum (1)"]) {
            const option = screen.getByRole("option", {
                name: new RegExp(soon.replace(/[()]/g, "\\$&")),
            });
            expect(option).toBeDisabled();
            expect(option).toHaveTextContent("soon to be released");
        }

        fireEvent.click(screen.getByRole("button", {name: "Check ownership"}));
        await screen.findByText("Agent 13579:40 is yours.");
        expect(verifyOwnership).toHaveBeenCalledWith(
            expect.objectContaining({
                chainId: 13579,
                tokenId: "40",
                registry: "0xC165A2AD2E540A4069E02834009161E2b4490d5A",
            }),
        );
    });
});

describe("AgentImport for an agent whose record is not pinned (task 129)", () => {
    it("takes the atom from the identity plan once the record is on chain, and offers the link", async () => {
        resolveAtom.mockResolvedValueOnce(null);
        planIdentity.mockResolvedValueOnce({
            caip19: "eip155:13579/erc721:0x/1",
            identityAtom: ATOM,
            calls: [],
            totalValue: 0n,
        });
        render(<AgentImport />, {wrapper: Provider});
        await proveToken("1");
        fireEvent.click(screen.getByRole("button", {name: "Sign the statement"}));
        fireEvent.click(await screen.findByRole("button", {name: "Price the public record"}));
        fireEvent.click(await screen.findByRole("button", {name: "Price the link"}));
        await screen.findByRole("button", {name: /Publish the link/});
    });
});

describe("AgentImport writes the record, then reads it back (task 129)", () => {
    // The fields the record step renders; the rest of an `IdentityAtomPlan` is the service's concern.
    const priced = {
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
    };
    const complete = {...priced, calls: [], totalValue: 0n};

    async function writeRecord() {
        resolveAtom.mockResolvedValueOnce(null);
        publishIdentity.mockResolvedValueOnce({txs: [SIGNATURE]});
        render(<AgentImport />, {wrapper: Provider});
        await proveToken("1");
        fireEvent.click(screen.getByRole("button", {name: "Sign the statement"}));
        fireEvent.click(await screen.findByRole("button", {name: "Price the public record"}));
        fireEvent.click(await screen.findByRole("button", {name: /Write the public record/}));
    }

    it("offers the link once every term reads as written", async () => {
        planIdentity.mockResolvedValueOnce(priced).mockResolvedValueOnce(complete);
        await writeRecord();
        await screen.findByRole("button", {name: "Price the link"});
        expect(planIdentity).toHaveBeenCalledTimes(2);
    });

    it("does not offer the link when part of the record is missing after the write", async () => {
        planIdentity.mockResolvedValueOnce(priced).mockResolvedValueOnce(priced);
        await writeRecord();
        await screen.findByText("Part of the record is not on chain yet. Write it again.");
        expect(screen.queryByRole("button", {name: "Price the link"})).toBeNull();
    });
});

describe("AgentImport after a mint on Base (task 129)", () => {
    it("drops the token id with the chain it does not offer", () => {
        render(
            <MemoryRouter initialEntries={["/start/agent?have=yes&chain=8453&id=5"]}>
                <ChainChoiceContext.Provider value={{choice: TESTNET, setMainnet: () => {}}}>
                    <AgentImport />
                </ChainChoiceContext.Provider>
            </MemoryRouter>,
        );
        expect(screen.getByLabelText("Registry chain")).toHaveValue("13579");
        expect(screen.getByLabelText("Token id")).toHaveValue("");
    });
});

describe("AgentImport with the toggle on mainnet (ADR 0194)", () => {
    it("still names Intuition Testnet as the chain the link lands on", async () => {
        render(
            <MemoryRouter>
                <ChainChoiceContext.Provider
                    value={{choice: choiceFor(true), setMainnet: () => {}}}
                >
                    <AgentImport />
                </ChainChoiceContext.Provider>
            </MemoryRouter>,
        );
        await proveToken("1");
        expect(
            screen.getByText(/One public link on Intuition Testnet, paid in tTRUST/),
        ).toBeInTheDocument();
    });
});
