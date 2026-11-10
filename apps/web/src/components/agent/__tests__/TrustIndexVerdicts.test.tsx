import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import type {DeclaredEndpoint, OutsideSignals} from "@arp-protocol/core";

import type {EndpointRead} from "../../../services/agent-endpoints";
import {OUTSIDE} from "../../../test/outside-fixture";

let read: EndpointRead | undefined;
let file: OutsideSignals | undefined;
vi.mock("../../../hooks/use-agent-endpoints", () => ({useAgentEndpoints: () => ({data: read})}));
vi.mock("../../../hooks/use-outside-signals", () => ({useOutsideSignals: () => file}));

import {TrustIndexVerdicts} from "../TrustIndexVerdicts";

const endpoint = (url: string): DeclaredEndpoint => ({
    declaredUnder: "services",
    name: "x402",
    protocol: null,
    version: null,
    capabilities: [],
    classification: {status: "probeable", url, declared: url},
});
const document = (...urls: string[]): EndpointRead => ({
    status: "read",
    url: "https://agent.example/card.json",
    probeable: urls.map(endpoint),
    notCheckable: [],
});

describe("TrustIndexVerdicts", () => {
    it("shows the index's word on each endpoint whose host it read, and credits it as its licence asks", () => {
        file = OUTSIDE;
        read = document("https://pay.example/a", "https://pay.example/mcp", "https://never.example/a");
        render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        // One line, which opens on the verdicts: the row's height does not depend on them.
        expect(screen.getByText(/: 2 endpoints read$/)).toBeInTheDocument();
        expect(screen.getByText("go · payable 8/9 days ↗")).toHaveAttribute(
            "href",
            `https://x402-doctor.fizzl.eu/api/trust?url=${encodeURIComponent("https://pay.example/a")}`,
        );
        expect(screen.getByText("not listed · its host 4/5 go ↗")).toBeInTheDocument();
        // Not asked is not "not listed": the third endpoint is left out.
        expect(screen.queryByText("https://never.example/a")).toBeNull();
        expect(screen.getByText(/x402 Trust Index by x402 Doctor \(fizzl\.eu\) · CC BY 4\.0/)).toHaveAttribute(
            "href",
            "https://huggingface.co/datasets/x402Fizzl/x402-trust-index",
        );
    });

    it("holds one line saying the reading did not ask about it, never a verdict", () => {
        file = OUTSIDE;
        read = document("https://never.example/a");
        render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        expect(screen.getByText("x402 Trust Index: not in its reading")).toBeInTheDocument();
        expect(screen.queryByText(/not listed/)).toBeNull();
    });

    it("holds the same one line while the document or the reading loads", () => {
        file = undefined;
        read = document("https://pay.example/a");
        render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        expect(screen.getByText("x402 Trust Index …")).toBeInTheDocument();
    });
});
