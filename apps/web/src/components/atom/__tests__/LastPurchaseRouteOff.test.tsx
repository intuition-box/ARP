import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

// A build with an API whose `/x402/last-purchase` is off: the fetch maps its 404 to `null` (ADR 0200).
vi.mock("../../../hooks/use-last-purchase", () => ({
    hasLastPurchaseSource: true,
    useLastPurchase: () => ({data: null, isError: false}),
}));

import {LastPurchase} from "../LastPurchase";

describe("LastPurchase, with the API's route off", () => {
    it("shows no card at all, not a card that says it could not read", () => {
        render(<LastPurchase label="api.tickersfeed.net/econ/snapshot" />);
        expect(screen.queryByRole("region", {name: /last purchase/i})).toBeNull();
        expect(screen.queryByText("not read")).toBeNull();
    });
});
