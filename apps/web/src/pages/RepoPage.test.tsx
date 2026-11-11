import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {screen, waitFor, within} from "@testing-library/react";
import type {Hex} from "viem";

import {renderWithProviders} from "../test/render";
import type {AtomView, ClaimView, EdgeRow, GroupView} from "../services/atom-standing-view";
import type {FactsAnswer} from "../services/facts-api";
import {RepoPage} from "./RepoPage";

/**
 * The repository page, rendered from a view.
 *
 * Two boundaries are faked and nothing else: the protocol package's graph reads, and ARP's Worker
 * (`liveFacts`), which is where GitHub's and skills.sh's figures come from. `fetch` itself throws, so
 * a read nobody faked fails here rather than leaving the machine.
 */

vi.mock("@arp-protocol/core", async () => {
    const actual = await vi.importActual<Record<string, unknown>>("@arp-protocol/core");
    return {
        ...actual,
        getToolWallets: vi.fn(async () => []),
        listTools: vi.fn(async () => ({
            curveId: 1,
            edgesRead: 0,
            truncated: false,
            sponsor: null,
            tools: [],
        })),
        listRegisteredTools: vi.fn(async () => ({curveId: 1, truncated: false, tools: []})),
    };
});

vi.mock("../hooks/use-live-facts", () => ({liveFacts: vi.fn(async () => null)}));

// ARP's own record of each skill's domain tag: the bundled file, replaced by a known one.
vi.mock("../data/skill-catalogue.json", () => ({
    default: {
        skills: {
            "github.com/example/pack?skill=render-video": {atom: "0xskill1", domain: "media"},
            "github.com/example/pack?skill=cut-audio": {atom: "0xskill2", domain: null},
            "github.com/example/pack?skill=trim-clip": {atom: "0xskill3", domain: "media"},
        },
    },
}));

const {listTools} = await import("@arp-protocol/core");
const {liveFacts} = await import("../hooks/use-live-facts");

const ATOM: Hex = `0x${"cd".repeat(32)}`;
const AT = "2026-11-01T08:00:00.000Z";

function facts(overrides: Partial<FactsAnswer> = {}): FactsAnswer {
    const skill = (description: string, installs: number | null) => ({
        description,
        installs,
        fetchedAt: AT,
    });
    return {
        read: {
            skills: {oldest: AT, newest: AT},
            repos: {oldest: AT, newest: AT},
            paths: {oldest: AT, newest: AT},
        },
        skills: {
            "github.com/example/pack?skill=render-video": skill("Render a video.", 1500),
            "github.com/example/pack?skill=cut-audio": skill("Cut audio.", 200),
            "github.com/example/pack?skill=trim-clip": skill("Trim a clip.", null),
            // The same three skills, word for word, in another repository.
            "github.com/copy/pack?skill=render-video": skill("Render a video.", 40),
            "github.com/copy/pack?skill=cut-audio": skill("Cut audio.", 2),
            "github.com/copy/pack?skill=trim-clip": skill("Trim a clip.", null),
        },
        repos: {
            "github.com/example/pack": {
                stars: 1234,
                days: 1,
                archived: false,
                gone: false,
                description: "Video tools for agents.",
                fetchedAt: AT,
            },
            "github.com/copy/pack": {
                stars: 5,
                days: null,
                archived: false,
                gone: false,
                description: null,
                fetchedAt: AT,
            },
        },
        paths: {},
        ...overrides,
    };
}

function row(atomId: string, skill: string, owner = "example"): EdgeRow {
    return {
        tripleId: `0xt-${atomId}`,
        name: skill,
        nameIsId: false,
        subjectAtomId: atomId,
        label: `github.com/${owner}/pack?skill=${skill}`,
        backing: null,
        positions: 0,
        opposition: null,
    };
}

function group(label: string, rows: EdgeRow[]): GroupView {
    return {
        predicateAtomId: `0xp-${label}`,
        label,
        labelIsId: false,
        inverse: null,
        rows,
        backing: null,
        positions: 0,
    };
}

function claim(object: string): ClaimView {
    return {
        tripleId: `0xc-${object}`,
        predicate: "has status",
        objectLabel: object,
        object,
        objectIsId: false,
        objectAtomId: `0xo-${object}`,
        backing: null,
    };
}

