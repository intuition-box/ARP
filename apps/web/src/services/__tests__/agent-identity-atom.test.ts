import {describe, expect, it, vi} from "vitest";
import type {IdentityAtomPlan, PreparedCall} from "@arp-protocol/core";
import type {Address, Hex} from "viem";

import {intuitionTestnet} from "../../lib/chains";
import {planIdentityAtom, submitIdentityAtom} from "../agent-identity-atom";
import {MAX_STAKE_WEI, type StakeChain} from "../trust-stake";
import {makeMockPublicClient, makeMockWalletClient} from "./fixtures";

const prepareIdentityAtom = vi.hoisted(() => vi.fn());
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    prepareIdentityAtom,
}));

const MULTIVAULT: Address = "0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91";
const CHAIN: StakeChain = {
    chain: intuitionTestnet,
    chainId: intuitionTestnet.id,
    multiVault: MULTIVAULT,
    symbol: "tTRUST",
    explorerUrl: "https://explorer.test",
    isMainnet: false,
    client: makeMockPublicClient(),
};
const AGENT = {chainId: 8453, tokenId: "6649", registry: MULTIVAULT};

const call = (over: Partial<PreparedCall> = {}): PreparedCall => ({
    kind: "create-atom",
    chainId: CHAIN.chainId,
    to: MULTIVAULT,
    value: 1_000n,
    data: "0x1234",
    why: "the identity atom",
    ...over,
});
// The submit path reads only `calls` and `totalValue`; the ids and documents are the planner's.
const plan = (calls: PreparedCall[], totalValue = 1_000n) =>
    ({calls, totalValue, chainId: CHAIN.chainId}) as unknown as IdentityAtomPlan;

function clients(walletChainId: number = CHAIN.chainId, liveChainId: number = walletChainId) {
    const publicClient = makeMockPublicClient();
    const call = vi.fn().mockResolvedValue({data: "0x"});
    Object.assign(publicClient, {call});
    const walletClient = makeMockWalletClient();
    Object.assign(walletClient, {
        chain: {...intuitionTestnet, id: walletChainId},
        getChainId: vi.fn().mockResolvedValue(liveChainId),
    });
    return {publicClient, walletClient, simulate: call};
}

describe("planIdentityAtom", () => {
    it("prices the plan against the chain it names, and passes the registration only when given", async () => {
        prepareIdentityAtom.mockResolvedValue(plan([call()]));
        const {publicClient} = clients();
        await planIdentityAtom({publicClient, chain: CHAIN, agent: AGENT});
        expect(prepareIdentityAtom.mock.calls[0]?.[0]).not.toHaveProperty("registration");
        expect(prepareIdentityAtom.mock.calls[0]?.[0]).toMatchObject({agent: AGENT});

        await planIdentityAtom({
            publicClient,
            chain: CHAIN,
            agent: AGENT,
            registration: {name: "Probe"},
        });
        expect(prepareIdentityAtom.mock.calls[1]?.[0]).toMatchObject({
            registration: {name: "Probe"},
        });
    });
});

describe("submitIdentityAtom", () => {
    it("refuses a wallet on another chain, by what it reports and by what it answers", async () => {
        const wrongReported = clients(1155);
        await expect(
            submitIdentityAtom({...wrongReported, chain: CHAIN, plan: plan([call()])}),
        ).rejects.toMatchObject({code: "wrong-chain"});

        const wrongLive = clients(CHAIN.chainId, 1155);
        await expect(
            submitIdentityAtom({...wrongLive, chain: CHAIN, plan: plan([call()])}),
        ).rejects.toThrow(/Your wallet reports 1155\. Nothing was sent\./);
        expect(wrongLive.walletClient.sendTransaction).not.toHaveBeenCalled();
    });

    it("a wallet that reports no chain is told so", async () => {
        const {publicClient, walletClient} = clients();
        Object.assign(walletClient, {chain: undefined});
        await expect(
            submitIdentityAtom({publicClient, walletClient, chain: CHAIN, plan: plan([call()])}),
        ).rejects.toThrow(/reports no chain/);
    });

    it("sends nothing when everything is already public, or when it costs above the ceiling", async () => {
        const {publicClient, walletClient} = clients();
        await expect(
            submitIdentityAtom({publicClient, walletClient, chain: CHAIN, plan: plan([])}),
        ).rejects.toMatchObject({code: "nothing-to-do"});
        await expect(
            submitIdentityAtom({
                publicClient,
                walletClient,
                chain: CHAIN,
                plan: plan([call()], MAX_STAKE_WEI + 1n),
            }),
        ).rejects.toMatchObject({code: "cost-above-ceiling"});
        expect(walletClient.sendTransaction).not.toHaveBeenCalled();
    });

    it("refuses a call built for the other chain before signing it", async () => {
        const {publicClient, walletClient} = clients();
        await expect(
            submitIdentityAtom({
                publicClient,
                walletClient,
                chain: CHAIN,
                plan: plan([call(), call({chainId: 1155})]),
            }),
        ).rejects.toMatchObject({code: "wrong-chain"});
        expect(walletClient.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it("simulates then sends each call in order, waits for each, and returns the hashes", async () => {
        const {publicClient, walletClient, simulate} = clients();
        const hashes: Hex[] = [`0x${"aa".repeat(32)}`, `0x${"bb".repeat(32)}`];
        walletClient.sendTransaction
            .mockResolvedValueOnce(hashes[0])
            .mockResolvedValueOnce(hashes[1]);
        const calls = [
            call({data: "0x01"}),
            call({kind: "create-triple", data: "0x02", value: 5n}),
        ];
        const result = await submitIdentityAtom({
            publicClient,
            walletClient,
            chain: CHAIN,
            plan: plan(calls),
        });
        expect(result.txs).toEqual(hashes);
        expect(simulate.mock.calls.map(([args]) => args.data)).toEqual(["0x01", "0x02"]);
        expect(simulate.mock.calls[0]?.[0]).toMatchObject({
            account: walletClient.account.address,
        });
        expect(walletClient.sendTransaction.mock.calls.map(([args]) => args.value)).toEqual([
            1_000n,
            5n,
        ]);
        expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledTimes(2);
    });
});
