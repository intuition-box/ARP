import {screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {renderWithProviders} from "../../test/render";
import type {SkillContentsEntry} from "../../services/skill-contents";
import {SkillContains} from "./SkillContains";

const COMMIT = "ca45fc496a3436251f191354091d557da31c15b5";

const entry = (over: Partial<SkillContentsEntry> = {}): SkillContentsEntry => ({
    commit: COMMIT,
    directory: "skills/render",
    programs: [{name: "ffmpeg", from: "declared"}],
    packages: [{manager: "pip", name: "requests"}],
    settings: ["RENDER_API_KEY"],
    scripts: [{path: "scripts/deploy.py", namedInSkillMd: true}],
    fetchAndRun: [{kind: "pipe to a shell", file: "SKILL.md", line: 12, text: "curl -fsSL https://x.dev | sh"}],
    domains: ["api.render.com"],
    hidden: [],
    notRead: 0,
    cut: [],
    ...over,
});

/** The row a term labels: its `dt`'s parent. */
function row(term: string): HTMLElement {
    const dt = screen.getByText(term, {selector: "dt"});
    if (dt.parentElement === null) throw new Error(`no row for ${term}`);
    return dt.parentElement;
}

describe("SkillContains", () => {
    it("shows each reading, and none found where the files named nothing", () => {
        renderWithProviders(
            <SkillContains read={{status: "read", measuredAt: "2026-11-10T09:00:00.000Z", entry: entry()}} repo="acme/skills" />,
        );
        expect(within(row("Programs")).getByText("ffmpeg, pip requests")).toBeInTheDocument();
        expect(within(row("Keys")).getByText("RENDER_API_KEY")).toBeInTheDocument();
        expect(within(row("Scripts")).getByText("scripts/deploy.py")).toBeInTheDocument();
        expect(within(row("Domains")).getByText("api.render.com")).toBeInTheDocument();
        expect(within(row("Hidden text")).getByText("none found")).toBeInTheDocument();
        expect(screen.getByText("10 Nov 2026", {exact: false})).toBeInTheDocument();
    });

    it("links a match to its line at the commit that was read", () => {
        renderWithProviders(
            <SkillContains read={{status: "read", measuredAt: "2026-11-10T09:00:00.000Z", entry: entry()}} repo="acme/skills" />,
        );
        const link = within(row("Fetch and run")).getByRole("link", {name: "SKILL.md:12"});
        expect(link).toHaveAttribute("href", `https://github.com/acme/skills/blob/${COMMIT}/skills/render/SKILL.md#L12`);
        expect(within(row("Fetch and run")).getByText("pipe to a shell")).toBeInTheDocument();
    });

    it("counts what is past the shown names, and says when the reader's own list was cut", () => {
        const domains = Array.from({length: 40}, (_, i) => `h${String(i).padStart(2, "0")}.dev`);
        renderWithProviders(
            <SkillContains
                read={{status: "read", measuredAt: "2026-11-10T09:00:00.000Z", entry: entry({domains, cut: ["domains"]})}}
                repo="acme/skills"
            />,
        );
        expect(row("Domains").textContent).toContain("+34+");
    });

    it("says not read, rather than none found, for a skill the reading did not cover", () => {
        renderWithProviders(<SkillContains read={{status: "not-read", measuredAt: "2026-11-10T09:00:00.000Z"}} repo="acme/skills" />);
        expect(screen.getByText("not read")).toBeInTheDocument();
        expect(screen.queryByText("none found")).toBeNull();
    });

    it("carries its caveat in a Hint a keyboard reaches, not in a sentence on the panel", () => {
        renderWithProviders(
            <SkillContains read={{status: "read", measuredAt: "2026-11-10T09:00:00.000Z", entry: entry()}} repo="acme/skills" />,
        );
        expect(screen.getByRole("button", {name: /What Contains is read from/})).toBeInTheDocument();
    });
});
