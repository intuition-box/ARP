import {fireEvent, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import type {ListToolResult} from "../services/list-tool";
import type {ProposeCategoryResult} from "../services/propose-category";

const listing: {
    available: boolean;
    submit: ReturnType<typeof vi.fn>;
    pending: boolean;
    result: ListToolResult | null;
} = {available: true, submit: vi.fn(), pending: false, result: null};

vi.mock("../hooks/use-list-tool", () => ({useListTool: () => listing}));

const proposal: {
    available: boolean;
    submit: ReturnType<typeof vi.fn>;
    pending: boolean;
    result: ProposeCategoryResult | null;
} = {available: true, submit: vi.fn(), pending: false, result: null};

vi.mock("../hooks/use-propose-category", () => ({useProposeCategory: () => proposal}));
vi.mock("../hooks/use-domain-tree", () => ({
    useDomainTree: () => ({
        tree: undefined,
        error: null,
        options: [
            {label: "design", depth: 1},
            {label: "payment", depth: 1},
        ],
    }),
}));

beforeEach(() => {
    listing.available = true;
    listing.submit = vi.fn();
    listing.pending = false;
    listing.result = null;
    proposal.available = true;
    proposal.submit = vi.fn();
    proposal.pending = false;
    proposal.result = null;
});

import {StartPage} from "./StartPage";
import {RouteTransition} from "../components/brand/RouteTransition";
import {ActivityLog} from "../services/activity-log";
import {AgentFeed, type EventSourceLike} from "../services/agent-feed";
import {renderWithProviders} from "../test/render";

function feedWith(events: unknown[]) {
    const source: EventSourceLike = {
        onopen: null,
        onmessage: null,
        onerror: null,
        close: () => undefined,
    };
    const feed = new AgentFeed(new ActivityLog(), {
        url: "http://feed",
        open: () => source,
        readReceipt: async () => null,
    });
    return {
        feed,
        deliver: () => {
            source.onopen?.(new Event("open"));
            for (const event of events)
                source.onmessage?.(new MessageEvent("message", {data: JSON.stringify(event)}));
        },
    };
}

const at = (profile: string) => ({route: {path: "/start/:profile", at: `/start/${profile}`}});

describe("the start page", () => {
    it("shows the Claude path with no wallet word, and ticks the connection when the agent is live", async () => {
        const {feed, deliver} = feedWith([]);
        renderWithProviders(<StartPage feed={feed} />, at("claude"));

        expect(await screen.findByRole("heading", {name: "I use Claude"})).toBeTruthy();
        expect(screen.queryByText(/wallet|testnet|chain|trust/i)).toBeNull();
        expect(screen.getAllByText("to do")).toHaveLength(2);

        deliver();
        await waitFor(() => expect(screen.getAllByText("to do")).toHaveLength(1));
    });

    it("offers the example prompt as words to say, not a shell command", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("claude"));
        const prompt = await screen.findByText(/with ARP\./);
        expect(prompt.textContent?.startsWith("$")).toBe(false);
    });

    it("sends a pasted repository URL to the search page", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        const field = await screen.findByLabelText("Repository URL");
        fireEvent.change(field, {target: {value: "github.com/Wieedze/ARP"}});
        fireEvent.click(screen.getByRole("button", {name: "Find"}));
        await waitFor(() => expect(screen.queryByLabelText("Repository URL")).toBeNull());
    });

    it("lists a tool through the sponsor and links to its page", async () => {
        listing.result = {status: "listed", atomId: "0xabc", created: true, transactions: []};
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        fireEvent.change(await screen.findByLabelText("Tool or skill URL"), {
            target: {value: "https://github.com/Wieedze/ARP?skill=arp"},
        });
        fireEvent.click(screen.getByRole("button", {name: "Add it"}));
        expect(listing.submit).toHaveBeenCalledWith("https://github.com/Wieedze/ARP?skill=arp");
        expect(screen.getByText("Listed.")).toBeTruthy();
        expect(screen.getByRole("link", {name: "Open its page →"}).getAttribute("href")).toBe(
            "/atom/0xabc",
        );
        expect(screen.queryByRole("link", {name: "Add it with a wallet →"})).toBeNull();
    });

    it("says a URL with a key was not added, names the one that would be, and offers no wallet", async () => {
        listing.result = {status: "private", listable: "https://mcp.example.com/mcp?api_key="};
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        expect(
            await screen.findByText(
                "That URL carries a value, such as a key, and a listing is public for good. Add https://mcp.example.com/mcp?api_key= instead.",
            ),
        ).toBeTruthy();
        expect(screen.queryByRole("link", {name: "Add it with a wallet →"})).toBeNull();
    });

    it("keeps the wallet path when the sponsor cannot help", async () => {
        listing.result = {status: "unavailable"};
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        expect(await screen.findByText("Adding is not available right now.")).toBeTruthy();
        expect(
            screen.getByRole("link", {name: "Add it with a wallet →"}).getAttribute("href"),
        ).toBe("/start/tool?with=wallet");
    });

    it("opens the wallet form on the same page", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool?with=wallet"));
        expect(await screen.findByLabelText("Tool URL", undefined, {timeout: 5000})).toBeTruthy();
        expect(screen.getByRole("heading", {name: "Add it with a wallet"})).toBeTruthy();
        expect(screen.getByLabelText("Repository URL")).toBeTruthy();
    });

    it("asks whether the agent has an id, and shows the steps until told yes", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("agent"));
        expect(await screen.findByText("Add ARP to your runtime")).toBeTruthy();
        expect(screen.getByRole("button", {name: "No"})).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(screen.getByRole("button", {name: "Yes, it has one"}));
        // The steps would mint a second identity, so the import replaces them.
        expect(
            // The form is a lazy chunk, slow to arrive while the whole suite runs in parallel.
            await screen.findByRole(
                "heading",
                {name: "Import an agent you already have"},
                {timeout: 5000},
            ),
        ).toBeTruthy();
        expect(screen.queryByText("Add ARP to your runtime")).toBeNull();
    });

    it("offers the wallet mint under the agent steps", async () => {
        // Inside `RouteTransition`, which remounts the page on the push, as the app does.
        renderWithProviders(
            <RouteTransition>
                <StartPage feed={feedWith([]).feed} />
            </RouteTransition>,
            at("agent"),
        );
        const link = await screen.findByRole("link", {name: "Mint with a wallet instead →"});
        expect(link.getAttribute("href")).toBe("/start/agent?with=wallet");
        fireEvent.click(link);
        expect(
            await screen.findByRole(
                "heading",
                {name: "Mint an ERC-8004 identity"},
                {timeout: 5000},
            ),
        ).toBeTruthy();
        expect(screen.queryByRole("link", {name: "Mint with a wallet instead →"})).toBeNull();
        // The link that held the focus is gone, so the form it opened takes it.
        await waitFor(() => expect(document.activeElement?.tagName).toBe("SECTION"));
    });

    it("leaves the focus alone when the URL opens the wallet form on arrival", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("agent?with=wallet"));
        await screen.findByRole("heading", {name: "Mint an ERC-8004 identity"}, {timeout: 5000});
        expect(document.activeElement?.tagName).not.toBe("SECTION");
    });

    it("gives the Claude path no wallet form", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("claude?with=wallet"));
        await screen.findByRole("heading", {name: "I use Claude"});
        expect(screen.queryByText(/wallet/i)).toBeNull();
    });

    it("offers only the wallet path when no sponsor is configured", async () => {
        listing.available = false;
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        expect(await screen.findByRole("link", {name: "Add it with a wallet →"})).toBeTruthy();
        expect(screen.queryByLabelText("Tool or skill URL")).toBeNull();
    });

    it("offers the category step once the tool is listed, with existing categories only", async () => {
        listing.result = {status: "listed", atomId: "0xabc", created: true, transactions: []};
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));

        const select = await screen.findByLabelText("Category");
        fireEvent.change(select, {target: {value: "design"}});
        fireEvent.click(screen.getByRole("button", {name: "File it"}));
        expect(proposal.submit).toHaveBeenCalledWith({label: "design", subjectId: "0xabc"});
        // A new category is an agent's to add (ADR `0146`): no way to type one here.
        expect(within(select).queryByRole("option", {name: "None fits"})).toBeNull();
        expect(screen.queryByLabelText("New category")).toBeNull();
    });

    it("tells the reader while it files, then what was filed", async () => {
        listing.result = {status: "listed", atomId: "0xabc", created: true, transactions: []};
        proposal.pending = true;
        const view = renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        expect(await screen.findByText("Filing…")).toBeTruthy();
        expect(screen.getByRole("button", {name: "File it"})).toHaveProperty("disabled", true);

        proposal.pending = false;
        proposal.result = {status: "done", label: "design", newCategory: false, created: true};
        view.rerender(<StartPage feed={feedWith([]).feed} />);
        expect(await screen.findByText("Filed under “design”.")).toBeTruthy();
    });

    it("shows no category step without a sponsor, even once listed", async () => {
        listing.result = {status: "listed", atomId: "0xabc", created: true, transactions: []};
        proposal.available = false;
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        await screen.findByLabelText("Tool or skill URL");
        expect(screen.queryByLabelText("Category")).toBeNull();
    });

    it("shows no category step before a tool is listed", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("tool"));
        await screen.findByLabelText("Tool or skill URL");
        expect(screen.queryByLabelText("Category")).toBeNull();
    });

    it("says so when the path does not exist", async () => {
        renderWithProviders(<StartPage feed={feedWith([]).feed} />, at("operator"));
        expect(await screen.findByText("No path by that name")).toBeTruthy();
    });
});
