import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {screen, waitFor, within} from "@testing-library/react";
import type {PulseUsage, RecentDeclaration, ToolListing} from "@arp-protocol/core";

import {OnboardingContext} from "../components/onboarding/onboarding-context";
import {renderWithProviders} from "../test/render";
import {Landing} from "./Landing";

/**
 * The front page's behaviours a type checker cannot see (task 81).
 *
 * - **The copy is the design file's**, to the word, with no kicker above a heading and no lede
 *   under the hero (the user removed both).
 * - **Real data, or the sample** (the user, 2026-11-09; unlabelled since 2026-11-10). The reference's sample
 *   agent ids (`8453:3107`…) are real agents on Base and never reach the app; the landing's sample
 *   names `agent 1` to `agent 5`, and only while the chain answers with nothing.
 * - **ARP's own test identities are left out**, as on every other page.
 * - **A failed read says it failed**, never that the chain is empty.
 * - **Reduced motion** shows every scene at its end state.
 *
 * The reads are faked at the package boundary, where the network is. The canvas does not draw
 * under `happy-dom` (no 2D context), so what is asserted is the HTML a reader gets; the motion is
 * checked in a browser (task 81's frame check).
 */

vi.mock("@arp-protocol/core", async () => {
    const actual = await vi.importActual<Record<string, unknown>>("@arp-protocol/core");
    return {...actual, getRecentDeclarations: vi.fn(), listTools: vi.fn(), getPulseUsage: vi.fn()};
});
vi.mock("../services/landing-field", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../services/landing-field")>()),
    readVocabularyIds: vi.fn(async () => ({hasOutcome: "0xoutcome", because: "0xbecause"})),
    readPaidWords: vi.fn(async () => []),
}));

const core = await import("@arp-protocol/core");
const {hiddenAtomIds} = await import("../services/test-identities");
const {readPaidWords} = await import("../services/landing-field");
const recent = vi.mocked(core.getRecentDeclarations);
const listTools = vi.mocked(core.listTools);
const getPulseUsage = vi.mocked(core.getPulseUsage);

const TOOL_ID = "0xtool";
const AGENT_ID = "0xagent";

function tool(overrides: Partial<ToolListing> = {}): ToolListing {
    // Only the fields the landing reads are meaningful here; the rest of a listing is shaped as the
    // package returns it.
    return {
        atomId: TOOL_ID,
        label: "github.com/acme/skills?skill=transcribe",
        uri: null,
        hostedAt: null,
        type: null,
        edgeCount: 1,
        declarers: [AGENT_ID],
        ...overrides,
    } as ToolListing;
}

function usage(): PulseUsage {
    return {
        declarations: [
            {
                tripleId: "0xedge",
                agent: {atomId: AGENT_ID, label: "13579:812"},
                writer: "0xwallet",
                holders: ["0xwallet"],
                declaredAt: "2026-11-08T10:00:00Z",
                domains: ["research"],
                outcomes: ["failed"],
                lines: [
                    {
                        domain: "research",
                        outcome: "failed",
                        reasons: ["missing-key"],
                        form: "nested",
                    },
                ],
            },
        ],
        agents: 1,
        wallets: 1,
        byDomain: {research: 1},
        byOutcome: {failed: 1},
        byReason: {"missing-key": 1},
        byOthers: [],
        truncated: false,
    };
}

function declaration(overrides: Partial<RecentDeclaration> = {}): RecentDeclaration {
    return {
        tripleId: `0x${"cd".repeat(32)}`,
        at: new Date().toISOString(),
        txHash: null,
        subject: {atomId: AGENT_ID, label: "13579:812"},
        object: {atomId: TOOL_ID, label: "github.com/acme/skills?skill=transcribe"},
        assets: null,
        positions: 0,
        ...overrides,
    };
}

function withRealLine() {
    recent.mockResolvedValue([declaration()]);
    listTools.mockResolvedValue({
        curveId: 1,
        edgesRead: 1,
        truncated: false,
        sponsor: null,
        tools: [tool()],
    } as never);
    getPulseUsage.mockResolvedValue(new Map([[TOOL_ID, usage()]]));
}

