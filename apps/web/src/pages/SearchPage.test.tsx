import {fireEvent, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import type {SkillsIndexRead} from "../hooks/use-skills-index";
import type {CohortView} from "../services/agent-cohort";
import type {ToolCatalogView, ToolRow} from "../services/tool-catalog";
import {renderWithProviders} from "../test/render";
import {SearchPage} from "./SearchPage";

const tool = (name: string, label: string): ToolRow => ({
    key: `0x${name}`,
    provenance: "registered",
    name,
    isUnnamed: false,
    source: "obra/superpowers",
    label,
    href: `/atom/0x${name}`,
    declarations: 0,
    declarers: [],
    sponsoredDeposits: null,
    wallets: null,
    supportTrust: "0.001",
    opposeTrust: null,
    stakers: 0,
});

const CATALOG: ToolCatalogView = {
    rows: [
        tool("writing-plans", "github.com/obra/superpowers?skill=writing-plans"),
        tool("brainstorming", "github.com/obra/superpowers?skill=brainstorming"),
        tool("wide-plans", "github.com/obra/superpowers?skill=wide-plans"),
        {...tool("zeta-plans", "github.com/owner/zeta-plans"), source: null},
    ],
    truncated: false,
    curveId: 1,
};

const agents = (names: string[]): CohortView => ({
    sourceId: "test",
    order: "evidence-quantity",
    total: names.length,
    rangeLabel: "",
    limit: 10,
    offset: 0,
    hasPrevious: false,
    hasNext: false,
    hiddenCount: 0,
    rows: names.map((name) => ({
        key: name,
        sigilId: "0x01",
        name,
        isFallbackMetadata: false,
        imageUrl: null,
        modules: [],
        href: "/agent/8453/1380",
        identityProblem: null,
        statementCount: 3,
        marketCap: null,
        marketCapExact: null,
        positions: "",
        isUnsupported: true,
    })),
});

vi.mock("../hooks/use-agent-cohort", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../hooks/use-agent-cohort")>()),
    useAgentSearch: (name: string) => ({
        data: agents(name.toLowerCase().includes("dackie") ? ["Captain Dackie"] : []),
        error: null,
    }),
}));
vi.mock("../hooks/use-tool-catalog", () => ({
    useReadsSignals: () => false,
    useToolCatalog: () => ({data: CATALOG, error: null}),
}));
vi.mock("../hooks/use-skill-facts", () => ({
    useSkillFacts: () => ({
        factFor: (label: string | null) =>
            label?.endsWith("wide-plans") === true ? {description: "", installs: 9} : null,
        repoFactFor: (label: string | null) =>
            label?.endsWith("zeta-plans") === true
                ? {stars: 5, archived: false, gone: false}
                : null,
    }),
}));

let indexRead: SkillsIndexRead = {status: "ok", skills: []};
vi.mock("../hooks/use-skills-index", () => ({useSkillsIndex: () => indexRead}));

const search = (text: string) => {
    const box = screen.getByRole("searchbox", {name: "Search agents and tools"});
    fireEvent.change(box, {target: {value: text}});
    fireEvent.submit(screen.getByRole("search"));
};

describe("the search page (task 48)", () => {
    it("shows nothing before a query", () => {
        renderWithProviders(<SearchPage />);
        expect(screen.queryByRole("heading", {name: /Agents/})).toBeNull();
    });

    it("finds an agent by name and tools by name in one search", () => {
        renderWithProviders(<SearchPage />);
        search("dackie");
        expect(screen.getByText("Captain Dackie")).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Tools · 0"})).toBeInTheDocument();
        search("writing");
        expect(screen.getByText("writing-plans")).toBeInTheDocument();
        expect(screen.queryByText("brainstorming")).toBeNull();
        expect(screen.getByText(/No agent by that name/)).toBeInTheDocument();
    });

    it("orders by installs where Signals cannot be read, then stars, then the name", () => {
        renderWithProviders(<SearchPage />);
        search("plans");
        const names = screen.getAllByRole("link").map((link) => link.textContent ?? "");
        const at = (name: string) => names.findIndex((text) => text.includes(name));
        expect(at("wide-plans")).toBeGreaterThanOrEqual(0);
        expect(at("wide-plans")).toBeLessThan(at("zeta-plans"));
        expect(at("zeta-plans")).toBeLessThan(at("writing-plans"));
    });

    it("offers to open an agent typed by its ids", () => {
        renderWithProviders(<SearchPage />);
        search("8453/1380");
        expect(screen.getByRole("link", {name: "Open agent 8453/1380 →"})).toHaveAttribute(
            "href",
            "/agent/8453/1380",
        );
    });
});

describe("the search reads skills.sh too (task 82)", () => {
    it("lists skills.sh's results, without the ones ARP already shows, each opening its pulse", () => {
        indexRead = {
            status: "ok",
            skills: [
                {source: "obra/superpowers", skill: "writing-plans", installs: 10, url: "https://github.com/obra/superpowers?skill=writing-plans"},
                {source: "openai/skills", skill: "transcribe", installs: 4033, url: "https://github.com/openai/skills?skill=transcribe"},
                {source: "mintlify.com", skill: "docs", installs: 1, url: null},
            ],
        };
        renderWithProviders(<SearchPage />);
        search("writing");
        expect(screen.getByRole("heading", {name: "On skills.sh · 1"})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: /transcribe/})).toHaveAttribute("href", "/pulse/openai/skills/transcribe");
        expect(screen.getByText(/4K installs/)).toBeInTheDocument();
        expect(screen.getAllByText("writing-plans")).toHaveLength(1);
        expect(screen.queryByText("docs")).toBeNull();
    });

    it("says so when skills.sh does not answer, rather than showing an empty list", () => {
        indexRead = {status: "unavailable", reason: "skills.sh answered 503"};
        renderWithProviders(<SearchPage />);
        search("writing");
        expect(screen.getByText("skills.sh did not answer. Try again in a moment.")).toBeInTheDocument();
        indexRead = {status: "ok", skills: []};
    });
});
