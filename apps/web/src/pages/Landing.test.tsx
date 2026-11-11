import {afterEach, beforeEach, describe, expect, it, vi, type MockInstance} from "vitest";
import {act, screen, waitFor, within} from "@testing-library/react";

import {OnboardingContext} from "../components/onboarding/onboarding-context";
import {renderWithProviders} from "../test/render";
import {Landing} from "./Landing";

/**
 * The front page's behaviours a type checker cannot see (task 81, task 133).
 *
 * - **The copy is the design file's**, to the word, with no kicker above a heading and no lede
 *   under the hero (the user removed both).
 * - **Static: nothing is read** (the user, 2026-11-11, ADR `0197`). Every scene shows the sample
 *   (`services/landing-sample.ts`) on either chain, and the page makes no network call for it.
 *   The reference's sample agent ids (`8453:3107`…) are real agents on Base and never reach the
 *   app; the landing's sample names `agent 1` to `agent 5`.
 * - **Reduced motion** shows every scene at its end state.
 *
 * The canvas does not draw under `happy-dom` (no 2D context), so what is asserted is the HTML a
 * reader gets; the motion is checked in a browser (task 81's frame check).
 */

// The reads the landing made until task 133, faked so a call to any of them is seen, not sent.
vi.mock("@arp-protocol/core", async () => {
    const actual = await vi.importActual<Record<string, unknown>>("@arp-protocol/core");
    return {
        ...actual,
        getRecentDeclarations: vi.fn(),
        listTools: vi.fn(),
        getPulseUsage: vi.fn(),
        readPulse: vi.fn(),
    };
});

const core = await import("@arp-protocol/core");
const {hiddenAtomIds} = await import("../services/test-identities");

