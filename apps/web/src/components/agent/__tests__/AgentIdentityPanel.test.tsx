import {screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {renderWithProviders} from "../../../test/render";
import type {TrustPanelView} from "../../../services/agent-trust";
import {AgentIdentityPanel} from "../AgentIdentityPanel";

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
    registrationFile: "data:application/json;base64,e30=",
    atomTermId: null,
    rows: [],
    capabilities: [],
    capabilityCount: 0,
    sourceErrors: [],
    conflicts: [],
};

describe("AgentIdentityPanel", () => {
    it("names the operator, where it is registered and its URL, and nothing a person cannot use", () => {
        const {container} = renderWithProviders(<AgentIdentityPanel view={view} />);
        expect(screen.getByText("Operator")).toBeInTheDocument();
        expect(screen.getByText("Registered")).toBeInTheDocument();
        expect(screen.getByText("URL")).toBeInTheDocument();
        // The user, 2026-11-11: an agent reads these through the MCP server; a person never needed them.
        const text = container.textContent ?? "";
        expect(text).not.toContain("Registration file");
        expect(text).not.toContain("inline data URI");
        expect(text).not.toContain("CAIP-19");
        expect(text).not.toContain(view.caip19);
    });
});