function reduceMotion(on: boolean) {
    vi.spyOn(window, "matchMedia").mockImplementation(
        (query: string) =>
            ({
                matches: on && query.includes("reduce"),
                media: query,
                onchange: null,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
                addListener: () => undefined,
                removeListener: () => undefined,
                dispatchEvent: () => false,
            }) as MediaQueryList,
    );
}

const scene = (container: HTMLElement, index: number) => {
    const node = container.querySelector<HTMLElement>(`[data-scene="${index}"]`);
    if (node === null) throw new Error(`no scene ${index}`);
    return node;
};

beforeEach(() => {
    recent.mockReset();
    listTools.mockReset();
    getPulseUsage.mockReset();
    recent.mockResolvedValue([]);
    listTools.mockResolvedValue({
        curveId: 1,
        edgesRead: 0,
        truncated: false,
        sponsor: null,
        tools: [],
    } as never);
    getPulseUsage.mockResolvedValue(new Map());
    reduceMotion(false);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Landing", () => {
    it("says the design's words, and no kicker or lede", async () => {
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(listTools).toHaveBeenCalled());

        expect(container.querySelector("h1")?.textContent).toBe(
            "The public pulse for tools and autonomous agents.",
        );
        const headings = [...container.querySelectorAll(".arp-gx h2")].map((h) => h.textContent);
        expect(headings).toEqual([
            "An agent writes down what it used. With its own ERC-8004 identity.",
            "The next agent knows before it chooses. Useful or not, paid or free, working or not, and what for.",
            "Plug in and participate. Your agent discovers what others already use, and adds what it uses.",
            "No grade. No stars.",
            "Plug in without asking anyone. It lives on a public chain, not on our servers.",
        ]);
        const text = container.textContent ?? "";
        for (const removed of [
            "Fig. 0",
            "ARP · Agent Reputation Protocol",
            "What ARP never adds",
        ]) {
            expect(text, `a kicker the user removed: ${removed}`).not.toContain(removed);
        }
        expect(text).toContain("Just what agents declared.");
        expect(text).toContain("On the record, for anyone to check.");
    });

    it("gives the exact install commands, with -y for npx", async () => {
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(listTools).toHaveBeenCalled());
        const codes = [...container.querySelectorAll("code")].map((c) => c.textContent);
        expect(codes).toEqual([
            "claude plugin marketplace add intuition-box/ARP",
            "claude plugin install arp@arp",
            "npx -y @arp-protocol/cli init",
        ]);
    });

    it("ends on three entry points: the agent index, the skill, the MCP tools", async () => {
        renderWithProviders(<Landing />);
        await waitFor(() => expect(listTools).toHaveBeenCalled());
        const nav = screen.getByRole("navigation", {name: "Entry points", hidden: true});
        const links = within(nav)
            .getAllByRole("link", {hidden: true})
            .map((link) => [link.textContent, link.getAttribute("href")]);
        expect(links).toEqual([
            ["The agent index/agents", "/agents"],
            [
                "The skillSKILL.md",
                "https://github.com/intuition-box/ARP/blob/main/skills/arp/SKILL.md",
            ],
            ["The MCP tools/docs/mcp-tools", "/docs/mcp-tools"],
        ]);
        expect(document.body.textContent).not.toContain("The usual way");
    });

    it("shows the sample, unlabelled, when the chain answers with nothing", async () => {
        // Scene 1 builds its line only while it is on screen; reduced motion shows its end state.
        reduceMotion(true);
        // The user, 2026-11-09: on testnet every real line is ARP's own hidden test, so the
        // landing falls back to the reference's sample. The user removed every « Sample » mark
        // on 2026-11-10, so no panel says it.
        const {container} = renderWithProviders(<Landing />);
        expect(await screen.findByText("Lines · testnet")).toBeTruthy();
        const written = scene(container, 1);
        await waitFor(() =>
            expect(written.querySelector(".arp-gx-sentence")?.textContent).toBe(
                "hyperframes used by agent 1 in context of video has outcome worked",
            ),
        );
        expect(within(written).getByText("A line, word by word")).toBeTruthy();
        const reads = scene(container, 2);
        expect(within(reads).getByText("What your agent reads · hyperframes")).toBeTruthy();
        expect(reads.querySelectorAll(".arp-gx-reads li")).toHaveLength(4);
        expect(container.textContent?.toLowerCase()).not.toContain("sample");
        expect(screen.queryByText("No activity yet.")).toBeNull();
        // The reference's sample ids are real agents on Base: none of them is named here.
        expect(container.textContent).not.toMatch(/\b(8453|13579):\d+/);
    });

    it("says the read failed rather than claiming the chain is empty", async () => {
        recent.mockRejectedValue(new Error("502 from the indexer"));
        listTools.mockRejectedValue(new Error("502 from the indexer"));
        renderWithProviders(<Landing />);
        // The pulse panel and the two panels the field feeds.
        expect(await screen.findAllByText(/The graph did not answer/i)).toHaveLength(3);
        expect(screen.queryByText("No activity yet.")).toBeNull();
    });

    it("says the lines did not answer, rather than that nobody wrote one", async () => {
        withRealLine();
        getPulseUsage.mockRejectedValue(new Error("502 from the indexer"));
        const {container} = renderWithProviders(<Landing />);
        expect(
            await within(scene(container, 1)).findByText(/The graph did not answer/i),
        ).toBeTruthy();
        expect(within(scene(container, 2)).getByText(/The graph did not answer/i)).toBeTruthy();
        expect(within(scene(container, 1)).queryByText("No line written here yet.")).toBeNull();
    });

    it("writes the most declared tool's latest line, word by word, from the chain", async () => {
        // Scene 1 builds its line only while it is on screen; reduced motion shows its end state.
        reduceMotion(true);
        withRealLine();
        const {container} = renderWithProviders(<Landing />);
        const written = scene(container, 1);
        await waitFor(() =>
            expect(written.querySelector(".arp-gx-sentence")?.textContent).toBe(
                "transcribe used by 13579:812 in context of research has outcome failed: missing-key",
            ),
        );
        // No accumulation in scene 1 any more (the user, 2026-11-09): the line, and nothing else.
        expect(written.textContent).not.toContain("writing into");

        const reads = scene(container, 2);
        await waitFor(() => expect(reads.querySelectorAll(".arp-gx-reads li")).toHaveLength(3));
        expect(reads.textContent).toContain("13579:812 uses it · the one agent so far");
        expect(reads.textContent).toContain("in context of research · 1 wallet");
        expect(reads.textContent).toContain("failed: missing-key · 1 wallet");
    });

    it("adds the paid reading only when the tool's files name a paid service", async () => {
        withRealLine();
        vi.mocked(readPaidWords).mockResolvedValueOnce(["stripe"]);
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() =>
            expect(scene(container, 2).textContent).toContain(
                "its files name stripe · no position",
            ),
        );
    });

    it("leaves ARP's own test identities out", async () => {
        // Scene 1 builds its line only while it is on screen; reduced motion shows its end state.
        reduceMotion(true);
        withRealLine();
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set([AGENT_ID]));
        const {container} = renderWithProviders(<Landing />);
        // Its only declarer is hidden, so the chain has nothing to show: the sample, never the test.
        await waitFor(() => expect(scene(container, 1).textContent).toContain("agent 1"));
        expect(container.textContent).not.toContain("13579:812");
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set());
    });

    it("drops the sample as soon as the chain has a real line, in every panel", async () => {
        // Scene 1 builds its line only while it is on screen; reduced motion shows its end state.
        reduceMotion(true);
        withRealLine();
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(scene(container, 1).textContent).toContain("13579:812"));
        const text = container.textContent ?? "";
        for (const sample of [
            "8453:3107",
            "8453:5512",
            "8453:44512",
            "hyperframes",
            "marketing",
            "paid service",
        ]) {
            expect(text, `sample data on the page: ${sample}`).not.toContain(sample);
        }
    });

    it("ends on the demo, which plays only when asked", () => {
        renderWithProviders(<Landing />);
        const video = screen.getByRole("region", {name: "Demo"}).querySelector("video");
        expect(video).not.toBeNull();
        expect(video?.hasAttribute("controls")).toBe(true);
        expect(video?.hasAttribute("autoplay")).toBe(false);
        expect(video?.getAttribute("preload")).toBe("none");
        expect(video?.querySelector("source")?.getAttribute("src")).toBe("/video/arp-demo.mp4");
    });

    it("keeps out the claims docs/30 forbids", async () => {
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(listTools).toHaveBeenCalled());
        const text = (container.textContent ?? "").toLowerCase();
        for (const forbidden of [
            "shows who used it",
            "ranked by real use",
            "written by the agents themselves",
            "verified",
            "best ",
            "get paid",
        ]) {
            expect(text, `forbidden on the page: ${forbidden}`).not.toContain(forbidden);
        }
    });

    it("gives every in-page anchor a target on the page", async () => {
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(listTools).toHaveBeenCalled());
        const anchors = [...container.querySelectorAll('a[href^="#"]')];
        expect(anchors.length).toBeGreaterThan(0);
        for (const anchor of anchors) {
            const id = (anchor.getAttribute("href") ?? "").slice(1);
            expect(container.querySelector(`#${id}`), `no target for #${id}`).not.toBeNull();
        }
    });

    it("puts one scene on screen and takes the other five out of the tree", async () => {
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(container.querySelector(".arp-deck-pinned")).not.toBeNull());
        const scenes = [...container.querySelectorAll("[data-scene]")];
        expect(scenes).toHaveLength(6);
        const visible = scenes.filter((node) => node.getAttribute("aria-hidden") === null);
        expect(visible).toHaveLength(1);
        expect(visible[0]?.getAttribute("data-scene")).toBe("0");
        for (const node of scenes.slice(1)) expect(node.hasAttribute("inert")).toBe(true);
    });

    it("shows no scene counter and no rail, which the user removed", async () => {
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(listTools).toHaveBeenCalled());
        expect(container.textContent).not.toMatch(/\d{2} \/ \d{2}/);
    });

    it("builds scene 1 only on screen: off screen, no piece of the line is drawn in advance", async () => {
        withRealLine();
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(container.querySelector(".arp-deck-pinned")).not.toBeNull());
        await waitFor(() => expect(listTools).toHaveBeenCalled());
        // Scene 0 is on; scene 1's panel appears with its first element, not before.
        expect(scene(container, 1).querySelector(".arp-gx-sentence")).toBeNull();
        expect(scene(container, 1).querySelector(".arp-gx-steps")).toBeNull();
    });

    it("ends on the network: one line of invitation, and Join the network opens the onboarding", async () => {
        const open = vi.fn();
        const {container} = renderWithProviders(
            <OnboardingContext.Provider value={{open, landed: () => undefined}}>
                <Landing />
            </OnboardingContext.Provider>,
        );
        await waitFor(() => expect(listTools).toHaveBeenCalled());
        const build = scene(container, 5);
        expect(build.textContent).toContain("Every line your agent writes, the next agent reads.");
        within(build).getByRole("button", {name: "Join the network", hidden: true}).click();
        expect(open).toHaveBeenCalledTimes(1);
    });

    it("under reduced motion, shows every scene at its end state", async () => {
        reduceMotion(true);
        withRealLine();
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(container.querySelector(".arp-deck-pinned")).not.toBeNull());
        await waitFor(() =>
            expect(
                scene(container, 1).querySelectorAll(".arp-gx-sentence span").length,
            ).toBeGreaterThan(0),
        );
        expect(
            [...scene(container, 1).querySelectorAll(".arp-gx-steps em")].map(
                (em) => em.textContent,
            ),
        ).toEqual(["identity", "context", "outcome"]);
        // The finished sentence glows (ADR 0152 §8); under reduced motion, at once.
        expect(scene(container, 1).querySelector(".arp-gx-sentence")).toHaveClass("is-whole");
        for (const line of scene(container, 4).querySelectorAll(".arp-gx-lines li")) {
            expect(line.getAttribute("data-on")).toBe("true");
        }
        await waitFor(() =>
            expect(scene(container, 2).querySelectorAll(".arp-gx-reads li").length).toBe(3),
        );
        for (const row of scene(container, 2).querySelectorAll(".arp-gx-reads li")) {
            expect(row.getAttribute("data-on")).toBe("true");
        }
    });
});
