import {fireEvent, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {buildTrustPanel, type TrustPanelView} from "../services/agent-trust";
import {richProfile} from "../services/__tests__/trust-fixtures";
import {renderWithProviders} from "../test/render";

/**
 * Every state the agent page can be in, from the reader's side: an address that is not one, a test
 * agent, loading, every source failed, nothing registered, and a found agent with one, two or no
 * providers. Reads are faked at the hook boundary; the components that fetch on their own
 * (`BeforeYouCall`, `AgentEndpoints`, `RatingRow`'s market) are markers, so no render reaches a
 * network.
 */
const ATOM = `0x${"ab".repeat(32)}`;

const base: TrustPanelView = {
    caip19: "eip155:8453/erc721:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/2340",
    chainId: 8453,
    tokenId: "2340",
    registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    found: true,
    name: "Clawnch",
    description: "The economic layer for the agent economy.",
    image: null,
    isFallbackMetadata: false,
    url: "https://clawn.ch",
    owner: "0x729a121c00000000000000000000000070B1de1d",
    registrationFile: "https://clawn.ch/agent.json",
    atomTermId: ATOM,
    rows: [],
    capabilities: [],
    capabilityCount: 0,
    sourceErrors: [],
    conflicts: [],
};

type ProfileState = {
    data: TrustPanelView | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
};

const state = vi.hoisted(
    (): {profile: ProfileState | null; contexts: string[]; shares: bigint} => ({
        profile: null,
        contexts: [],
        shares: 0n,
    }),
);

vi.mock("../hooks/use-agent-profile", () => ({
    useAgentProfile: () => state.profile,
}));
vi.mock("../hooks/use-agent-lines", () => ({
    useAgentLines: () => ({
        data: {usedBy: [], used: [], contexts: state.contexts, truncated: false},
    }),
}));
vi.mock("../hooks/use-stake-session", () => ({useStakeSession: () => ({data: undefined})}));
vi.mock("../hooks/use-term-vault", () => ({
    useTermVault: () => ({data: {shares: state.shares}}),
}));
vi.mock("../hooks/use-listed-capabilities", () => ({useListedCapabilities: () => ({data: []})}));
vi.mock("../components/agent/AgentClaims", () => ({AgentClaims: () => <p>relations</p>}));
vi.mock("../components/agent/BeforeYouCall", () => ({BeforeYouCall: () => <p>before you call</p>}));
vi.mock("../components/agent/AgentEndpoints", () => ({
    AgentEndpoints: () => <p>endpoints list</p>,
}));
vi.mock("../components/agent/RatingRow", () => ({
    RatingRow: ({row}: {row: {providerName: string}}) => <p>{`rating by ${row.providerName}`}</p>,
}));

import {AgentTrustPanel} from "./AgentTrustPanel";

const refetch = vi.fn(async () => {});

function found(overrides: Partial<TrustPanelView> = {}): ProfileState {
    return {data: {...base, ...overrides}, isLoading: false, error: null, refetch};
}

function renderAt(at: string) {
    return renderWithProviders(<AgentTrustPanel />, {
        route: {path: "/agent/:chainId/:tokenId", at},
    });
}

beforeEach(() => {
    state.profile = found();
    state.contexts = [];
    state.shares = 0n;
    refetch.mockClear();
});

describe("AgentTrustPanel states", () => {
    it("explains the address shape when the token id is not decimal", () => {
        renderAt("/agent/8453/abc");
        expect(screen.getByText(/addressed by chain id and token id/)).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Look one up →"})).toHaveAttribute(
            "href",
            "/agents",
        );
    });

    it("treats a zero chain id as no address", () => {
        renderAt("/agent/0/12");
        expect(screen.getByText(/addressed by chain id and token id/)).toBeInTheDocument();
    });

    it("shows no page for one of ARP's own test agents and links the list", () => {
        renderAt("/agent/13579/5");
        expect(
            screen.getByRole("heading", {name: "Agent 13579:5 is one of ARP's tests"}),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "The list, and why"})).toHaveAttribute(
            "href",
            "/test-identities",
        );
    });

    it("names the agent it is resolving while the profile loads", () => {
        state.profile = {data: undefined, isLoading: true, error: null, refetch};
        renderAt("/agent/8453/2340");
        expect(screen.getByText(/resolving 8453:2340/)).toBeInTheDocument();
    });

    it("says every source failed and retries on a click", () => {
        state.profile = {data: undefined, isLoading: false, error: new Error("timeout"), refetch};
        renderAt("/agent/8453/2340");
        expect(
            screen.getByRole("heading", {name: "Could not read this agent"}),
        ).toBeInTheDocument();
        expect(screen.getByText(/timeout/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("renders nothing of the agent before a view exists", () => {
        state.profile = {data: undefined, isLoading: false, error: null, refetch};
        renderAt("/agent/8453/2340");
        expect(screen.queryByRole("heading")).toBeNull();
    });

    it("says no agent is registered under that token", () => {
        state.profile = found({found: false});
        renderAt("/agent/8453/2340");
        expect(screen.getByRole("heading", {name: "No agent there"})).toBeInTheDocument();
        expect(screen.getByText(base.caip19)).toBeInTheDocument();
    });

    it("names an unnamed agent by its token, flags stand-in metadata, and shows its avatar", () => {
        state.profile = found({
            name: null,
            isFallbackMetadata: true,
            image: "https://clawn.ch/avatar.png",
        });
        renderAt("/agent/8453/2340");
        expect(screen.getByRole("heading", {level: 1, name: "Token 2340"})).toBeInTheDocument();
        expect(screen.getByText(/indexer’s stand-in/)).toBeInTheDocument();
        const avatar = screen.getByRole("img", {name: "2340 avatar"});
        fireEvent.error(avatar);
        expect(screen.queryByRole("img", {name: "2340 avatar"})).toBeNull();
    });

    it("lists the contexts its lines name under the name", () => {
        state.contexts = ["security", "payments"];
        renderAt("/agent/8453/2340");
        const list = screen.getByRole("list", {name: "Contexts its lines name"});
        expect(list).toHaveTextContent("security");
        expect(list).toHaveTextContent("payments");
    });

    it("shows no relations block when the agent has no atom", () => {
        state.profile = found({atomTermId: null, description: null});
        renderAt("/agent/8453/2340");
        expect(screen.queryByText("relations")).toBeNull();
        expect(screen.queryByText(base.description ?? "")).toBeNull();
    });

    it("opens the endpoints section from its tab", () => {
        renderAt("/agent/8453/2340");
        fireEvent.click(screen.getByRole("tab", {name: /Endpoints/}));
        expect(screen.getByText("endpoints list")).toBeInTheDocument();
    });

    it("says nobody rated an agent with no provider, and that ARP publishes no rating", () => {
        renderAt("/agent/8453/2340?section=ratings");
        expect(screen.getByText("No trust provider has rated this agent.")).toBeInTheDocument();
        expect(screen.getByText("ARP publishes no rating, and will not.")).toBeInTheDocument();
    });

    it("stacks a single provider's rating without a strip", () => {
        const two = buildTrustPanel(richProfile());
        state.profile = found({rows: two.rows.slice(0, 1)});
        renderAt("/agent/8453/2340?section=ratings");
        expect(
            screen.getByText(`rating by ${two.rows[0]?.providerName ?? ""}`),
        ).toBeInTheDocument();
        expect(screen.queryByRole("heading", {name: "Ratings and agent data"})).toBeNull();
    });

    it("gives two providers one tab each and switches between them", () => {
        const two = buildTrustPanel(richProfile());
        const [first, second] = two.rows;
        if (first === undefined || second === undefined) throw new Error("fixture has two rows");
        state.profile = found({rows: two.rows});
        renderAt("/agent/8453/2340?section=ratings");

        expect(screen.getByRole("heading", {name: "Ratings and agent data"})).toBeInTheDocument();
        expect(screen.getByText(`rating by ${first.providerName}`)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("tab", {name: new RegExp(second.providerName)}));
        expect(screen.getByText(`rating by ${second.providerName}`)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("tab", {name: /^ARP/}));
        expect(screen.getByText("insufficient evidence")).toBeInTheDocument();
    });

    it("offers a Not read tab only when a source failed", () => {
        const two = buildTrustPanel(richProfile());
        state.profile = found({
            conflicts: two.conflicts,
            sourceErrors: [{sourceId: "intuition", step: "getMarkets", message: "down"}],
        });
        renderAt("/agent/8453/2340?section=unread");
        expect(screen.getByRole("tab", {name: /Not read/})).toHaveAttribute(
            "aria-selected",
            "true",
        );
    });
});
