import {screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {renderWithProviders} from "../../../test/render";
import type {SkillFact} from "../../../hooks/use-skill-facts";
import type {ToolRow} from "../../../services/tool-catalog";
import {ToolCatalogList} from "../ToolCatalogList";

/**
 * The qualifier line under a tool's name: where it comes from, its installs, its repository's
 * stars, how many agents use its skills, and the author's sentence. The skill facts are mocked at
 * their hook, keyed by label, so each row asks for its own.
 */
const FACTS: Record<string, SkillFact> = {
    "skill-a": {description: "Renders video from HTML.", installs: 12_400},
    "skill-b": {description: "", installs: null},
};
vi.mock("../../../hooks/use-skill-facts", () => ({
    useSkillFacts: () => ({
        factFor: (label: string | null) => (label === null ? null : (FACTS[label] ?? null)),
        repoFactFor: (label: string | null) =>
            label === "https://github.com/acme/tools"
                ? {stars: 2_500, days: 3, archived: false}
                : null,
    }),
}));

const row = (overrides: Partial<ToolRow>): ToolRow => ({
    key: "0xaa",
    provenance: "registered",
    name: "tool",
    isUnnamed: false,
    source: null,
    label: null,
    href: "/atom/0xaa",
    declarations: 0,
    declarers: [],
    sponsoredDeposits: 0,
    wallets: null,
    supportTrust: "2.5000",
    opposeTrust: null,
    stakers: 1,
    ...overrides,
});

function line(name: string): HTMLElement {
    const link = screen.getByRole("link", {name: new RegExp(`^${name}`)});
    const qualifier = link.querySelector("span span");
    if (!(qualifier instanceof HTMLElement)) throw new Error(`no qualifier under ${name}`);
    return qualifier;
}

describe("ToolCatalogList qualifiers", () => {
    it("joins source and installs, and sets the author's sentence under the name", () => {
        renderWithProviders(
            <ToolCatalogList
                rows={[
                    row({
                        key: "a",
                        name: "skill-a",
                        label: "skill-a",
                        source: "acme/skills",
                        href: "/atom/a",
                    }),
                ]}
                curveId={1}
            />,
        );
        expect(line("skill-a").textContent).toBe("acme/skills·12K installs");
        expect(screen.getByText("Renders video from HTML.")).toBeInTheDocument();
    });

    it("shows installs without a leading dot when there is no source, and no empty sentence", () => {
        renderWithProviders(
            <ToolCatalogList
                rows={[
                    row({key: "a", name: "skill-a", label: "skill-a", href: "/atom/a"}),
                    row({key: "b", name: "skill-b", label: "skill-b", href: "/atom/b"}),
                ]}
                curveId={1}
            />,
        );
        expect(line("skill-a").textContent).toBe("12K installs");
        expect(line("skill-b").textContent).toBe("");
    });

    it("gives a repository its stars and its skills' agents, when asked for stars", () => {
        const repo = row({
            key: "r",
            name: "acme/tools",
            label: "https://github.com/acme/tools",
            href: "/atom/r",
        });
        renderWithProviders(
            <ToolCatalogList
                rows={[repo]}
                curveId={1}
                showStars
                repoUsage={new Map([["acme/tools", {agents: 1}]])}
            />,
        );
        const qualifier = line("acme/tools");
        expect(qualifier.textContent).toBe("2.5K stars·1");
        expect(
            within(qualifier).getByRole("img", {name: "1 agent uses its skills"}),
        ).toBeInTheDocument();
    });

    it("counts agents without stars, and plural agents read as such", () => {
        const repo = row({
            key: "r",
            name: "acme/tools",
            label: "https://github.com/acme/tools",
            href: "/atom/r",
        });
        renderWithProviders(
            <ToolCatalogList
                rows={[repo]}
                curveId={1}
                repoUsage={new Map([["acme/tools", {agents: 3}]])}
            />,
        );
        expect(line("acme/tools").textContent).toBe("3");
        expect(screen.getByRole("img", {name: "3 agents use its skills"})).toBeInTheDocument();
    });

    it("sets stars after the installs, separated", () => {
        const both = row({
            key: "s",
            name: "skill-a",
            label: "skill-a",
            source: "acme/skills",
            href: "/atom/s",
        });
        renderWithProviders(<ToolCatalogList rows={[both]} curveId={1} showStars />);
        // `skill-a` has no repository fact, so stars stay out even when the list asks for them.
        expect(line("skill-a").textContent).toBe("acme/skills·12K installs");
    });

    it("blanks a registered tool's creation dust, and shows what stands against a tool", () => {
        renderWithProviders(
            <ToolCatalogList
                rows={[
                    row({key: "d", name: "dusty", href: "/atom/d", stakers: null}),
                    row({
                        key: "o",
                        name: "opposed",
                        href: "/atom/o",
                        stakers: 3,
                        opposeTrust: "0.4000",
                    }),
                ]}
                curveId={2}
            />,
        );
        expect(screen.getByRole("link", {name: /^dusty/})).not.toHaveTextContent(
            "support behind it",
        );
        const opposed = screen.getByRole("link", {name: /^opposed/});
        expect(opposed).toHaveTextContent("support behind it");
        expect(opposed).toHaveTextContent(/against/);
    });
});
