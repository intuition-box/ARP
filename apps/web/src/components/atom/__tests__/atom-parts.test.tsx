import {INTUITION_USES_TERM_ID} from "@arp-protocol/core";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {EdgeRow, GroupView} from "../../../services/atom-standing-view";
import {Install} from "../AtomPageParts";
import {AtomSigil} from "../AtomSigil";

const row = (subjectAtomId: string): EdgeRow => ({
    tripleId: `t-${subjectAtomId}`,
    name: subjectAtomId,
    nameIsId: true,
    subjectAtomId,
    label: null,
    backing: null,
    positions: 0,
    opposition: null,
});

const group = (predicateAtomId: string, subjects: string[]): GroupView => ({
    predicateAtomId,
    label: "uses",
    labelIsId: false,
    inverse: null,
    rows: subjects.map(row),
    backing: null,
    positions: 0,
});

describe("AtomSigil", () => {
    it("draws one dot per distinct agent that declared using it, and names the count", () => {
        render(
            <AtomSigil
                atomId="0xtool"
                name="pptx"
                groups={[
                    group(INTUITION_USES_TERM_ID.toUpperCase(), ["0xa", "0xb", "0xa"]),
                    group("0xtag", ["0xc"]),
                ]}
            />,
        );
        expect(
            screen.getByRole("img", {name: "pptx: declared by 2 agents, none proven"}),
        ).toBeInTheDocument();
    });

    it("says agent in the singular", () => {
        render(
            <AtomSigil
                atomId="0xtool"
                name="pptx"
                groups={[group(INTUITION_USES_TERM_ID, ["0xa"])]}
            />,
        );
        expect(
            screen.getByRole("img", {name: "pptx: declared by 1 agent, none proven"}),
        ).toBeInTheDocument();
    });

    it("draws nothing for a tool no agent declared, whatever else points at it", () => {
        const {container} = render(
            <AtomSigil atomId="0xtool" name="pptx" groups={[group("0xtag", ["0xc"])]} />,
        );
        expect(container).toBeEmptyDOMElement();
    });
});

describe("Install", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("copies the command, says so, and goes back to Copy after a moment", async () => {
        vi.useFakeTimers();
        const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined);
        vi.stubGlobal("navigator", {...navigator, clipboard: {writeText}});
        render(<Install command="npx skills add a/b" prompt="›" />);
        expect(screen.getByText("›")).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(screen.getByRole("button", {name: "Copy"}));
        });
        expect(writeText).toHaveBeenCalledWith("npx skills add a/b");
        expect(screen.getByRole("button", {name: "Copied"})).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(1500);
        });
        expect(screen.getByRole("button", {name: "Copy"})).toBeInTheDocument();
    });
});
