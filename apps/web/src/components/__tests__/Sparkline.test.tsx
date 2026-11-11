import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Sparkline} from "../Sparkline";

/** The line's accessible summary is the reader's whole access to its shape. */
const describeIt = (value: bigint) => `${value} T`;

describe("Sparkline", () => {
    it("draws nothing from a single point", () => {
        const {container} = render(
            <Sparkline points={[{label: "a", value: 1n}]} describe={describeIt} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("says the line went up, with both ends labelled", () => {
        render(
            <Sparkline
                points={[
                    {label: "mon", value: 1n},
                    {label: "tue", value: 5n},
                    {label: "wed", value: 9n},
                ]}
                describe={describeIt}
            />,
        );
        expect(
            screen.getByRole("img", {name: "9 T on wed, up from 1 T on mon, over 3 points."}),
        ).toBeInTheDocument();
        expect(screen.getByText("mon")).toBeInTheDocument();
        expect(screen.getByText("wed")).toBeInTheDocument();
    });

    it("says down and flat, and sits a flat line on the midline", () => {
        const {unmount} = render(
            <Sparkline
                points={[
                    {label: "a", value: 9n},
                    {label: "b", value: 2n},
                ]}
                describe={describeIt}
            />,
        );
        expect(screen.getByRole("img", {name: /, down from /})).toBeInTheDocument();
        unmount();
        const {container} = render(
            <Sparkline
                points={[
                    {label: "a", value: 4n},
                    {label: "b", value: 4n},
                ]}
                describe={describeIt}
                height={20}
            />,
        );
        expect(screen.getByRole("img", {name: /, flat from /})).toBeInTheDocument();
        expect(container.querySelector("polyline")?.getAttribute("points")).toBe(
            "0.00,10.00 100.00,10.00",
        );
    });
});
