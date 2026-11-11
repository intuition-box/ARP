import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {LastPurchaseCard} from "../LastPurchase";
import type {LastPurchaseView} from "../../../services/last-purchase";

const TX = "0x7d12d72b606823236946b30f6d7c51f11143df93ee405a93701a0659a0f71997";
const failed: LastPurchaseView = {
    verdict: "not delivered",
    reason: "stale_data",
    delisted: false,
    day: "2026-10-30",
    tx: {hash: TX, href: `https://basescan.org/tx/${TX}`},
    listing: "https://api.nohumans.directory/v1/listings/80082624-3d7",
};
const pending: LastPurchaseView = {
    verdict: "…",
    reason: null,
    delisted: false,
    day: null,
    tx: null,
    listing: null,
};

describe("LastPurchaseCard", () => {
    it("gives the verdict, its code, the day and the transaction, and credits the source and licence", () => {
        render(<LastPurchaseCard view={failed} />);
        expect(screen.getByText("not delivered · stale_data")).toBeInTheDocument();
        expect(screen.getByText(/2026/)).toBeInTheDocument();
        expect(screen.getByRole("link", {name: `Settlement transaction ${TX}`})).toHaveAttribute(
            "href",
            `https://basescan.org/tx/${TX}`,
        );
        expect(screen.getByRole("link", {name: "nohumans.directory ↗"})).toHaveAttribute(
            "href",
            "https://api.nohumans.directory",
        );
        expect(screen.getByRole("link", {name: "CC BY 4.0 ↗"})).toHaveAttribute(
            "href",
            "https://creativecommons.org/licenses/by/4.0/",
        );
    });

    it("holds the same three lines while it loads, the credit included", () => {
        const {container} = render(<LastPurchaseCard view={pending} />);
        expect(screen.getByText("…")).toBeInTheDocument();
        expect(container.querySelectorAll("p")).toHaveLength(3);
        expect(screen.getByRole("link", {name: "nohumans.directory ↗"})).toBeInTheDocument();
    });

    it("is labelled as nohumans.directory's, not as an ARP line", () => {
        render(<LastPurchaseCard view={failed} />);
        expect(
            screen.getByRole("region", {name: "Last purchase, checked by nohumans.directory"}),
        ).toBeInTheDocument();
    });
});
