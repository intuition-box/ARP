import {describe, expect, it, vi} from "vitest";
import type {
    RegisteredTool,
    RegisteredToolsPage,
    ToolListing,
    ToolListingPage,
} from "@arp-protocol/core";

import {getAtomStanding, listTools, type AtomStanding} from "@arp-protocol/core";

import {atomStandingQueryOptions} from "../use-atom-standing";
import {toolCatalogQueryKey, toolCatalogQueryOptions} from "../use-tool-catalog";
import {visibleStanding} from "../../services/test-identities";
import {formatTrust} from "../../services/trust-format";

function tool(atomId: string, overrides: Partial<ToolListing> = {}): ToolListing {
    return {
        atomId,
        label: "Trail of Bits — guidelines-advisor",
        uri: "ipfs://bafkreie5h7fovc2ytr43kyzoh634txokyt4yjw4mu2v724zqxbbment6cy",
        hostedAt: null,
        type: "Thing",
        edgeCount: 1,
        declarers: [],
        pricedEdges: 1,
        sponsoredDeposits: 0,
        sponsoredWallets: 0,
        declaredDeposits: 1,
        supportAssetsSum: 1_980_000_001_000_000n,
        opposeAssetsSum: 1_000_000n,
        ...overrides,
    };
}

function pageOf(): ToolListingPage {
    return {curveId: 1, edgesRead: 1, truncated: false, sponsor: null, tools: [tool("0xba5844b5")]};
}

function registered(atomId: string, overrides: Partial<RegisteredTool> = {}): RegisteredTool {
    return {
        atomId,
        label: "github.com/crytic/slither",
        uri: "ipfs://bafkreidf2beugrdbzvidlwibi46fhyanrh7v3noaucjahsllu2xjqtas44",
        url: "https://github.com/crytic/slither",
        positionCount: 1,
        assets: 9_825_000_000_000_000n,
        declarations: 0,
        ...overrides,
    };
}

function registeredPageOf(tools: RegisteredTool[]): RegisteredToolsPage {
    return {curveId: 1, truncated: false, tools};
}

/** Nothing registered — the live state on both chains as of 2026-10-21. */
const noneRegistered = async () => registeredPageOf([]);

/** No test identity found on the graph, so nothing is filtered. */
const noneHidden = async (): Promise<ReadonlySet<string>> => new Set<string>();

describe("toolCatalogQueryKey", () => {
    it("keys on the order, because two orders are two sequences", () => {
        // A page from one order must never be served from cache for the other.
        expect(toolCatalogQueryKey(1155, "priced-edges", 1)).not.toEqual(
            toolCatalogQueryKey(1155, "conviction", 1),
        );
        // The two curves are two markets, so one must never be served from the other's cache.
        expect(toolCatalogQueryKey(1155, "priced-edges", 1)).not.toEqual(
            toolCatalogQueryKey(1155, "priced-edges", 2),
        );
    });

    /**
     * The chain is the one that cannot be left out. ARP's own three `uses` edges are on 13579 while
     * the cohort is on 1155, so a reader switches to see them — and a shared key would serve the
     * other chain's rows from cache under the new label.
     */
    it("keys on the chain, so one chain's rows never render under the other's name", () => {
        expect(toolCatalogQueryKey(1155, "priced-edges", 1)).not.toEqual(
            toolCatalogQueryKey(13579, "priced-edges", 1),
        );
    });
});

/** Either chain, named at the call site so the key assertions above stay readable. */
const MAINNET = {chainId: 1155, graphqlUrl: "https://mainnet.intuition.sh/v1/graphql"};

