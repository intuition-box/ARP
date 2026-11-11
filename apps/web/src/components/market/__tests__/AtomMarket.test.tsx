import {fireEvent, render, screen, within} from "@testing-library/react";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router-dom";
import type {Hex} from "viem";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {ChainChoiceContext, choiceFor} from "../../../lib/chain-choice";
import type {TermShapeView} from "../../../services/term-shape-view";

/**
 * The market on an atom, with every read mocked at its hook. What is asserted is what the reader
 * reads: the three figures, the backers as links, the value line, and that both write controls get
 * this atom and refetch the reads when a write settles.
 */
const ATOM: Hex = `0x${"aa".repeat(32)}`;
const ME = "0x000000000000000000000000000000000000c0DE";

type Session = {curveId: bigint} | undefined;
const state: {
    session: Session;
    vault: {totalAssets: bigint; shares: bigint | null} | undefined;
    shape:
        | {shape: TermShapeView; curve: {bucket: string; signals: number; volume: bigint}[]}
        | undefined;
    backers:
        | {
              account: string;
              atomId: string | null;
              label: string | null;
              deposited: bigint;
              redeemed: bigint;
          }[]
        | undefined;
    value: {at: string; value: bigint}[] | undefined;
} = {session: undefined, vault: undefined, shape: undefined, backers: undefined, value: undefined};

const vaultRefetch = vi.fn();
const shapeRefetch = vi.fn();
const calls = {shape: vi.fn(), vault: vi.fn()};

vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => ({address: ME}),
}));
vi.mock("../../../hooks/use-stake-session", () => ({
    useStakeSession: () => ({data: state.session, error: null}),
}));
vi.mock("../../../hooks/use-term-vault", () => ({
    useTermVault: (params: unknown) => {
        calls.vault(params);
        return {data: state.vault, refetch: vaultRefetch};
    },
}));
vi.mock("../../../hooks/use-term-shape", () => ({
    useTermShape: (termId: string | null, curveId: number) => {
        calls.shape(termId, curveId);
        return {data: state.shape, refetch: shapeRefetch};
    },
}));
vi.mock("../../../hooks/use-term-backers", () => ({
    useTermBackers: () => ({data: state.backers}),
}));
vi.mock("../../../hooks/use-term-value", () => ({
    useTermValue: () => ({data: state.value}),
}));
vi.mock("../../agent/StakeControl", () => ({
    StakeControl: (props: {
        claim: {heading: string; market: {support: {positionCount: number | null}}};
        headingLevel: string;
        onSettled: () => void;
    }) => (
        <div>
            <p>{`stake: ${props.claim.heading} · ${props.headingLevel} · ${props.claim.market.support.positionCount}`}</p>
            <button type="button" onClick={props.onSettled}>
                stake settled
            </button>
        </div>
    ),
}));
vi.mock("../../agent/WithdrawControl", () => ({
    WithdrawControl: (props: {heldShares: bigint | null; onSettled: () => void}) => (
        <button type="button" onClick={props.onSettled}>
            {`withdraw settled · ${String(props.heldShares)}`}
        </button>
    ),
}));

import {AtomMarket} from "../AtomMarket";

const SHAPE: TermShapeView = {
    curveId: 1,
    concentration: "60% held by one account",
    isDominated: true,
    span: "Oct 2026 → Nov 2026",
    arrivedTogether: false,
    breadth: "half its supporters hold 3+ other positions",
    breadthSampled: false,
    positionCount: 2,
};

function renderIt(props: {heading?: string | null} = {}) {
    const wrap = ({children}: {children: ReactNode}) => (
        <MemoryRouter>
            <ChainChoiceContext.Provider value={{choice: choiceFor(false), setMainnet: vi.fn()}}>
                {children}
            </ChainChoiceContext.Provider>
        </MemoryRouter>
    );
    return render(<AtomMarket atomTermId={ATOM} name="hyperframes" nameIsId={false} {...props} />, {
        wrapper: wrap,
    });
}

const figure = (label: string) => {
    const term = screen.getAllByText(label).find((node) => node.tagName === "DT");
    return term?.nextElementSibling?.textContent;
};

beforeEach(() => {
    state.session = undefined;
    state.vault = undefined;
    state.shape = undefined;
    state.backers = undefined;
    state.value = undefined;
    vaultRefetch.mockReset();
    shapeRefetch.mockReset();
    calls.shape.mockReset();
});

