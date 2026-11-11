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
                {
                    rung: 4,
                    couldNotSay: false,
                    proofUrl: "https://mcp.example/mcp",
                    kinds: ["mcp"],
                    at: "2026-11-09T18:02:01.721Z",
                },
            ),
        };
        open();
        expect(screen.getByRole("heading", {name: "Before you call"})).toBeInTheDocument();
        expect(
            screen.getByText(
                "2 endpoints · A2A, MCP · x402 payment asked · no auth named · answered",
            ),
        ).toBeInTheDocument();
        expect(row("Endpoints")).toHaveTextContent("mcp.example");
        expect(row("Endpoints")).toHaveTextContent("1 no probe can reach");
        // The summary names the protocols, so no row repeats them; the rows sit folded under it.
        expect(screen.queryByText("Speaks")).toBeNull();
        expect(row("Endpoints").closest("details")?.querySelector("summary")).toHaveTextContent(
            "Details",
        );
        expect(row("Answered")).toHaveTextContent("answered · mcp");
        expect(row("Payment")).toHaveTextContent("x402 asked");
        expect(row("Auth")).toHaveTextContent("none named");
    });

    it("keeps every row when the document declares nothing, and says what is missing", () => {
        data = {status: "read", url: agent.registrationFile, contents: readAgentContents({}, null)};
        open();
        for (const term of ["Endpoints", "Answered", "Payment", "Auth"])
            expect(row(term)).toBeInTheDocument();
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

    it("says the document could not be read when the read failed", () => {
        data = undefined;
        isError = true;
        open();
        expect(screen.getByText("could not be read")).toBeInTheDocument();
        expect(row("Payment")).toHaveTextContent("—");
        isError = false;
    });

    it("links an unreadable document only when it has an http address", () => {
        data = {status: "unreadable", href: "https://agent.example/card.json", detail: "404"};
        const first = open();
        expect(screen.getByRole("link", {name: "document unreadable ↗"})).toHaveAttribute(
            "href",
            "https://agent.example/card.json",
        );
        first.unmount();
        data = {status: "unreadable", href: null, detail: "not http"};
        open();
        expect(screen.getByText("document unreadable")).toBeInTheDocument();
        expect(screen.queryByRole("link")).toBeNull();
    });

    const base = readAgentContents({}, null);
    const read = (contents: typeof base): AgentContentsRead => ({
        status: "read",
        url: agent.registrationFile,
        contents,
    });

    it("tells a failed reading apart from an endpoint that did not answer", () => {
        data = read({
            ...base,
            answers: {status: "no answer", couldNotSay: true, at: "2026-11-09T00:00:00Z"},
        });
        const first = open();
        expect(row("Answered")).toHaveTextContent("no verdict");
        first.unmount();
        data = read({
            ...base,
            answers: {status: "no answer", couldNotSay: false, at: "2026-11-09T00:00:00Z"},
        });
        open();
        expect(row("Answered")).toHaveTextContent("no answer");
    });

    it("says answered without a protocol or a proof, and names the auth asked for", () => {
        data = read({
            ...base,
            auth: ["bearer", "oauth2"],
            answers: {status: "answered", speaks: [], proofUrl: null, at: "2026-11-09T00:00:00Z"},
        });
        open();
        expect(row("Answered")).toHaveTextContent(/^Answeredanswered$/);
        expect(row("Auth")).toHaveTextContent("bearer, oauth2");
    });
});
