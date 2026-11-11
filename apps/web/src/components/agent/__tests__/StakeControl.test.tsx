import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../../lib/chain-choice";
import type {StakeQuote, StakeSession} from "../../../services/trust-stake";
import {StakeControl, type StakeClaim} from "../StakeControl";

/**
 * The stake control's three steps — choose, review, sign — with wagmi and the stake actions mocked
 * at their module boundary. The wallet is a mutable object so each test sets where it stands.
 */
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
    quote: vi.fn(),
    submit: vi.fn(),
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
        quote: actions.quote,
        submit: actions.submit,
        awaitReceipt: actions.awaitReceipt,
    }),
}));

const TESTNET = choiceFor(false);
const MAINNET = choiceFor(true);
const TRIPLE: Hex = `0x${"ab".repeat(32)}`;
const ATOM: Hex = `0x${"cd".repeat(32)}`;
const HASH: Hex = `0x${"ef".repeat(32)}`;
const SESSION: StakeSession = {curveId: 1n, minDeposit: 10n ** 15n, minShare: 1n};

const TRIPLE_CLAIM: StakeClaim = {
    target: {kind: "triple", tripleId: TRIPLE},
    predicate: "uses hyperframes",
    subject: "agent 7",
    heading: "Support this declaration",
    blurb: "One line above the form.",
    market: {support: {positionCount: 3}, opposition: {positionCount: 0}},
};
const ATOM_CLAIM: StakeClaim = {
    target: {kind: "atom", atomId: ATOM},
    subject: "8453:42",
    subjectIsId: true,
    heading: "Support this agent",
    market: null,
};

function quoteFor(claim: StakeClaim, side: "support" | "oppose", isMainnet = false): StakeQuote {
    const choice = isMainnet ? MAINNET : TESTNET;
    return {
        side,
        target: claim.target,
        termId: TRIPLE,
        curveId: 1n,
        receiver: "0x000000000000000000000000000000000000c0DE",
        assets: 5n * 10n ** 16n,
        expectedShares: 4n * 10n ** 16n,
        assetsAfterFees: 45n * 10n ** 15n,
        feeAssets: 5n * 10n ** 15n,
        minShares: 39n * 10n ** 15n,
        vault: {
            termId: TRIPLE,
            curveId: 1n,
            totalAssets: 0n,
            totalShares: 0n,
            sharePrice: 0n,
            shares: null,
        },
        chain: {
            chain: choice.chain,
            chainId: choice.chainId,
            multiVault: choice.multiVault,
            symbol: choice.symbol,
            explorerUrl: choice.explorerUrl,
            isMainnet: choice.isMainnet,
            client: choice.client,
        },
    };
}

function onChain(children: ReactNode, isMainnet = false) {
    return (
        <ChainChoiceContext.Provider value={{choice: choiceFor(isMainnet), setMainnet: () => {}}}>
            {children}
        </ChainChoiceContext.Provider>
    );
}

function renderControl(
    props: Partial<Parameters<typeof StakeControl>[0]> & {claim: StakeClaim},
    isMainnet = false,
) {
    const onSettled = vi.fn();
    const onInFlightChange = vi.fn();
    render(
        onChain(
            <StakeControl
                session={SESSION}
                sessionError={null}
                onSettled={onSettled}
                onInFlightChange={onInFlightChange}
                {...props}
            />,
            isMainnet,
        ),
    );
    return {onSettled, onInFlightChange};
}

const amountField = () => screen.getByLabelText("Amount (tTRUST)");
const review = () => screen.getByRole("button", {name: "Review this support"});

beforeEach(() => {
    wallet.address = "0x000000000000000000000000000000000000c0DE";
    wallet.isConnected = true;
    wallet.chainId = 13579;
    wallet.isSwitching = false;
    actions.quote.mockReset();
    actions.submit.mockReset();
    actions.awaitReceipt.mockReset();
    actions.switchChainAsync.mockReset();
});

