import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {screen, waitFor, within} from "@testing-library/react";
import {DomainTree, type AtomStanding} from "@arp-protocol/core";
import type {Hex} from "viem";

import {renderWithProviders} from "../test/render";
import type {AtomView, ClaimView} from "../services/atom-standing-view";
import type {FactsAnswer} from "../services/facts-api";
import {SkillPage} from "./SkillPage";

/**
 * The skill page, rendered from a view.
 *
 * The boundaries faked: the protocol package's graph reads (the repository's standing, the domain
 * tree, the catalogue), ARP's Worker (`liveFacts`, which also says where each SKILL.md lives), and
 * `fetch`, which is how the SKILL.md itself is read from `raw.githubusercontent.com`.
 */

vi.mock("@arp-protocol/core", async () => {
    const actual = await vi.importActual<Record<string, unknown>>("@arp-protocol/core");
    return {
        ...actual,
        getAtomStanding: vi.fn(),
        readDomainTree: vi.fn(),
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

const {getAtomStanding, readDomainTree} = await import("@arp-protocol/core");
const {liveFacts} = await import("../hooks/use-live-facts");

const ATOM: Hex = `0x${"ef".repeat(32)}`;
const LABEL = "github.com/example/pack?skill=render-video";
const AT = "2026-11-02T08:00:00.000Z";
const RAW = "https://raw.githubusercontent.com/example/pack/HEAD/skills/render-video/SKILL.md";

/** What `fetch` answers for the SKILL.md, per test. Anything else it is asked for fails. */
let skillMd: () => Promise<Response>;

function facts(overrides: Partial<FactsAnswer> = {}): FactsAnswer {
    return {
        read: {
            skills: {oldest: AT, newest: AT},
            repos: {oldest: AT, newest: AT},
            paths: {oldest: AT, newest: AT},
        },
        skills: {[LABEL]: {description: "Renders a video from a script.", installs: 1_276_987, fetchedAt: AT}},
        repos: {
            "github.com/example/pack": {
                stars: 321,
                days: 1,
                archived: false,
                gone: false,
                description: null,
                fetchedAt: AT,
            },
        },
        paths: {[LABEL]: "skills/render-video/SKILL.md"},
        ...overrides,
    };
}

function claim(predicate: string, object: string, objectAtomId = `0xo-${object}`): ClaimView {
    return {
        tripleId: `0x${"12".repeat(32)}`,
        predicate,
        objectLabel: object,
        object: object.replace(/^github\.com\//, ""),
        objectIsId: false,
        objectAtomId,
        backing: null,
    };
}

const SOURCE = claim("source", "github.com/example/pack", "0xrepo");

function view(overrides: Partial<AtomView> = {}): AtomView {
    return {
        atomId: ATOM,
        title: "render-video",
        subtitle: "example/pack",
        browseUrl: "https://github.com/example/pack",
        url: `https://${LABEL}`,
        label: LABEL,
        titleIsId: false,
        type: "Thing",
        pinnedUri: null,
        offersMarket: true,
        exists: true,
        ownBacking: null,
        ownPositions: 0,
        groups: [],
        claims: [SOURCE],
        edgeCount: 0,
        truncated: false,
        ...overrides,
    };
}

/** The repository's own standing, which is where its liveness verdict is read from. */
function repoStanding(liveness: string | null): AtomStanding {
    const empty = {
        totalMarketCap: 0n,
        totalAssets: 0n,
        marketCap: 0n,
        totalShares: 0n,
        currentSharePrice: 0n,
        positionCount: 0,
    };
    return {
        atomId: "0xrepo",
        label: "github.com/example/pack",
        type: "Thing",
        pinnedUri: null,
        url: "https://github.com/example/pack",
        market: null,
        exists: true,
        groups: [],
        claims:
            liveness === null
                ? []
                : [
                      {
                          tripleId: "0xlive",
                          attestorBacked: true,
                          predicate: {atomId: "0xp-status", label: "has status"},
                          object: {atomId: "0xo-live", label: liveness, type: "Thing"},
                          support: empty,
                      },
                  ],
        edgeCount: 0,
        truncated: false,
        provenance: {source: "intuition", kind: "atom", origin: "0xrepo"},
        // `market: null` and a hand-built claim: the fields this page reads, typed as the package's.
    } as unknown as AtomStanding;
}

/** `tool ← media ← video`: a domain two levels down, so its path has a step before it. */
const TREE = DomainTree.from("tool", [
    {tripleId: "0xh1", child: "media", parent: "tool", positions: 1, shares: 10n},
    {tripleId: "0xh2", child: "video", parent: "media", positions: 1, shares: 10n},
]);

/**
 * Rendered, and the facts read let finish: a test that unmounts while a bundled file is still being
 * imported can hand the next test an unmocked copy of it.
 */
async function renderPage(atomView: AtomView, mainnet = false) {
    const result = renderWithProviders(
        <SkillPage view={atomView} atomId={ATOM} modules={{}} onDeclared={() => {}} />,
        {mainnet},
    );
    await waitFor(() => expect(liveFacts).toHaveBeenCalled());
    return result;
}

/** The nearest enclosing element, or a failure naming what was missing. */
function around(node: Element | null | undefined, selector: string): HTMLElement {
    const found = node?.closest(selector);
    if (!(found instanceof HTMLElement)) throw new Error(`no ${selector} around the node`);
    return found;
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
        vi.fn(async (input: RequestInfo | URL) => {
            if (String(input) === RAW) return skillMd();
            throw new Error("no network in tests");
        }),
    );
});
beforeEach(() => {
    vi.mocked(liveFacts).mockResolvedValue(facts());
    vi.mocked(getAtomStanding).mockResolvedValue(repoStanding(null));
    vi.mocked(readDomainTree).mockResolvedValue(TREE);
    skillMd = async () =>
        new Response(
            "---\nname: render-video\ndescription: Renders a video. Use it when a script is ready.\nversion: 4.0.539\n---\n# Body\n",
            {status: 200},
        );
});
afterEach(() => {
    vi.clearAllMocks();
});

describe("the header", () => {
    it("names the skill, links its repository's page, its host and its pulse", async () => {
        await renderPage(view());
        expect(screen.getByRole("heading", {level: 1})).toHaveTextContent("render-video");
        const repoLinks = screen.getAllByRole("link", {name: "example/pack"});
        expect(repoLinks[0]).toHaveAttribute("href", "/atom/0xrepo");
        expect(screen.getByRole("link", {name: "github.com ↗"})).toHaveAttribute(
            "href",
            "https://github.com/example/pack",
        );
        expect(screen.getByRole("link", {name: "Pulse →"})).toHaveAttribute(
            "href",
            "/pulse/example/pack/render-video",
        );
        expect(
            screen.getByText("npx skills add example/pack --skill render-video"),
        ).toBeInTheDocument();
    });

    it("prints the repository unlinked when no source claim names its atom", async () => {
        await renderPage(view({claims: [], browseUrl: null}));
        expect(screen.getByText("example/pack")).toBeInTheDocument();
        expect(screen.queryByRole("link", {name: "example/pack"})).toBeNull();
        expect(screen.queryByRole("link", {name: /↗/})).toBeNull();
    });

    it("has no repository, no pulse and no install for a label that is not a skill", async () => {
        await renderPage(view({label: null, title: "Loose skill", claims: [], browseUrl: null}));
        expect(screen.getByRole("heading", {level: 1})).toHaveTextContent("Loose skill");
        expect(screen.queryByRole("link", {name: "Pulse →"})).toBeNull();
        expect(screen.queryByText(/npx skills add/)).toBeNull();
    });
});

describe("the description", () => {
    it("reads the SKILL.md: its first sentence large, the rest beneath, its version linked", async () => {
        await renderPage(view());
        expect(await screen.findByText("Renders a video.")).toBeInTheDocument();
        expect(screen.getByText("Use it when a script is ready.")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "SKILL.md · v4.0.539"})).toHaveAttribute(
            "href",
            "https://github.com/example/pack/blob/HEAD/skills/render-video/SKILL.md",
        );
    });

    it("links a SKILL.md with no version as the bare file name", async () => {
        skillMd = async () =>
            new Response("---\ndescription: One sentence only\n---\n", {status: 200});
        await renderPage(view());
        expect(await screen.findByRole("link", {name: "SKILL.md"})).toBeInTheDocument();
        expect(screen.getByText("One sentence only")).toBeInTheDocument();
    });

    it("falls back to skills.sh's copy when the file has no description", async () => {
        skillMd = async () => new Response("---\nversion: 1.0.0\n---\n", {status: 200});
        await renderPage(view());
        expect(await screen.findByRole("link", {name: "SKILL.md · v1.0.0"})).toBeInTheDocument();
        expect(screen.getByText("Renders a video from a script.")).toBeInTheDocument();
    });

    it("says the file did not load, and keeps skills.sh's copy, when the read fails", async () => {
        skillMd = async () => new Response("not found", {status: 404});
        await renderPage(view());
        expect(await screen.findByText("SKILL.md did not load", {}, {timeout: 4000})).toBeInTheDocument();
        expect(screen.getByText("Renders a video from a script.")).toBeInTheDocument();
    });

    it("says there is no SKILL.md, and no description, when nothing is known", async () => {
        vi.mocked(liveFacts).mockResolvedValue(facts({paths: {}, skills: {"github.com/x/y?skill=z": {description: "z", installs: 1, fetchedAt: AT}}}));
        await renderPage(view());
        expect(await screen.findByText("No SKILL.md found")).toBeInTheDocument();
        expect(screen.getByText("no description")).toBeInTheDocument();
    });

    it("says the SKILL.md is being read while it is", async () => {
        skillMd = () => new Promise<Response>(() => {});
        vi.mocked(liveFacts).mockResolvedValue(facts({skills: {"github.com/x/y?skill=z": {description: "z", installs: 1, fetchedAt: AT}}}));
        await renderPage(view());
        expect(await screen.findByText("reading the SKILL.md…")).toBeInTheDocument();
    });
});

