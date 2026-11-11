import {fireEvent, render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../../lib/chain-choice";
import type {TermShapeView} from "../../../services/term-shape-view";
import {TermShapePanel} from "../TermShapePanel";

/** The four readings and the line, as a reader gets them: facts with their notes, never a verdict. */
const SHAPE: TermShapeView = {
    curveId: 1,
    concentration: "70% held by one account",
    isDominated: true,
    span: "Nov 2026",
    arrivedTogether: true,
    breadth: "half its supporters hold 12+ other positions",
    breadthSampled: true,
    positionCount: 1234,
};

const wrap = ({children}: {children: ReactNode}) => (
    <ChainChoiceContext.Provider value={{choice: choiceFor(false), setMainnet: vi.fn()}}>
        {children}
    </ChainChoiceContext.Provider>
);

const bucket = (day: string, signals: number, volume: bigint) => ({
    bucket: `${day}T00:00:00Z`,
    signals,
    volume,
});

describe("TermShapePanel", () => {
    it("renders nothing for a market nobody supports", () => {
        const {container} = render(
            <TermShapePanel shape={{...SHAPE, positionCount: 0}} curve={[]} curveLabel="Linear" />,
            {wrapper: wrap},
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("names each flag beside its reading, and says when nothing moved", () => {
        render(<TermShapePanel shape={SHAPE} curve={[]} curveLabel="Linear" />, {wrapper: wrap});
        expect(screen.getByText("1,234")).toBeInTheDocument();
        expect(screen.getByText("one account can move this on its own")).toBeInTheDocument();
        expect(screen.getByText("every supporter opened on the same day")).toBeInTheDocument();
        expect(screen.getByText("over the largest hundred, not all of them")).toBeInTheDocument();
        expect(screen.getByText("Nothing has moved on this market yet.")).toBeInTheDocument();
        fireEvent.focus(screen.getByRole("button", {name: "Which curve"}));
        expect(screen.getByRole("tooltip")).toHaveTextContent(
            "Every figure here is read on the Linear bonding curve.",
        );
    });

    it("leaves out a reading the chain has no answer for, and its note", () => {
        render(
            <TermShapePanel
                shape={{
                    ...SHAPE,
                    concentration: null,
                    span: "Oct 2026 → Nov 2026",
                    arrivedTogether: false,
                    breadth: null,
                }}
                curve={[bucket("2026-11-02", 1, 1n)]}
                curveLabel="Linear"
            />,
            {wrapper: wrap},
        );
        expect(screen.queryByText("Concentration")).toBeNull();
        expect(screen.queryByText("Its supporters")).toBeNull();
        expect(screen.queryByText("every supporter opened on the same day")).toBeNull();
        // One bucket: bars, no line.
        expect(screen.getByRole("img", {name: "1 move over 1 week"})).toBeInTheDocument();
        expect(screen.queryByText("tTRUST moved, in or out")).toBeNull();
    });

    it("draws the bars and the volume line from two buckets or more", () => {
        render(
            <TermShapePanel
                shape={SHAPE}
                curve={[bucket("2026-10-26", 2, 1n), bucket("2026-11-02", 0, 3n)]}
                curveLabel="Linear"
            />,
            {wrapper: wrap},
        );
        expect(screen.getByRole("img", {name: "2 moves over 2 weeks"})).toBeInTheDocument();
        expect(screen.getByText(/· to week of/)).toBeInTheDocument();
        expect(screen.getByText("tTRUST moved, in or out")).toBeInTheDocument();
    });

    it("draws an all-zero week without dividing by zero", () => {
        render(
            <TermShapePanel
                shape={SHAPE}
                curve={[bucket("2026-11-02", 0, 0n)]}
                curveLabel="Linear"
            />,
            {wrapper: wrap},
        );
        const bars = screen.getByRole("img", {name: "0 moves over 1 week"});
        expect((bars.firstElementChild as HTMLElement).style.height).toBe("0%"); // The one bar span.
    });
});
