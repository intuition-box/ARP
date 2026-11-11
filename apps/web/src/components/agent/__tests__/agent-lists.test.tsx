import {screen, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import type {TrustPanelView} from "../../../services/agent-trust";
import type {CohortRow, CohortView} from "../../../services/agent-cohort";
import type {SievedAgent} from "../../../services/agents-reachable";
import {renderWithProviders} from "../../../test/render";
import {AgentIdentityPanel, AgentSigil} from "../AgentIdentityPanel";
import {CohortList} from "../CohortList";
import {ReachableList} from "../ReachableList";

/** Identity, cohort and reachable lists: what each row says and where it links. */
const listed = vi.hoisted(() => ({useListedCapabilities: vi.fn()}));
vi.mock("../../../hooks/use-listed-capabilities", () => ({
    useListedCapabilities: listed.useListedCapabilities,
}));

const ATOM = `0x${"ab".repeat(32)}`;
const view: TrustPanelView = {
    caip19: "eip155:8453/erc721:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/2340",
    chainId: 8453,
    tokenId: "2340",
    registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    found: true,
    name: "Clawnch",
    description: null,
    image: null,
    isFallbackMetadata: false,
    url: "https://clawn.ch",
    owner: "0x729a121c00000000000000000000000070B1de1d",
    registrationFile: null,
    atomTermId: null,
    rows: [],
    capabilities: [],
    capabilityCount: 0,
    sourceErrors: [],
    conflicts: [],
};

beforeEach(() => {
    listed.useListedCapabilities.mockReset();
    listed.useListedCapabilities.mockReturnValue({data: undefined});
});

describe("AgentIdentityPanel", () => {
    it("links the operator and the registration on the identity's own chain", () => {
        renderWithProviders(<AgentIdentityPanel view={view} />);
        expect(screen.getByRole("link", {name: /0x729a121c/})).toHaveAttribute(
            "href",
            `https://basescan.org/address/${view.owner}`,
        );
        expect(screen.getByRole("link", {name: /#2340 ↗/})).toHaveAttribute(
            "href",
            `https://basescan.org/token/${view.registry}?a=2340`,
        );
        expect(screen.getByText("not in the Intuition graph")).toBeInTheDocument();
    });

    it("leaves the operator and registration unlinked on a chain with no explorer here", () => {
        renderWithProviders(<AgentIdentityPanel view={{...view, chainId: 13579, url: null}} />);
        expect(screen.getByText(/0x729a121c/).closest("a")).toBeNull();
        expect(screen.getByText(/#2340/).closest("a")).toBeNull();
        expect(screen.queryByText("URL")).toBeNull();
    });

    it("says the operator was not read, opens the atom, and marks a stand-in URL", () => {
        renderWithProviders(
            <AgentIdentityPanel
                view={{...view, owner: null, atomTermId: ATOM, isFallbackMetadata: true}}
            />,
        );
        expect(screen.getByText("not read")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "open ↗"}).getAttribute("href")).toContain(ATOM);
        expect(screen.getByText("URL (indexer stand-in)")).toBeInTheDocument();
    });
});

describe("AgentSigil", () => {
    it("draws nothing when the agent declared nothing", () => {
        const {container} = renderWithProviders(<AgentSigil view={view} />);
        expect(container).toBeEmptyDOMElement();
    });

    it("draws one dot per listed capability when the agent is on the graph", () => {
        listed.useListedCapabilities.mockReturnValue({data: ["search"]});
        renderWithProviders(
            <AgentSigil view={{...view, atomTermId: ATOM}} viewerStaked size={48} />,
        );
        expect(listed.useListedCapabilities).toHaveBeenCalledWith(ATOM);
        expect(
            screen.getByRole("img", {name: "Clawnch: 1 declaration, none proven"}),
        ).toBeInTheDocument();
    });

    it("falls back to the declared tools, and to the token id for a nameless agent", () => {
        renderWithProviders(
            <AgentSigil
                view={{
                    ...view,
                    name: null,
                    capabilities: [
                        {
                            relation: "uses-tool",
                            label: "Tools",
                            entries: [
                                {
                                    relation: "uses-tool",
                                    label: "a",
                                    name: "a",
                                    url: null,
                                    sourceHandle: "0x1",
                                },
                                {
                                    relation: "uses-tool",
                                    label: "b",
                                    name: "b",
                                    url: null,
                                    sourceHandle: "0x2",
                                },
                            ],
                        },
                    ],
                }}
            />,
        );
        expect(
            screen.getByRole("img", {name: "2340: 2 declarations, none proven"}),
        ).toBeInTheDocument();
    });
});

describe("CohortList", () => {
    const row = (overrides: Partial<CohortRow>): CohortRow => ({
        key: "k",
        sigilId: ATOM,
        name: "Clawnch",
        isFallbackMetadata: false,
        imageUrl: null,
        modules: [{name: "0x1", state: "declared"}],
        href: "/agent/8453/2340",
        identityProblem: null,
        statementCount: 1234,
        marketCap: "2.5 TRUST",
        marketCapExact: "2.500000 TRUST",
        positions: "3 supports",
        isUnsupported: false,
        ...overrides,
    });
    const cohort = (rows: CohortRow[]): CohortView => ({
        sourceId: "intuition",
        order: "evidence-quantity",
        total: rows.length,
        rangeLabel: "",
        limit: 25,
        offset: 0,
        hasPrevious: false,
        hasNext: false,
        rows,
        hiddenCount: 0,
    });

    it("says the page came back empty", () => {
        renderWithProviders(<CohortList view={cohort([])} />);
        expect(
            screen.getByText(
                "This page came back empty — the offset has run off the end of the list.",
            ),
        ).toBeInTheDocument();
    });

    it("links a resolved row, explains an unlinked one, and leaves an unsupported cell empty", () => {
        renderWithProviders(
            <CohortList
                view={cohort([
                    row({}),
                    row({
                        key: "b",
                        name: "Agent 8453:9",
                        href: null,
                        modules: [],
                        identityProblem: "two identities share this atom",
                        isFallbackMetadata: true,
                        statementCount: null,
                        marketCap: null,
                        marketCapExact: null,
                    }),
                    row({key: "c", name: "Quiet", isUnsupported: true}),
                ])}
            />,
        );
        const [first, second, third] = screen.getAllByRole("listitem");
        const link = within(first).getByRole("link");
        expect(link).toHaveAttribute("href", "/agent/8453/2340");
        expect(link).toHaveTextContent("1,234 declarations");
        expect(within(first).getByText("2.5 TRUST", {exact: false})).toHaveAttribute(
            "title",
            "2.500000 TRUST",
        );
        expect(within(second).queryByRole("link")).toBeNull();
        expect(
            within(second).getByText(
                "two identities share this atom · indexer stand-in, not a chosen name",
            ),
        ).toBeInTheDocument();
        expect(within(second).getAllByText("—")).toHaveLength(2);
        expect(within(third).getByText("no support")).toBeInTheDocument();
        expect(within(third).queryByText("3 supports")).toBeNull();
    });
});

describe("ReachableList", () => {
    const agent = (overrides: Partial<SievedAgent>): SievedAgent => ({
        chainId: 8453,
        registry: "0x8004",
        tokenId: "7",
        name: "Speaker",
        rung: 4,
        couldNotSay: false,
        proofUrl: "https://mcp.example/mcp",
        kinds: ["mcp"],
        at: "2026-11-09T00:00:00Z",
        ...overrides,
    });

    it("says no agent answered", () => {
        renderWithProviders(<ReachableList agents={[]} />);
        expect(
            screen.getByText("No agent in the index answered the last reading."),
        ).toBeInTheDocument();
    });

    it("names each agent's rung, protocols, host and id, and links its page", () => {
        renderWithProviders(
            <ReachableList
                agents={[agent({}), agent({tokenId: "8", name: null, proofUrl: null, kinds: []})]}
            />,
        );
        const [first, second] = screen.getAllByRole("link");
        expect(first).toHaveAttribute("href", "/agent/8453/7");
        expect(first).toHaveTextContent("Speaks · MCP·mcp.example·8453/7");
        expect(second).toHaveTextContent("Agent 8453:8");
        expect(second).toHaveTextContent("Speaks·8453/8");
        expect(second).not.toHaveTextContent("example");
    });
});
