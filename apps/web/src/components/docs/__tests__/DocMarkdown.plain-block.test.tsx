import {screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../../../test/render";
import {DocMarkdown} from "../DocMarkdown";

vi.mock("../MermaidDiagram", () => ({
    MermaidDiagram: () => <p>diagram</p>,
}));

/** A fenced block with no language is a command like any other: copyable, never a diagram. */
describe("DocMarkdown, a block with no language", () => {
    it("is copyable and is not handed to the diagram", () => {
        renderWithProviders(<DocMarkdown markdown={"```\narp doctor\n```"} />);
        expect(screen.getByText("arp doctor")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Copy"})).toBeInTheDocument();
        expect(screen.queryByText("diagram")).toBeNull();
    });

    it("keeps a link with a relative target as a plain link", () => {
        renderWithProviders(<DocMarkdown markdown={"[next](lines)"} />);
        const link = screen.getByRole("link", {name: "next"});
        expect(link.getAttribute("href")).toBe("lines");
        expect(link.getAttribute("target")).toBeNull();
    });
});
