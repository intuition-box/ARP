import {
    INTUITION_USES_TERM_ID,
    type DeclaredEndpoint,
    type FindAgentsPage,
} from "@arp-protocol/core";
import {fireEvent, screen, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import type {AgentLinesView} from "../../../services/agent-lines";
import type {EndpointRead} from "../../../services/agent-endpoints";
import type {AtomView, GroupView} from "../../../services/atom-standing-view";
import {renderWithProviders} from "../../../test/render";
import {AgentClaims} from "../AgentClaims";
import {AgentEndpoints} from "../AgentEndpoints";
import {CapabilityFilter, CapabilityResults} from "../CapabilitySearch";
import {CapabilitySection} from "../CapabilitySection";

/**
 * The agent page's read-only sections. Each hook is mocked at its module; the claim field and the
 * claim list are replaced by markers that print the props this component computed for them, so the
 * assertion is about what `AgentClaims` hands on and not about how the field draws it.
 */
const hooks = vi.hoisted(() => ({
    useFindAgents: vi.fn(),
    useAgentEndpoints: vi.fn(),
    useAtomStanding: vi.fn(),
    useDeclaredModules: vi.fn(),
    useAgentLines: vi.fn(),
}));
vi.mock("../../../hooks/use-find-agents", () => ({useFindAgents: hooks.useFindAgents}));
vi.mock("../../../hooks/use-agent-endpoints", () => ({useAgentEndpoints: hooks.useAgentEndpoints}));
vi.mock("../../../hooks/use-atom-standing", () => ({useAtomStanding: hooks.useAtomStanding}));
vi.mock("../../../hooks/use-declared-modules", () => ({
    useDeclaredModules: hooks.useDeclaredModules,
}));
vi.mock("../../../hooks/use-agent-lines", () => ({useAgentLines: hooks.useAgentLines}));
vi.mock("../../atom/ClaimField", () => ({
    ClaimField: (props: {
        groups: GroupView[];
        subject: string;
        edgeCount: number;
        truncated: boolean;
    }) => (
        <p data-testid="field">
            {`field of ${props.subject}: ${props.groups.map((group) => `${group.label}=${group.rows.length}`).join(",")}; ${props.edgeCount} edges${props.truncated ? ", truncated" : ""}`}
        </p>
    ),
}));
vi.mock("../../atom/ClaimList", () => ({
    Group: (props: {group: GroupView; modules: Record<string, string[]>}) => (
        <p data-testid="group">{`${props.group.label} (${Object.keys(props.modules).length} known)`}</p>
    ),
    Empty: (props: {atomId: string}) => <p>{`nothing points at ${props.atomId}`}</p>,
}));

const AGENT = `0x${"aa".repeat(32)}`;

beforeEach(() => {
    for (const fn of Object.values(hooks)) fn.mockReset();
    hooks.useDeclaredModules.mockReturnValue({data: undefined});
    hooks.useAgentLines.mockReturnValue({data: undefined});
});

describe("CapabilityFilter", () => {
    it("submits what was typed, clears, and runs an example", () => {
        const onChange = vi.fn();
        const onSubmit = vi.fn();
        const {rerender} = renderWithProviders(
            <CapabilityFilter value="" onChange={onChange} onSubmit={onSubmit} />,
        );
        expect(screen.getByRole("button", {name: "Filter"})).toBeDisabled();
        expect(screen.queryByRole("button", {name: "Clear"})).toBeNull();
        fireEvent.change(screen.getByRole("searchbox"), {target: {value: "defi"}});
        expect(onChange).toHaveBeenLastCalledWith("defi");

        rerender(<CapabilityFilter value="defi" onChange={onChange} onSubmit={onSubmit} />);
        fireEvent.click(screen.getByRole("button", {name: "Filter"}));
        expect(onSubmit).toHaveBeenLastCalledWith("defi");
        fireEvent.click(screen.getByRole("button", {name: "Clear"}));
        expect(onChange).toHaveBeenLastCalledWith("");
        expect(onSubmit).toHaveBeenLastCalledWith("");

        fireEvent.click(screen.getByRole("button", {name: "MCP Server"}));
        expect(onChange).toHaveBeenLastCalledWith("MCP Server");
        expect(onSubmit).toHaveBeenLastCalledWith("MCP Server");
    });
});

describe("CapabilityResults", () => {
    const page: FindAgentsPage = {
        domain: "defi",
        truncated: true,
        curveId: 1,
        agents: [
            {
                atomId: AGENT,
                label: "Yield bot",
                matched: {predicateId: "0x01", label: "defi"},
                backingAssets: 2n * 10n ** 18n,
                backers: 3,
            },
            {
                atomId: `0x${"bb".repeat(32)}`,
                label: null,
                matched: {predicateId: "0x01", label: null},
                backingAssets: null,
                backers: 0,
            },
        ],
    };

    it("shows nothing at all for an empty search", () => {
        hooks.useFindAgents.mockReturnValue({isPending: true});
        renderWithProviders(<CapabilityResults domain="  " />);
        expect(screen.getByRole("region", {name: "Agents declaring"})).toHaveTextContent(/^$/);
    });

    it("says which chain it is reading while pending", () => {
        hooks.useFindAgents.mockReturnValue({isPending: true});
        renderWithProviders(<CapabilityResults domain="defi" />);
        expect(screen.getByText("reading testnet")).toBeVisible();
    });

    it("says why the search failed, Error or not", () => {
        hooks.useFindAgents.mockReturnValue({
            isPending: false,
            isError: true,
            error: new Error("HTTP 500"),
        });
        const {unmount} = renderWithProviders(<CapabilityResults domain="defi" />);
        expect(screen.getByRole("alert")).toHaveTextContent("HTTP 500");
        unmount();
        hooks.useFindAgents.mockReturnValue({isPending: false, isError: true, error: "timeout"});
        renderWithProviders(<CapabilityResults domain="defi" />);
        expect(screen.getByRole("alert")).toHaveTextContent("timeout");
    });

    it("says nothing declared that when no agent matches", () => {
        hooks.useFindAgents.mockReturnValue({
            isPending: false,
            isError: false,
            data: {...page, agents: []},
        });
        renderWithProviders(<CapabilityResults domain="defi" />);
        expect(screen.getByText("nothing declared that")).toBeVisible();
    });

    it("lists each candidate with why it matched and what backs it", () => {
        hooks.useFindAgents.mockReturnValue({isPending: false, isError: false, data: page});
        renderWithProviders(<CapabilityResults domain="defi" />);
        expect(screen.getByText("2 declared defi — first page")).toBeVisible();
        const [first, second] = screen.getAllByRole("listitem");
        expect(within(first).getByText("Yield bot")).toBeVisible();
        expect(within(first).getByText("2 tTRUST")).toBeVisible();
        expect(within(first).getByRole("img", {name: "3 distinct supporters"})).toBeInTheDocument();
        expect(within(first).getByRole("link", {name: "Open Yield bot"})).toHaveAttribute(
            "href",
            `/atom/${AGENT}`,
        );
        expect(within(second).getByText("—")).toBeVisible();
        expect(within(second).queryByText(/tTRUST/)).toBeNull();
        expect(
            within(second).getByRole("link", {name: `Open 0x${"bb".repeat(32)}`}),
        ).toBeInTheDocument();
    });

    it("drops the first-page note when the read was whole", () => {
        hooks.useFindAgents.mockReturnValue({
            isPending: false,
            isError: false,
            data: {...page, truncated: false},
        });
        renderWithProviders(<CapabilityResults domain="defi" />);
        expect(screen.getByText("2 declared defi")).toBeVisible();
    });
});

describe("CapabilitySection", () => {
    it("says nothing is declared", () => {
        renderWithProviders(<CapabilitySection groups={[]} count={0} />);
        expect(screen.getByText("Nothing declared.")).toBeVisible();
    });

    it("links to the atom, else to the url, else names it", () => {
        renderWithProviders(
            <CapabilitySection
                count={3}
                groups={[
                    {
                        relation: "uses-tool",
                        label: "Tools",
                        entries: [
                            {
                                relation: "uses-tool",
                                label: null,
                                name: "github.com/a/b",
                                url: null,
                                sourceHandle: "0x77",
                            },
                            {
                                relation: "uses-tool",
                                label: "Web",
                                name: null,
                                url: "https://web.example",
                                sourceHandle: null,
                            },
                            {
                                relation: "uses-tool",
                                label: null,
                                name: null,
                                url: null,
                                sourceHandle: null,
                            },
                        ],
                    },
                ]}
            />,
        );
        expect(screen.getByText("Tools")).toBeVisible();
        expect(screen.getByRole("link", {name: "a/b"})).toHaveAttribute("href", "/atom/0x77");
        expect(screen.getByRole("link", {name: "Web"})).toHaveAttribute(
            "href",
            "https://web.example",
        );
        expect(screen.getByText("unnamed").closest("a")).toBeNull();
    });
});

describe("AgentEndpoints", () => {
    const probeable: DeclaredEndpoint = {
        declaredUnder: "services",
        name: "MCP",
        protocol: "mcp",
        version: null,
        capabilities: ["search", "fetch"],
        classification: {
            status: "probeable",
            url: "https://mcp.example/",
            declared: "https://mcp.example",
        },
    };
    const templated: DeclaredEndpoint = {
        declaredUnder: "endpoints",
        name: null,
        protocol: null,
        version: null,
        capabilities: [],
        classification: {status: "not-checkable", code: "templated", declared: "https://x/{id}"},
    };

    function withRead(read: EndpointRead | undefined, isPending = false) {
        hooks.useAgentEndpoints.mockReturnValue({isPending, data: read});
    }

    it("says it is reading", () => {
        withRead(undefined, true);
        renderWithProviders(<AgentEndpoints registrationFile="https://x" />);
        expect(screen.getByText("Reading what it published…")).toBeVisible();
    });

    it("tells no document apart from a document with no endpoint", () => {
        withRead({status: "none", reason: "no-registration-file"});
        const {unmount} = renderWithProviders(<AgentEndpoints registrationFile={null} />);
        expect(
            screen.getByText(
                "This agent registered without a document, so it published no way in.",
            ),
        ).toBeVisible();
        unmount();
        withRead({status: "none", reason: "no-endpoints-declared"});
        renderWithProviders(<AgentEndpoints registrationFile="https://x" />);
        expect(screen.getByText("Its registration document declares no endpoint.")).toBeVisible();
    });

    it("groups callable endpoints apart from declared-only ones", () => {
        withRead({
            status: "read",
            url: "https://x",
            probeable: [probeable],
            notCheckable: [templated],
        });
        renderWithProviders(<AgentEndpoints registrationFile="https://x" />);
        const callable = screen.getByRole("heading", {name: /^Callable/});
        expect(callable).toBeVisible();
        expect(screen.getByRole("link", {name: "https://mcp.example/"})).toBeInTheDocument();
        expect(screen.getByText("2 declared")).toBeVisible();
        expect(screen.getByRole("heading", {name: /^Declared, not callable/})).toBeVisible();
        expect(screen.getByText("unnamed")).toBeVisible();
        expect(screen.getByText("https://x/{id}")).toBeVisible();
        expect(screen.getByText("templated")).toBeVisible();
    });

    it("draws only the group that has endpoints", () => {
        withRead({status: "read", url: "https://x", probeable: [], notCheckable: [templated]});
        renderWithProviders(<AgentEndpoints registrationFile="https://x" />);
        expect(screen.queryByRole("heading", {name: /^Callable/})).toBeNull();
    });

    it("draws no declared-only group when every endpoint is callable", () => {
        withRead({status: "read", url: "https://x", probeable: [probeable], notCheckable: []});
        renderWithProviders(<AgentEndpoints registrationFile="https://x" />);
        expect(screen.queryByRole("heading", {name: /^Declared, not callable/})).toBeNull();
    });
});

describe("AgentClaims", () => {
    const usedBy: GroupView = {
        predicateAtomId: INTUITION_USES_TERM_ID,
        label: "uses",
        labelIsId: false,
        inverse: null,
        rows: [
            {
                tripleId: "0xt1",
                name: "Caller",
                nameIsId: false,
                subjectAtomId: "0xcaller",
                label: "Caller",
                backing: null,
                positions: 0,
                opposition: null,
            },
        ],
        backing: null,
        positions: 0,
    };
    const standing = (overrides: Partial<AtomView>): Partial<AtomView> => ({
        atomId: AGENT,
        exists: true,
        groups: [usedBy],
        claims: [],
        edgeCount: 1,
        truncated: false,
        ...overrides,
    });

    it("says it is reading the graph", () => {
        hooks.useAtomStanding.mockReturnValue({isPending: true, data: undefined});
        renderWithProviders(<AgentClaims atomId={AGENT} name="Bot" />);
        expect(screen.getByText("Reading the graph…")).toBeVisible();
    });

    it("says the agent is not on the graph yet", () => {
        hooks.useAtomStanding.mockReturnValue({isPending: false, data: standing({exists: false})});
        renderWithProviders(<AgentClaims atomId={AGENT} name="Bot" />);
        expect(
            screen.getByText("This agent is not on the graph yet, so nothing can point at it."),
        ).toBeVisible();
    });

    it("falls back to the empty state when nothing points at it", () => {
        hooks.useAtomStanding.mockReturnValue({isPending: false, data: standing({groups: []})});
        renderWithProviders(<AgentClaims atomId={AGENT} name="Bot" />);
        expect(screen.getByText(`nothing points at ${AGENT}`)).toBeVisible();
    });

    it("draws the field with what it used added, and lists the graph's own groups", () => {
        const lines: AgentLinesView = {
            usedBy: [],
            used: [
                {
                    tripleId: "0xt2",
                    atomId: "0xtool",
                    label: "hyperframes",
                    name: "hyperframes",
                    nameIsId: false,
                    positions: 2,
                    parts: [{domain: "video", outcome: "worked"}],
                },
            ],
            contexts: ["video"],
            truncated: true,
        };
        hooks.useAtomStanding.mockReturnValue({isPending: false, data: standing({})});
        hooks.useAgentLines.mockReturnValue({data: lines});
        hooks.useDeclaredModules.mockReturnValue({data: {"0xcaller": ["0xtool"]}});
        renderWithProviders(<AgentClaims atomId={AGENT} name="Bot" />);
        expect(screen.getByTestId("field")).toHaveTextContent(
            "field of Bot: uses=1,uses=1; 2 edges, truncated",
        );
        expect(screen.getByTestId("group")).toHaveTextContent("uses (1 known)");
        expect(hooks.useDeclaredModules).toHaveBeenCalledWith(["0xcaller"]);
    });

    it("counts only the graph's edges when the agent used nothing", () => {
        hooks.useAtomStanding.mockReturnValue({
            isPending: false,
            data: standing({truncated: false}),
        });
        renderWithProviders(<AgentClaims atomId={AGENT} name="Bot" />);
        expect(screen.getByTestId("field")).toHaveTextContent("field of Bot: uses=1; 1 edges");
        expect(screen.getByTestId("group")).toHaveTextContent("uses (0 known)");
    });
});