describe("StakeControl before the form", () => {
    it("asks for a wallet when none is connected", () => {
        wallet.isConnected = false;
        renderControl({claim: TRIPLE_CLAIM, headingLevel: "h2"});
        expect(
            screen.getByRole("heading", {level: 2, name: "Support this declaration"}),
        ).toBeVisible();
        expect(screen.getByText("One line above the form.")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Connect a wallet to add support"})).toBeVisible();
    });

    it("stays closed while the minimum cannot be read, and says why", () => {
        renderControl({claim: ATOM_CLAIM, sessionError: new Error("rpc down")});
        expect(screen.getByText(/The minimum amount could not be read \(rpc down\)/)).toBeVisible();
        expect(screen.queryByRole("button", {name: "Review this support"})).toBeNull();
    });

    it("says it is reading the minimum while the session is pending", () => {
        renderControl({claim: ATOM_CLAIM, session: undefined});
        expect(screen.getByText("Reading the minimum amount…")).toBeVisible();
    });

    it("offers the switch on the wrong chain and reports a refused switch", async () => {
        wallet.chainId = 1;
        actions.switchChainAsync.mockRejectedValueOnce(new Error("User rejected"));
        renderControl({claim: TRIPLE_CLAIM});
        expect(screen.getByText(/Your wallet is on chain/)).toHaveTextContent(
            "Your wallet is on chain 1. This support goes to Intuition Testnet (13579).",
        );
        fireEvent.click(screen.getByRole("button", {name: "Switch to Intuition Testnet"}));
        expect(actions.switchChainAsync).toHaveBeenCalledWith({chainId: 13579});
        expect(await screen.findByText("User rejected")).toBeVisible();
    });

    it("names an unknown chain and says it waits for the switch", () => {
        wallet.chainId = undefined;
        wallet.isSwitching = true;
        renderControl({claim: TRIPLE_CLAIM});
        expect(screen.getByText(/Your wallet is on chain/)).toHaveTextContent("chain unknown");
        expect(screen.getByRole("status")).toHaveTextContent(
            "Waiting for your wallet to confirm the network switch.",
        );
        expect(screen.getByRole("button", {name: "Switch to Intuition Testnet"})).toBeDisabled();
    });

    it("reports a thrown non-Error from the switch as text", async () => {
        wallet.chainId = 1;
        actions.switchChainAsync.mockRejectedValueOnce("plain refusal");
        renderControl({claim: TRIPLE_CLAIM});
        fireEvent.click(screen.getByRole("button", {name: "Switch to Intuition Testnet"}));
        expect(await screen.findByText("plain refusal")).toBeVisible();
    });
});

describe("StakeControl's form", () => {
    it("needs a side and a valid amount before review opens on a triple", () => {
        renderControl({claim: TRIPLE_CLAIM});
        expect(screen.getByRole("radio", {name: /Support/})).not.toBeChecked();
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        expect(review()).toBeDisabled();
        fireEvent.click(screen.getByRole("radio", {name: /Oppose/}));
        expect(review()).toBeEnabled();
    });

    it("explains an amount it refuses, and says nothing for an empty field", () => {
        renderControl({claim: ATOM_CLAIM});
        expect(screen.queryByRole("radio")).toBeNull();
        fireEvent.change(amountField(), {target: {value: "abc"}});
        expect(screen.getByText("Enter an amount in tTRUST, for example 0.05.")).toBeVisible();
        fireEvent.change(amountField(), {target: {value: "0.0001"}});
        expect(screen.getByText("The minimum support is 0.001 tTRUST.")).toBeVisible();
        expect(review()).toBeDisabled();
    });

    it("reports a failed quote with nothing sent and goes back to the form", async () => {
        actions.quote.mockRejectedValueOnce(new Error("preview reverted"));
        renderControl({claim: ATOM_CLAIM});
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());
        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Nothing was sent. preview reverted",
        );
        expect(actions.quote).toHaveBeenCalledWith(
            expect.objectContaining({side: "support", assets: 5n * 10n ** 16n, session: SESSION}),
        );
        fireEvent.click(screen.getByRole("button", {name: "Back"}));
        expect(review()).toBeInTheDocument();
    });

    it("shows Pricing… while the quote is out", async () => {
        actions.quote.mockReturnValueOnce(new Promise(() => {}));
        renderControl({claim: ATOM_CLAIM});
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());
        expect(await screen.findByRole("button", {name: "Pricing…"})).toBeDisabled();
    });
});