describe("the classification panel", () => {
    it("walks the domain from the root down and links the skill's own", async () => {
        await renderPage(view({claims: [SOURCE, claim("has tag", "video", "0xvideo")]}));
        const panel = around(screen.getByText("Classification"), "div");
        const link = await within(panel).findByRole("link", {name: "video"});
        expect(link).toHaveAttribute("href", "/atom/0xvideo");
        expect(within(panel).getByText("media")).toBeInTheDocument();
    });

    it("says none for a skill with no domain and no source", async () => {
        await renderPage(view({claims: []}));
        const panel = around(screen.getByText("Classification"), "div");
        expect(within(panel).getAllByText("none")).toHaveLength(2);
        // Nothing to read a verdict from, so it does not wait for one.
        expect(within(panel).getByText("no verdict")).toBeInTheDocument();
    });

    it("links the repository's liveness verdict to the GitHub request it rests on", async () => {
        vi.mocked(getAtomStanding).mockResolvedValue(repoStanding("maintained"));
        await renderPage(view());
        expect(await screen.findByRole("link", {name: "maintained ↗"})).toHaveAttribute(
            "href",
            "https://api.github.com/repos/example/pack",
        );
    });

    it("prints a verdict without a link for a repository that is not on GitHub", async () => {
        vi.mocked(getAtomStanding).mockResolvedValue(repoStanding("reachable"));
        await renderPage(view({claims: [claim("source", "gitlab.com/example/pack", "0xrepo")]}));
        expect(await screen.findByText("reachable")).toBeInTheDocument();
        expect(screen.queryByRole("link", {name: /reachable/})).toBeNull();
    });

    it("gives no verdict once the repository's standing holds none", async () => {
        await renderPage(view());
        const panel = around(screen.getByText("Classification"), "div");
        await waitFor(() => expect(within(panel).getByText("no verdict")).toBeInTheDocument());
    });
});

