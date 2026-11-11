import {fireEvent, render, screen, within} from "@testing-library/react";
import type {ReactNode} from "react";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../../lib/chain-choice";
import {
    buildPanelTabs,
    buildTrustPanel,
    type PanelTab,
    type TrustPanelView,
    type TrustRow,
} from "../../../services/agent-trust";
import type {ClaimVaults, VaultPosition} from "../../../services/trust-stake";
import {
    FRESH,
    MISMATCH,
    richProfile,
    UNVERIFIED,
    UNVERIFIED_UNRECONSTRUCTABLE,
} from "../../../services/__tests__/trust-fixtures";
import {EvidenceRail} from "../EvidenceRail";
import {MarketPanel} from "../MarketPanel";
import {RatingRow} from "../RatingRow";
import {SectionTabs} from "../SectionTabs";
import {TrustPanelTabs} from "../TrustPanelTabs";
import {UnreadSources} from "../UnreadSources";
import {FreshnessLine, SignatureLine} from "../VerdictLines";

/**
 * The agent page's provider rows, built from the services' own fixtures through `buildTrustPanel`
 * so each row has the shape the page really receives. The vault read is mocked at its hook.
 */
const vaults = vi.hoisted(() => ({
    useClaimVaults: vi.fn(),
}));
vi.mock("../../../hooks/use-claim-vaults", () => ({useClaimVaults: vaults.useClaimVaults}));
vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => ({address: undefined}),
}));

const view = buildTrustPanel(richProfile());
const [deep3, aster] = view.rows;
if (deep3 === undefined || aster === undefined) throw new Error("fixture lost its two rows");

function onTestnet(children: ReactNode) {
    return (
        <ChainChoiceContext.Provider value={{choice: choiceFor(false), setMainnet: () => {}}}>
            {children}
        </ChainChoiceContext.Provider>
    );
}

function vault(termId: Hex, totalAssets: bigint, shares: bigint | null): VaultPosition {
    return {termId, curveId: 1n, totalAssets, totalShares: totalAssets, sharePrice: 1n, shares};
}

beforeEach(() => {
    vaults.useClaimVaults.mockReset();
    vaults.useClaimVaults.mockReturnValue({data: undefined, isLoading: false, error: null});
});

describe("TrustPanelTabs", () => {
    const tabs = buildPanelTabs(view.rows).tabs;

    it("lists every provider with its signature line, and ARP with no rating", () => {
        render(
            <TrustPanelTabs tabs={tabs} selectedSlug="deep3-labs" baseId="t" onSelect={() => {}} />,
        );
        const list = screen.getByRole("tablist");
        const all = within(list).getAllByRole("tab");
        expect(all.map((tab) => tab.textContent)).toEqual([
            "Deep3 Labsself-signed",
            "AsterPay KYAnot verified",
            "ARPno rating",
        ]);
        expect(all[0]).toHaveAttribute("aria-selected", "true");
        expect(all[0]).toHaveAttribute("tabindex", "0");
        expect(all[1]).toHaveAttribute("tabindex", "-1");
        expect(all[0]).toHaveAttribute("aria-controls", "t-panel-deep3-labs");
    });

    it("moves with arrows, wraps at both ends, and jumps with Home and End", () => {
        const onSelect = vi.fn();
        render(
            <TrustPanelTabs tabs={tabs} selectedSlug="deep3-labs" baseId="t" onSelect={onSelect} />,
        );
        const all = screen.getAllByRole("tab");
        fireEvent.keyDown(all[0], {key: "ArrowLeft"});
        fireEvent.keyDown(all[2], {key: "ArrowRight"});
        fireEvent.keyDown(all[0], {key: "ArrowDown"});
        fireEvent.keyDown(all[1], {key: "ArrowUp"});
        fireEvent.keyDown(all[1], {key: "End"});
        fireEvent.keyDown(all[2], {key: "Home"});
        fireEvent.keyDown(all[0], {key: "a"});
        expect(onSelect.mock.calls.map(([slug]) => slug)).toEqual([
            "arp",
            "deep3-labs",
            "asterpay-kya",
            "deep3-labs",
            "arp",
            "deep3-labs",
        ]);
        expect(document.activeElement).toBe(all[0]);
        fireEvent.click(all[1]);
        expect(onSelect).toHaveBeenLastCalledWith("asterpay-kya");
    });

    it("draws a mismatch tab's rule in the alarm colour", () => {
        const mismatch: PanelTab = {
            kind: "provider",
            slug: "bad",
            label: "Bad",
            row: deep3,
            summary: {signature: {status: "mismatch", label: "mismatch"}},
        };
        render(
            <TrustPanelTabs
                tabs={[mismatch]}
                selectedSlug="other"
                baseId="t"
                onSelect={() => {}}
            />,
        );
        const tab = screen.getByRole("tab", {name: /Bad/});
        expect(within(tab).getByText("mismatch").className).toContain("color-alarm");
    });
});

