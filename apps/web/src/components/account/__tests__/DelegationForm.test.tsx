import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {DelegationForm} from "../DelegationForm";

/**
 * The caveat form: two steps, nothing signed by the click that filled it, and the confirmation
 * names the chain, the cap, the window and the checksummed delegate the signature is for.
 */
const LOWER = "0x52908400098527886e0f7030069857d2e4169ee7";
const CHECKSUMMED = "0x52908400098527886E0F7030069857D2E4169EE7";

function renderForm(props: {suggested?: string | null; pending?: boolean} = {}) {
    const onSign = vi.fn();
    render(
        <DelegationForm
            suggestedDelegate={props.suggested ?? null}
            chainName="Intuition Testnet"
            chainId={13579}
            symbol="tTRUST"
            pending={props.pending ?? false}
            onSign={onSign}
        />,
    );
    return onSign;
}

describe("DelegationForm", () => {
    it("refuses a delegate that is not an address", () => {
        const onSign = renderForm();
        fireEvent.change(screen.getByLabelText("Agent address"), {target: {value: "bob"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        expect(screen.getByRole("alert")).toHaveTextContent("Enter a 0x address");
        expect(onSign).not.toHaveBeenCalled();
    });

    it("refuses a cap that is not an amount, and a zero cap", () => {
        renderForm({suggested: LOWER});
        const cap = screen.getByLabelText("Cap per period (tTRUST)");
        fireEvent.change(cap, {target: {value: "lots"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        expect(screen.getByRole("alert")).toHaveTextContent("Cap must be a tTRUST amount");
        fireEvent.change(cap, {target: {value: "0"}});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        expect(screen.getByRole("alert")).toHaveTextContent("Cap must be above 0");
    });

    it("reviews, then signs exactly what the summary says", () => {
        const onSign = renderForm({suggested: LOWER});
        expect(screen.getByLabelText("Agent address")).toHaveValue(LOWER);
        fireEvent.change(screen.getByLabelText("Cap per period (tTRUST)"), {
            target: {value: "2.5"},
        });
        fireEvent.click(screen.getByLabelText("7d"));
        expect(screen.getByLabelText("7d")).toBeChecked();
        fireEvent.click(screen.getByRole("button", {name: "Review"}));

        expect(
            screen
                .getByText(/Sign on Intuition Testnet \(13579\):/)
                .textContent?.replace(/\s+/g, " "),
        ).toBe(`Sign on Intuition Testnet (13579): 2.5 tTRUST per 7d to ${CHECKSUMMED}.`);
        const sign = screen.getByRole("button", {name: "Sign in wallet"});
        expect(sign).toHaveFocus();
        fireEvent.click(sign);
        expect(onSign).toHaveBeenCalledWith({
            delegate: CHECKSUMMED,
            cap: 2_500_000_000_000_000_000n,
            periodSeconds: 604_800n,
        });
    });

    it("Back returns to the form with focus on Review", () => {
        renderForm({suggested: LOWER});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        fireEvent.click(screen.getByRole("button", {name: "Back"}));
        expect(screen.getByRole("button", {name: "Review"})).toHaveFocus();
        expect(screen.getByLabelText("1d")).toBeChecked();
    });

    it("while the wallet is open both buttons wait", () => {
        renderForm({suggested: LOWER, pending: true});
        fireEvent.click(screen.getByRole("button", {name: "Review"}));
        expect(screen.getByRole("button", {name: "Signing…"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Back"})).toBeDisabled();
    });
});