describe("the external signals", () => {
    it("prints skills.sh's installs and GitHub's stars and last push, dated", async () => {
        await renderPage(view());
        const panel = around(screen.getByText("External signals"), "div");
        await waitFor(() => expect(within(panel).getByText("1,276,987")).toBeInTheDocument());
        expect(within(panel).getByText("321")).toBeInTheDocument();
        expect(within(panel).getByText("1 day")).toBeInTheDocument();
        expect(within(panel).getByText("2 Nov 2026")).toBeInTheDocument();
    });

    it("prints dashes and no date when nothing is known", async () => {
        vi.mocked(liveFacts).mockResolvedValue(
            facts({
                read: {
                    skills: {oldest: null, newest: null},
                    repos: {oldest: null, newest: null},
                    paths: {oldest: null, newest: null},
                },
                skills: {[LABEL]: {description: "d", installs: null, fetchedAt: AT}},
                repos: {},
            }),
        );
        await renderPage(view());
        const panel = around(screen.getByText("External signals"), "div");
        await waitFor(() => expect(within(panel).getAllByText("—")).toHaveLength(3));
        expect(within(panel).queryByText(/Nov 2026/)).toBeNull();
    });

    it("says days, plural, for anything but one", async () => {
        const answer = facts();
        answer.repos["github.com/example/pack"] = {
            ...repoOf(answer),
            days: 30,
        };
        vi.mocked(liveFacts).mockResolvedValue(answer);
        await renderPage(view());
        expect(await screen.findByText("30 days")).toBeInTheDocument();
    });
});

describe("relations and the record", () => {
    it("lists every declaration about the skill under Relations", async () => {
        await renderPage(
            view({
                edgeCount: 1,
                groups: [
                    {
                        predicateAtomId: "0xp-uses",
                        label: "uses",
                        labelIsId: false,
                        inverse: null,
                        rows: [
                            {
                                tripleId: "0xe1",
                                name: "Agent 13579:3",
                                nameIsId: false,
                                subjectAtomId: "0xagent",
                                label: "Agent 13579:3",
                                backing: null,
                                positions: 0,
                                opposition: null,
                            },
                        ],
                        backing: null,
                        positions: 0,
                    },
                ],
            }),
        );
        const relations = around(screen.getByRole("heading", {name: "Relations"}), "section");
        expect(within(relations).getAllByText(/Agent 13579:3/).length).toBeGreaterThan(0);
    });

    it("records the atom, what it identifies, and the source triple, on the chain read", async () => {
        await renderPage(view(), true);
        expect(screen.getByRole("link", {name: ATOM}).getAttribute("href")).toContain(ATOM);
        expect(screen.getByRole("link", {name: `https://${LABEL}`})).toBeInTheDocument();
        expect(screen.getByText("source")).toBeInTheDocument();
        expect(screen.getByText("ARP's attestor")).toBeInTheDocument();
        const triple = screen.getByRole("link", {name: /^0x1212/});
        expect(triple.getAttribute("href")).toContain(SOURCE.tripleId);
    });

    it("leaves out the identifies, source and attestor rows when there are none", async () => {
        await renderPage(view({url: null, claims: []}));
        expect(screen.queryByText("Identifies")).toBeNull();
        expect(screen.queryByText("Written by")).toBeNull();
    });
});
