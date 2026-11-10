import {screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {renderWithProviders} from "../../test/render";
import type {SkillContentsEntry} from "../../services/skill-contents";
import {BeforeInstall} from "./BeforeInstall";

const COMMIT = "b4c7f9cf7c601b440fcc94a7a9c44658cb6b7cd6";
const AT = "2026-11-10T09:00:00.000Z";

/** Shaped like hyperframes' `hyperframes` skill at this commit, the case the user saw (task 112). */
const entry = (over: Partial<SkillContentsEntry> = {}): SkillContentsEntry => ({
    commit: COMMIT,
    directory: "skills/hyperframes",
    programs: [
        {name: "Chrome", from: "package", file: "scripts/bake-basemap.mjs", line: 43, via: "puppeteer-core"},
        {name: "ffmpeg", from: "spawned", file: "scripts/bake-basemap.mjs", line: 280},
        {name: "node", from: "interpreter"},
    ],
    packages: [],
    settings: ["DUR", "FPS", "GEMINI_API_KEY", "OPENROUTER_API_KEY"],
    keys: [
        {name: "GEMINI_API_KEY", why: "secret", file: "references/film.md", line: 16},
        {name: "OPENROUTER_API_KEY", why: "secret", file: "references/film.md", line: 16},
    ],
    scripts: [
        {path: "scripts/bake-basemap.mjs", namedInSkillMd: false},
        {path: "scripts/locate.mjs", namedInSkillMd: false},
    ],
    fetchAndRun: [],
    domains: ["a.basemaps.cartocdn.com", "fonts.googleapis.com", "generativelanguage.googleapis.com", "www.w3.org"],
    hidden: [],
    skipped: [],
    cut: [],
    ...over,
});

const show = (value: SkillContentsEntry = entry()) =>
    renderWithProviders(<BeforeInstall read={{status: "read", measuredAt: AT, entry: value}} repo="heygen-com/hyperframes" />);

/** The row a term labels: its `dt`'s parent. */
function row(term: string): HTMLElement {
    const dt = screen.getByText(term, {selector: "dt"});
    if (dt.parentElement === null) throw new Error(`no row for ${term}`);
    return dt.parentElement;
}

describe("BeforeInstall", () => {
    it("leads with one line answering the questions in order", () => {
        show();
        expect(screen.getByRole("heading", {name: "Before you install"})).toBeInTheDocument();
        expect(screen.getByText("2 keys · 2 paid services · needs Chrome, ffmpeg, node · 2 scripts")).toBeInTheDocument();
        expect(screen.getByText("10 Nov 2026")).toBeInTheDocument();
    });

    it("shows the keys, not every setting, each linked to its line at the commit read", () => {
        show();
        expect(row("Asks for")).toHaveTextContent("GEMINI_API_KEY");
        expect(row("Asks for")).toHaveTextContent("2 other settings");
        expect(row("Asks for")).not.toHaveTextContent("FPS");
        const [link] = screen.getAllByRole("link", {name: "references/film.md:16"});
        expect(link).toHaveAttribute(
            "href",
            `https://github.com/heygen-com/hyperframes/blob/${COMMIT}/skills/hyperframes/references/film.md#L16`,
        );
    });

    it("names the paid services, the programs with how each was found, and groups static hosts", () => {
        show();
        expect(row("Paid services")).toHaveTextContent("Google Gemini");
        expect(row("Paid services")).toHaveTextContent("OpenRouter");
        expect(row("Needs installed")).toHaveTextContent("Chrome via puppeteer-core, scripts/bake-basemap.mjs:43");
        expect(row("Needs installed")).toHaveTextContent("ffmpeg run by scripts/bake-basemap.mjs:280");
        expect(row("Needs installed")).toHaveTextContent("node script interpreter");
        expect(row("Sends data to")).toHaveTextContent("generativelanguage.googleapis.com");
        expect(row("Sends data to")).toHaveTextContent("fonts, CDNs and map tiles: 2");
        expect(row("Sends data to")).toHaveTextContent("other sites named: 1");
    });

    it("says nothing of hidden text or unread files when there are none", () => {
        show();
        expect(screen.queryByText("Hidden text")).toBeNull();
        expect(screen.queryByText("Not read")).toBeNull();
        expect(screen.queryByText("Fetches and runs code")).toBeNull();
    });

    it("puts code fetched and run first, and names a skipped text file with why", () => {
        show(
            entry({
                fetchAndRun: [{kind: "pipe to a shell", file: "SKILL.md", line: 12, text: "curl -fsSL https://x.dev | sh"}],
                skipped: [{path: "assets/frost.js", why: "too large"}],
            }),
        );
        const terms = screen.getAllByRole("term").map((term) => term.textContent);
        expect(terms[0]).toBe("Fetches and runs code");
        expect(screen.getByText(/^fetches and runs code · /)).toBeInTheDocument();
        expect(row("Not read")).toHaveTextContent("1 file");
        expect(screen.getByText("assets/frost.js · too large")).toBeInTheDocument();
    });

    it("holds the rows every answer has while the reading loads, so nothing under it jumps", () => {
        renderWithProviders(<BeforeInstall read={{status: "pending"}} repo="a/b" />);
        for (const term of ["Asks for", "Paid services", "Needs installed", "Runs on your machine", "Sends data to"])
            expect(row(term)).toHaveTextContent("…");
    });

    it("says not read for a skill the reading did not cover", () => {
        renderWithProviders(<BeforeInstall read={{status: "not-read", measuredAt: AT}} repo="a/b" />);
        expect(screen.getAllByText("not read")).toHaveLength(6);
        expect(row("Asks for")).toHaveTextContent("not read");
    });
});
