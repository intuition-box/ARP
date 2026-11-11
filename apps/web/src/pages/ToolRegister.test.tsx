import {fireEvent, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {choiceFor} from "../lib/chain-choice";
import type {ToolRegistration} from "../services/tool-register";
import {renderWithProviders} from "../test/render";

/**
 * The wallet way to register a tool. The two actions are mocked at the hook — the plan is a chain
 * read and the submit a signature, neither of which a DOM test may make — and the wallet's state is
 * mocked at wagmi, because the real config never connects under `happy-dom`.
 */
const TESTNET = choiceFor(false);
const ATOM_ID = "0x1111111111111111111111111111111111111111111111111111111111111111";
const TX = "0x2222222222222222222222222222222222222222222222222222222222222222";

const wallet = vi.hoisted((): {isConnected: boolean; chainId: number | undefined} => ({
    isConnected: true,
    chainId: 13579,
}));
const switchChainAsync = vi.hoisted(() => vi.fn<() => Promise<void>>());
const actions = vi.hoisted(() => ({
    plan: vi.fn<(url: string) => Promise<ToolRegistration>>(),
    submit: vi.fn<(plan: ToolRegistration) => Promise<string>>(),
}));

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => ({isConnected: wallet.isConnected, chainId: wallet.chainId}),
    useSwitchChain: () => ({switchChainAsync, isPending: false}),
}));

vi.mock("../hooks/use-tool-register", () => ({
    useToolRegister: () => actions,
}));

import {ToolRegister} from "./ToolRegister";

function registration(overrides: Partial<ToolRegistration> = {}): ToolRegistration {
    return {
        chain: TESTNET,
        input: "github.com/crytic/slither",
        normalisedUrl: "https://github.com/crytic/slither",
        atomUri: "ipfs://bafyexample",
        atomId: ATOM_ID,
        document: '{"name":"slither"}',
        exists: false,
        existingCandidates: [],
        assets: 2_000_000_000_000_000n,
        creationFee: 1_000_000_000_000_000n,
        assetsAfterFees: 900_000_000_000_000n,
        feeAssets: 1_100_000_000_000_000n,
        shares: 900_000_000_000_000n,
        ...overrides,
    };
}

async function lookUp(url = "github.com/crytic/slither") {
    fireEvent.change(screen.getByLabelText("Tool URL"), {target: {value: url}});
    fireEvent.click(screen.getByRole("button", {name: "Look it up"}));
    await screen.findByText("Normalised URL");
}

beforeEach(() => {
    wallet.isConnected = true;
    wallet.chainId = 13579;
    actions.plan.mockReset();
    actions.submit.mockReset();
    switchChainAsync.mockReset();
});

