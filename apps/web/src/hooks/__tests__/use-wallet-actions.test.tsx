import {act, renderHook, waitFor} from "@testing-library/react";
import type {IdentityAtomPlan} from "@arp-protocol/core";
import type {Address, Hex} from "viem";
import {afterEach, describe, expect, it, vi} from "vitest";

import {choiceFor} from "../../lib/chain-choice";
import type {DeclaredUse} from "../../services/declare-use";
import type {ImportedAgent, ImportLinkPlan} from "../../services/agent-import";
import type {MintQuote} from "../../services/identity-mint";
import type {ToolRegistration} from "../../services/tool-register";
import type {RedeemQuote, StakeChain, StakeQuote, StakeTarget} from "../../services/trust-stake";
import {hookProviders} from "./hook-providers";

/**
 * The hooks that sign. Each one's contract with its page: it prices on the chain the page chose,
 * signs only with a connected wallet, records what it sent, and refuses rather than signing when
 * there is no wallet. The wallet and every service that would reach a chain are faked.
 */
const WALLET = {account: {address: "0x000000000000000000000000000000000000c0DE"}, uid: "w1"};
const HASH: Hex = `0x${"12".repeat(32)}`;
const OWNER: Address = "0x000000000000000000000000000000000000c0DE";
const REGISTRY: Address = "0x0000000000000000000000000000000000000001";

const wagmiCore = vi.hoisted(() => ({getWalletClient: vi.fn()}));
vi.mock("@wagmi/core", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@wagmi/core")>()),
    ...wagmiCore,
}));
const connectedWalletClient = vi.hoisted(() => vi.fn());
vi.mock("../wallet-client", () => ({connectedWalletClient}));
const stake = vi.hoisted(() => ({
    quoteStake: vi.fn(),
    submitStake: vi.fn(),
    quoteRedeem: vi.fn(),
    submitRedeem: vi.fn(),
}));
vi.mock("../../services/trust-stake", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/trust-stake")>()),
    ...stake,
}));
const txRecord = vi.hoisted(() => ({recordSent: vi.fn(), recordSettled: vi.fn(), recordUnsettled: vi.fn()}));
vi.mock("../../services/tx-record", () => txRecord);
const mint = vi.hoisted(() => ({quoteMint: vi.fn(), submitMint: vi.fn()}));
vi.mock("../../services/identity-mint", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/identity-mint")>()),
    ...mint,
}));
const declare = vi.hoisted(() => ({planUseDeclaration: vi.fn(), submitUseDeclaration: vi.fn()}));
vi.mock("../../services/declare-use", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/declare-use")>()),
    ...declare,
}));
const register = vi.hoisted(() => ({planToolRegistration: vi.fn(), submitToolRegistration: vi.fn()}));
vi.mock("../../services/tool-register", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/tool-register")>()),
    ...register,
}));
const agentImport = vi.hoisted(() => ({
    verifyAgentOwnership: vi.fn(),
    signImportConsent: vi.fn(),
    submitOperatorLink: vi.fn(),
}));
vi.mock("../../services/agent-import", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/agent-import")>()),
    ...agentImport,
}));
const identityAtom = vi.hoisted(() => ({submitIdentityAtom: vi.fn()}));
vi.mock("../../services/agent-identity-atom", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/agent-identity-atom")>()),
    ...identityAtom,
}));
const smartAccount = vi.hoisted(() => ({createUserSmartAccount: vi.fn()}));
vi.mock("../../services/smart-account", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../services/smart-account")>()),
    ...smartAccount,
}));

const {useStakeActions} = await import("../use-stake-actions");
const {draftToAgentUri, useIdentityMint} = await import("../use-identity-mint");
const {useDeclareUse} = await import("../use-declare-use");
const {useToolRegister} = await import("../use-tool-register");
const {useAgentImport} = await import("../use-agent-import");
const {useProposeCategory} = await import("../use-propose-category");

const testnet = choiceFor(false);
const mainnet = choiceFor(true);

afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