describe("AtomMarket", () => {
    it("before the curve is known reads nothing and shows dashes", () => {
        renderIt();
        expect(calls.shape).toHaveBeenCalledWith(null, 1);
        expect(figure("Total support")).toBe("—");
        expect(screen.getAllByText("—")).toHaveLength(3);
        expect(screen.getByRole("heading", {name: "Support", level: 2})).toBeInTheDocument();
        expect(screen.getByText("stake: Support this agent · h3 · null")).toBeInTheDocument();
        expect(screen.queryByText("Your shares")).toBeNull();
    });

    it("shows what is held, who holds it, the value line and the shape", () => {
        state.session = {curveId: 4n};
        state.vault = {totalAssets: 3_000_000_000_000_000_000n, shares: 5n};
        state.shape = {
            shape: SHAPE,
            curve: [
                {bucket: "2026-10-26T00:00:00Z", signals: 1, volume: 1n},
                {bucket: "2026-11-02T00:00:00Z", signals: 3, volume: 4n},
            ],
        };
        state.backers = [
            {
                account: "0x1111111111111111111111111111111111111111",
                atomId: "0xbeef",
                label: "Alice",
                deposited: 2_000_000_000_000_000_000n,
                redeemed: 0n,
            },
            {
                account: "0x2222222222222222222222222222222222222222",
                atomId: null,
                label: null,
                deposited: 1_000_000_000_000_000_000n,
                redeemed: 500_000_000_000_000_000n,
            },
        ];
        state.value = [
            {at: "2026-10-26T10:00:00Z", value: 1n},
            {at: "2026-11-02T10:00:00Z", value: 3_000_000_000_000_000_000n},
        ];
        renderIt();

        expect(calls.shape).toHaveBeenCalledWith(ATOM, 4);
        expect(figure("Total support")).toMatch(/^3(\.0+)? tTRUST$/);
        expect(screen.getByText("supporting")).toBeInTheDocument();
        expect(screen.getByText("Your shares")).toBeInTheDocument();

        const list = screen.getAllByRole("list")[0];
        if (list === undefined) throw new Error("no backer list");
        expect(within(list).getByRole("link", {name: "Alice"})).toHaveAttribute(
            "href",
            "/atom/0xbeef",
        );
        const stranger = within(list).getByRole("link", {name: /0x22222222/});
        expect(stranger.getAttribute("href")).toMatch(
            /\/address\/0x2222222222222222222222222222222222222222$/,
        );
        expect(within(list).getByText(/^−0\.5/)).toBeInTheDocument();

        expect(
            screen
                .getAllByRole("img")
                .some((img) => /on 2026-11-02, up from/.test(img.textContent ?? "")),
        ).toBe(true);
        expect(screen.getByText("60% held by one account")).toBeInTheDocument();
        expect(screen.getByText("stake: Support this agent · h3 · 2")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "withdraw settled · 5"})).toBeInTheDocument();
    });

    it("with nobody supporting, the vault's deposit is nobody's and is not shown", () => {
        state.session = {curveId: 1n};
        state.vault = {totalAssets: 1n, shares: 0n};
        state.shape = {shape: {...SHAPE, positionCount: 0}, curve: []};
        renderIt();
        expect(figure("Total support")).toBe("—");
        expect(figure("Supporters")).toBe("0");
        expect(screen.getByText("none")).toBeInTheDocument();
    });

    it("without its own heading is named for the atom and raises the controls' level", () => {
        renderIt({heading: null});
        expect(screen.getByRole("region", {name: "Support for hyperframes"})).toBeInTheDocument();
        expect(screen.queryByRole("heading", {level: 2, name: "Support"})).toBeNull();
        expect(screen.getByText("stake: Support this agent · h2 · null")).toBeInTheDocument();
    });

    it("refetches the vault and the shape when either write settles", () => {
        state.session = {curveId: 1n};
        state.vault = {totalAssets: 1n, shares: null};
        renderIt();
        fireEvent.click(screen.getByRole("button", {name: "stake settled"}));
        fireEvent.click(screen.getByRole("button", {name: "withdraw settled · null"}));
        expect(vaultRefetch).toHaveBeenCalledTimes(2);
        expect(shapeRefetch).toHaveBeenCalledTimes(2);
    });
});
