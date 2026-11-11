import {act, renderHook, waitFor} from "@testing-library/react";
import type {Delegation} from "@metamask/smart-accounts-kit";
import {getAddress, type Address, type Hex} from "viem";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useAccountDelegations} from "../use-account-delegations";
import {useAgentId, useAgentWallet} from "../use-agent";
import {useStoredDelegations} from "../use-stored-delegations";
import {hookProviders} from "./hook-providers";

/**
 * `/account`'s hook, with the wallet, the chain and every service that would sign or read faked.
 * `localStorage` is happy-dom's own, so a signed delegation really is kept and read back.
 */
const OPERATOR: Address = "0x000000000000000000000000000000000000c0DE";
const SMART_ACCOUNT: Address = "0x00000000000000000000000000000000000000Aa";
const DELEGATE: Address = getAddress("0x00000000000000000000000000000000000000d1");
const RUNTIME: Address = getAddress("0x00000000000000000000000000000000000000e2");
const HASH: Hex = `0x${"34".repeat(32)}`;

const account = vi.hoisted(() => ({
    state: {address: undefined as string | undefined, chainId: undefined as number | undefined}, // Typed wider than its initial value; the tests set both.
    walletClient: undefined as {uid: string} | undefined, // As above.
    switchChainAsync: vi.fn(),
}));
vi.mock("wagmi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("wagmi")>()),
    useAccount: () => account.state,
    useWalletClient: () => ({data: account.walletClient}),
    useSwitchChain: () => ({switchChainAsync: account.switchChainAsync}),
}));
const readContract = vi.hoisted(() => vi.fn());
vi.mock("../../lib/clients", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../lib/clients")>();
    return {...original, publicClient: {...original.publicClient, readContract}};
});
const findAgentIdByOwner = vi.hoisted(() => vi.fn());
vi.mock("../../services/agent-identity", () => ({findAgentIdByOwner}));
const smart = vi.hoisted(() => ({
    createUserSmartAccount: vi.fn(),
    isSmartAccountDeployed: vi.fn(),
    deploySmartAccountIfNeeded: vi.fn(),
}));
vi.mock("../../services/smart-account", () => smart);
const signDelegationAs = vi.hoisted(() => vi.fn());
vi.mock("../../services/delegation", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/delegation")>()),
    signDelegationAs,
}));
const revokeDelegation = vi.hoisted(() => vi.fn());
vi.mock("../../services/delegation-revoke", () => ({revokeDelegation}));
const readNativeBalance = vi.hoisted(() => vi.fn());
vi.mock("../../services/native-balance", () => ({readNativeBalance}));
const readDelegationState = vi.hoisted(() => vi.fn());
vi.mock("@arp-protocol/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@arp-protocol/core")>()),
    readDelegationState,
}));
const connectedWalletClient = vi.hoisted(() => vi.fn());
vi.mock("../wallet-client", () => ({connectedWalletClient}));

function signed(delegate: Address = DELEGATE, signature: Hex = "0xaa"): Delegation {
    return {
        delegate,
        delegator: SMART_ACCOUNT,
        authority: `0x${"f".repeat(64)}`,
        caveats: [],
        salt: "0x01",
        signature,
    };
}

