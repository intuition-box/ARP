import {fireEvent, screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {ActivityPage} from "./ActivityPage";
import type {ChainReads} from "../hooks/use-chain-facts";
import {renderWithProviders} from "../test/render";

const NOTHING: ChainReads = {fetchRecent: async () => [], fetchStakes: async () => []};
const HASH = `0x${"e".repeat(64)}`;
const LATER = `0x${"f".repeat(64)}`;

describe("the activity page", () => {
    it("lists every agent's declarations and stakes from the indexer, newest first", async () => {
        const end = (atomId: string, label: string) => ({atomId, label});
        const reads: ChainReads = {
            fetchRecent: async () => [
                {
                    tripleId: "claim-1",
                    at: "2026-10-30T13:17:10+00:00",
                    txHash: HASH,
                    subject: end("a8", "Agent 13579:8"),
                    object: end("t1", "writing-plans"),
                    assets: null,
                    positions: 1,
                },
            ],
            fetchStakes: async () => [
                {
                    id: `${LATER}-2`,
                    kind: "deposit",
                    at: "2026-10-30T13:17:27+00:00",
                    txHash: LATER,
                    tripleId: "claim-1",
                    subject: end("a8", "Agent 13579:8"),
                    object: end("t1", "writing-plans"),
                    account: "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF",
                    receiver: "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF",
                    assets: 2000000000000000n,
                },
                {
                    // In the transaction that wrote the claim: shown on the declaration's row.
                    id: `${HASH}-4`,
                    kind: "deposit",
                    at: "2026-10-30T13:17:10+00:00",
                    txHash: HASH,
                    tripleId: "claim-1",
                    subject: end("a8", "Agent 13579:8"),
                    object: end("t1", "writing-plans"),
                    account: "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF",
                    receiver: "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF",
                    assets: 990000000000000n,
                },
            ],
        };
        renderWithProviders(<ActivityPage reads={reads} />);

        const table = await screen.findByRole("table", {name: /public/i});
        const rows = within(table).getAllByRole("row").slice(1);
        expect(rows).toHaveLength(2);
        expect(within(rows[0]!).getByText(/supported/)).toBeTruthy();
        expect(within(rows[0]!).getByText("by 0xB86F…7FCF")).toBeTruthy();
        expect(within(rows[1]!).getByText(/declared/)).toBeTruthy();
        expect(within(rows[1]!).getByText(/0\.00099/)).toBeTruthy();
        expect(within(rows[1]!).getByText("Agent 13579:8")).toBeTruthy();
    });

    it("marks the rows incomplete when one of the two reads fails", async () => {
        const reads: ChainReads = {
            fetchRecent: async () => [
                {
                    tripleId: "claim-1",
                    at: "2026-10-30T13:17:10+00:00",
                    txHash: HASH,
                    subject: {atomId: "a8", label: "Agent 13579:8"},
                    object: {atomId: "t1", label: "writing-plans"},
                    assets: null,
                    positions: 0,
                },
            ],
            fetchStakes: async () => {
                throw new Error("indexer down");
            },
        };
        renderWithProviders(<ActivityPage reads={reads} />);
        expect(
            await screen.findByRole("heading", {name: /every agent · incomplete, one read failed/}),
        ).toBeTruthy();
        expect(screen.getByText("Agent 13579:8")).toBeTruthy();
    });

    it("says the indexer did not answer when both reads fail", async () => {
        const down = async () => {
            throw new Error("indexer down");
        };
        renderWithProviders(
            <ActivityPage reads={{fetchRecent: down, fetchStakes: down}} />,
        );
        expect(await screen.findByText(/The indexer did not answer/)).toBeTruthy();
        expect(screen.queryByRole("table", {name: /public/i})).toBeNull();
    });

    it("says there is no activity yet, how to be the first, and where the hidden tests are", async () => {
        renderWithProviders(<ActivityPage reads={NOTHING} />);
        expect(await screen.findByText("No activity yet.")).toBeTruthy();
        expect(screen.getByRole("link", {name: "get started"}).getAttribute("href")).toBe("/start/claude");
        expect(screen.getByRole("link", {name: "hidden"}).getAttribute("href")).toBe("/test-identities");
    });
});

describe("the public table", () => {
    const end = (atomId: string, label: string) => ({atomId, label});
    const reads: ChainReads = {
        fetchRecent: async () => [
            {
                tripleId: "claim-1",
                at: "2026-10-30T13:17:10+00:00",
                txHash: HASH,
                subject: end("a8", "Agent 13579:8"),
                object: end("t1", "writing-plans"),
                assets: null,
                positions: 1,
            },
        ],
        fetchStakes: async () => [
            {
                id: `${LATER}-2`,
                kind: "deposit",
                at: "2026-10-30T13:17:27+00:00",
                txHash: LATER,
                tripleId: "claim-1",
                subject: end("a8", "Agent 13579:8"),
                object: end("t1", "writing-plans"),
                account: "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF",
                receiver: "0xB86F5f4E338eCEEC5DD095f48acF764465587FCF",
                assets: 2000000000000000n,
            },
        ],
    };

    it("links each row's agent and tool to their pages (task 48)", async () => {
        renderWithProviders(<ActivityPage reads={reads} />);
        const table = await screen.findByRole("table", {name: /every agent/i});
        const [agent] = within(table).getAllByRole("link", {name: "Agent 13579:8"});
        expect(agent).toHaveAttribute("href", "/atom/a8");
        const [tool] = within(table).getAllByRole("link", {name: "writing-plans"});
        expect(tool).toHaveAttribute("href", "/atom/t1");
    });

    it("narrows the public table to one kind", async () => {
        renderWithProviders(<ActivityPage reads={reads} />);
        const table = await screen.findByRole("table", {name: /every agent/i});
        expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
        fireEvent.click(screen.getByRole("button", {name: "Supported"}));
        const narrowed = screen.getByRole("table", {name: /every agent/i});
        expect(within(narrowed).getAllByRole("row").slice(1)).toHaveLength(1);
        fireEvent.click(screen.getByRole("button", {name: "Withdrawn"}));
        expect(screen.getByText("None of this kind among the latest public rows.")).toBeTruthy();
    });
});

describe("a row the indexer gave less for", () => {
    it("prints a dash for a time it cannot read, no transaction link without a hash, and a skill's repository", async () => {
        const reads: ChainReads = {
            fetchRecent: async () => [],
            fetchStakes: async () => [
                {
                    id: "no-hash-1",
                    kind: "redeem",
                    at: "not a time",
                    txHash: null,
                    tripleId: "claim-2",
                    subject: {atomId: "a9", label: "Agent 13579:9"},
                    object: {atomId: "t2", label: "github.com/obra/superpowers?skill=writing-plans"},
                    account: null,
                    receiver: null,
                    assets: null,
                },
            ],
        };
        renderWithProviders(<ActivityPage reads={reads} />);
        const table = await screen.findByRole("table", {name: /every agent/i});
        const [row] = within(table).getAllByRole("row").slice(1);
        if (row === undefined) throw new Error("one row");
        expect(within(row).getByText("—")).toBeTruthy();
        expect(within(row).getByText("withdrew")).toBeTruthy();
        expect(within(row).getByText("obra/superpowers")).toBeTruthy();
        expect(within(row).queryByRole("link", {name: /Transaction/})).toBeNull();
        expect(within(row).queryByText(/^by /)).toBeNull();
    });
});

describe("one view (2026-11-10)", () => {
    it("has no Yours view, no positions and no local runtime", async () => {
        renderWithProviders(<ActivityPage reads={NOTHING} />, {
            route: {path: "/activity", at: "/activity?view=yours"},
        });
        expect(await screen.findByText("No activity yet.")).toBeTruthy();
        expect(screen.queryByRole("button", {name: /^Yours/})).toBeNull();
        expect(screen.queryByRole("heading", {name: "Your support"})).toBeNull();
        expect(screen.queryByText(/This machine/)).toBeNull();
    });
});
