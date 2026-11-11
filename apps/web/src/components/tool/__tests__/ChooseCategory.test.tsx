import {fireEvent, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import type {ProposeCategoryResult} from "../../../services/propose-category";

/**
 * Filing a skill under a category: hidden without a sponsor, nothing sent without a choice, and
 * the answer said in the live line.
 */
const proposal: {available: boolean; pending: boolean; result: ProposeCategoryResult | null} = {
    available: true,
    pending: false,
    result: null,
};
const submit = vi.fn();
let treeError: Error | null = null;

vi.mock("../../../hooks/use-propose-category", () => ({
    useProposeCategory: () => ({...proposal, submit}),
}));
vi.mock("../../../hooks/use-domain-tree", () => ({
    useDomainTree: () => ({
        tree: undefined,
        options: [
            {label: "video", depth: 1},
            {label: "design", depth: 1},
        ],
        error: treeError,
    }),
}));

import {ChooseCategory} from "../ChooseCategory";

beforeEach(() => {
    proposal.available = true;
    proposal.pending = false;
    proposal.result = null;
    treeError = null;
    submit.mockReset();
});

describe("ChooseCategory", () => {
    it("is absent when no sponsor can file it", () => {
        proposal.available = false;
        const {container} = render(<ChooseCategory subjectId="0xskill" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("sends nothing until a category is chosen, then files the one chosen", () => {
        render(<ChooseCategory subjectId="0xskill" />);
        const file = screen.getByRole("button", {name: "File it"});
        expect(file).toBeDisabled();
        fireEvent.submit(file.closest("form") as HTMLFormElement); // The form the button submits.
        expect(submit).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText("Category"), {target: {value: "video"}});
        fireEvent.click(screen.getByRole("button", {name: "File it"}));
        expect(submit).toHaveBeenCalledWith({label: "video", subjectId: "0xskill"});
    });

    it("sends nothing a second time while one is being filed", () => {
        proposal.pending = true;
        render(<ChooseCategory subjectId="0xskill" />);
        fireEvent.change(screen.getByLabelText("Category"), {target: {value: "design"}});
        fireEvent.submit(
            screen.getByRole("button", {name: "File it"}).closest("form") as HTMLFormElement,
        ); // As above.
        expect(submit).not.toHaveBeenCalled();
        expect(screen.getByText("Filing…")).toBeInTheDocument();
    });

    it("says the answer, or that the categories could not be read", () => {
        proposal.result = {status: "done", label: "video", newCategory: false, created: true};
        const {unmount} = render(<ChooseCategory subjectId="0xskill" />);
        expect(screen.getByText("Filed under “video”.")).toBeInTheDocument();
        unmount();
        proposal.result = null;
        treeError = new Error("graph down");
        render(<ChooseCategory subjectId="0xskill" />);
        expect(screen.getByText("The categories could not be read.")).toBeInTheDocument();
    });
});
