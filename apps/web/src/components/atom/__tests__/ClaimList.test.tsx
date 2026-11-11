import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";

import type {EdgeRow, GroupView} from "../../../services/atom-standing-view";
import {Empty, Group} from "../ClaimList";

/** A skill's description is what the hook has filed under its label. */
vi.mock("../../../hooks/use-skill-facts", () => ({
    useSkillFacts: () => ({
        factFor: (label: string | null) =>
            label === "render" ? {description: "Renders a video from HTML"} : null,
    }),
}));

const row = (over: Partial<EdgeRow>): EdgeRow => ({
    tripleId: "0x1",
    name: "render",
    nameIsId: false,
    subjectAtomId: "0xrender",
    label: "render",
    backing: null,
    positions: 0,
    opposition: null,
    ...over,
});

const group = (over: Partial<GroupView>): GroupView => ({
    predicateAtomId: "0xp",
    label: "uses",
    labelIsId: false,
    inverse: null,
    rows: [],
    backing: null,
    positions: 0,
    ...over,
});

const show = (g: GroupView, modules: Record<string, string[]> = {}) =>
    render(
        <MemoryRouter>
            <Group group={g} subject="hyperframes" modules={modules} />
        </MemoryRouter>,
    );

describe("ClaimList's group", () => {
    it("reads each row as the whole sentence, with what stands for and against it", () => {
        show(
            group({
                backing: "1.2 tTRUST",
                positions: 3,
                rows: [row({backing: "1.2 tTRUST", positions: 3, opposition: "0.4 tTRUST"})],
            }),
        );
        expect(screen.getByRole("heading", {name: "uses"})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "render"})).toHaveAttribute(
            "href",
            "/atom/0xrender",
        );
        expect(screen.getByText("hyperframes")).toBeInTheDocument();
        expect(screen.getByText("against 0.4 tTRUST")).toBeInTheDocument();
        expect(screen.getAllByText("1.2 tTRUST")).toHaveLength(2);
    });

    it("lists members with their description when the heading reads from this side", () => {
        show(group({label: "source", inverse: "skills", rows: [row({})]}));
        expect(screen.getByRole("heading", {name: "skills"})).toBeInTheDocument();
        expect(screen.getByText("Renders a video from HTML")).toBeInTheDocument();
        expect(screen.queryByText("hyperframes")).toBeNull();
    });

    it("draws the claimant's sigil when it declared something, hidden from the reader's name", () => {
        const {container} = show(group({rows: [row({})]}), {"0xrender": ["0xtool"]});
        expect(container.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    });

    it("sets an id in mono, for a predicate and a subject that have no word", () => {
        show(
            group({
                label: "0xabc…def",
                labelIsId: true,
                rows: [row({name: "0x123…456", nameIsId: true})],
            }),
        );
        expect(screen.getByRole("heading", {name: "0xabc…def"}).className).toContain("font-mono");
        expect(screen.getByRole("link", {name: "0x123…456"}).className).toContain("font-mono");
    });
});

describe("ClaimList's empty state", () => {
    it("says nothing points at the atom and keeps its id to verify", () => {
        render(<Empty atomId="0xdeadbeef" />);
        expect(screen.getByRole("heading", {name: "Nothing points at it"})).toBeInTheDocument();
        expect(screen.getByText("0xdeadbeef")).toBeInTheDocument();
    });
});
