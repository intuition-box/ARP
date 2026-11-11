import type {IdentityAtomPlan} from "@arp-protocol/core";
import {fireEvent, render, screen} from "@testing-library/react";
import type {Address, Hex} from "viem";
import {describe, expect, it, vi} from "vitest";

import {choiceFor} from "../../../lib/chain-choice";
import type {ImportLinkPlan, OwnershipVerdict} from "../../../services/agent-import";
import {withError, type WriteState} from "../import-phase";
import {LinkPlan, Proof, Published, Refusal} from "../ImportResults";
import {MissingIdentityAtom} from "../MissingIdentityAtom";

/**
 * The import page's result panels, each rendered from the state the page hands it. What is
 * asserted is what the operator reads: the refusal named, the costs per write, and the receipts.
 */
const OWNER: Address = "0x1111111111111111111111111111111111111111";
const YOU: Address = "0x2222222222222222222222222222222222222222";
const TX_A: Hex = `0x${"a1".repeat(32)}`;
const TX_B: Hex = `0x${"b2".repeat(32)}`;
const ref = {chainId: 8453, tokenId: "1380"} as OwnershipVerdict["ref"]; // The fields Refusal reads.
const chain = choiceFor(false);

describe("Refusal", () => {
    it("names a token that was never minted", () => {
        render(<Refusal verdict={{status: "not-found", ref, caip19: "eip155:8453/x:1380"}} />);
        expect(screen.getByText("No such agent in that registry.")).toBeInTheDocument();
        expect(screen.getByText(/Token 1380 on chain 8453 has never been/)).toBeInTheDocument();
    });

    it("names both addresses when the agent is someone else's", () => {
        render(
            <Refusal
                verdict={{status: "owner-mismatch", ref, caip19: "c", owner: OWNER, connected: YOU}}
            />,
        );
        expect(screen.getByText("That agent belongs to another address.")).toBeInTheDocument();
        expect(screen.getByText(OWNER)).toBeInTheDocument();
        expect(screen.getByText(YOU)).toBeInTheDocument();
    });

    it("says nothing for an agent that is yours", () => {
        const owned = {status: "owned", ref, caip19: "c"} as OwnershipVerdict; // Refusal reads `status` only.
        const {container} = render(<Refusal verdict={owned} />);
        expect(container).toBeEmptyDOMElement();
    });
});

describe("Proof", () => {
    const proven = {
        chainId: 8453,
        tokenId: "1380",
        caip19: "eip155:8453/x:1380",
        owner: OWNER,
        operatingAccount: YOU,
    };

    it("calls an unnamed agent by its id and says the atom is not mirrored", () => {
        render(<Proof proven={{...proven, atom: null}} />);
        expect(screen.getByText("Agent 8453:1380 is yours.")).toBeInTheDocument();
        expect(screen.getByText("not mirrored — see step 3")).toBeInTheDocument();
    });

    it("uses the atom's label and id when the graph has one", () => {
        const atom = {atomId: `0x${"cc".repeat(32)}`, label: "Probe"} as unknown as NonNullable<
            Parameters<typeof Proof>[0]["proven"]["atom"]
        >; // Proof reads these two fields.
        render(<Proof proven={{...proven, atom}} />);
        expect(screen.getByText("Probe is yours.")).toBeInTheDocument();
        expect(screen.getByText(`0x${"cc".repeat(32)}`)).toBeInTheDocument();
    });
});

describe("LinkPlan", () => {
    const plan = (exists: boolean) =>
        ({
            chain: {symbol: "tTRUST"},
            agentAtomId: `0x${"01".repeat(32)}`,
            predicateId: `0x${"02".repeat(32)}`,
            accountAtomUri: "caip10:eip155:13579:0x2222",
            accountAtomExists: exists,
            tripleExists: exists,
            atomAssets: 1_000_000_000_000_000n,
            tripleAssets: 2_000_000_000_000_000n,
            totalCost: 3_000_000_000_000_000n,
        }) as unknown as ImportLinkPlan; // LinkPlan reads only these fields.

    it("prices both writes when neither exists", () => {
        render(<LinkPlan plan={plan(false)} />);
        expect(screen.getByText(/^total — 0\.003 tTRUST$/)).toBeInTheDocument();
        expect(screen.getByText("Object — your account, to be created")).toBeInTheDocument();
        expect(screen.getByText(/^account atom — 0\.001 tTRUST$/)).toBeInTheDocument();
        expect(screen.getByText(/^same-as edge — 0\.002 tTRUST$/)).toBeInTheDocument();
    });

    it("prices nothing already published", () => {
        render(<LinkPlan plan={plan(true)} />);
        expect(screen.getByText("Object — your account, already on the graph")).toBeInTheDocument();
        expect(screen.getByText("account atom — already published, 0 tTRUST")).toBeInTheDocument();
        expect(screen.getByText("same-as edge — already published, 0 tTRUST")).toBeInTheDocument();
    });
});