beforeEach(() => {
    localStorage.clear();
    account.state = {address: OPERATOR, chainId: 13579};
    account.walletClient = {uid: "w1"};
    smart.createUserSmartAccount.mockResolvedValue({address: SMART_ACCOUNT});
    smart.isSmartAccountDeployed.mockResolvedValue(false);
    findAgentIdByOwner.mockResolvedValue(null);
    readNativeBalance.mockResolvedValue(7n);
    readDelegationState.mockResolvedValue("enabled");
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("useAccountDelegations", () => {
    it("derives the operator's Smart Account and reports whether it is deployed", async () => {
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.smartAccount).not.toBeNull());
        expect(result.current.smartAccount).toEqual({address: SMART_ACCOUNT, isDeployed: false});
        expect(result.current.onTestnet).toBe(true);
        expect(result.current.rows).toEqual([]);
        expect(result.current.suggestedDelegate).toBeNull();
        expect(smart.createUserSmartAccount).toHaveBeenCalledWith({owner: OPERATOR, signer: {walletClient: {uid: "w1"}}});
    });

    it("reads nothing and offers no act without a connected wallet", async () => {
        account.state = {address: undefined, chainId: undefined};
        account.walletClient = undefined;
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        expect(result.current.smartAccount).toBeNull();
        expect(result.current.onTestnet).toBe(false);
        await expect(result.current.deploy.mutateAsync()).rejects.toThrow("Agent wallet not ready");
        await expect(
            result.current.sign.mutateAsync({delegate: DELEGATE, cap: 1n, periodSeconds: 1n}),
        ).rejects.toThrow("Agent wallet not ready");
        await expect(result.current.revoke.mutateAsync(signed())).rejects.toThrow("Agent wallet not ready");
        expect(smart.createUserSmartAccount).not.toHaveBeenCalled();
    });

    it("signs a delegation, keeps it, then shows its on-chain state and its delegate's balance", async () => {
        signDelegationAs.mockResolvedValue(signed());
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.smartAccount).not.toBeNull());
        await act(async () => {
            await result.current.sign.mutateAsync({delegate: DELEGATE, cap: 10n, periodSeconds: 86_400n});
        });
        expect(signDelegationAs).toHaveBeenCalledWith(
            expect.objectContaining({
                smartAccount: {address: SMART_ACCOUNT},
                delegation: expect.objectContaining({delegator: SMART_ACCOUNT, delegate: DELEGATE}),
            }),
        );
        expect(result.current.rows).toHaveLength(1);
        await waitFor(() => expect(result.current.rows[0]?.state).toBe("enabled"));
        expect(result.current.rows[0]?.view.delegate).toBe(DELEGATE);
        await waitFor(() => expect(result.current.runtimes).toEqual([{address: DELEGATE, balance: 7n}]));
    });

    it("deploys the Smart Account with the connected wallet and re-reads it", async () => {
        connectedWalletClient.mockResolvedValue({uid: "funder"});
        smart.deploySmartAccountIfNeeded.mockResolvedValue(HASH);
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.smartAccount).not.toBeNull());
        smart.isSmartAccountDeployed.mockResolvedValue(true);
        let tx: Hex | null = null;
        await act(async () => {
            tx = await result.current.deploy.mutateAsync();
        });
        expect(tx).toBe(HASH);
        expect(smart.deploySmartAccountIfNeeded).toHaveBeenCalledWith({
            smartAccount: {address: SMART_ACCOUNT},
            funderWalletClient: {uid: "funder"},
        });
        await waitFor(() => expect(result.current.smartAccount?.isDeployed).toBe(true));
    });

    it("revokes through the DelegationManager and re-reads every state", async () => {
        connectedWalletClient.mockResolvedValue({uid: "operator"});
        revokeDelegation.mockResolvedValue(HASH);
        signDelegationAs.mockResolvedValue(signed());
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.smartAccount).not.toBeNull());
        await act(async () => {
            await result.current.sign.mutateAsync({delegate: DELEGATE, cap: 10n, periodSeconds: 1n});
        });
        await waitFor(() => expect(result.current.rows[0]?.state).toBe("enabled"));
        readDelegationState.mockResolvedValue("disabled");
        await act(async () => {
            await result.current.revoke.mutateAsync(signed());
        });
        expect(revokeDelegation).toHaveBeenCalledWith(
            expect.objectContaining({target: signed(), operatorWalletClient: {uid: "operator"}}),
        );
        await waitFor(() => expect(result.current.rows[0]?.state).toBe("disabled"));
    });

    it("asks the wallet to switch to testnet", async () => {
        account.state = {address: OPERATOR, chainId: 1155};
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        expect(result.current.onTestnet).toBe(false);
        await act(async () => {
            await result.current.switchToTestnet.mutateAsync();
        });
        expect(account.switchChainAsync).toHaveBeenCalledWith({chainId: 13579});
    });

    it("suggests the runtime wallet bound to the operator's agent, never the zero address", async () => {
        findAgentIdByOwner.mockResolvedValue(5n);
        readContract.mockResolvedValue(RUNTIME);
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.suggestedDelegate).toBe(RUNTIME));
        expect(readContract).toHaveBeenCalledWith(
            expect.objectContaining({functionName: "getAgentWallet", args: [5n]}),
        );
    });

    it("surfaces a Smart Account that cannot be derived", async () => {
        smart.createUserSmartAccount.mockRejectedValue(new Error("no signer"));
        const {result} = renderHook(() => useAccountDelegations(), {wrapper: hookProviders().wrapper});
        await waitFor(() => expect(result.current.smartAccountError?.message).toBe("no signer"));
        expect(result.current.smartAccount).toBeNull();
    });
});

describe("useAgentId and useAgentWallet", () => {
    it("look nothing up without an owner or an agent", () => {
        account.state = {address: undefined, chainId: undefined};
        const {wrapper} = hookProviders();
        expect(renderHook(() => useAgentId(), {wrapper}).result.current.fetchStatus).toBe("idle");
        expect(renderHook(() => useAgentWallet(null), {wrapper}).result.current.fetchStatus).toBe("idle");
        expect(findAgentIdByOwner).not.toHaveBeenCalled();
        expect(readContract).not.toHaveBeenCalled();
    });

    it("find the connected owner's agent and read its wallet", async () => {
        findAgentIdByOwner.mockResolvedValue(9n);
        readContract.mockResolvedValue(RUNTIME);
        const {wrapper} = hookProviders();
        const id = renderHook(() => useAgentId(), {wrapper});
        await waitFor(() => expect(id.result.current.data).toBe(9n));
        expect(findAgentIdByOwner).toHaveBeenCalledWith(expect.objectContaining({owner: OPERATOR}));
        const wallet = renderHook(() => useAgentWallet(9n), {wrapper});
        await waitFor(() => expect(wallet.result.current.data).toBe(RUNTIME));
    });
});

describe("useStoredDelegations", () => {
    it("lists nothing and refuses to keep a delegation without a Smart Account", () => {
        const {result} = renderHook(() => useStoredDelegations(undefined));
        expect(result.current.list).toEqual([]);
        expect(() => result.current.add(signed())).toThrow(/cannot store the permission/);
    });

    it("keeps what it is given and lists it back", () => {
        const {result} = renderHook(() => useStoredDelegations(SMART_ACCOUNT));
        act(() => result.current.add(signed()));
        act(() => result.current.add(signed(RUNTIME, "0xbb")));
        expect(result.current.list.map((entry) => entry.delegation.delegate).sort()).toEqual([DELEGATE, RUNTIME].sort());
    });

    it("lists nothing when the browser blocks storage", () => {
        vi.stubGlobal("localStorage", undefined);
        const {result} = renderHook(() => useStoredDelegations(SMART_ACCOUNT));
        expect(result.current.list).toEqual([]);
        expect(() => result.current.add(signed())).toThrow(/cannot store the permission/);
        vi.unstubAllGlobals();
    });
});
