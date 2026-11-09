import {screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../../test/render";

import {DocMarkdown} from "./DocMarkdown";

// No Mermaid in happy-dom: a diagram that cannot be drawn falls back to its source.
vi.mock("./MermaidDiagram", () => ({
    MermaidDiagram: ({source}: {source: string}) => <pre className="doc-code">{source}</pre>,
}));

describe("DocMarkdown", () => {
    it("keeps a link to a page in the app and a link to a raw file as a plain download", () => {
        renderWithProviders(<DocMarkdown markdown={"[Lines](/docs/lines) and [raw](/docs/lines.md)"} />);
        expect(screen.getByRole("link", {name: "Lines"}).getAttribute("href")).toBe("/docs/lines");
        expect(screen.getByRole("link", {name: "raw"}).getAttribute("href")).toBe("/docs/lines.md");
    });

    it("opens an outside link in a new tab", () => {
        renderWithProviders(<DocMarkdown markdown={"[GitHub](https://github.com/intuition-box/ARP)"} />);
        expect(screen.getByRole("link", {name: "GitHub"}).getAttribute("target")).toBe("_blank");
    });

    it("gives a heading made of inline code an id", () => {
        renderWithProviders(<DocMarkdown markdown={"### `/search`"} />);
        expect(screen.getByRole("heading", {level: 3}).id).toBe("search");
    });

    it("hands a mermaid block to the diagram, and a command to a copyable block", async () => {
        renderWithProviders(
            <DocMarkdown markdown={"```mermaid\nflowchart LR\n  a --> b\n```\n\n```bash\narp doctor\n```"} />,
        );
        expect(await screen.findByText(/flowchart LR/)).toBeTruthy();
        expect(screen.getByText("arp doctor")).toBeTruthy();
        expect(screen.getByRole("button", {name: "Copy"})).toBeTruthy();
    });

    it("renders a table", () => {
        renderWithProviders(<DocMarkdown markdown={"| a | b |\n| --- | --- |\n| 1 | 2 |"} />);
        expect(screen.getByRole("table")).toBeTruthy();
    });
});
