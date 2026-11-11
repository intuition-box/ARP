import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import type {DeclaredEndpoint, OutsideSignals} from "@arp-protocol/core";

import type {EndpointRead} from "../../../services/agent-endpoints";
import {formatDay} from "../../../lib/atom-page";
import {OUTSIDE} from "../../../test/outside-fixture";

let read: EndpointRead | undefined;
let readFailed = false;
let file: OutsideSignals | undefined;
vi.mock("../../../hooks/use-agent-endpoints", () => ({
    useAgentEndpoints: () => ({data: read, isError: readFailed}),
}));
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
        read = document(
            "https://pay.example/a",
            "https://pay.example/mcp",
            "https://never.example/a",
        );
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
        expect(
            screen.getByText(/x402 Trust Index by x402 Doctor \(fizzl\.eu\) · CC BY 4\.0/),
        ).toHaveAttribute("href", "https://huggingface.co/datasets/x402Fizzl/x402-trust-index");
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

    it("words an unreachable and a no-go endpoint, counts one in the singular, and drops a missing day", () => {
        file = {
            ...OUTSIDE,
            sources: {...OUTSIDE.sources, trustIndex: {...OUTSIDE.sources.trustIndex, scan: null}},
            x402: {
                ...OUTSIDE.x402,
                urls: {
                    "https://pay.example/a": {
                        verdict: "error",
                        reasons: [],
                        priceUsd: null,
                        daysChecked: 3,
                        daysPayable: 0,
                    },
                },
            },
        };
        read = document("https://pay.example/a");
        const first = render(
            <TrustIndexVerdicts registrationFile="https://agent.example/card.json" />,
        );
        expect(screen.getByText("x402 Trust Index: 1 endpoint read")).toBeInTheDocument();
        expect(screen.getByText("unreachable · payable 0/3 days ↗")).toBeInTheDocument();
        // No scan date in the file: the credit is dated by the day the file was read.
        expect(
            screen.getByRole("link", {name: /x402 Trust Index by/, hidden: true}),
        ).toHaveTextContent(new RegExp(`^${formatDay("2026-11-10")} · `));
        first.unmount();

        file = {
            ...OUTSIDE,
            x402: {
                ...OUTSIDE.x402,
                urls: {
                    "https://pay.example/a": {
                        verdict: "no_go",
                        reasons: [],
                        priceUsd: null,
                        daysChecked: 3,
                        daysPayable: 1,
                    },
                },
            },
        };
        render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        expect(screen.getByText("no go · payable 1/3 days ↗")).toBeInTheDocument();
    });

    it("says not listed for a host it asked about and found nothing on", () => {
        file = OUTSIDE;
        read = document("https://quiet.example/a");
        render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        expect(screen.getByText("not listed ↗")).toBeInTheDocument();
    });

    it("reads nothing from a document that failed or has no callable endpoint", () => {
        file = OUTSIDE;
        read = undefined;
        readFailed = true;
        const first = render(
            <TrustIndexVerdicts registrationFile="https://agent.example/card.json" />,
        );
        expect(screen.getByText("x402 Trust Index: not in its reading")).toBeInTheDocument();
        first.unmount();
        readFailed = false;
        read = {
            status: "read",
            url: "https://agent.example/card.json",
            probeable: [
                {
                    ...endpoint("https://pay.example/a"),
                    classification: {
                        status: "not-checkable",
                        code: "templated",
                        declared: "https://pay.example/{id}",
                    },
                },
            ],
            notCheckable: [],
        };
        render(<TrustIndexVerdicts registrationFile="https://agent.example/card.json" />);
        expect(screen.getByText("x402 Trust Index: not in its reading")).toBeInTheDocument();
    });
});