function view(overrides: Partial<AtomView> = {}): AtomView {
    return {
        atomId: ATOM,
        title: "example/pack",
        subtitle: null,
        browseUrl: "https://github.com/example/pack",
        url: "https://github.com/example/pack",
        label: "github.com/example/pack",
        titleIsId: false,
        type: "Thing",
        pinnedUri: null,
        offersMarket: true,
        exists: true,
        ownBacking: null,
        ownPositions: 0,
        groups: [
            group("source", [
                row("0xskill2", "cut-audio"),
                row("0xskill3", "trim-clip"),
                row("0xskill1", "render-video"),
            ]),
        ],
        claims: [],
        edgeCount: 3,
        truncated: false,
        ...overrides,
    };
}

/**
 * Rendered, and the facts read let finish: a test that unmounts while the bundled catalogue is
 * still being imported hands the next test an unmocked copy of it.
 */
async function renderPage(atomView: AtomView, mainnet = false) {
    const result = renderWithProviders(<RepoPage view={atomView} atomId={ATOM} modules={{}} />, {
        mainnet,
    });
    await waitFor(() => expect(liveFacts).toHaveBeenCalled());
    await screen.findByText("Classification");
    return result;
}

/** The nearest enclosing element, or a failure naming what was missing. */
function around(node: Element | null | undefined, selector: string): HTMLElement {
    const found = node?.closest(selector);
    if (!(found instanceof HTMLElement)) throw new Error(`no ${selector} around the node`);
    return found;
}

/** The element itself, or a failure: an index or a sibling the page should have. */
function present(node: Element | null | undefined): HTMLElement {
    if (!(node instanceof HTMLElement)) throw new Error("an element the page should have");
    return node;
}

/** This page's repository in a facts answer, which every fixture here carries. */
function repoOf(answer: FactsAnswer): FactsAnswer["repos"][string] {
    const repo = answer.repos["github.com/example/pack"];
    if (repo === undefined) throw new Error("the fixture names the repository");
    return repo;
}

// For the whole file and never restored: a polling read keeps firing after the last test, and
// with the stub gone it reached happy-dom's real `fetch`. The environment dies with the file.
beforeAll(() => {
    vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
            throw new Error("no network in tests");
        }),
    );
});
beforeEach(() => {
    vi.mocked(liveFacts).mockResolvedValue(facts());
});
afterEach(() => {
    vi.clearAllMocks();
});

describe("the header", () => {
    it("names the owner and the repository, links the host and offers the install line", async () => {
        await renderPage(view());
        const heading = screen.getByRole("heading", {level: 1});
        expect(heading).toHaveTextContent("example/pack");
        expect(screen.getByRole("link", {name: "github.com ↗"})).toHaveAttribute(
            "href",
            "https://github.com/example/pack",
        );
        expect(screen.getByText("npx skills add example/pack")).toBeInTheDocument();
        expect(await screen.findByText("Video tools for agents.")).toBeInTheDocument();
    });

    it("falls back to the title, with no host link and no install, for a label that is not a repository", async () => {
        await renderPage(view({label: null, title: "Some repository", browseUrl: null, groups: []}));
        expect(screen.getByRole("heading", {level: 1})).toHaveTextContent("Some repository");
        expect(screen.queryByRole("link", {name: /↗/})).toBeNull();
        expect(screen.queryByText(/npx skills add/)).toBeNull();
        // No skills, so neither the table nor the domain row is drawn.
        expect(screen.queryByRole("table")).toBeNull();
        expect(screen.queryByText("Domains")).toBeNull();
    });
});

describe("the skills it publishes", () => {
    it("lists them ordered by installs, with each one's description and domain", async () => {
        await renderPage(view());
        expect(screen.getByRole("heading", {name: "3 skills"})).toBeInTheDocument();
        await screen.findByText("Render a video.");
        const skillTable = present(screen.getAllByRole("table")[0]);
        const rows = within(skillTable).getAllByRole("row").slice(1);
        expect(rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent)).toEqual([
            "render-video",
            "cut-audio",
            "trim-clip",
        ]);
        expect(within(present(rows[0])).getByText("1,500")).toBeInTheDocument();
        expect(within(present(rows[0])).getByText("media")).toBeInTheDocument();
        expect(within(present(rows[1])).getByText("no tag")).toBeInTheDocument();
        // No install count is a dash, never a zero.
        expect(within(present(rows[2])).getByText("—")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "render-video"})).toHaveAttribute(
            "href",
            "/atom/0xskill1",
        );
    });

    it("counts the agents using a skill and what is behind it, from the catalogue's read", async () => {
        vi.mocked(listTools).mockResolvedValue({
            curveId: 1,
            edgesRead: 2,
            truncated: false,
            sponsor: null,
            tools: [
                {
                    atomId: "0xSKILL1",
                    label: "github.com/example/pack?skill=render-video",
                    uri: null,
                    hostedAt: null,
                    type: "Thing",
                    edgeCount: 2,
                    declarers: ["0xagent"],
                    pricedEdges: 2,
                    sponsoredDeposits: 0,
                    sponsoredWallets: 0,
                    declaredDeposits: 0,
                    supportAssetsSum: 2_000_000_000_000_000_000n,
                    opposeAssetsSum: 0n,
                },
            ],
        });
        await renderPage(view());
        const cell = await screen.findByText(/tTRUST$/);
        const skillRow = around(cell, "tr");
        expect(within(skillRow).getByText("render-video")).toBeInTheDocument();
        expect(within(skillRow).getByText("2")).toBeInTheDocument();
        // The other two have nobody behind them, and say so.
        expect(screen.getAllByText("nothing")).toHaveLength(2);
    });

    it("says one skill, not one skills", async () => {
        await renderPage(view({groups: [group("source", [row("0xskill1", "render-video")])]}));
        expect(await screen.findByRole("heading", {name: "1 skill"})).toBeInTheDocument();
    });
});

