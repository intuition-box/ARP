import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it} from "vitest";

import type {GroupView} from "../../../services/atom-standing-view";
import {ClaimField} from "../ClaimField";

/** What the agent page adds to the field (task 95): a ring of what it used, and a line on a dot. */
const used: GroupView = {
    predicateAtomId: "0xuses:out",
    label: "uses",
    labelIsId: false,
    inverse: "uses",
    direction: "out",
    rows: [
        {
            tripleId: "0xe1",
            name: "pptx",
            nameIsId: false,
            subjectAtomId: "0xtool",
            label: "pptx",
            backing: "0.002 tTRUST",
            positions: 2,
            opposition: null,
            line: "presentation · task done",
        },
    ],
    backing: null,
    positions: 0,
};

const show = (reserveLine: boolean) =>
    render(
        <MemoryRouter>
            <ClaimField
                groups={[used]}
                subject="agent 12"
                edgeCount={1}
                truncated={false}
                reserveLine={reserveLine}
            />
        </MemoryRouter>,
    );

describe("ClaimField, on the agent page", () => {
    it("names an outgoing dot as the agent's own sentence, with its line", () => {
        show(true);
        expect(
            screen.getByRole("link", {
                name: "agent 12 uses pptx, 0.002 tTRUST behind it, 2 supports, presentation · task done",
            }),
        ).toBeTruthy();
    });

    it("shows the line on the card when the loupe reads the dot", () => {
        const {container} = show(true);
        act(() => {
            fireEvent.focus(screen.getByRole("link", {name: /agent 12 uses pptx/}));
        });
        expect(container.querySelector(".arp-cf-card .arp-cf-line")?.textContent).toBe(
            "presentation · task done",
        );
    });

    it("says what task done means only where a line can show", () => {
        show(true);
        expect(screen.getByRole("button", {name: "What task done means"})).toBeTruthy();
    });

    it("leaves every other page's field as it was", () => {
        show(false);
        expect(screen.queryByRole("button", {name: "What task done means"})).toBeNull();
    });
});
