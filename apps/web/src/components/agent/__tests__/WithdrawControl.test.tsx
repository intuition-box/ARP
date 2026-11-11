import {fireEvent, render, screen} from "@testing-library/react";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../../lib/chain-choice";
import type {RedeemQuote} from "../../../services/trust-stake";
import {WithdrawControl} from "../WithdrawControl";

/** The exit control: form, confirmation, receipt and the two failures, with the chain mocked. */
type Wallet = {
    address: string | undefined;
    isConnected: boolean;
    chainId: number | undefined;
    isSwitching: boolean;
};
const wallet = vi.hoisted(
    (): Wallet => ({
        address: "0x000000000000000000000000000000000000c0DE",
        isConnected: true,
        chainId: 13579,
        isSwitching: false,
    }),
);
const actions = vi.hoisted(() => ({
    quoteExit: vi.fn(),
    submitExit: vi.fn(),
    awaitReceipt: vi.fn(),
    switchChainAsync: vi.fn(),
}));

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => ({
        address: wallet.address,
        isConnected: wallet.isConnected,
        chainId: wallet.chainId,
    }),
    useSwitchChain: () => ({
        switchChainAsync: actions.switchChainAsync,
        isPending: wallet.isSwitching,
    }),
    useConnect: () => ({connectors: [], connect: vi.fn(), isPending: false, error: null}),
}));

vi.mock("../../../hooks/use-stake-actions", () => ({
    useStakeActions: () => ({
        quoteExit: actions.quoteExit,
        submitExit: actions.submitExit,
        awaitReceipt: actions.awaitReceipt,
    }),
}));

const TERM: Hex = `0x${"ab".repeat(32)}`;
const HASH: Hex = `0x${"ef".repeat(32)}`;
const ONE = 10n ** 18n;

function quote(isMainnet = false): RedeemQuote {
    const choice = choiceFor(isMainnet);
    return {
        termId: TERM,
        curveId: 1n,
        receiver: "0x000000000000000000000000000000000000c0DE",
        chain: {
            chain: choice.chain,
            chainId: choice.chainId,
            multiVault: choice.multiVault,
            symbol: choice.symbol,
            explorerUrl: choice.explorerUrl,
            isMainnet: choice.isMainnet,
            client: choice.client,
        },
        shares: ONE / 2n,
        assetsAfterFees: ONE / 4n,
        sharesUsed: ONE / 2n,
        maxShares: ONE,
        minAssets: 1n,
    };
}

function renderControl(
    props: Partial<Parameters<typeof WithdrawControl>[0]> = {},
    isMainnet = false,
) {
    const onSettled = vi.fn();
    const view = render(
        <ChainChoiceContext.Provider value={{choice: choiceFor(isMainnet), setMainnet: () => {}}}>
            <WithdrawControl
                termId={TERM}
                curveId={1n}
                heldShares={ONE}
                onSettled={onSettled}
                {...props}
            />
        </ChainChoiceContext.Provider>,
    );
    return {onSettled, ...view};
}

const sharesField = () => screen.getByLabelText("Shares to withdraw");

beforeEach(() => {
    wallet.address = "0x000000000000000000000000000000000000c0DE";
    wallet.isConnected = true;
    wallet.chainId = 13579;
    wallet.isSwitching = false;
    for (const fn of Object.values(actions)) fn.mockReset();
});

