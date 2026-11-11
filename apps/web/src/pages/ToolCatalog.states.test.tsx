import {fireEvent, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi, type Mock} from "vitest";

import type {ToolCatalogView, ToolRow} from "../services/tool-catalog";
import {renderWithProviders} from "../test/render";

/**
 * The tools page's states besides a full list: loading, a failed read, a failed refetch under good
 * rows, an empty catalogue, a filter that matches nothing, a truncated read, and a catalogue that
 * already has a Signal. The catalogue, the domain tree, the tag index and the skill facts are mocked
 * at their hooks, which are where this page's reads leave it.
 */
const row = (index: number, source: string | null, overrides: Partial<ToolRow> = {}): ToolRow => ({
    key: `0x${index.toString(16).padStart(64, "0")}`,
    provenance: "registered",
    name: `tool-${index}`,
    isUnnamed: false,
    source,
    label: `tool-${index}`,
    href: `/atom/0x${index}`,
    declarations: 0,
    declarers: [],
    sponsoredDeposits: null,
    wallets: null,
    supportTrust: "0.001",
    opposeTrust: null,
    stakers: 0,
    ...overrides,
});

const catalog = vi.hoisted(
    (): {
        data: ToolCatalogView | undefined;
        error: Error | null;
        refetch: Mock<() => Promise<undefined>>;
        inDomain: Set<string>;
    } => ({
        data: undefined,
        error: null,
        refetch: vi.fn(async () => undefined),
        inDomain: new Set<string>(),
    }),
);

vi.mock("../hooks/use-tool-catalog", () => ({
    useReadsSignals: () => true,
    useToolCatalog: () => ({data: catalog.data, error: catalog.error, refetch: catalog.refetch}),
}));
vi.mock("../hooks/use-domain-tree", () => ({
    useDomainTree: () => ({tree: undefined, options: [{label: "video", depth: 0}], error: null}),
}));
vi.mock("../hooks/use-tag-index", () => ({
    useTagIndex: () => ({
        index: {
            byDomain: new Map(),
            countFor: () => catalog.inDomain.size,
            idsUnder: (domains: readonly string[]) =>
                domains.length === 0 ? null : catalog.inDomain,
        },
        isLoading: false,
        error: null,
    }),
}));
vi.mock("../hooks/use-skill-facts", () => ({
    useSkillFacts: () => ({factFor: () => null, repoFactFor: () => null}),
}));

import {ToolCatalog} from "./ToolCatalog";

function catalogue(rows: ToolRow[], truncated = false): ToolCatalogView {
    return {rows, truncated, curveId: 1};
}

beforeEach(() => {
    catalog.data = catalogue([row(1, "owner/skills"), row(2, null)]);
    catalog.error = null;
    catalog.refetch.mockClear();
    catalog.inDomain = new Set();
});

describe("the tools page's states", () => {
    it("says it is reading the graph before the first read returns", () => {
        catalog.data = undefined;
        renderWithProviders(<ToolCatalog />);
        expect(screen.getByText("reading tools from the intuition graph")).toBeInTheDocument();
    });

    it("names a failed first read and retries it", () => {
        catalog.data = undefined;
        catalog.error = new Error("HTTP 503");
        renderWithProviders(<ToolCatalog />);
        expect(screen.getByText("The graph read failed.")).toBeInTheDocument();
        expect(screen.getByText("HTTP 503")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(catalog.refetch).toHaveBeenCalledTimes(1);
    });

    it("keeps the last good rows when a refetch fails, and says so", () => {
        catalog.error = new Error("HTTP 503");
        renderWithProviders(<ToolCatalog />);
        expect(screen.getByText("tool-1")).toBeInTheDocument();
        expect(
            screen.getByText(
                "These rows are the last successful read. The most recent one failed.",
            ),
        ).toBeInTheDocument();
    });

    it("says an empty catalogue is empty and how to fill it", () => {
        catalog.data = catalogue([]);
        renderWithProviders(<ToolCatalog />);
        expect(screen.getByText("nothing here yet")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Register the first one →"})).toHaveAttribute(
            "href",
            "/start/tool",
        );
    });

    it("tells a domain filter that matched nothing to clear itself", () => {
        renderWithProviders(<ToolCatalog />);
        fireEvent.click(screen.getByRole("button", {name: /^video/}));
        expect(screen.getByText("no rows match")).toBeInTheDocument();
        expect(screen.getByText("Clear the domain filter to see them.")).toBeInTheDocument();
    });

    it("says an index with no rows of its own has none yet", () => {
        catalog.data = catalogue([row(1, "owner/skills")]);
        renderWithProviders(<ToolCatalog />, {route: {path: "/tools", at: "/tools?index=repos"}});
        expect(screen.getByText("None in repositories yet.")).toBeInTheDocument();
    });

    it("says the skills index has none yet when only repositories are listed", () => {
        catalog.data = catalogue([row(2, null)]);
        renderWithProviders(<ToolCatalog />);
        expect(screen.getByText("None in skills yet.")).toBeInTheDocument();
    });

    it("says a truncated read is a prefix", () => {
        catalog.data = catalogue([row(1, "owner/skills")], true);
        renderWithProviders(<ToolCatalog />);
        expect(screen.getByText(/The read hit its limit/)).toBeInTheDocument();
    });

    it("says there are no signals yet only while no row has one", () => {
        const {unmount} = renderWithProviders(<ToolCatalog />);
        expect(screen.getByText("No signals yet")).toBeInTheDocument();
        unmount();

        catalog.data = catalogue([row(1, "owner/skills", {sponsoredDeposits: 2})]);
        renderWithProviders(<ToolCatalog />);
        expect(screen.queryByText("No signals yet")).toBeNull();
    });

    it("lists repositories on the repositories index and steps back a page", () => {
        catalog.data = catalogue(Array.from({length: 30}, (_, index) => row(100 + index, null)));
        renderWithProviders(<ToolCatalog />, {route: {path: "/tools", at: "/tools?index=repos"}});
        const range = () => screen.getByRole("navigation", {name: "Tool pages"}).querySelector("p");
        expect(range()).toHaveTextContent("1–25 of 30");
        fireEvent.click(screen.getByRole("button", {name: "Next →"}));
        expect(range()).toHaveTextContent("26–30 of 30");
        fireEvent.click(screen.getByRole("button", {name: "← Previous"}));
        expect(range()).toHaveTextContent("1–25 of 30");
        fireEvent.click(screen.getByRole("button", {name: /^Skills/}));
        expect(screen.getByText("None in skills yet.")).toBeInTheDocument();
    });
});