describe("toolCatalogQueryOptions", () => {
    it("passes the order through and maps the page to rows", async () => {
        const fetchListing = vi.fn(async () => pageOf());
        const options = toolCatalogQueryOptions(
            MAINNET,
            "conviction",
            2,
            fetchListing,
            noneRegistered,
            noneHidden,
        );
        const view = await options.queryFn();

        expect(fetchListing).toHaveBeenCalledWith("conviction", 2, null, new Set());
        expect(view.rows).toHaveLength(1);
        expect(view.rows[0]?.name).toBe("Trail of Bits — guidelines-advisor");
        expect(view.rows[0]?.href).toBe("/atom/0xba5844b5");
        // The counter vault's creation dust is under the smallest printed figure, so the cell stays
        // empty rather than showing "<0.00000001 against" that nobody put there (task 48).
        expect(view.rows[0]?.opposeTrust).toBeNull();
    });

    it("passes the chain's sponsor to the read and keys on it", async () => {
        // The sponsor decides which deposits read as signals, so a page read without one must
        // never be served from cache once one is configured.
        const sponsor = "0x906f3A52ec089f8D4E9127F91C6bE5Ae0d18f91f";
        const fetchListing = vi.fn(async () => pageOf());
        const options = toolCatalogQueryOptions(
            {chainId: 13579, graphqlUrl: "https://testnet.intuition.sh/v1/graphql", sponsor},
            "conviction",
            1,
            fetchListing,
            noneRegistered,
            noneHidden,
        );
        await options.queryFn();
        expect(fetchListing).toHaveBeenCalledWith("conviction", 1, sponsor, new Set());
        expect(options.queryKey).toEqual(toolCatalogQueryKey(13579, "conviction", 1, sponsor));
        expect(options.queryKey).not.toEqual(toolCatalogQueryKey(13579, "conviction", 1));
    });

    it("keeps the previous page while a new order loads", () => {
        // Switching order is the same rows in a different sequence, so replacing the list with a
        // loading state on every click would be a worse answer than a stale one.
        const options = toolCatalogQueryOptions(
            MAINNET,
            "priced-edges",
            1,
            async () => pageOf(),
            noneRegistered,
            noneHidden,
        );
        expect(options.placeholderData).toBeDefined();
    });

    it("lets a failed read surface rather than retrying indefinitely", () => {
        const options = toolCatalogQueryOptions(
            MAINNET,
            "priced-edges",
            1,
            async () => pageOf(),
            noneRegistered,
            noneHidden,
        );
        expect(options.retry).toBe(1);
    });

    it("shows registered tools beside declared ones, each marked for what it is", async () => {
        /**
         * The two populations, and why there are two rather than one widened filter.
         *
         * `listTools` keeps only `uses` edges whose subject carries a `same as` edge — the only
         * proof on the graph that a subject is a real ERC-8004 agent. Measured on mainnet
         * 2026-10-21, **0 of 185** edges pass it, so a catalogue of declarations alone has nothing
         * to show. A registered tool is an **atom**, not an edge, so it never passes through that
         * query and a person can create one without being an agent.
         */
        const options = toolCatalogQueryOptions(
            MAINNET,
            "conviction",
            1,
            async () => pageOf(),
            async () => registeredPageOf([registered("0xfeed")]),
            noneHidden,
        );
        const view = await options.queryFn();

        expect(view.rows.map((row) => row.provenance)).toEqual(["declared", "registered"]);
        expect(view.rows[1]?.name).toBe("crytic/slither");
        // Positions on the tool's own atom. Not folded into the deposit counts, which count events
        // across edges — summing the two would be ADR `0023`'s per-vault-versus-across-edges error.
        expect(view.rows[1]?.stakers).toBe(1);
        expect(view.rows[0]?.stakers).toBeNull();
    });

    it("keeps the declared row when a tool is in both populations", async () => {
        // A tool can be registered by a person and declared by an agent. The declared row carries
        // the per-edge market this page is about; the atom-vault figures answer the other question
        // and are on the tool's own page.
        const options = toolCatalogQueryOptions(
            MAINNET,
            "conviction",
            1,
            async () => pageOf(),
            async () => registeredPageOf([registered("0xBA5844B5", {label: "should not appear"})]),
            noneHidden,
        );
        const view = await options.queryFn();

        expect(view.rows).toHaveLength(1);
        expect(view.rows[0]?.provenance).toBe("declared");
    });

    it("reports truncation from either read", async () => {
        const options = toolCatalogQueryOptions(
            MAINNET,
            "conviction",
            1,
            async () => pageOf(),
            async () => ({
                ...registeredPageOf([]),
                truncated: true,
            }),
            noneHidden,
        );
        expect((await options.queryFn()).truncated).toBe(true);
    });

    it("leaves out what ARP's own tests wrote, and keeps the tool in the catalogue", async () => {
        // Task 74: a tool declared only by ARP's test agents loses its declared row, and stays
        // listed as registered with no declaration. The leaving out is `listTools`'s (task 143), so
        // the listing is asked with the hidden list and returns no row for that tool.
        const fetchListing = vi.fn(async () => ({...pageOf(), tools: []}));
        const options = toolCatalogQueryOptions(
            {chainId: 13579, graphqlUrl: "https://indexer.test"},
            "conviction",
            1,
            fetchListing,
            async () => registeredPageOf([registered("0xba5844b5", {declarations: 3})]),
            async () => new Set(["0xaaa"]),
        );
        const view = await options.queryFn();

        expect(fetchListing).toHaveBeenCalledWith("conviction", 1, null, new Set(["0xaaa"]));
        const only = view.rows.find((row) => row.key === "0xba5844b5");
        expect(only?.provenance).toBe("registered");
        expect(only?.declarations).toBe(0);
    });

    it("shows a tool one hidden and one visible agent declared as its atom page does (task 143)", async () => {
        // The pdf skill on 13579, 2026-11-12: four `uses pdf` edges, three by ARP's test agents.
        // /tools showed all four edges' figures while the atom page showed one declaration.
        const sponsor = "0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9";
        const edge = (subject: string, assets: string) => ({
            term_id: `edge-${subject}`,
            subject_id: subject,
            object: {
                term_id: "0xpdf",
                label: "github.com/anthropics/skills?skill=pdf",
                data: null,
                type: "Thing",
            },
            term: {
                total_assets: assets,
                vaults: [{position_count: 2, total_assets: assets}],
                deposits: {aggregate: {count: 2}},
                sponsored: {aggregate: {count: 1}},
            },
            counter_term: {total_assets: "0", vaults: [{position_count: 0, total_assets: "0"}]},
        });
        const triples = [edge("0xtest", "1980000001000000"), edge("0xreal", "990000001000000")];
        const transport = {
            async request(query: string) {
                if (query.includes("deposits(")) {
                    return {
                        deposits: [
                            {term_id: "edge-0xtest", receiver_id: "0xTesterWallet"},
                            {term_id: "edge-0xreal", receiver_id: "0xRealWallet"},
                        ],
                    };
                }
                return {triples};
            },
        };
        const options = toolCatalogQueryOptions(
            {chainId: 13579, graphqlUrl: "https://indexer.test", sponsor},
            "conviction",
            1,
            (order, curveId, chosen, excludeSubjects) =>
                // A stub of the one method `listTools` calls; the transport's other members go unused.
                listTools({
                    graphqlUrl: "https://indexer.test",
                    transport: transport as never,
                    order,
                    curveId,
                    sponsor: chosen,
                    excludeSubjects,
                }),
            noneRegistered,
            async () => new Set(["0xtest"]),
        );
        const row = (await options.queryFn()).rows.find((r) => r.key === "0xpdf");

        // The atom page's read of the same two edges, after `visibleStanding`.
        // Only the fields `visibleStanding` reads are set.
        const standing = visibleStanding(
            {
                edgeCount: 2,
                groups: [
                    {
                        predicate: {atomId: "0xuses", label: "uses"},
                        edges: triples.map((t) => ({
                            tripleId: t.term_id,
                            subject: {atomId: t.subject_id, label: null, type: null},
                            support: {totalAssets: BigInt(t.term.total_assets), positionCount: 2},
                            oppose: {totalAssets: 0n, positionCount: 0},
                        })),
                        assets: 0n,
                        positions: 0,
                    },
                ],
            } as unknown as AtomStanding,
            new Set(["0xtest"]),
        );

        expect(row?.declarations).toBe(standing.edgeCount);
        expect(row?.declarers).toEqual(["0xreal"]);
        expect(row?.sponsoredDeposits).toBe(1);
        expect(row?.wallets).toBe(1);
        expect(row?.supportTrust).toBe(formatTrust(standing.groups[0]?.assets ?? -1n));
        expect(row?.supportTrust).toBe(formatTrust(990_000_001_000_000n));
    });

    it("counts one sponsored line once on the atom page and on /tools (task 144)", async () => {
        // `uses pdf` by agent 46 on 13579, read 2026-11-12: two positions, the sponsoring service's
        // opening one and the agent's, 0.00099 tTRUST each. The atom page counted 2 supports and
        // /tools 1 Signal; with the sponsor excluded, both read 1.
        const sponsor = "0x77939A4c276f3E549276CEB3A09CDa1fF58b7ec9";
        const assets = "1980000001000000";
        const listingTransport = {
            async request(query: string) {
                if (query.includes("deposits(")) {
                    return {deposits: [{term_id: "edge-46", receiver_id: "0xAgentWallet"}]};
                }
                return {
                    triples: [
                        {
                            term_id: "edge-46",
                            subject_id: "0xagent46",
                            object: {term_id: "0xpdf", label: "pdf", data: null, type: "Thing"},
                            term: {
                                total_assets: assets,
                                vaults: [{position_count: 2, total_assets: assets}],
                                deposits: {aggregate: {count: 2}},
                                sponsored: {aggregate: {count: 1}},
                            },
                            counter_term: {total_assets: "0", vaults: []},
                        },
                    ],
                };
            },
        };
        const tools = toolCatalogQueryOptions(
            {chainId: 13579, graphqlUrl: "https://indexer.test", sponsor},
            "conviction",
            1,
            (order, curveId, chosen, excludeSubjects) =>
                // A stub of the one method `listTools` calls; the transport's other members go unused.
                listTools({
                    graphqlUrl: "https://indexer.test",
                    transport: listingTransport as never,
                    order,
                    curveId,
                    sponsor: chosen,
                    excludeSubjects,
                }),
            noneRegistered,
            async () => new Set<string>(),
        );
        const row = (await tools.queryFn()).rows.find((r) => r.key === "0xpdf");

        const seen: unknown[] = [];
        const standingTransport = {
            async request(_query: string, variables: Record<string, unknown>) {
                seen.push(variables["exclude"]);
                // `kept` answers what `_nin: $exclude` leaves: the agent's position only.
                // `getAtomStanding` always sends `exclude` as a string array, asserted just below.
                const kept = (variables["exclude"] as string[]).includes(sponsor) ? 1 : 2;
                return {
                    atom: [{term_id: "0xpdf", label: "pdf", type: "Thing", term: {}}],
                    claims: [],
                    triples: [
                        {
                            term_id: "edge-46",
                            predicate: {term_id: "0xuses", label: "uses"},
                            subject: {term_id: "0xagent46", label: "Agent 13579:46", type: "Thing"},
                            term: {
                                total_assets: assets,
                                vaults: [{position_count: 2, kept: {aggregate: {count: kept}}}],
                            },
                            counter_term: {total_assets: "0", vaults: []},
                        },
                    ],
                };
            },
        };
        const atomPage = atomStandingQueryOptions(
            {chainId: 13579, graphqlUrl: "https://indexer.test", symbol: "tTRUST", payers: [sponsor]},
            "0xpdf",
            (atomId, config) =>
                // A stub of the one method `getAtomStanding` calls.
                getAtomStanding(atomId, {...config, transport: standingTransport as never}),
        );
        const view = await atomPage.queryFn();
        const edge = view.groups[0]?.rows[0];

        expect(seen).toEqual([[sponsor]]);
        expect(edge?.positions).toBe(1);
        expect(edge?.positions).toBe(row?.sponsoredDeposits);
        // The amount is the vault's whole on both pages, the sponsor's own deposit included.
        expect(row?.supportTrust).toBe(formatTrust(BigInt(assets)));
        expect(edge?.backing).toBe(`${formatTrust(BigInt(assets))} tTRUST`);
    });
});