describe("useStakeActions", () => {
    const target: StakeTarget = {kind: "atom", atomId: HASH};

    it("prices a deposit and an exit on the chain the page chose", async () => {
        stake.quoteStake.mockResolvedValue({assets: 1n});
        stake.quoteRedeem.mockResolvedValue({shares: 1n});
        const {wrapper} = hookProviders({isMainnet: true});
        const {result} = renderHook(() => useStakeActions(), {wrapper});
        const session = {curveId: 1n, minDeposit: 1n, minShare: 1n};
        await result.current.quote({target, side: "support", assets: 5n, receiver: OWNER, session});
        expect(stake.quoteStake).toHaveBeenCalledWith(mainnet.client, expect.objectContaining({assets: 5n, chain: mainnet}));
        await result.current.quoteExit({termId: HASH, curveId: 1n, shares: 3n, receiver: OWNER});
        expect(stake.quoteRedeem).toHaveBeenCalledWith(mainnet.client, expect.objectContaining({shares: 3n, chain: mainnet}));
    });

    it("refuses to sign without a connected wallet", async () => {
        wagmiCore.getWalletClient.mockResolvedValue(null);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useStakeActions(), {wrapper});
        const quote = {chain: testnet, assets: 5n} as unknown as StakeQuote; // Only `chain` and `assets` are read before the service.
        await expect(result.current.submit(quote)).rejects.toThrow(/No wallet client/);
        const exit = {chain: testnet} as unknown as RedeemQuote; // Only `chain` is read before the service.
        await expect(result.current.submitExit(exit)).rejects.toThrow(/No wallet client/);
        expect(stake.submitStake).not.toHaveBeenCalled();
        expect(stake.submitRedeem).not.toHaveBeenCalled();
    });

    it("records a sent deposit and a sent withdrawal on the chain their quote carries", async () => {
        wagmiCore.getWalletClient.mockResolvedValue(WALLET);
        stake.submitStake.mockResolvedValue(HASH);
        stake.submitRedeem.mockResolvedValue(HASH);
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useStakeActions(), {wrapper});
        const quote = {chain: mainnet, assets: 5n} as unknown as StakeQuote; // As above.
        expect(await result.current.submit(quote)).toBe(HASH);
        expect(txRecord.recordSent).toHaveBeenCalledWith(HASH, {label: "support", chainId: 1155, valueWei: 5n});
        const exit = {chain: testnet} as unknown as RedeemQuote; // As above.
        expect(await result.current.submitExit(exit)).toBe(HASH);
        expect(txRecord.recordSent).toHaveBeenCalledWith(HASH, {label: "withdraw", chainId: 13579});
    });

    it("records a settled receipt, and an unsettled one before rethrowing", async () => {
        const {wrapper} = hookProviders();
        const {result} = renderHook(() => useStakeActions(), {wrapper});
        const receipt = {status: "success"};
        const settles = {client: {waitForTransactionReceipt: vi.fn(async () => receipt)}} as unknown as StakeChain; // Only the client's receipt wait is used.
        await result.current.awaitReceipt(HASH, settles);
        expect(txRecord.recordSettled).toHaveBeenCalledWith(HASH, receipt);
        const cause = new Error("timeout");
        const hangs = {
            client: {
                waitForTransactionReceipt: vi.fn(async () => {
                    throw cause;
                }),
            },
        } as unknown as StakeChain; // As above.
        await expect(result.current.awaitReceipt(HASH, hangs)).rejects.toBe(cause);
        expect(txRecord.recordUnsettled).toHaveBeenCalledWith(HASH, cause);
    });
});