const SAMPLE_SENTENCE = "hyperframes used by agent 1 in context of video has outcome task done";

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

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
    vi.mocked(core.getRecentDeclarations).mockReset();
    vi.mocked(core.listTools).mockReset();
    vi.mocked(core.getPulseUsage).mockReset();
    vi.mocked(core.readPulse).mockReset();
    vi.mocked(hiddenAtomIds).mockClear();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    reduceMotion(false);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Landing", () => {
    it("says the design's words, and no kicker or lede", () => {
        const {container} = renderWithProviders(<Landing />);

        expect(container.querySelector("h1")?.textContent).toBe(
            "The public pulse for tools and autonomous agents.",
        );
        const headings = [...container.querySelectorAll(".arp-gx h2")].map((h) => h.textContent);
        expect(headings).toEqual([
            "An agent writes down what it used. With its own ERC-8004 identity.",
            "The next agent knows before it chooses. Useful or not, paid or free, working or not, and what for.",
            "Plug in and participate. Your agent discovers what others already use, and adds what it uses.",
            "No grade. No stars.",
            "Plug in right now and start verifying. It lives on a public chain, not on our servers.",
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

    it("gives the exact install commands, with -y for npx", () => {
        const {container} = renderWithProviders(<Landing />);
        const codes = [...container.querySelectorAll("code")].map((c) => c.textContent);
        expect(codes).toEqual([
            "claude plugin marketplace add intuition-box/ARP",
            "claude plugin install arp@arp",
            "npx -y @arp-protocol/cli init",
        ]);
    });

    it("links no agent page: the Agents part is out of the navigation (the user, 2026-11-11)", () => {
        const {container} = renderWithProviders(<Landing />);
        const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
        expect(hrefs.filter((href) => /^\/agents?(\/|$)/.test(href))).toEqual([]);
        expect(screen.getByRole("link", {name: "Open the tool index"}).getAttribute("href")).toBe(
            "/tools",
        );
    });

    it("ends on three entry points: the tool index, the skill, the MCP tools", () => {
        renderWithProviders(<Landing />);
        const nav = screen.getByRole("navigation", {name: "Entry points", hidden: true});
        const links = within(nav)
            .getAllByRole("link", {hidden: true})
            .map((link) => [link.textContent, link.getAttribute("href")]);
        expect(links).toEqual([
            ["The tool index/tools", "/tools"],
            [
                "The skillSKILL.md",
                "https://github.com/intuition-box/ARP/blob/main/skills/arp/SKILL.md",
            ],
            ["The MCP tools/docs/mcp-tools", "/docs/mcp-tools"],
        ]);
        expect(document.body.textContent).not.toContain("The usual way");
    });

    it("shows the sample in every scene, unlabelled, on the first render", () => {
        // Scene 1 builds its line only while it is on screen; reduced motion shows its end state.
        reduceMotion(true);
        const {container} = renderWithProviders(<Landing />);
        // No read to wait for: the first render is the whole page.
        const pulse = scene(container, 0);
        expect(within(pulse).getByText("Lines")).toBeTruthy();
        expect(
            [...pulse.querySelectorAll(".arp-gx-beatrows li")].map((row) => row.textContent),
        ).toEqual([
            "agent 1hyperframesvideo",
            "agent 2pptxdocument",
            "agent 3remotion-rendervideo",
            "agent 4frontend-designdesign",
        ]);
        const written = scene(container, 1);
        expect(written.querySelector(".arp-gx-sentence")?.textContent).toBe(SAMPLE_SENTENCE);
        expect(within(written).getByText("A line, word by word")).toBeTruthy();
        const reads = scene(container, 2);
        expect(within(reads).getByText("What your agent reads · hyperframes")).toBeTruthy();
        expect(
            [...reads.querySelectorAll(".arp-gx-reads li em")].map((em) => em.textContent),
        ).toEqual(["useful", "for what", "working", "paid"]);
        const text = container.textContent ?? "";
        expect(text.toLowerCase()).not.toContain("sample");
        // No read means no read state: nothing pending, failed or empty is ever said.
        for (const state of ["reading…", "The graph did not answer", "No activity yet."]) {
            expect(text, `a read state on a static page: ${state}`).not.toContain(state);
        }
        // The reference's sample ids are real agents on Base: none of them is named here.
        expect(text).not.toMatch(/\b(8453|13579|1155):\d+/);
    });

    it("reads nothing: no chain, indexer or API call, on either chain", async () => {
        for (const mainnet of [false, true]) {
            reduceMotion(true);
            const {container, unmount} = renderWithProviders(<Landing />, {mainnet});
            // Long enough for a mounted query to have fired, had there been one.
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
            });
            expect(scene(container, 1).querySelector(".arp-gx-sentence")?.textContent).toBe(
                SAMPLE_SENTENCE,
            );
            // The sample is the same on mainnet: no chain is named on the page.
            expect(within(scene(container, 0)).getByText("Lines")).toBeTruthy();
            unmount();
        }
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(core.getRecentDeclarations).not.toHaveBeenCalled();
        expect(core.listTools).not.toHaveBeenCalled();
        expect(core.getPulseUsage).not.toHaveBeenCalled();
        expect(core.readPulse).not.toHaveBeenCalled();
        expect(hiddenAtomIds).not.toHaveBeenCalled();
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

    it("keeps out the claims docs/30 forbids", () => {
        const {container} = renderWithProviders(<Landing />);
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

    it("gives every in-page anchor a target on the page", () => {
        const {container} = renderWithProviders(<Landing />);
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

    it("shows no scene counter and no rail, which the user removed", () => {
        const {container} = renderWithProviders(<Landing />);
        expect(container.textContent).not.toMatch(/\d{2} \/ \d{2}/);
    });

    it("builds scene 1 only on screen: off screen, no piece of the line is drawn in advance", async () => {
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(container.querySelector(".arp-deck-pinned")).not.toBeNull());
        // Scene 0 is on; scene 1's panel appears with its first element, not before.
        expect(scene(container, 1).querySelector(".arp-gx-sentence")).toBeNull();
        expect(scene(container, 1).querySelector(".arp-gx-steps")).toBeNull();
    });

    it("ends on the network: one line of invitation, and Join the network opens the onboarding", () => {
        const open = vi.fn();
        const {container} = renderWithProviders(
            <OnboardingContext.Provider value={{open, landed: () => undefined}}>
                <Landing />
            </OnboardingContext.Provider>,
        );
        const build = scene(container, 5);
        expect(build.textContent).toContain("Every line your agent writes, the next agent reads.");
        within(build).getByRole("button", {name: "Join the network", hidden: true}).click();
        expect(open).toHaveBeenCalledTimes(1);
    });

    it("under reduced motion, shows every scene at its end state", async () => {
        reduceMotion(true);
        const {container} = renderWithProviders(<Landing />);
        await waitFor(() => expect(container.querySelector(".arp-deck-pinned")).not.toBeNull());
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
        const rows = scene(container, 2).querySelectorAll(".arp-gx-reads li");
        expect(rows).toHaveLength(4);
        for (const row of rows) expect(row.getAttribute("data-on")).toBe("true");
    });
});
