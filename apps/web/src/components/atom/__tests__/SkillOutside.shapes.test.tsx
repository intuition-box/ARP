import {screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import type {OutsideSignals} from "@arp-protocol/core";

import {renderWithProviders} from "../../../test/render";
import {OUTSIDE} from "../../../test/outside-fixture";

let file: OutsideSignals | undefined;
vi.mock("../../../hooks/use-outside-signals", () => ({useOutsideSignals: () => file}));

import {SkillOutside} from "../SkillOutside";

/** The fixture with one repository's reading replaced, and one skill's named issues. */
function withRepo(
    repo: OutsideSignals["repos"][string],
    skill?: OutsideSignals["skills"][string],
): OutsideSignals {
    return {
        ...OUTSIDE,
        repos: {...OUTSIDE.repos, "github.com/acme/x": repo},
        skills: skill === undefined ? OUTSIDE.skills : {"github.com/acme/x?skill=s": skill},
    };
}

function row(term: string): HTMLElement {
    const dt = screen.getByText(term, {selector: "dt"});
    if (dt.parentElement === null) throw new Error(`no row for ${term}`);
    return dt.parentElement;
}

describe("SkillOutside, the readings it can be handed", () => {
    it("holds an ellipsis while the file loads, with no hint yet", () => {
        file = undefined;
        renderWithProviders(<SkillOutside label="github.com/acme/skills?skill=render" />);
        expect(screen.getByText("…")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "What On GitHub is read from"})).toBeNull();
    });

    it("shows the issues without a state when GitHub's state was not read", () => {
        file = withRepo({status: null, issues: {total: 4, open: 0, recent: []}});
        renderWithProviders(<SkillOutside label="github.com/acme/x" />);
        expect(screen.queryByText("State")).toBeNull();
        expect(within(row("Failure issues")).getByRole("link")).toHaveTextContent("4 · 0 open");
        expect(screen.queryByText("Newest")).toBeNull();
    });

    it("shows the state alone when the issues were not read", () => {
        file = withRepo({status: "gone", issues: null});
        renderWithProviders(<SkillOutside label="github.com/acme/x" />);
        expect(within(row("State")).getByRole("link")).toHaveTextContent("not found");
        expect(screen.queryByText("Failure issues")).toBeNull();
    });

    it("counts the named issues past the three it shows", () => {
        const recent = [5, 4, 3, 2].map((number) => ({
            number,
            state: "open" as const,
            opened: "2026-11-01",
        }));
        file = withRepo(
            {status: "active", perSkill: true, issues: {total: 9, open: 9, recent}},
            {named: 6, recent},
        );
        renderWithProviders(<SkillOutside label="github.com/acme/x?skill=s" />);
        const named = row("Name this skill");
        expect(within(named).getAllByRole("link")).toHaveLength(3);
        expect(within(named).getByText("+3")).toBeInTheDocument();
    });

    it("says not read for a skill with no label", () => {
        file = OUTSIDE;
        renderWithProviders(<SkillOutside label={null} />);
        expect(screen.getByText("not read")).toBeInTheDocument();
    });
});