describe("StakeControl's confirmation and receipt", () => {
    it("restates an opposing triple claim, signs once, and settles", async () => {
        actions.quote.mockResolvedValueOnce(quoteFor(TRIPLE_CLAIM, "oppose"));
        actions.submit.mockResolvedValueOnce(HASH);
        actions.awaitReceipt.mockResolvedValueOnce(undefined);
        const {onSettled, onInFlightChange} = renderControl({claim: TRIPLE_CLAIM});
        fireEvent.click(screen.getByRole("radio", {name: /Oppose/}));
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());

        expect(await screen.findByText("Confirm before your wallet opens")).toBeVisible();
        expect(screen.getByText(/You are about to put/)).toHaveTextContent(
            "You are about to put 0.05 tTRUST against the declaration that agent 7 uses hyperframes.",
        );
        expect(
            screen.getByText("Test tTRUST on Intuition Testnet. Not recoverable by this panel."),
        ).toBeVisible();
        expect(screen.getByText("none — you would be the first")).toBeInTheDocument();
        expect(screen.getByText("0.045 tTRUST of 0.05")).toBeInTheDocument();
        expect(screen.getByText("(1% slippage floor)", {exact: false})).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Sign in wallet"}));
        expect(await screen.findByText("Supported")).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("against this declaration.");
        expect(screen.getByRole("link", {name: /↗/})).toHaveAttribute(
            "href",
            `${TESTNET.explorerUrl}/tx/${HASH}`,
        );
        expect(actions.submit).toHaveBeenCalledTimes(1);
        expect(onInFlightChange.mock.calls).toEqual([[true], [false]]);
        expect(onSettled).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole("button", {name: "Support again"}));
        expect(amountField()).toHaveValue("");
        expect(screen.getByRole("radio", {name: /Oppose/})).not.toBeChecked();
    });

    it("says the support counts, waits for the receipt, and names a real chain on mainnet", async () => {
        actions.quote.mockResolvedValueOnce(quoteFor(TRIPLE_CLAIM, "support", true));
        actions.submit.mockResolvedValueOnce(HASH);
        actions.awaitReceipt.mockReturnValueOnce(new Promise(() => {}));
        wallet.chainId = 1155;
        renderControl({claim: TRIPLE_CLAIM}, true);
        fireEvent.click(screen.getByRole("radio", {name: /Support/}));
        fireEvent.change(screen.getByLabelText("Amount (TRUST)"), {target: {value: "0.05"}});
        fireEvent.click(review());

        expect(await screen.findByText(/Real TRUST, Intuition/)).toBeVisible();
        expect(screen.getByText(/You are about to put/)).toHaveTextContent(
            "behind the declaration",
        );
        expect(screen.getByText("3")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Sign in wallet"}));
        expect(await screen.findByText("Submitted — waiting for the receipt")).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent(
            "in support of this declaration. Nothing above has been updated yet",
        );
        expect(screen.queryByRole("button", {name: "Support again"})).toBeNull();
    });

    it("waits for the wallet with both buttons disabled while signing", async () => {
        actions.quote.mockResolvedValueOnce(quoteFor(ATOM_CLAIM, "support"));
        actions.submit.mockReturnValueOnce(new Promise(() => {}));
        renderControl({claim: ATOM_CLAIM});
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());
        fireEvent.click(await screen.findByRole("button", {name: "Sign in wallet"}));
        expect(await screen.findByRole("status")).toHaveTextContent(
            "Waiting for your wallet. Nothing has been sent until you sign.",
        );
        expect(screen.getByRole("button", {name: "Sign in wallet"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
    });

    it("restates an atom target as support you can withdraw, and cancels back to the form", async () => {
        actions.quote.mockResolvedValueOnce(quoteFor(ATOM_CLAIM, "support"));
        renderControl({claim: ATOM_CLAIM});
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());
        expect(await screen.findByText(/You are about to put/)).toHaveTextContent(
            "behind 8453:42. Nothing here can contradict it",
        );
        expect(screen.getByText("not reported")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Cancel"}));
        expect(review()).toBeInTheDocument();
    });

    it("goes back to the confirmation when signing fails before anything was sent", async () => {
        actions.quote.mockResolvedValueOnce(quoteFor(ATOM_CLAIM, "support"));
        actions.submit.mockRejectedValueOnce(new Error("User denied"));
        const {onInFlightChange, onSettled} = renderControl({claim: ATOM_CLAIM});
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());
        fireEvent.click(await screen.findByRole("button", {name: "Sign in wallet"}));
        expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was sent. User denied");
        expect(onInFlightChange.mock.calls).toEqual([[true], [false]]);
        expect(onSettled).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Back"}));
        expect(screen.getByText("Confirm before your wallet opens")).toBeVisible();
    });

    it("warns not to sign again when the receipt is lost after broadcast", async () => {
        actions.quote.mockResolvedValueOnce(quoteFor(ATOM_CLAIM, "support"));
        actions.submit.mockResolvedValueOnce(HASH);
        actions.awaitReceipt.mockRejectedValueOnce(new Error("timeout"));
        renderControl({claim: ATOM_CLAIM});
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());
        fireEvent.click(await screen.findByRole("button", {name: "Sign in wallet"}));
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(
            "it may still land. Do not sign it again without checking. timeout",
        );
        expect(screen.getByRole("link", {name: /↗/})).toHaveAttribute(
            "href",
            `${TESTNET.explorerUrl}/tx/${HASH}`,
        );
        fireEvent.click(screen.getByRole("button", {name: "Back"}));
        await waitFor(() => expect(review()).toBeInTheDocument());
    });

    it("says an atom's support is in support of this agent", async () => {
        actions.quote.mockResolvedValueOnce(quoteFor(ATOM_CLAIM, "support"));
        actions.submit.mockResolvedValueOnce(HASH);
        actions.awaitReceipt.mockResolvedValueOnce(undefined);
        renderControl({claim: {...ATOM_CLAIM, subjectIsId: false}, onInFlightChange: undefined});
        fireEvent.change(amountField(), {target: {value: "0.05"}});
        fireEvent.click(review());
        fireEvent.click(await screen.findByRole("button", {name: "Sign in wallet"}));
        expect(await screen.findByText("Supported")).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("in support of this agent.");
    });
});
