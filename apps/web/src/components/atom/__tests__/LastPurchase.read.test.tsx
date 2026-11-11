import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {NOHUMANS_SOURCE, type LastPurchaseAnswer} from "../../../services/last-purchase";
import {LastPurchase, LastPurchaseCard} from "../LastPurchase";

/** The read is the hook's; the card's states come from what the hook answers. */
const state = vi.hoisted(() => ({
    hasSource: true,
    query: {isError: false, data: undefined} as {
        isError: boolean;
        data: LastPurchaseAnswer | undefined;
    },
}));
const useLastPurchase = vi.hoisted(() =>
    vi.fn<(endpoint: string | null) => typeof state.query>(() => state.query),
);

vi.mock("../../../hooks/use-last-purchase", () => ({
    get hasLastPurchaseSource() {
        return state.hasSource;
    },
    useLastPurchase,
}));

const TX = "0x7d12d72b606823236946b30f6d7c51f11143df93ee405a93701a0659a0f71997";

function answer(): LastPurchaseAnswer {
    return {
        source: NOHUMANS_SOURCE,
        network: "eip155:8453",
        endpoint: "https://api.example.com/x",
        fetchedAt: "2026-11-11T10:00:00Z",
        listing: "https://api.nohumans.directory/v1/listings/1",
        match: "active",
        purchase: {at: "2026-11-01T00:00:00Z", delivered: true, reason: null, tx: TX},
    };
}

beforeEach(() => {
    state.hasSource = true;
    state.query = {isError: false, data: undefined};
    useLastPurchase.mockClear();
});

describe("LastPurchase, reading", () => {
    it("shows nothing on a label that is not an endpoint, and asks nothing for it", () => {
        const {container} = render(<LastPurchase label="a skill name" />);
        expect(container).toBeEmptyDOMElement();
        expect(useLastPurchase).toHaveBeenCalledWith(null);
    });

    it("shows nothing when the build has no source to ask", () => {
        state.hasSource = false;
        const {container} = render(<LastPurchase label="api.example.com/x" />);
        expect(container).toBeEmptyDOMElement();
        expect(useLastPurchase).toHaveBeenCalledWith(null);
    });

    it("holds an ellipsis while the read runs, and asks for the endpoint with its scheme", () => {
        render(<LastPurchase label="api.example.com/x" />);
        expect(screen.getByText("…")).toBeInTheDocument();
        expect(useLastPurchase).toHaveBeenCalledWith("https://api.example.com/x");
    });

    it("says it was not read when the read failed", () => {
        state.query = {isError: true, data: undefined};
        render(<LastPurchase label="https://api.example.com/x" />);
        expect(screen.getByText("not read")).toBeInTheDocument();
    });

    it("gives the verdict once the read answers", () => {
        state.query = {isError: false, data: answer()};
        render(<LastPurchase label="https://api.example.com/x" />);
        expect(screen.getByText("delivered")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: `Settlement transaction ${TX}`})).toHaveAttribute(
            "href",
            `https://basescan.org/tx/${TX}`,
        );
    });
});

describe("LastPurchaseCard, the record's other shapes", () => {
    it("links the record when nothing was ever bought, and says the listing was removed", () => {
        render(
            <LastPurchaseCard
                view={{
                    verdict: "never bought there",
                    reason: null,
                    delisted: true,
                    day: null,
                    tx: null,
                    listing: "https://api.nohumans.directory/v1/listings/2",
                }}
            />,
        );
        expect(screen.getByText("never bought there · delisted")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "record ↗"})).toHaveAttribute(
            "href",
            "https://api.nohumans.directory/v1/listings/2",
        );
    });

    it("prints a transaction it cannot link as its short hash", () => {
        render(
            <LastPurchaseCard
                view={{
                    verdict: "delivered",
                    reason: null,
                    delisted: false,
                    day: "2026-11-01",
                    tx: {hash: TX, href: null},
                    listing: null,
                }}
            />,
        );
        expect(screen.getByText("0x7d12…1997")).toBeInTheDocument();
        expect(screen.queryByRole("link", {name: /Settlement transaction/})).toBeNull();
    });

    it("prints only the day when the purchase named no transaction", () => {
        render(
            <LastPurchaseCard
                view={{
                    verdict: "delivered",
                    reason: null,
                    delisted: false,
                    day: "2026-11-01",
                    tx: null,
                    listing: null,
                }}
            />,
        );
        expect(screen.queryByText(/ · /)).toBeNull();
        expect(screen.getByText(/2026/)).toBeInTheDocument();
    });
});
