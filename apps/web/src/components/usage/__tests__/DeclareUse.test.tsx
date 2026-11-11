import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router-dom";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../../lib/chain-choice";
import {DeclareUseGuardError, type DeclaredUse} from "../../../services/declare-use";

/**
 * The declare control, driven through its hook (`useDeclareUse`) and a mocked wallet. What is
 * asserted is what the operator reads: the refusal headline and its rows, the five cost rows, the
 * switch when the wallet is elsewhere, and the receipt after the write.
 */
const OWNER = "0x000000000000000000000000000000000000c0DE";
const OBJECT: Hex = `0x${"ab".repeat(32)}`;
const TX: Hex = `0x${"12".repeat(32)}`;

const wallet = {address: OWNER as string | undefined, isConnected: true, chainId: 13579 as number};
const switchChainAsync = vi.fn<(args: {chainId: number}) => Promise<void>>();
let switching = false;
const plan = vi.fn<(args: unknown) => Promise<DeclaredUse>>();
const submit = vi.fn<(plan: DeclaredUse) => Promise<Hex>>();
const connect = vi.fn();

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => wallet,
    useSwitchChain: () => ({switchChainAsync, isPending: switching}),
    useConnect: () => ({connectors: [], connect, isPending: false, error: null}),
}));

vi.mock("../../../hooks/use-declare-use", () => ({
    useDeclareUse: () => ({plan, submit}),
}));

import {DeclareUse} from "../DeclareUse";

function aPlan(overrides: Partial<DeclaredUse> = {}): DeclaredUse {
    return {
        // Only the fields the screen reads matter; the chain is the testnet stake chain.
        chain: {} as DeclaredUse["chain"],
        agent: {chainId: 8453, tokenId: "1380"},
        subject: `0x${"cd".repeat(32)}` as DeclaredUse["subject"], // A term id, as the planner returns.
        object: OBJECT,
        tripleId: `0x${"ef".repeat(32)}`,
        exists: false,
        calls: [],
        totalValue: 2_000_000_000_000_000n,
        creationFee: 1_000_000_000_000_000n,
        feeAssets: 1_100_000_000_000_000n,
        assetsAfterFees: 900_000_000_000_000n,
        shares: 900_000_000_000_000n,
        ...overrides,
    } as DeclaredUse; // Fields the screen never reads are left at their type's default.
}

const setMainnet = vi.fn();

function renderIt(isMainnet = false, onDeclared?: () => void): void {
    const wrap = ({children}: {children: ReactNode}) => (
        <MemoryRouter>
            <ChainChoiceContext.Provider value={{choice: choiceFor(isMainnet), setMainnet}}>
                {children}
            </ChainChoiceContext.Provider>
        </MemoryRouter>
    );
    render(<DeclareUse object={OBJECT} objectLabel="hyperframes" onDeclared={onDeclared} />, {
        wrapper: wrap,
    });
}

function lookUp(value: string): void {
    fireEvent.change(screen.getByLabelText("Your agent"), {target: {value}});
    fireEvent.click(screen.getByRole("button", {name: "Check it"}));
}

beforeEach(() => {
    wallet.address = OWNER;
    wallet.isConnected = true;
    wallet.chainId = 13579;
    switching = false;
    plan.mockReset();
    submit.mockReset();
    switchChainAsync.mockReset();
    setMainnet.mockReset();
});

