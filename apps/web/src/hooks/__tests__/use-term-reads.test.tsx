import {renderHook, waitFor} from "@testing-library/react";
import type {FindAgentsPage, TermBacker} from "@arp-protocol/core";
import type {Address, Hex} from "viem";
import {afterEach, describe, expect, it, vi} from "vitest";

import {INTUITION_MAINNET_MULTIVAULT} from "../../lib/intuition-mainnet";
import {hiddenAtomIds} from "../../services/test-identities";
import type {VaultPosition} from "../../services/trust-stake";
import {useAgentRefForAtom} from "../use-agent-ref-for-atom";
import {useClaimVaults} from "../use-claim-vaults";
import {useDeclaredModules} from "../use-declared-modules";
import {useFindAgents} from "../use-find-agents";
import {useListedCapabilities} from "../use-listed-capabilities";
import {useStakeSession} from "../use-stake-session";
import {useTermBackers} from "../use-term-backers";
import {useTermValue} from "../use-term-value";
import {useTermVault} from "../use-term-vault";
import {useToolWallets} from "../use-tool-wallets";
import {hookProviders} from "./hook-providers";

/**
 * Every hook here is one query over one read, and what a caller depends on is the same four things:
 * it waits for its inputs, it asks the chain the page chose, it passes the answer through (filtered
 * where it says so), and a failed read surfaces as an error. The reads are mocked at the module
 * that would reach the network.
 */
const core = vi.hoisted(() => ({
    getTermBackers: vi.fn(),
    getTermValueHistory: vi.fn(),
    resolveAgentRefForAtom: vi.fn(),
    getDeclaredModulesFor: vi.fn(),
    getListedCapabilitiesFor: vi.fn(),
    findAgents: vi.fn(),
    getToolWallets: vi.fn(),
}));
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    ...core,
}));
const stake = vi.hoisted(() => ({
    readClaimVaults: vi.fn(),
    readVaultPosition: vi.fn(),
    readStakeSession: vi.fn(),
}));
vi.mock("../../services/trust-stake", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/trust-stake")>()),
    ...stake,
}));

const TESTNET_GRAPHQL = "https://testnet.intuition.sh/v1/graphql";
const MAINNET_GRAPHQL = "https://mainnet.intuition.sh/v1/graphql";
const TERM: Hex = `0x${"11".repeat(32)}`;
const ACCOUNT: Address = "0x000000000000000000000000000000000000c0DE";
/** One of the wallets `arp-test-identities.json` lists, whose positions are never shown. */
const HIDDEN_WALLET = "0x906f3A52ec089f8D4E9127F91C6bE5Ae0d18f91f";

function backer(account: string): TermBacker {
    return {account, atomId: null, label: null, shares: 1n, deposited: 1n, redeemed: 0n, openedAt: null};
}

function position(termId: Hex): VaultPosition {
    return {termId, curveId: 1n, totalAssets: 10n, totalShares: 10n, sharePrice: 1n, shares: null};
}

afterEach(() => {
    vi.clearAllMocks();
});

describe("useTermBackers", () => {
    it("waits for both the term and the curve", () => {
        const {wrapper} = hookProviders();
        const none = renderHook(() => useTermBackers(null, 1n), {wrapper});
        const noCurve = renderHook(() => useTermBackers(TERM, undefined), {wrapper});
        expect(none.result.current.fetchStatus).toBe("idle");
        expect(noCurve.result.current.fetchStatus).toBe("idle");
        expect(core.getTermBackers).not.toHaveBeenCalled();
    });

    it("leaves out positions held by ARP's own test wallets", async () => {
        core.getTermBackers.mockResolvedValue([backer("0xaaa"), backer(HIDDEN_WALLET)]);
        const {wrapper} = hookProviders({isMainnet: true});
        const {result} = renderHook(() => useTermBackers(TERM, 2n), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.map((row) => row.account)).toEqual(["0xaaa"]);
        expect(core.getTermBackers).toHaveBeenCalledWith(TERM, 2n, {graphqlUrl: MAINNET_GRAPHQL});
    });
});

describe("useTermValue", () => {
    it("waits for its inputs, then returns the history the indexer gives", async () => {
        const {wrapper} = hookProviders();
        expect(renderHook(() => useTermValue(TERM, undefined), {wrapper}).result.current.fetchStatus).toBe("idle");
        core.getTermValueHistory.mockResolvedValue([{at: "2026-11-01T00:00:00Z", value: 3n}]);
        const {result} = renderHook(() => useTermValue(TERM, 1n), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([{at: "2026-11-01T00:00:00Z", value: 3n}]);
        expect(core.getTermValueHistory).toHaveBeenCalledWith(TERM, 1n, {graphqlUrl: TESTNET_GRAPHQL});
    });
});

describe("useTermVault", () => {
    it("waits for a term and a curve", () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useTermVault({termId: TERM, curveId: null, account: null}), {wrapper});
        expect(result.current.fetchStatus).toBe("idle");
    });

    it("reads the position from the chosen chain's MultiVault", async () => {
        stake.readVaultPosition.mockResolvedValue(position(TERM));
        const {wrapper} = hookProviders({isMainnet: true});
        const {result} = renderHook(() => useTermVault({termId: TERM, curveId: 1n, account: ACCOUNT}), {
            wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.totalAssets).toBe(10n);
        expect(stake.readVaultPosition).toHaveBeenCalledWith(expect.anything(), {
            termId: TERM,
            curveId: 1n,
            account: ACCOUNT,
            multiVault: INTUITION_MAINNET_MULTIVAULT,
        });
    });
});