describe("SectionTabs", () => {
    const tabs = [
        {slug: "a", label: "Uses", count: 3},
        {slug: "b", label: "Lines", count: null},
        {slug: "c", label: "Notes"},
    ];

    it("shows a count only where one was given, zero included", () => {
        render(
            <SectionTabs
                tabs={[...tabs, {slug: "d", label: "Empty", count: 0}]}
                selectedSlug="a"
                baseId="s"
                onSelect={() => {}}
            />,
        );
        expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
            "Uses3",
            "Lines",
            "Notes",
            "Empty0",
        ]);
        expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-selected", "true");
    });

    it("moves with the keyboard and on click", () => {
        const onSelect = vi.fn();
        render(<SectionTabs tabs={tabs} selectedSlug="a" baseId="s" onSelect={onSelect} />);
        const all = screen.getAllByRole("tab");
        fireEvent.keyDown(all[0], {key: "ArrowUp"});
        fireEvent.keyDown(all[2], {key: "ArrowDown"});
        fireEvent.keyDown(all[0], {key: "ArrowRight"});
        fireEvent.keyDown(all[1], {key: "ArrowLeft"});
        fireEvent.keyDown(all[0], {key: "End"});
        fireEvent.keyDown(all[2], {key: "Home"});
        fireEvent.keyDown(all[0], {key: "Enter"});
        fireEvent.click(all[1]);
        expect(onSelect.mock.calls.map(([slug]) => slug)).toEqual([
            "c",
            "a",
            "b",
            "a",
            "c",
            "a",
            "b",
        ]);
        expect(document.activeElement).toBe(all[0]);
    });
});