describe("DeclareUse", () => {
    it("on mainnet offers only the switch back to testnet", () => {
        renderIt(true);
        expect(screen.getByText("Declaring a use · not on Mainnet")).toBeInTheDocument();
        expect(screen.queryByLabelText("Your agent")).toBeNull();
        fireEvent.click(screen.getByRole("button", {name: "Switch to testnet"}));
        expect(setMainnet).toHaveBeenCalledWith(false);
    });

    it("without a wallet asks for one and keeps the check disabled", () => {
        wallet.isConnected = false;
        wallet.address = undefined;
        renderIt();
        expect(
            screen.getByRole("button", {name: "Connect the wallet that owns the agent"}),
        ).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Your agent"), {target: {value: "8453/1"}});
        expect(screen.getByRole("button", {name: "Check it"})).toBeDisabled();
    });

    it("refuses a reference that is not chain/token, without asking the chain", async () => {
        renderIt();
        lookUp("1380");
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "That is not an agent reference",
        );
        expect(plan).not.toHaveBeenCalled();
    });

    it("lays a guard's detail out as rows", async () => {
        plan.mockRejectedValue(
            new DeclareUseGuardError("not-the-owner", "long prose", [
                {label: "Owner", value: "0xowner"},
                {label: "Connected", value: "0xyou"},
            ]),
        );
        renderIt();
        lookUp("8453/1380");
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("Not your agent");
        expect(alert).toHaveTextContent("Owner");
        expect(alert).toHaveTextContent("0xowner");
        expect(alert).not.toHaveTextContent("long prose");
        expect(plan).toHaveBeenCalledWith({
            agent: {chainId: 8453, tokenId: "1380"},
            connected: OWNER,
            object: OBJECT,
        });
    });

    it("prints the message of an error that is not a guard", async () => {
        plan.mockRejectedValue("rpc timed out");
        renderIt();
        lookUp("8453/1380");
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("The check failed");
        expect(alert).toHaveTextContent("rpc timed out");
    });

    it("says when the claim already stands, with nothing to sign", async () => {
        plan.mockResolvedValue(aPlan({exists: true}));
        renderIt();
        lookUp("8453/1380");
        expect(
            await screen.findByText("This agent has already declared using this."),
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /Declare —/})).toBeNull();
    });

    it("shows the cost, declares, and links the transaction", async () => {
        const onDeclared = vi.fn();
        plan.mockResolvedValue(aPlan());
        submit.mockResolvedValue(TX);
        renderIt(false, onDeclared);
        lookUp("8453/1380");
        expect(await screen.findByText("You send")).toBeInTheDocument();
        expect(screen.getByText("hyperframes")).toBeInTheDocument();
        expect(screen.getByText("Creation fee")).toBeInTheDocument();
        expect(screen.getByText("Your support")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: `0x${"cd".repeat(32)}`})).toHaveAttribute(
            "href",
            `/atom/0x${"cd".repeat(32)}`,
        );
        fireEvent.click(screen.getByRole("button", {name: /Declare — .* tTRUST/}));
        expect(await screen.findByText("Declared.")).toBeInTheDocument();
        expect(onDeclared).toHaveBeenCalledTimes(1);
        const txLink = screen.getByRole("link", {name: /0x1212/});
        expect(txLink.getAttribute("href")).toMatch(new RegExp(`/tx/${TX}$`));
    });

    it("says why a write failed and keeps the plan on screen", async () => {
        plan.mockResolvedValue(aPlan());
        submit.mockRejectedValue(new Error("user rejected"));
        renderIt();
        lookUp("8453/1380");
        fireEvent.click(await screen.findByRole("button", {name: /Declare —/}));
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("The check failed");
        expect(alert).toHaveTextContent("user rejected");
        expect(screen.getByText("You send")).toBeInTheDocument();
    });

    it("editing the field drops a plan already shown", async () => {
        plan.mockResolvedValue(aPlan());
        renderIt();
        lookUp("8453/1380");
        expect(await screen.findByText("You send")).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Your agent"), {target: {value: "8453/1"}});
        expect(screen.queryByText("You send")).toBeNull();
    });

    it("on another chain offers the switch and says when it is refused", async () => {
        wallet.chainId = 1;
        plan.mockResolvedValue(aPlan());
        switchChainAsync.mockRejectedValueOnce(new Error("dismissed"));
        renderIt();
        lookUp("8453/1380");
        expect(await screen.findByText(/Your wallet is on chain 1\./)).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /Declare —/})).toBeNull();
        fireEvent.click(screen.getByRole("button", {name: /Switch to/}));
        expect(await screen.findByRole("alert")).toHaveTextContent("dismissed");
        expect(switchChainAsync).toHaveBeenCalledWith({chainId: 13579});

        switchChainAsync.mockRejectedValueOnce("plain refusal");
        fireEvent.click(screen.getByRole("button", {name: /Switch to/}));
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("plain refusal"));
    });

    it("names an unknown wallet chain and disables the switch while it runs", async () => {
        wallet.chainId = undefined as unknown as number; // A wallet that reports no chain.
        switching = true;
        plan.mockResolvedValue(aPlan());
        renderIt();
        lookUp("8453/1380");
        expect(await screen.findByText(/on chain unknown/)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Switching…"})).toBeDisabled();
    });
});