describe("useIdentityMint", () => {
    it("targets the testnet registry on testnet and Base on mainnet", () => {
        const onTestnet = renderHook(() => useIdentityMint(), {wrapper: hookProviders().wrapper});
        const onMainnet = renderHook(() => useIdentityMint(), {wrapper: hookProviders({isMainnet: true}).wrapper});
        expect(onTestnet.result.current.target.chain.id).toBe(13579);
        expect(onMainnet.result.current.target.chain.id).toBe(8453);
    });

    it("quotes against its own target", async () => {
        mint.quoteMint.mockResolvedValue({predictedTokenId: "1"});
        const {result} = renderHook(() => useIdentityMint(), {wrapper: hookProviders().wrapper});
        await result.current.quote(OWNER, "data:,x");
        expect(mint.quoteMint).toHaveBeenCalledWith(
            expect.objectContaining({target: result.current.target, owner: OWNER, agentUri: "data:,x"}),
        );
    });

    it("mints on the chain the quote names, and refuses without a wallet", async () => {
        const {result} = renderHook(() => useIdentityMint(), {wrapper: hookProviders().wrapper});
        const quoted = {chainId: 8453, agentUri: "data:,x"} as unknown as MintQuote; // Only these two fields are read.
        wagmiCore.getWalletClient.mockResolvedValue({account: undefined});
        await expect(result.current.submit(quoted)).rejects.toThrow(/No wallet client/);
        wagmiCore.getWalletClient.mockResolvedValue(WALLET);
        mint.submitMint.mockResolvedValue({tokenId: "9"});
        expect(await result.current.submit(quoted)).toEqual({tokenId: "9"});
        expect(mint.submitMint).toHaveBeenCalledWith(
            expect.objectContaining({walletClient: WALLET, agentUri: "data:,x", target: expect.objectContaining({registry: expect.any(String)})}),
        );
        expect(mint.submitMint.mock.calls[0]?.[0].target.chain.id).toBe(8453);
    });

    it("draftToAgentUri writes a data URI naming the target's chain and registry", () => {
        const {result} = renderHook(() => useIdentityMint(), {wrapper: hookProviders().wrapper});
        const {target} = result.current;
        const uri = draftToAgentUri({name: "Agent", description: "Does things"}, target);
        const prefix = "data:application/json;base64,";
        expect(uri.startsWith(prefix)).toBe(true);
        const file: unknown = JSON.parse(atob(uri.slice(prefix.length)));
        expect(file).toMatchObject({name: "Agent", description: "Does things"});
        expect(JSON.stringify(file)).toContain(`eip155:${target.chain.id}:${target.registry}`);
    });
});

describe("useDeclareUse", () => {
    it("plans on the chosen chain and submits with the connected wallet on the plan's chain", async () => {
        declare.planUseDeclaration.mockResolvedValue({chain: testnet});
        declare.submitUseDeclaration.mockResolvedValue(HASH);
        connectedWalletClient.mockResolvedValue(WALLET);
        const {result} = renderHook(() => useDeclareUse(), {wrapper: hookProviders({isMainnet: true}).wrapper});
        const agent = {chainId: 13579, tokenId: "1", registry: REGISTRY};
        await result.current.plan({agent, connected: OWNER, object: HASH});
        expect(declare.planUseDeclaration).toHaveBeenCalledWith(
            expect.objectContaining({agent, chain: mainnet, graphqlUrl: mainnet.graphqlUrl}),
        );
        const declaration = {chain: testnet} as unknown as DeclaredUse; // Only `chain` is read by the hook.
        expect(await result.current.submit(declaration)).toBe(HASH);
        expect(declare.submitUseDeclaration).toHaveBeenCalledWith({
            walletClient: WALLET,
            publicClient: testnet.client,
            declaration,
        });
    });
});

describe("useToolRegister", () => {
    it("plans on the chosen chain and submits on the registration's chain", async () => {
        register.planToolRegistration.mockResolvedValue({chain: testnet});
        register.submitToolRegistration.mockResolvedValue(HASH);
        connectedWalletClient.mockResolvedValue(WALLET);
        const {result} = renderHook(() => useToolRegister(), {wrapper: hookProviders().wrapper});
        await result.current.plan("https://mcp.example.com");
        expect(register.planToolRegistration).toHaveBeenCalledWith(
            expect.objectContaining({url: "https://mcp.example.com", chain: testnet}),
        );
        const registration = {chain: mainnet} as unknown as ToolRegistration; // Only `chain` is read by the hook.
        expect(await result.current.submit(registration)).toBe(HASH);
        expect(register.submitToolRegistration).toHaveBeenCalledWith({
            walletClient: WALLET,
            publicClient: mainnet.client,
            registration,
        });
    });
});

