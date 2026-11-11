import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, screen, waitFor, within} from "@testing-library/react";
import {DomainTree, type AtomStanding, type MarketSide} from "@arp-protocol/core";

import {renderWithProviders} from "../test/render";
import type {FactsAnswer} from "../services/facts-api";
import {AtomPanel} from "./AtomPanel";

/**
 * The generic atom page's facts column and verdict line: what is read beside the chain (a
 * description, installs, a repository's stars and push date) and what the atom says about itself.
 *
 * Faked at the boundaries only: the protocol package's graph reads, ARP's Worker (`liveFacts`) and
 * `fetch`, which throws for anything nobody faked.
 */

vi.mock("@arp-protocol/core", async () => {
    const actual = await vi.importActual<Record<string, unknown>>("@arp-protocol/core");
    return {
        ...actual,
        getAtomStanding: vi.fn(),
        resolveAgentRefForAtom: vi.fn(async () => null),
        getDeclaredModulesFor: vi.fn(async () => ({})),
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

// The declaration form signs with a wallet; what this page owes it is a re-read once it reports a
// declaration written, so the form is replaced by a button that reports one.
vi.mock("../components/usage/DeclareUse", () => ({
    DeclareUse: ({onDeclared}: {onDeclared: () => void}) => (
        <button type="button" onClick={onDeclared}>
            report a declaration
        </button>
    ),
}));

const {getAtomStanding, readDomainTree} = await import("@arp-protocol/core");
const {liveFacts} = await import("../hooks/use-live-facts");

const ATOM = `0x${"9a".repeat(32)}`;
const TOOL = "mcp.example.com/mcp";
const REPO = "github.com/example/server";
const AT = "2026-11-03T08:00:00.000Z";

const side = (assets: bigint, positions: number | null): MarketSide => ({
    totalMarketCap: assets,
    totalAssets: assets,
    marketCap: assets,
    totalShares: 1000n,
    currentSharePrice: 1n,
    positionCount: positions,
});

type Claim = AtomStanding["claims"][number];

function claim(
    tripleId: string,
    predicate: string,
    object: {atomId: string; label: string | null},
    support: MarketSide = side(0n, 0),
): Claim {
    return {
        tripleId,
        attestorBacked: true,
        predicate: {atomId: `0xp-${predicate}`, label: predicate},
        object: {...object, type: "Thing"},
        support,
    };
}

function standing(overrides: Partial<AtomStanding> = {}): AtomStanding {
    return {
        atomId: ATOM,
        label: TOOL,
        type: "Thing",
        pinnedUri: "ipfs://bafkreiexample",
        url: `https://${TOOL}`,
        market: side(0n, 0),
        exists: true,
        claims: [],
        groups: [],
        edgeCount: 0,
        truncated: false,
        provenance: {source: "intuition", kind: "atom", origin: ATOM},
        ...overrides,
        // `Partial` overrides spread over a whole default leave every field set.
    } as AtomStanding;
}

type RepoFact = FactsAnswer["repos"][string];

function facts(repo: Partial<RepoFact> | null, installs: number | null = 4_200): FactsAnswer {
    return {
        read: {
            skills: {oldest: AT, newest: AT},
            repos: {oldest: AT, newest: AT},
            paths: {oldest: AT, newest: AT},
        },
        skills: {[TOOL]: {description: "An MCP server for examples.", installs, fetchedAt: AT}},
        repos:
            repo === null
                ? {}
                : {
                      [REPO]: {
                          stars: 9_876,
                          days: 3,
                          archived: false,
                          gone: false,
                          description: null,
                          fetchedAt: AT,
                          ...repo,
                      },
                  },
        paths: {},
    };
}

const SOURCE = claim("0xc-source", "source", {atomId: "0xrepo", label: REPO});


/** The element itself, or a failure: an index or a sibling the page should have. */
function present(node: Element | null | undefined): HTMLElement {
    if (!(node instanceof HTMLElement)) throw new Error("an element the page should have");
    return node;
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
    vi.mocked(liveFacts).mockResolvedValue(facts({}));
    vi.mocked(readDomainTree).mockResolvedValue(
        DomainTree.from("tool", [
            {tripleId: "0xh1", child: "security", parent: "tool", positions: 1, shares: 1n},
        ]),
    );
});
afterEach(() => {
    vi.clearAllMocks();
});

async function renderAt(read: AtomStanding) {
    vi.mocked(getAtomStanding).mockResolvedValue(read);
    const result = renderWithProviders(<AtomPanel />, {
        route: {path: "/atom/:atomId", at: `/atom/${ATOM}`},
    });
    await screen.findByRole("heading", {level: 1});
    await waitFor(() => expect(liveFacts).toHaveBeenCalled());
    return result;
}

describe("what is read beside the chain", () => {
    it("leads with the description and lists installs and the source repository's stars", async () => {
        await renderAt(standing({claims: [SOURCE]}));
        expect(await screen.findByText("An MCP server for examples.")).toBeInTheDocument();
        expect(screen.getByText("Installs").nextElementSibling).toHaveTextContent("4,200");
        expect(screen.getByText("GitHub stars").nextElementSibling).toHaveTextContent("9,876");
    });

    it("leaves installs out when there is no count, and stars out when there is no repository", async () => {
        vi.mocked(liveFacts).mockResolvedValue(facts(null, null));
        await renderAt(standing({claims: [SOURCE]}));
        await screen.findByText("An MCP server for examples.");
        expect(screen.queryByText("Installs")).toBeNull();
        expect(screen.queryByText("GitHub stars")).toBeNull();
    });
});

describe("the verdict line", () => {
    it("says maintained, with the push it rests on", async () => {
        await renderAt(standing({claims: [SOURCE]}));
        expect(await screen.findByText("pushed 3d ago")).toBeInTheDocument();
        expect(screen.getByText("maintained")).toBeInTheDocument();
    });

    it("says not maintained for an archived repository", async () => {
        vi.mocked(liveFacts).mockResolvedValue(facts({archived: true}));
        await renderAt(standing({claims: [SOURCE]}));
        expect(await screen.findByText("archived by its owner")).toBeInTheDocument();
        expect(screen.getByText("not maintained")).toBeInTheDocument();
    });

    it("says the repository is gone when it is", async () => {
        vi.mocked(liveFacts).mockResolvedValue(facts({gone: true}));
        await renderAt(standing({claims: [SOURCE]}));
        expect(await screen.findByText("the repository is gone")).toBeInTheDocument();
    });

    it("says there is no push date rather than inventing one", async () => {
        vi.mocked(liveFacts).mockResolvedValue(facts({days: null}));
        await renderAt(standing({claims: [SOURCE]}));
        expect(await screen.findByText("no push date")).toBeInTheDocument();
    });

    it("prints the on-chain verdict's word and what stands behind it, with no evidence when nothing is read", async () => {
        vi.mocked(liveFacts).mockResolvedValue(facts(null));
        await renderAt(
            standing({
                claims: [
                    claim(
                        "0xc-live",
                        "has status",
                        {atomId: "0xreach", label: "reachable"},
                        side(2_000_000_000_000_000_000n, 1),
                    ),
                ],
            }),
        );
        expect(await screen.findByText("reachable")).toBeInTheDocument();
        expect(screen.getByText(/behind it$/)).toHaveTextContent("tTRUST behind it");
        expect(screen.queryByText(/pushed/)).toBeNull();
        // The verdict is not listed a second time among the atom's own claims.
        expect(screen.queryByRole("link", {name: "reachable"})).toBeNull();
    });

    it("draws no verdict when neither the chain nor GitHub says anything", async () => {
        vi.mocked(liveFacts).mockResolvedValue(facts(null));
        await renderAt(standing());
        await screen.findByText("An MCP server for examples.");
        expect(screen.queryByText("maintained")).toBeNull();
    });
});

describe("what the atom says about itself", () => {
    it("names a domain tag as a domain, links each object and prints what is behind a claim", async () => {
        await renderAt(
            standing({
                claims: [
                    claim(
                        "0xc-tag",
                        "has tag",
                        {atomId: "0xsecurity", label: "security"},
                        side(3_000_000_000_000_000_000n, 2),
                    ),
                    claim("0xc-anon", "relates to", {atomId: `0x${"77".repeat(32)}`, label: null}),
                ],
            }),
        );
        const domain = await screen.findByText("Domain");
        expect(within(present(domain.nextElementSibling)).getByRole("link", {name: "security"})).toHaveAttribute(
            "href",
            "/atom/0xsecurity",
        );
        expect(domain.nextElementSibling).toHaveTextContent(/tTRUST/);
        // An object with no label is named by its id, in mono.
        const anon = present(screen.getByText("relates to").nextElementSibling);
        expect(within(anon).getByRole("link")).toHaveClass("font-mono");
    });
});

describe("the identity column", () => {
    it("shows the atom's own support when somebody holds a position on it", async () => {
        await renderAt(standing({market: side(5_000_000_000_000_000_000n, 2)}));
        expect(await screen.findByText("Support")).toBeInTheDocument();
    });

    it("leaves the type and the pin out when the atom has neither", async () => {
        await renderAt(standing({type: null, pinnedUri: null}));
        expect(screen.queryByText("Type")).toBeNull();
        expect(screen.queryByText("Pinned at")).toBeNull();
        expect(screen.getByText("Atom")).toBeInTheDocument();
    });

    it("titles an atom with no label by its id, in mono, and links nothing to browse", async () => {
        await renderAt(standing({label: null, url: null}));
        const heading = screen.getByRole("heading", {level: 1});
        expect(heading).toHaveClass("font-mono");
        expect(heading.textContent).toMatch(/^0x9a9a/);
        expect(screen.queryByRole("link", {name: /↗/})).toBeNull();
    });

    it("keeps a repository on another host on this page, linked to its host", async () => {
        await renderAt(standing({label: "gitlab.com/example/server", url: "https://gitlab.com/example/server"}));
        expect(screen.getByRole("link", {name: "gitlab.com ↗"})).toHaveAttribute(
            "href",
            "https://gitlab.com/example/server",
        );
        expect(screen.queryByText("Repository")).toBeNull();
    });

    it("names the repository under a skill hosted outside GitHub", async () => {
        await renderAt(
            standing({
                label: "gitlab.com/example/server?skill=lint",
                url: "https://gitlab.com/example/server?skill=lint",
            }),
        );
        expect(screen.getByRole("heading", {level: 1})).toHaveTextContent("lint");
        expect(screen.getByText("example/server")).toBeInTheDocument();
    });
});

describe("after a declaration", () => {
    it("reads the atom again, so the new line shows", async () => {
        await renderAt(standing());
        const reads = vi.mocked(getAtomStanding).mock.calls.length;
        fireEvent.click(screen.getByRole("button", {name: "report a declaration"}));
        await waitFor(() => expect(vi.mocked(getAtomStanding).mock.calls.length).toBe(reads + 1));
    });

    it("reads a skill's atom again too", async () => {
        await renderAt(
            standing({
                label: "github.com/example/server?skill=lint",
                url: "https://github.com/example/server?skill=lint",
            }),
        );
        const reads = vi.mocked(getAtomStanding).mock.calls.length;
        fireEvent.click(await screen.findByRole("button", {name: "report a declaration"}));
        await waitFor(() =>
            expect(vi.mocked(getAtomStanding).mock.calls.length).toBeGreaterThan(reads),
        );
    });
});