describe("MarketPanel", () => {
    it("says there is no market without a triple", () => {
        render(
            onTestnet(
                <MarketPanel
                    row={{...deep3, tripleId: null}}
                    vaults={undefined}
                    isLoading={false}
                    error={null}
                />,
            ),
        );
        expect(screen.getByText("no market")).toBeVisible();
    });

    it("prefers the chain's balances, marks your side, and keeps the vault id checkable", () => {
        const tripleId = deep3.tripleId;
        if (tripleId === null) throw new Error("fixture row has a triple");
        const claim: ClaimVaults = {
            tripleId,
            counterTermId: `0x${"99".repeat(32)}`,
            curveId: 1n,
            support: vault(tripleId, 2n * 10n ** 18n, 10n ** 18n),
            opposition: vault(`0x${"99".repeat(32)}`, 0n, null),
        };
        render(
            onTestnet(<MarketPanel row={deep3} vaults={claim} isLoading={false} error={null} />),
        );
        expect(screen.getByText("2 tTRUST")).toBeVisible();
        expect(screen.getByText("0 tTRUST")).toBeVisible();
        expect(screen.getByText("you: supporting")).toBeVisible();
        expect(screen.getByText(tripleId)).toBeInTheDocument();
        expect(screen.getByText("Your shares")).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "1 distinct supporter"})).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "0 distinct supporters"})).toBeInTheDocument();
    });

    it("says reading while the balances load, and falls back to the indexer when they fail", () => {
        const {rerender} = render(
            onTestnet(<MarketPanel row={deep3} vaults={undefined} isLoading error={null} />),
        );
        expect(screen.getAllByText("reading…")).toHaveLength(2);
        rerender(
            onTestnet(
                <MarketPanel
                    row={deep3}
                    vaults={undefined}
                    isLoading={false}
                    error={new Error("rpc down")}
                />,
            ),
        );
        expect(screen.getByText("0.0009875 tTRUST")).toBeVisible();
        expect(screen.getByText(/Balances could not be read: rpc down/)).toBeVisible();
    });

    it("says what the indexer did not report", () => {
        const market = deep3.market;
        if (market === null) throw new Error("fixture row has a market");
        const row: TrustRow = {
            ...deep3,
            market: {
                ...market,
                support: {...market.support, positionCount: null, marketCap: null},
            },
        };
        const {rerender} = render(
            onTestnet(<MarketPanel row={row} vaults={undefined} isLoading={false} error={null} />),
        );
        expect(screen.getByText("supporter count not reported by the indexer")).toBeVisible();
        expect(screen.getByText("—")).toBeVisible();
        rerender(
            onTestnet(
                <MarketPanel
                    row={{...deep3, market: null}}
                    vaults={undefined}
                    isLoading={false}
                    error={null}
                />,
            ),
        );
        expect(screen.getAllByText("no market data")).toHaveLength(2);
    });
});

describe("RatingRow", () => {
    it("shows the score, its scale, the reviewers, the verdicts, the dimensions and the document", () => {
        render(onTestnet(<RatingRow row={{...deep3, riskLevel: "low"}} session={undefined} />));
        expect(screen.getByRole("heading", {name: "Deep3 Labs"})).toBeVisible();
        expect(screen.getByRole("link", {name: "https://deep3labs.example ↗"})).toBeInTheDocument();
        expect(screen.getByText("55.35")).toBeVisible();
        expect(screen.getByText("score · 0-100 · risk low")).toBeVisible();
        expect(screen.getByText("26 reviewers · 6 comparative · 20 non-comparative")).toBeVisible();
        expect(screen.getByText("Signed, author not checked")).toBeVisible();
        expect(screen.getByText("Stale")).toBeVisible();
        expect(screen.getByText("quality")).toBeVisible();
        expect(screen.getByRole("link", {name: "raw document ↗"})).toHaveAttribute(
            "href",
            "https://api.example/rating.json",
        );
        expect(vaults.useClaimVaults).toHaveBeenCalledWith({
            tripleId: deep3.tripleId,
            curveId: null,
            account: null,
        });
    });

    it("says what is missing: no score, no document, no provider link", () => {
        render(
            onTestnet(
                <RatingRow
                    row={{
                        ...aster,
                        score: null,
                        rating: null,
                        providerUrl: null,
                    }}
                    session={{curveId: 4n, minDeposit: 1n, minShare: 1n}}
                />,
            ),
        );
        expect(screen.getByText("No score in this document.")).toBeVisible();
        expect(
            screen.getByText("No trust assessment published, so there is no document to check."),
        ).toBeVisible();
        expect(screen.queryByRole("link")).toBeNull();
        expect(vaults.useClaimVaults).toHaveBeenCalledWith(expect.objectContaining({curveId: 4n}));
    });

    it("explains a document it could not read, and flags a signature mismatch", () => {
        const rating = deep3.rating;
        if (rating === null) throw new Error("fixture row has a rating");
        render(
            onTestnet(
                <RatingRow
                    row={{
                        ...deep3,
                        scoreScale: null,
                        dimensions: [],
                        documentUrl: null,
                        documentError: {kind: "http", status: 404, statusText: "Not Found"},
                        rating: {...rating, signature: MISMATCH},
                    }}
                    session={undefined}
                />,
            ),
        );
        expect(screen.getByText("The resolver answered HTTP 404 Not Found.")).toBeVisible();
        expect(screen.getByText("score")).toBeVisible();
        expect(screen.getByText("Signature mismatch")).toBeVisible();
        expect(
            screen.getByText("Treat this document as untrusted until the provider explains it."),
        ).toBeVisible();
        expect(screen.queryByText("Dimensions")).toBeNull();
        expect(screen.getByRole("article").className).toContain("color-alarm");
    });
});

