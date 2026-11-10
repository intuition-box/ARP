import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {readAgentContents} from "@arp-protocol/core";

import type {AgentContentsRead} from "../../../services/agent-contents";

let data: AgentContentsRead | undefined;
let isError = false;
vi.mock("../../../hooks/use-agent-contents", () => ({useAgentContents: () => ({data, isError})}));

import {AgentContains} from "../AgentContains";

const agent = {registrationFile: "https://agent.example/card.json", chainId: 8453, tokenId: "7"};
const open = () => render(<AgentContains agent={agent} />);

describe("AgentContains", () => {
    it("lists what the document declares and when the agent answered", () => {
        isError = false;
        data = {
            status: "read",
            url: agent.registrationFile,
            contents: readAgentContents(
                {
                    x402Support: true,
                    services: [
                        {name: "MCP", endpoint: "https://mcp.example/mcp"},
                        {name: "A2A", endpoint: "https://a2a.example/{agentId}"},
                    ],
                },
                {rung: 4, couldNotSay: false, proofUrl: "https://mcp.example/mcp", kinds: ["mcp"], at: "2026-11-09T18:02:01.721Z"},
            ),
        };
        open();
        expect(screen.getByText("Contains")).toBeInTheDocument();
        expect(screen.getByText(/MCP mcp\.example/)).toBeInTheDocument();
        expect(screen.getByText(/A2A templated/)).toBeInTheDocument();
        expect(screen.getByText("declared")).toBeInTheDocument();
        expect(screen.getByText("none named")).toBeInTheDocument();
        expect(screen.getByText(/answered · mcp/)).toBeInTheDocument();
    });

    it("says silence on auth is none named, and a failed reading is no verdict", () => {
        data = {
            status: "read",
            url: agent.registrationFile,
            contents: readAgentContents({services: []}, {rung: 2, couldNotSay: true, proofUrl: null, kinds: [], at: "2026-11-09T18:02:01.721Z"}),
        };
        open();
        expect(screen.getByText("none declared")).toBeInTheDocument();
        expect(screen.getByText("not declared")).toBeInTheDocument();
        expect(screen.getByText("no verdict")).toBeInTheDocument();
    });

    it("keeps the link to a document it could not read, and says when there is none", () => {
        data = {status: "unreadable", href: "https://agent.example/card.json", detail: "CORS"};
        const {unmount} = open();
        expect(screen.getByRole("link", {name: "document unreadable ↗"})).toHaveAttribute("href", "https://agent.example/card.json");
        unmount();
        data = {status: "none"};
        open();
        expect(screen.getByText("no registration document")).toBeInTheDocument();
    });

    it("says not read for an agent outside the dated reading", () => {
        data = {status: "read", url: agent.registrationFile, contents: readAgentContents({}, null)};
        open();
        expect(screen.getByText("not read")).toBeInTheDocument();
    });
});