describe("Published", () => {
    it("links each transaction that was sent", () => {
        render(<Published txs={{atomTx: TX_A, tripleTx: TX_B}} explorerUrl="https://x.test" />);
        expect(screen.getByText("The link is public.")).toBeInTheDocument();
        expect(screen.getByText("Wallet record")).toBeInTheDocument();
        const links = screen.getAllByRole("link");
        expect(links.map((link) => link.getAttribute("href"))).toEqual([
            `https://x.test/tx/${TX_A}`,
            `https://x.test/tx/${TX_B}`,
        ]);
    });

    it("leaves out a write that did not happen", () => {
        render(<Published txs={{tripleTx: TX_B}} explorerUrl="https://x.test" />);
        expect(screen.queryByText("Wallet record")).toBeNull();
        expect(screen.getAllByRole("link")).toHaveLength(1);
    });
});

describe("MissingIdentityAtom", () => {
    const identityPlan = (calls: number, existing: boolean): IdentityAtomPlan =>
        ({
            uris: {identity: "ipfs://identity", caip: "ipfs://caip"},
            existing: {
                identityAtom: existing,
                caipAtom: existing,
                triple: existing,
                typeTriple: existing,
                implementTriple: existing,
            },
            tripleId: `0x${"03".repeat(32)}`,
            totalValue: 4_000_000_000_000_000n,
            calls: Array.from({length: calls}, (_, i) => ({
                kind: "createAtoms",
                data: `0x0${i}`,
                value: 1_000_000_000_000_000n,
                preview: i === 0 ? {shares: 5_000_000_000_000_000n} : undefined,
            })),
        }) as unknown as IdentityAtomPlan; // The panel reads these fields only.

    function renderIt(
        write: WriteState<IdentityAtomPlan, Hex[]>,
        extra: {onTargetChain?: boolean; walletChainId?: number; isSwitching?: boolean} = {},
    ) {
        const handlers = {onPlan: vi.fn(), onPublish: vi.fn(), onSwitchChain: vi.fn()};
        render(
            <MissingIdentityAtom
                write={write}
                onTargetChain={extra.onTargetChain ?? true}
                chain={chain}
                walletChainId={extra.walletChainId}
                isSwitching={extra.isSwitching ?? false}
                {...handlers}
            />,
        );
        return handlers;
    }

    it("offers to price the record, and waits while it prices", () => {
        const {onPlan} = renderIt({stage: "unpriced", error: "rpc down"});
        fireEvent.click(screen.getByRole("button", {name: "Price the public record"}));
        expect(onPlan).toHaveBeenCalled();
        expect(screen.getByText("rpc down")).toBeInTheDocument();
    });

    it("shows a pending price as a disabled button", () => {
        renderIt({stage: "pricing"});
        expect(screen.getByRole("button", {name: "Pricing…"})).toBeDisabled();
    });

    it("lists each call's cost and publishes on the click", () => {
        const {onPublish} = renderIt({stage: "priced", plan: identityPlan(2, false), error: null});
        expect(screen.getByText(/^total — 0\.004 tTRUST$/)).toBeInTheDocument();
        expect(screen.getByText("Identity atom, to be created")).toBeInTheDocument();
        expect(screen.getByText(/createAtoms — 0\.001 tTRUST, 0\.005 shares/)).toBeInTheDocument();
        expect(screen.getByText(/createAtoms — 0\.001 tTRUST, no preview/)).toBeInTheDocument();
        fireEvent.click(
            screen.getByRole("button", {name: /Write the public record — 0\.004 tTRUST/}),
        );
        expect(onPublish).toHaveBeenCalled();
    });

    it("says there is nothing to send when every piece exists", () => {
        renderIt({stage: "priced", plan: identityPlan(0, true), error: null});
        expect(screen.getByText("CAIP-19 atom, already on the graph")).toBeInTheDocument();
        expect(screen.getByText(/There is nothing to send\./)).toBeInTheDocument();
    });

    it("asks for the switch when the wallet is on another chain", () => {
        const {onSwitchChain} = renderIt(
            {stage: "priced", plan: identityPlan(1, false), error: null},
            {onTargetChain: false},
        );
        expect(screen.getByText(/Your wallet is on chain unknown\./)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", {name: /Switch to/}));
        expect(onSwitchChain).toHaveBeenCalled();
    });

    it("disables the switch while it runs and names the wallet's chain", () => {
        renderIt(
            {stage: "priced", plan: identityPlan(1, false), error: null},
            {onTargetChain: false, walletChainId: 1, isSwitching: true},
        );
        expect(screen.getByText(/Your wallet is on chain 1\./)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Switching…"})).toBeDisabled();
    });

    it("waits for the wallet while sending", () => {
        renderIt({stage: "sending", plan: identityPlan(1, false)});
        expect(screen.getByRole("button", {name: "Waiting for your wallet…"})).toBeDisabled();
    });

    it("after the write, links each transaction and offers nothing else", () => {
        renderIt({stage: "sent", plan: identityPlan(1, false), result: [TX_A, TX_B]});
        expect(screen.getByText("The agent has a public record.")).toBeInTheDocument();
        expect(screen.getByText("Transaction 2")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /Write the public record/})).toBeNull();
    });
});

describe("withError", () => {
    it("leaves a write in flight or sent unchanged", () => {
        const sending: WriteState<string, string> = {stage: "sending", plan: "p"};
        expect(withError(sending, "late")).toBe(sending);
        expect(withError({stage: "priced", plan: "p", error: null}, "late")).toEqual({
            stage: "priced",
            plan: "p",
            error: "late",
        });
    });
});
