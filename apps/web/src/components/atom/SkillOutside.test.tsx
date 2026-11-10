import {screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import type {OutsideSignals} from "@arp-protocol/core";

import {renderWithProviders} from "../../test/render";
import {OUTSIDE} from "../../test/outside-fixture";

let file: OutsideSignals | undefined;
vi.mock("../../hooks/use-outside-signals", () => ({useOutsideSignals: () => file}));

import {SkillOutside} from "./SkillOutside";

function row(term: string): HTMLElement {
    const dt = screen.getByText(term, {selector: "dt"});
    if (dt.parentElement === null) throw new Error(`no row for ${term}`);
    return dt.parentElement;
}

describe("SkillOutside", () => {
    it("shows GitHub's state and the failure issues, each linked where a reader can ask again", () => {
        file = OUTSIDE;
        renderWithProviders(<SkillOutside label="github.com/acme/skills?skill=render" />);
        expect(within(row("State")).getByRole("link")).toHaveAttribute("href", "https://api.github.com/repos/acme/skills");
        expect(within(row("State")).getByRole("link")).toHaveTextContent("archived");
        const issues = within(row("Failure issues")).getByRole("link");
        expect(issues).toHaveTextContent("12 · 3 open");
        expect(issues.getAttribute("href")).toContain("https://github.com/acme/skills/issues?q=");
        expect(within(row("Name this skill")).getByRole("link")).toHaveAttribute(
            "href",
            "https://github.com/acme/skills/issues/40",
        );
        expect(screen.getByText("10 Nov 2026")).toBeInTheDocument();
    });

    it("says none when no issue title names the skill", () => {
        file = OUTSIDE;
        renderWithProviders(<SkillOutside label="github.com/acme/skills?skill=quiet" />);
        expect(within(row("Name this skill")).getByText("none")).toBeInTheDocument();
    });

    it("shows the newest issues of a repository that holds one skill, with no count it does not have", () => {
        file = OUTSIDE;
        renderWithProviders(<SkillOutside label="github.com/acme/one?skill=x" />);
        expect(within(row("State")).getByRole("link")).toHaveTextContent("not archived");
        expect(within(row("Newest")).getByRole("link")).toHaveAttribute("href", "https://github.com/acme/one/issues/7");
        expect(within(row("Newest")).queryByText(/^\+/)).toBeNull();
    });

    it("says not read for a repository the reading did not cover, never none", () => {
        file = OUTSIDE;
        renderWithProviders(<SkillOutside label="github.com/elsewhere/x?skill=y" />);
        expect(screen.getByText("not read")).toBeInTheDocument();
        expect(screen.queryByText("Failure issues")).toBeNull();
    });
});