describe("useAgentImport's signing steps", () => {
    it("verifies ownership of the agent named", async () => {
        agentImport.verifyAgentOwnership.mockResolvedValue({status: "owner"});
        const {result} = renderHook(() => useAgentImport());
        await result.current.verifyOwnership({chainId: 8453, tokenId: "4", registry: REGISTRY, connected: OWNER});
        expect(agentImport.verifyAgentOwnership).toHaveBeenCalledWith({
            ref: {chainId: 8453, tokenId: "4", registry: REGISTRY},
            connected: OWNER,
        });
    });

    it("derives the operating account from the connected wallet", async () => {
        connectedWalletClient.mockResolvedValue(WALLET);
        smartAccount.createUserSmartAccount.mockResolvedValue({address: REGISTRY});
        const {result} = renderHook(() => useAgentImport());
        expect(await result.current.deriveOperatingAccount(OWNER)).toBe(REGISTRY);
        expect(smartAccount.createUserSmartAccount).toHaveBeenCalledWith({owner: OWNER, signer: {walletClient: WALLET}});
    });

    it("signs the consent and publishes the link with the connected wallet", async () => {
        connectedWalletClient.mockResolvedValue(WALLET);
        agentImport.signImportConsent.mockResolvedValue({signature: HASH, chainId: 8453});
        agentImport.submitOperatorLink.mockResolvedValue({tripleTx: HASH});
        const {result} = renderHook(() => useAgentImport());
        const consent = {} as Parameters<typeof result.current.signConsent>[0]; // The mock reads none of it.
        expect(await result.current.signConsent(consent)).toEqual({signature: HASH, chainId: 8453});
        const plan = {chain: testnet} as unknown as ImportLinkPlan; // Only `chain` is read by the hook.
        const imported = {} as ImportedAgent; // Passed through untouched.
        expect(await result.current.publishLink({imported, plan})).toEqual({tripleTx: HASH});
        expect(agentImport.submitOperatorLink).toHaveBeenCalledWith({
            walletClient: WALLET,
            publicClient: testnet.client,
            imported,
            plan,
        });
    });

    it("publishes an identity record on the chain it was priced on, and refuses any other", async () => {
        connectedWalletClient.mockResolvedValue(WALLET);
        identityAtom.submitIdentityAtom.mockResolvedValue({atomTx: HASH});
        const {result} = renderHook(() => useAgentImport());
        const onMainnet = {chainId: 1155} as IdentityAtomPlan; // Only `chainId` is read by the hook.
        await result.current.publishIdentity(onMainnet);
        expect(identityAtom.submitIdentityAtom).toHaveBeenLastCalledWith(expect.objectContaining({chain: mainnet}));
        await result.current.publishIdentity({chainId: 13579} as IdentityAtomPlan); // As above.
        expect(identityAtom.submitIdentityAtom).toHaveBeenLastCalledWith(expect.objectContaining({chain: testnet}));
        await expect(result.current.publishIdentity({chainId: 8453} as IdentityAtomPlan)).rejects.toThrow( // As above.
            /chain 8453, which ARP does not write to/,
        );
    });
});

describe("useProposeCategory", () => {
    it("posts the request to the sponsor and returns its answer", async () => {
        const fetchSpy = vi.fn(async () =>
            new Response(JSON.stringify({label: "payment", newCategory: false, created: true}), {status: 200}),
        );
        vi.stubGlobal("fetch", fetchSpy);
        const {result} = renderHook(() => useProposeCategory(), {wrapper: hookProviders().wrapper});
        expect(result.current.available).toBe(true);
        expect(result.current.result).toBeNull();
        act(() => result.current.submit({label: "payment", subjectId: "0xtool"}));
        await waitFor(() => expect(result.current.result).not.toBeNull());
        expect(result.current.result).toEqual({status: "done", label: "payment", newCategory: false, created: true});
        expect(result.current.pending).toBe(false);
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringMatching(/\/propose-category$/),
            expect.objectContaining({method: "POST", body: JSON.stringify({label: "payment", subjectId: "0xtool"})}),
        );
    });
});