describe("the classification panel", () => {
    it("groups the skills by domain and counts the untagged ones apart", async () => {
        await renderPage(view());
        const domains = around((await screen.findByText("Domains")), "div");
        await waitFor(() => expect(within(domains).getByText("media")).toBeInTheDocument());
        expect(within(domains).getByText("2")).toBeInTheDocument();
        expect(within(domains).getByText("no tag")).toBeInTheDocument();
        expect(within(domains).getByText("1")).toBeInTheDocument();
    });

    it("gives no verdict when nothing is written about the repository's liveness", async () => {
        await renderPage(view());
        expect(screen.getByText("no verdict")).toBeInTheDocument();
    });

    it("links a liveness verdict to the GitHub request it rests on", async () => {
        await renderPage(view({claims: [claim("maintained")]}));
        expect(screen.getByRole("link", {name: "maintained ↗"})).toHaveAttribute(
            "href",
            "https://api.github.com/repos/example/pack",
        );
    });

    it("prints a verdict without a link when the repository is not on GitHub", async () => {
        await renderPage(
            view({
                label: "gitlab.com/example/pack",
                browseUrl: "https://gitlab.com/example/pack",
                claims: [claim("reachable")],
            }),
        );
        expect(screen.getByText("reachable")).toBeInTheDocument();
        expect(screen.queryByRole("link", {name: /reachable/})).toBeNull();
        expect(screen.getByRole("link", {name: "gitlab.com ↗"})).toBeInTheDocument();
    });

    it("says an archived repository is archived, whatever the attestor wrote", async () => {
        const answer = facts();
        answer.repos["github.com/example/pack"] = {
            ...repoOf(answer),
            archived: true,
        };
        vi.mocked(liveFacts).mockResolvedValue(answer);
        await renderPage(view({claims: [claim("maintained")]}));
        expect(await screen.findByRole("link", {name: "archived ↗"})).toBeInTheDocument();
        expect(screen.queryByText(/maintained/)).toBeNull();
    });

    it("says a repository that no longer exists is gone", async () => {
        const answer = facts();
        answer.repos["github.com/example/pack"] = {
            ...repoOf(answer),
            gone: true,
        };
        vi.mocked(liveFacts).mockResolvedValue(answer);
        await renderPage(view());
        expect(await screen.findByRole("link", {name: "gone ↗"})).toBeInTheDocument();
    });
});

describe("the external signals", () => {
    it("prints GitHub's stars and last push and the installs summed over the known skills, dated", async () => {
        await renderPage(view());
        const panel = around((await screen.findByText("External signals")), "div");
        await waitFor(() => expect(within(panel).getByText("1,234")).toBeInTheDocument());
        expect(within(panel).getByText("1 day")).toBeInTheDocument();
        // 1500 + 200: the skill with no count adds nothing, and is not a zero either.
        expect(within(panel).getByText("1,700")).toBeInTheDocument();
        expect(screen.getByText("1 Nov 2026")).toBeInTheDocument();
    });

    it("prints dashes when nothing is known, and no date", async () => {
        vi.mocked(liveFacts).mockResolvedValue(
            facts({
                read: {
                    skills: {oldest: null, newest: null},
                    repos: {oldest: null, newest: null},
                    paths: {oldest: null, newest: null},
                },
                skills: {"github.com/other/thing?skill=x": {description: "x", installs: 1, fetchedAt: AT}},
                repos: {},
            }),
        );
        await renderPage(view());
        await waitFor(() => expect(vi.mocked(liveFacts)).toHaveBeenCalled());
        const panel = around(screen.getByText("External signals"), "div");
        await waitFor(() => expect(within(panel).getAllByText("—")).toHaveLength(3));
        expect(screen.queryByText(/Nov 2026/)).toBeNull();
    });

    it("says days, plural, for anything but one", async () => {
        const answer = facts();
        answer.repos["github.com/example/pack"] = {
            ...repoOf(answer),
            days: 12,
        };
        vi.mocked(liveFacts).mockResolvedValue(answer);
        await renderPage(view());
        expect(await screen.findByText("12 days")).toBeInTheDocument();
    });
});