describe("EvidenceRail", () => {
    it("says the weight is unknown when no reviewers were published", () => {
        render(<EvidenceRail basis={{kind: "not-published"}} weight="unknown" />);
        expect(screen.getByText("Weight unknown.")).toBeVisible();
    });

    it("counts one reviewer in the singular and leaves out counts it was not given", () => {
        render(
            <EvidenceRail
                basis={{kind: "reviewers", total: 1, comparative: null, nonComparative: null}}
                weight="single"
            />,
        );
        expect(screen.getByText("1 reviewer")).toBeVisible();
        expect(
            screen.getByText("One reviewer. A single opinion, priced as a score."),
        ).toBeVisible();
    });

    it("groups large counts and says none for zero", () => {
        const {rerender} = render(
            <EvidenceRail
                basis={{kind: "reviewers", total: 1445, comparative: 1000, nonComparative: null}}
                weight="deep"
            />,
        );
        expect(screen.getByText("1,445 reviewers · 1,000 comparative")).toBeVisible();
        rerender(
            <EvidenceRail
                basis={{kind: "reviewers", total: 0, comparative: null, nonComparative: null}}
                weight="none"
            />,
        );
        expect(screen.getByText("0 reviewers")).toBeVisible();
        expect(screen.getByText("No reviewers behind this score.")).toBeVisible();
    });
});

describe("VerdictLines", () => {
    it("drops the redundant reason of an absent signature and keeps a real one", () => {
        const {rerender} = render(<SignatureLine verdict={UNVERIFIED} />);
        expect(screen.getByText("Not verified")).toBeVisible();
        expect(screen.queryByText(/signature/)).toBeNull();
        rerender(<SignatureLine verdict={UNVERIFIED_UNRECONSTRUCTABLE} />);
        expect(screen.getByText(/no strategy is confirmed for provider "asterpay"/)).toBeVisible();
    });

    it("says how long a fresh window has left, and why there is no window", () => {
        const {rerender} = render(<FreshnessLine verdict={FRESH} />);
        expect(screen.getByText("Fresh")).toBeVisible();
        expect(screen.getByText(/left of the window it declared/)).toBeVisible();
        rerender(<FreshnessLine verdict={{status: "unknown", reason: "no validUntil field"}} />);
        expect(screen.getByText("No window")).toBeVisible();
        expect(screen.getByText("no validUntil field")).toBeVisible();
    });
});

describe("UnreadSources", () => {
    it("names each failed source and each disagreement, keeping both answers", () => {
        const failing: TrustPanelView = {
            ...view,
            sourceErrors: [{sourceId: "intuition", step: "getMarkets", message: "HTTP 503"}],
            conflicts: [
                {
                    field: "name",
                    entries: [
                        {sourceId: "erc8004", value: "Clawnch"},
                        {sourceId: "intuition", value: null},
                    ],
                    note: "",
                },
            ],
        };
        render(<UnreadSources view={failing} />);
        const items = screen.getAllByRole("listitem");
        expect(items[0]).toHaveTextContent("intuition failed at getMarkets: HTTP 503");
        expect(items[1]).toHaveTextContent(
            "Sources disagree on name: erc8004 says Clawnch; intuition says nothing. Both answers kept.",
        );
    });
});
