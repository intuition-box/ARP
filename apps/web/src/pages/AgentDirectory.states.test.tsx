import {HttpError, ListAgentsFailedError, NoListingSourceError} from "@arp-protocol/core";
import {fireEvent, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi, type Mock} from "vitest";

import type {CohortRow, CohortView} from "../services/agent-cohort";
import {renderWithProviders} from "../test/render";

/**
 * The full index's own states: loading, three kinds of failure, an unknown total, hidden test
 * identities, a page still being read, paging and the order control. Rendered on mainnet, where
 * the sieve's testnet reading does not apply and the page lists the whole index. The cohort is
 * mocked at its hook; the hook's arguments are recorded so paging and ordering are asserted as the
 * read they ask for.
 */
type CohortState = {
    data: CohortView | undefined;
    error: Error | null;
    isPlaceholderData: boolean;
};

const cohort = vi.hoisted(
    (): {
        state: CohortState;
        calls: [string, number][];
        refetch: Mock<() => Promise<undefined>>;
    } => ({
        state: {data: undefined, error: null, isPlaceholderData: false},
        calls: [],
        refetch: vi.fn(async () => undefined),
    }),
);

vi.mock("../hooks/use-agent-cohort", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../hooks/use-agent-cohort")>()),
    useAgentCohort: (order: string, offset: number) => {
        cohort.calls.push([order, offset]);
        return {...cohort.state, refetch: cohort.refetch};
    },
}));

import {AgentDirectory} from "./AgentDirectory";

const row: CohortRow = {
    key: "a",
    sigilId: "0x01",
    name: "Captain Dackie",
    isFallbackMetadata: false,
    imageUrl: null,
    modules: [],
    href: "/agent/8453/1",
    identityProblem: null,
    statementCount: 3,
    marketCap: "6.337 TRUST",
    marketCapExact: "6.3369302 TRUST",
    positions: "1 support",
    isUnsupported: false,
};

function view(overrides: Partial<CohortView> = {}): CohortView {
    return {
        sourceId: "test",
        order: "evidence-quantity",
        total: 1234,
        rangeLabel: "1–25 of 1,234",
        limit: 25,
        offset: 0,
        hasPrevious: false,
        hasNext: true,
        hiddenCount: 0,
        rows: [row],
        ...overrides,
    };
}

function lastCall(): [string, number] | undefined {
    return cohort.calls[cohort.calls.length - 1];
}

beforeEach(() => {
    cohort.state = {data: view(), error: null, isPlaceholderData: false};
    cohort.calls = [];
    cohort.refetch.mockClear();
});

describe("the full agent index", () => {
    it("shows the total in the header", () => {
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByText("1,234")).toBeInTheDocument();
    });

    it("shows a dash for a total the source could not count", () => {
        cohort.state = {data: view({total: null}), error: null, isPlaceholderData: false};
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("says it is reading the cohort before the first page arrives", () => {
        cohort.state = {data: undefined, error: null, isPlaceholderData: false};
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByText("—")).toBeInTheDocument();
        expect(screen.getByText("Reading the cohort")).toBeInTheDocument();
    });

    it("pages forward and back, and restarts paging when the order changes", () => {
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByRole("button", {name: "← Previous"})).toBeDisabled();
        fireEvent.click(screen.getByRole("button", {name: "Next →"}));
        expect(lastCall()).toEqual(["evidence-quantity", 25]);

        cohort.state = {
            data: view({hasPrevious: true, offset: 25}),
            error: null,
            isPlaceholderData: false,
        };
        fireEvent.click(screen.getByRole("button", {name: "Next →"}));
        expect(lastCall()).toEqual(["evidence-quantity", 50]);
        fireEvent.click(screen.getByRole("button", {name: "← Previous"}));
        expect(lastCall()).toEqual(["evidence-quantity", 25]);

        fireEvent.click(screen.getByRole("button", {name: "Most supported"}));
        expect(lastCall()).toEqual(["economic-conviction", 0]);
        expect(screen.getByRole("button", {name: "Most supported"})).toHaveAttribute(
            "aria-pressed",
            "true",
        );
    });

    it("says a page is still being read while the previous one is shown", () => {
        cohort.state = {data: view(), error: null, isPlaceholderData: true};
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByText(/· reading…/)).toBeInTheDocument();
    });

    it("links one hidden test identity, and counts several", () => {
        cohort.state = {data: view({hiddenCount: 1}), error: null, isPlaceholderData: false};
        const {unmount} = renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByRole("link", {name: "ARP test identity hidden"})).toHaveAttribute(
            "href",
            "/test-identities",
        );
        unmount();

        cohort.state = {data: view({hiddenCount: 3}), error: null, isPlaceholderData: false};
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByRole("link", {name: "ARP test identities hidden"})).toBeInTheDocument();
    });

    it("names a failed read and retries it", () => {
        cohort.state = {data: undefined, error: new Error("HTTP 502"), isPlaceholderData: false};
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByText("The cohort could not be read")).toBeInTheDocument();
        expect(screen.getByText(/HTTP 502/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Try again"}));
        expect(cohort.refetch).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("button", {name: /instead$/})).toBeNull();
    });

    it("offers the other order when the indexer timed out", () => {
        const timeout = new HttpError("timeout", "deadline", 10_000);
        cohort.state = {
            data: undefined,
            error: new ListAgentsFailedError(
                [{sourceId: "intuition", step: "listAgents", message: "deadline"}],
                [timeout],
            ),
            isPlaceholderData: false,
        };
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByText("The indexer did not answer in time")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: "Order by most supported instead"}));
        expect(lastCall()).toEqual(["economic-conviction", 0]);
    });

    it("offers no retry when nothing configured can list agents", () => {
        cohort.state = {
            data: undefined,
            error: new NoListingSourceError(["erc8004-registry"]),
            isPlaceholderData: false,
        };
        renderWithProviders(<AgentDirectory />, {mainnet: true});
        expect(screen.getByText("Nothing configured here can list agents")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Try again"})).toBeNull();
    });
});