describe("WithdrawControl", () => {
    it("renders nothing when nothing is held", () => {
        const {container} = renderControl({heldShares: null});
        expect(container).toBeEmptyDOMElement();
        const zero = renderControl({heldShares: 0n});
        expect(zero.container).toBeEmptyDOMElement();
    });

    it("shows the holding, and fills the exact amount on All of it", () => {
        renderControl({headingLevel: "h3"});
        expect(screen.getByRole("heading", {level: 3, name: "Withdraw"})).toBeVisible();
        expect(screen.getByText(/Your support here: supporting/)).toBeInTheDocument();
        expect(screen.getByText("Shares held: 1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "All of it"}));
        expect(sharesField()).toHaveValue("1");
        expect(screen.getByRole("button", {name: "Review"})).toBeEnabled();
    });

    it("explains each refused amount", () => {
        renderControl();
        fireEvent.change(sharesField(), {target: {value: "abc"}});
        expect(screen.getByText("Not a number.")).toBeVisible();
        expect(sharesField()).toHaveAccessibleDescription("Not a number.");
        fireEvent.change(sharesField(), {target: {value: "0"}});
        expect(screen.getByText("Enter a number greater than zero.")).toBeVisible();
        fireEvent.change(sharesField(), {target: {value: "2"}});
        expect(screen.getByText("More than you hold (1 shares).")).toBeVisible();
        expect(screen.getByRole("button", {name: "Review"})).toBeDisabled();
    });

    it("keeps review closed without a curve", () => {
        renderControl({curveId: undefined});
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        expect(screen.getByRole("button", {name: "Review"})).toBeDisabled();
    });

    it("asks for a wallet when none is connected", () => {
        wallet.isConnected = false;
        renderControl();
        expect(screen.getByRole("button", {name: "Connect a wallet to withdraw"})).toBeVisible();
    });

    it("offers the switch on the wrong chain and reports a refused switch", async () => {
        wallet.chainId = undefined;
        actions.switchChainAsync.mockRejectedValueOnce("refused");
        renderControl();
        expect(screen.getByText(/Your wallet is on chain/)).toHaveTextContent(
            "Your wallet is on chain unknown. This withdrawal happens on Intuition Testnet (13579).",
        );
        fireEvent.click(screen.getByRole("button", {name: "Switch to Intuition Testnet"}));
        expect(actions.switchChainAsync).toHaveBeenCalledWith({chainId: 13579});
        expect(await screen.findByRole("alert")).toHaveTextContent("refused");
    });

    it("reports a failed quote and goes back to the form", async () => {
        actions.quoteExit.mockRejectedValueOnce(new Error("preview reverted"));
        renderControl();
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("preview reverted");
        expect(screen.queryByText(/The transaction went out/)).toBeNull();
        expect(actions.quoteExit).toHaveBeenCalledWith(
            expect.objectContaining({termId: TERM, curveId: 1n, shares: ONE / 2n}),
        );
        fireEvent.click(screen.getByRole("button", {name: "Back"}));
        expect(sharesField()).toBeInTheDocument();
    });

    it("shows Pricing… while the quote is out", async () => {
        actions.quoteExit.mockReturnValueOnce(new Promise(() => {}));
        renderControl();
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        expect(await screen.findByRole("button", {name: "Pricing…"})).toBeDisabled();
    });

    it("confirms, signs, waits, and settles", async () => {
        actions.quoteExit.mockResolvedValueOnce(quote());
        actions.submitExit.mockResolvedValueOnce(HASH);
        let land: () => void = () => {};
        actions.awaitReceipt.mockReturnValueOnce(
            new Promise<void>((resolve) => {
                land = resolve;
            }),
        );
        const {onSettled} = renderControl();
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));

        expect(await screen.findByText(/You are about to withdraw/)).toHaveTextContent(
            "You are about to withdraw and receive 0.25 tTRUST, after fees.",
        );
        expect(screen.getByText("Test tTRUST on Intuition Testnet.")).toBeVisible();
        expect(screen.getByText("Shares burned: 0.5")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Withdraw"}));
        expect(await screen.findByText("Submitted — waiting for the receipt")).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("Nothing above has been updated yet");
        expect(screen.getByRole("link", {name: "Transaction →"})).toHaveAttribute(
            "href",
            `${choiceFor(false).explorerUrl}/tx/${HASH}`,
        );
        land();
        expect(await screen.findByText("Withdrawn")).toBeVisible();
        expect(onSettled).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole("button", {name: "Done"}));
        expect(sharesField()).toHaveValue("");
    });

    it("names a real chain on mainnet, waits for the wallet, and cancels", async () => {
        wallet.chainId = 1155;
        actions.quoteExit.mockResolvedValueOnce(quote(true));
        renderControl({}, true);
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        expect(await screen.findByText(/Real TRUST, Intuition/)).toBeVisible();
        fireEvent.click(screen.getByRole("button", {name: "Cancel"}));
        expect(sharesField()).toBeInTheDocument();
    });

    it("disables both buttons while the wallet is open", async () => {
        actions.quoteExit.mockResolvedValueOnce(quote());
        actions.submitExit.mockReturnValueOnce(new Promise(() => {}));
        renderControl();
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        fireEvent.click(await screen.findByRole("button", {name: "Withdraw"}));
        expect(
            await screen.findByRole("button", {name: "Waiting for your wallet…"}),
        ).toBeDisabled();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
    });

    it("says nothing went out when signing fails", async () => {
        actions.quoteExit.mockResolvedValueOnce(quote());
        actions.submitExit.mockRejectedValueOnce(new Error("User denied"));
        renderControl();
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        fireEvent.click(await screen.findByRole("button", {name: "Withdraw"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("User denied");
        expect(screen.queryByText(/The transaction went out/)).toBeNull();
    });

    it("links the transaction when the receipt is lost after broadcast", async () => {
        actions.quoteExit.mockResolvedValueOnce(quote());
        actions.submitExit.mockResolvedValueOnce(HASH);
        actions.awaitReceipt.mockRejectedValueOnce(new Error("timeout"));
        const {onSettled} = renderControl();
        fireEvent.change(sharesField(), {target: {value: "0.5"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        fireEvent.click(await screen.findByRole("button", {name: "Withdraw"}));
        expect(await screen.findByText(/The transaction went out/)).toBeVisible();
        expect(screen.getByRole("link", {name: "Transaction →"})).toHaveAttribute(
            "href",
            `${choiceFor(false).explorerUrl}/tx/${HASH}`,
        );
        expect(onSettled).not.toHaveBeenCalled();
    });
});
