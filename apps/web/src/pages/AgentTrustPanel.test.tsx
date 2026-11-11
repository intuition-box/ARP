import {screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../test/render";
import type {TrustPanelView} from "../services/agent-trust";
import {AgentTrustPanel} from "./AgentTrustPanel";

/**
 * The agent page is for reading (task 128, ADR `0193`): what the agent does first, then Before you
 * call, and no write a person makes on it. The reads are faked at the hook boundary; the two write
 * surfaces are replaced by markers so their absence is asserted directly, not inferred from copy.
 */

const ATOM = `0x${"ab".repeat(32)}`;
const view: TrustPanelView = {
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

vi.mock("../hooks/use-agent-profile", () => ({
    useAgentProfile: () => ({data: view, isLoading: false, error: null, refetch: vi.fn()}),
}));
vi.mock("../hooks/use-agent-lines", () => ({useAgentLines: () => ({data: undefined})}));
vi.mock("../hooks/use-stake-session", () => ({useStakeSession: () => ({data: undefined})}));
vi.mock("../hooks/use-term-vault", () => ({useTermVault: () => ({data: undefined})}));
vi.mock("../hooks/use-agent-contents", () => ({useAgentContents: () => ({data: undefined, isError: false})}));
vi.mock("../hooks/use-listed-capabilities", () => ({useListedCapabilities: () => ({data: []})}));
vi.mock("../components/agent/AgentClaims", () => ({AgentClaims: () => <p>relations</p>}));
vi.mock("../components/market/AtomMarket", () => ({AtomMarket: () => <p>support market</p>}));
vi.mock("../components/usage/DeclareUse", () => ({DeclareUse: () => <p>declare use</p>}));

describe("AgentTrustPanel", () => {
    it("reads the description before Before you call, and offers no market and no declaration", () => {
        renderWithProviders(<AgentTrustPanel />, {route: {path: "/agent/:chainId/:tokenId", at: "/agent/8453/2340"}});
        const description = screen.getByText(view.description ?? "");
        const before = screen.getByRole("heading", {name: "Before you call"});
        expect(description.compareDocumentPosition(before) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByText("relations")).toBeInTheDocument();
        expect(screen.queryByText("support market")).toBeNull();
        expect(screen.queryByText("declare use")).toBeNull();
    });
});
