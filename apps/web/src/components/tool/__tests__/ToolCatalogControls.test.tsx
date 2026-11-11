import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {TOOL_CURVES} from "../../../services/tool-catalog";
import {CurveControl, Segmented} from "../ToolCatalogControls";

/** The curve choice: one pressed button per market, named by its group's label. */
describe("CurveControl", () => {
    it("presses the curve being read and reports the one chosen", () => {
        const onChange = vi.fn();
        const [first, second] = TOOL_CURVES;
        if (first === undefined || second === undefined) throw new Error("two curves expected");
        render(<CurveControl curveId={first.id} onChange={onChange} />);
        const group = screen.getByRole("group", {name: "Pricing"});
        expect(group).toBeInTheDocument();
        expect(screen.getByRole("button", {name: first.label})).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        const other = screen.getByRole("button", {name: second.label});
        expect(other).toHaveAttribute("aria-pressed", "false");
        expect(other).toHaveAttribute("title", second.curve);
        fireEvent.click(other);
        expect(onChange).toHaveBeenCalledWith(second.id);
    });
});

describe("Segmented", () => {
    it("leaves the title off an option that has none, and two groups keep their own names", () => {
        render(
            <>
                <Segmented
                    label="Sort"
                    options={[{id: "a", label: "A"}]}
                    selected="a"
                    onChange={vi.fn()}
                />
                <Segmented
                    label="Order"
                    options={[{id: 1, label: "One"}]}
                    selected={2}
                    onChange={vi.fn()}
                />
            </>,
        );
        expect(screen.getByRole("button", {name: "A"})).not.toHaveAttribute("title");
        expect(screen.getByRole("group", {name: "Sort"})).toBeInTheDocument();
        expect(screen.getByRole("group", {name: "Order"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "One"})).toHaveAttribute("aria-pressed", "false");
    });
});