describe("useClaimVaults", () => {
    it("waits for a claim, then reads both of its sides", async () => {
        const {wrapper} = hookProviders();
        expect(
            renderHook(() => useClaimVaults({tripleId: null, curveId: 1n, account: null}), {wrapper}).result.current
                .fetchStatus,
        ).toBe("idle");
        stake.readClaimVaults.mockResolvedValue({
            tripleId: TERM,
            counterTermId: TERM,
            curveId: 1n,
            support: position(TERM),
            opposition: position(TERM),
        });
        const {result} = renderHook(() => useClaimVaults({tripleId: TERM, curveId: 1n, account: null}), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.support.totalShares).toBe(10n);
        expect(stake.readClaimVaults).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({tripleId: TERM, curveId: 1n, account: null}),
        );
    });
});

describe("useStakeSession", () => {
    it("reads the session limits once per chain", async () => {
        stake.readStakeSession.mockResolvedValue({curveId: 1n, minDeposit: 5n, minShare: 1n});
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useStakeSession(), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.minDeposit).toBe(5n);
    });
});

describe("useAgentRefForAtom", () => {
    it("waits for an atom, then resolves it on the chosen chain", async () => {
        const {wrapper} = hookProviders();
        expect(renderHook(() => useAgentRefForAtom(null), {wrapper}).result.current.fetchStatus).toBe("idle");
        core.resolveAgentRefForAtom.mockResolvedValue({chainId: 13579, tokenId: "7"});
        const {result} = renderHook(() => useAgentRefForAtom(TERM), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({chainId: 13579, tokenId: "7"});
        expect(core.resolveAgentRefForAtom).toHaveBeenCalledWith(TERM, {graphqlUrl: TESTNET_GRAPHQL});
    });
});

describe("useDeclaredModules", () => {
    it("reads nothing for no subject", () => {
        const {wrapper} = hookProviders();
        expect(renderHook(() => useDeclaredModules([]), {wrapper}).result.current.fetchStatus).toBe("idle");
    });

    it("asks once for every subject it was given", async () => {
        core.getDeclaredModulesFor.mockResolvedValue(new Map());
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useDeclaredModules(["0xb", "0xa"]), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(core.getDeclaredModulesFor).toHaveBeenCalledWith(["0xb", "0xa"], {graphqlUrl: TESTNET_GRAPHQL});
    });
});

describe("useListedCapabilities", () => {
    it("waits for a subject, then returns what is listed for it", async () => {
        const {wrapper} = hookProviders();
        expect(renderHook(() => useListedCapabilities(null), {wrapper}).result.current.fetchStatus).toBe("idle");
        core.getListedCapabilitiesFor.mockResolvedValue(["search"]);
        const {result} = renderHook(() => useListedCapabilities("0xsubject"), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(["search"]);
        expect(core.getListedCapabilitiesFor).toHaveBeenCalledWith("0xsubject", {graphqlUrl: TESTNET_GRAPHQL});
    });
});

describe("useFindAgents", () => {
    function page(atomIds: string[]): FindAgentsPage {
        return {
            agents: atomIds.map((atomId) => ({atomId}) as FindAgentsPage["agents"][number]), // Only `atomId` is read by the filter under test.
            truncated: false,
            curveId: 1,
            domain: "payment",
        };
    }

    it("searches nothing for a blank domain", () => {
        const {wrapper} = hookProviders();
        expect(renderHook(() => useFindAgents("   "), {wrapper}).result.current.fetchStatus).toBe("idle");
        expect(core.findAgents).not.toHaveBeenCalled();
    });

    it("trims the domain and drops ARP's own test identities from the candidates", async () => {
        core.findAgents.mockResolvedValue(page(["0xKEEP", "0xHIDDEN"]));
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set(["0xhidden"]));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useFindAgents("  payment "), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.agents.map((agent) => agent.atomId)).toEqual(["0xKEEP"]);
        expect(core.findAgents).toHaveBeenCalledWith("payment", {graphqlUrl: TESTNET_GRAPHQL, limit: 50});
        vi.mocked(hiddenAtomIds).mockResolvedValue(new Set());
    });
});

describe("useToolWallets", () => {
    it("reads nothing on mainnet, where ARP has no sponsoring account", () => {
        const {wrapper} = hookProviders({isMainnet: true});
        const {result} = renderHook(() => useToolWallets(TERM), {wrapper});
        expect(result.current.fetchStatus).toBe("idle");
        expect(core.getToolWallets).not.toHaveBeenCalled();
    });

    it("lists the wallets the sponsor deposited for, minus ARP's own test wallets", async () => {
        core.getToolWallets.mockResolvedValue([
            {account: "0xreal", deposits: 1, assets: 1n},
            {account: HIDDEN_WALLET, deposits: 1, assets: 1n},
        ]);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useToolWallets(TERM), {wrapper});
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.map((wallet) => wallet.account)).toEqual(["0xreal"]);
        expect(core.getToolWallets).toHaveBeenCalledWith(TERM, {
            graphqlUrl: TESTNET_GRAPHQL,
            sponsor: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        });
    });

    it("surfaces a failed read as an error", async () => {
        core.getToolWallets.mockRejectedValue(new Error("indexer down"));
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useToolWallets(TERM), {wrapper});
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe("indexer down");
    });
});