describe("the same pack elsewhere", () => {
    it("puts the other repository beside this one, with each one's figures", async () => {
        await renderPage(view());
        expect(
            await screen.findByRole("heading", {name: "The same 3 skills, in 1 other repository"}),
        ).toBeInTheDocument();
        const copy = screen.getByRole("link", {name: "copy/pack"});
        expect(copy).toHaveAttribute("href", "https://github.com/copy/pack");
        const copyRow = around(copy, "tr");
        expect(within(copyRow).getByText("5")).toBeInTheDocument();
        expect(within(copyRow).getByText("—")).toBeInTheDocument();
        expect(within(copyRow).getByText("42")).toBeInTheDocument();
        const hereRow = around(screen.getByText("this page"), "tr");
        expect(within(hereRow).getByText("1d ago")).toBeInTheDocument();
        expect(screen.getByText("installs in the others")).toBeInTheDocument();
    });

    it("says repositories, plural, when there are several copies", async () => {
        const answer = facts();
        for (const skill of ["render-video", "cut-audio", "trim-clip"]) {
            const original = answer.skills[`github.com/example/pack?skill=${skill}`];
            if (original !== undefined) answer.skills[`github.com/third/pack?skill=${skill}`] = original;
        }
        vi.mocked(liveFacts).mockResolvedValue(answer);
        await renderPage(view());
        expect(
            await screen.findByRole("heading", {name: "The same 3 skills, in 2 other repositories"}),
        ).toBeInTheDocument();
        // A repository with no facts of its own prints dashes, not zeros.
        const third = around(screen.getByRole("link", {name: "third/pack"}), "tr");
        expect(within(third).getAllByText("—")).toHaveLength(2);
    });

    it("draws nothing when no other repository carries the whole pack", async () => {
        const answer = facts();
        delete answer.skills["github.com/copy/pack?skill=trim-clip"];
        vi.mocked(liveFacts).mockResolvedValue(answer);
        await renderPage(view());
        await screen.findByText("Render a video.");
        expect(screen.queryByRole("heading", {name: /The same/})).toBeNull();
    });
});

describe("relations and the record", () => {
    it("keeps the other claims under Relations and the source skills out of them", async () => {
        const uses: EdgeRow = {...row("0xagent", "Agent 13579:3"), label: "Agent 13579:3"};
        await renderPage(view({groups: [...view().groups, group("uses", [uses])]}));
        const relations = around(screen.getByRole("heading", {name: "Relations"}), "section");
        expect(within(relations).getAllByText(/Agent 13579:3/).length).toBeGreaterThan(0);
        expect(within(relations).queryByText("render-video")).toBeNull();
    });

    it("records the atom on the explorer of the chain read, and what it identifies", async () => {
        await renderPage(view({claims: [claim("maintained")]}), true);
        const atom = screen.getByRole("link", {name: ATOM});
        expect(atom.getAttribute("href")).toContain(ATOM);
        expect(screen.getByRole("link", {name: "https://github.com/example/pack"})).toBeInTheDocument();
        expect(screen.getByText("3 skills point here")).toBeInTheDocument();
        expect(screen.getByText("ARP's attestor")).toBeInTheDocument();
    });

    it("counts the tagged skills once the catalogue is read", async () => {
        await renderPage(view());
        expect(await screen.findByText("2 of 3 skills")).toBeInTheDocument();
    });

    it("leaves out the identifies row, the domain tags and the attestor when there are none", async () => {
        await renderPage(view({url: null, groups: []}));
        expect(screen.queryByText("Identifies")).toBeNull();
        expect(screen.queryByText("Domain tags")).toBeNull();
        expect(screen.queryByText("Written by")).toBeNull();
        expect(screen.getByText("0 skills point here")).toBeInTheDocument();
    });
});
