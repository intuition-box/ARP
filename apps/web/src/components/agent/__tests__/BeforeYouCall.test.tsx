import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {readAgentContents} from "@arp-protocol/core";

import type {AgentContentsRead} from "../../../services/agent-contents";

let data: AgentContentsRead | undefined;
let isError = false;
vi.mock("../../../hooks/use-agent-contents", () => ({useAgentContents: () => ({data, isError})}));
// The Payment row's x402 Doctor verdicts have their own test; here they read nothing.
vi.mock("../TrustIndexVerdicts", () => ({TrustIndexVerdicts: () => null}));

import {BeforeYouCall} from "../BeforeYouCall";

const agent = {registrationFile: "https://agent.example/card.json", chainId: 8453, tokenId: "7"};
const open = () => render(<BeforeYouCall agent={agent} />);

/** The row a term labels: its `dt`'s parent. */
function row(term: string): HTMLElement {
    const dt = screen.getByText(term, {selector: "dt"});
    if (dt.parentElement === null) throw new Error(`no row for ${term}`);
    return dt.parentElement;
}

describe("BeforeYouCall", () => {
    it("answers can I reach it, what it speaks, whether it answered, and what it asks for", () => {
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
        expect(screen.getByRole("heading", {name: "Before you call"})).toBeInTheDocument();
        expect(
            screen.getByText("2 endpoints · A2A, MCP · x402 payment asked · no auth named · answered"),
        ).toBeInTheDocument();
        expect(row("Endpoints")).toHaveTextContent("mcp.example");
        expect(row("Endpoints")).toHaveTextContent("1 no probe can reach");
        expect(row("Speaks")).toHaveTextContent("A2A, MCP");
        expect(row("Answered")).toHaveTextContent("answered · mcp");
        expect(row("Payment")).toHaveTextContent("x402 asked");
        expect(row("Auth")).toHaveTextContent("none named");
    });

    it("keeps every row when the document declares nothing, and says what is missing", () => {
        data = {status: "read", url: agent.registrationFile, contents: readAgentContents({}, null)};
        open();
        for (const term of ["Endpoints", "Speaks", "Answered", "Payment", "Auth"]) expect(row(term)).toBeInTheDocument();
        expect(row("Endpoints")).toHaveTextContent("none declared");
        expect(row("Answered")).toHaveTextContent("not in the reading");
        expect(row("Payment")).toHaveTextContent("none declared");
    });

    it("says there is no document, and keeps every row", () => {
        data = {status: "none"};
        open();
        expect(screen.getByText("no registration document")).toBeInTheDocument();
        // The rows stay, so the description below does not move up when the answer is "none".
        expect(row("Endpoints")).toHaveTextContent("—");
    });

    it("keeps the summary line while the document loads", () => {
        data = undefined;
        open();
        expect(row("Payment")).toHaveTextContent("…");
    });
});
