import {render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

/**
 * A diagram, drawn by Mermaid (mocked at its module: happy-dom has no layout) at its natural
 * width, or its source when the draw fails. What the reader gets is the figure, the loader before
 * it, or the text.
 */
const initialize = vi.fn();
const renderDiagram = vi.fn<(id: string, source: string) => Promise<{svg: string}>>();

vi.mock("mermaid", () => ({
    default: {
        initialize: (config: unknown) => initialize(config),
        render: (id: string, source: string) => renderDiagram(id, source),
    },
}));

import {MermaidDiagram} from "../MermaidDiagram";

beforeEach(() => {
    initialize.mockReset();
    renderDiagram.mockReset();
    document.documentElement.style.setProperty("--color-fg", "#e6e8e6");
});

describe("MermaidDiagram", () => {
    it("shows the loader, then the diagram at its own width", async () => {
        renderDiagram.mockResolvedValue({
            svg: '<svg width="100%" style="max-width: 400px;" viewBox="0 0 400 100"><text>a to b</text></svg>',
        });
        const {container} = render(<MermaidDiagram source={"flowchart LR\n a --> b"} />);
        expect(container.querySelector(".doc-diagram")).not.toBeNull();
        expect(screen.queryByRole("figure")).toBeNull();

        const figure = await screen.findByRole("figure", {
            name: "Diagram. Its text is in this page's Markdown.",
        });
        expect(figure).toHaveTextContent("a to b");
        expect(figure.querySelector("svg")?.getAttribute("width")).toBe("400");

        const [id, source] = renderDiagram.mock.calls[0] ?? [];
        expect(id).toMatch(/^mermaid-[a-zA-Z0-9]+$/);
        expect(source).toBe("flowchart LR\n a --> b");
        expect(initialize).toHaveBeenCalledWith(
            expect.objectContaining({
                securityLevel: "strict",
                themeVariables: expect.objectContaining({primaryTextColor: "#e6e8e6"}),
            }),
        );
    });

    it("falls back to the source when the draw fails", async () => {
        renderDiagram.mockRejectedValue(new Error("parse error"));
        const {container} = render(<MermaidDiagram source="not a diagram" />);
        await waitFor(() =>
            expect(container.querySelector("pre")).toHaveTextContent("not a diagram"),
        );
        expect(screen.queryByRole("figure")).toBeNull();
    });

    it("drops a draw that lands after it was unmounted", async () => {
        let finish: (value: {svg: string}) => void = () => undefined;
        renderDiagram.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        const {unmount} = render(<MermaidDiagram source="flowchart LR" />);
        await waitFor(() => expect(renderDiagram).toHaveBeenCalled());
        unmount();
        finish({svg: "<svg></svg>"});
        await Promise.resolve();
        expect(screen.queryByRole("figure")).toBeNull();
    });
});
