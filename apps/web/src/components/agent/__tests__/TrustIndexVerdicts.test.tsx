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

    it("renders nothing when none of the agent's hosts was read", () => {
        file = OUTSIDE;
        read = document("https://never.example/a");
        const {container} = render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing until both the document and the reading are in", () => {
        file = undefined;
        read = document("https://pay.example/a");
        const {container} = render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        expect(container).toBeEmptyDOMElement();
    });
});