describe("ToolRegister", () => {
    it("keeps the look-up disabled until a URL is typed", () => {
        renderWithProviders(<ToolRegister />);
        expect(screen.getByRole("button", {name: "Look it up"})).toBeDisabled();
        fireEvent.change(screen.getByLabelText("Tool URL"), {target: {value: "  "}});
        expect(screen.getByRole("button", {name: "Look it up"})).toBeDisabled();
    });

    it("prices a new atom with every fee layer and registers it on a click", async () => {
        actions.plan.mockResolvedValue(registration());
        actions.submit.mockResolvedValue(TX);
        renderWithProviders(<ToolRegister />);
        await lookUp();

        expect(actions.plan).toHaveBeenCalledWith("github.com/crytic/slither");
        expect(screen.getByText("https://github.com/crytic/slither")).toBeInTheDocument();
        expect(screen.getByText("Creation fee")).toBeInTheDocument();
        expect(screen.getByText(/— spent/)).toBeInTheDocument();
        expect(screen.getByText("Ready to register")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: /^Register — .* tTRUST$/}));
        expect(await screen.findByText("Registered.")).toBeInTheDocument();
        expect(actions.submit).toHaveBeenCalledTimes(1);
        const txLink = screen.getByRole("link", {name: /0x2222/});
        expect(txLink).toHaveAttribute("href", `${TESTNET.explorerUrl}/tx/${TX}`);
        expect(screen.getByText('{"name":"slither"}')).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "See its declarations →"})).toHaveAttribute(
            "href",
            `/atom/${ATOM_ID}`,
        );
    });

    it("says an existing atom is already registered and offers no write", async () => {
        actions.plan.mockResolvedValue(registration({exists: true}));
        renderWithProviders(<ToolRegister />);
        await lookUp();

        expect(screen.getByText("This tool is already registered.")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /^Register/})).toBeNull();
        expect(screen.getByRole("link", {name: "See its declarations →"})).toHaveAttribute(
            "href",
            `/atom/${ATOM_ID}`,
        );
    });

    it("lists one other registration of the URL by its label", async () => {
        actions.plan.mockResolvedValue(
            registration({
                existingCandidates: [{termId: "0xabc", label: "Slither", uri: "ipfs://slither"}],
            }),
        );
        renderWithProviders(<ToolRegister />);
        await lookUp();

        expect(
            screen.getByRole("heading", {name: "Another registration already carries this URL."}),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Slither"})).toHaveAttribute("href", "/atom/0xabc");
    });

    it("counts several other registrations and names an unlabelled one by its id", async () => {
        const unlabelled = `0x${"9".repeat(64)}`;
        actions.plan.mockResolvedValue(
            registration({
                existingCandidates: [
                    {termId: "0xabc", label: "Slither", uri: "ipfs://slither"},
                    {termId: unlabelled, label: null, uri: "ipfs://other"},
                ],
            }),
        );
        renderWithProviders(<ToolRegister />);
        await lookUp();

        expect(
            screen.getByRole("heading", {name: "2 other registrations already carry this URL."}),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", {name: /^id 0x9/})).toHaveAttribute(
            "href",
            `/atom/${unlabelled}`,
        );
    });

    it("shows the look-up's failure and clears it when the URL is edited", async () => {
        actions.plan.mockRejectedValue(new Error("That is not a URL."));
        renderWithProviders(<ToolRegister />);
        fireEvent.change(screen.getByLabelText("Tool URL"), {target: {value: "nope"}});
        fireEvent.click(screen.getByRole("button", {name: "Look it up"}));

        expect(await screen.findByRole("alert")).toHaveTextContent("That is not a URL.");
        fireEvent.change(screen.getByLabelText("Tool URL"), {target: {value: "nope2"}});
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows a non-Error rejection as text", async () => {
        actions.plan.mockRejectedValue("offline");
        renderWithProviders(<ToolRegister />);
        fireEvent.change(screen.getByLabelText("Tool URL"), {target: {value: "x"}});
        fireEvent.click(screen.getByRole("button", {name: "Look it up"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    });

    it("drops the plan when the URL is edited after a look-up", async () => {
        actions.plan.mockResolvedValue(registration());
        renderWithProviders(<ToolRegister />);
        await lookUp();
        fireEvent.change(screen.getByLabelText("Tool URL"), {target: {value: "github.com/other"}});
        expect(screen.queryByText("Normalised URL")).toBeNull();
        expect(screen.queryByRole("button", {name: /^Register/})).toBeNull();
    });

    it("shows a refused signature and keeps the plan on screen", async () => {
        actions.plan.mockResolvedValue(registration());
        actions.submit.mockRejectedValue(new Error("User rejected the request."));
        renderWithProviders(<ToolRegister />);
        await lookUp();
        fireEvent.click(screen.getByRole("button", {name: /^Register — /}));

        expect(await screen.findByRole("alert")).toHaveTextContent("User rejected the request.");
        expect(screen.getByText("Normalised URL")).toBeInTheDocument();
    });

    it("asks for a wallet when none is connected", async () => {
        wallet.isConnected = false;
        actions.plan.mockResolvedValue(registration());
        renderWithProviders(<ToolRegister />);
        await lookUp();
        expect(
            screen.getByRole("button", {name: "Connect a wallet to register it"}),
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /^Register/})).toBeNull();
    });

    it("offers to switch a wallet on another chain, and says why a switch failed", async () => {
        wallet.chainId = 1;
        switchChainAsync.mockRejectedValue(new Error("User rejected the switch."));
        actions.plan.mockResolvedValue(registration());
        renderWithProviders(<ToolRegister />);
        await lookUp();

        expect(screen.getByText(/Your wallet is on chain 1\./)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: `Switch to ${TESTNET.chain.name}`}));
        expect(switchChainAsync).toHaveBeenCalledWith({chainId: 13579});
        expect(await screen.findByRole("alert")).toHaveTextContent("User rejected the switch.");
    });

    it("says the wallet chain is unknown when it reports none, and a string failure as text", async () => {
        wallet.chainId = undefined;
        switchChainAsync.mockRejectedValue("closed");
        actions.plan.mockResolvedValue(registration());
        renderWithProviders(<ToolRegister />);
        await lookUp();

        expect(screen.getByText(/Your wallet is on chain unknown\./)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: /^Switch to/}));
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("closed"));
    });
});
