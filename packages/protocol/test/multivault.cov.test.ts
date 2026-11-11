import {custom, decodeFunctionData, encodeFunctionResult, type Hex} from "viem";
import {describe, expect, it} from "vitest";

import {multiVaultDeclareAbi, multiVaultReads} from "../src/declare/multivault.js";

const MULTI_VAULT = "0x6E35cF57A41fA15eA0EaE9C33e751b01A784Fe7e";
const ZERO = "0x0000000000000000000000000000000000000000";
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const TERM: Hex = `0x${"ab".repeat(32)}`;
const COUNTER: Hex = `0x${"cd".repeat(32)}`;

type Call = {functionName: string; args: readonly unknown[]};

/** A JSON-RPC stub that decodes each `eth_call` and answers it from the ABI, recording what it was asked. */
function rpc(chainId: number) {
    const calls: Call[] = [];
    const transport = custom(
        {
            async request({method, params}: {method: string; params?: unknown}) {
                if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
                if (method !== "eth_call" || !Array.isArray(params))
                    throw new Error(`unexpected ${method}`);
                const tx: unknown = params[0];
                if (
                    typeof tx !== "object" ||
                    tx === null ||
                    !("data" in tx) ||
                    typeof tx.data !== "string"
                ) {
                    throw new Error("no calldata");
                }
                // viem sends hex calldata; the template literal narrows the string to `Hex` for the decoder.
                const decoded = decodeFunctionData({
                    abi: multiVaultDeclareAbi,
                    data: `0x${tx.data.slice(2)}`,
                });
                calls.push({functionName: decoded.functionName, args: decoded.args ?? []});
                switch (decoded.functionName) {
                    case "calculateAtomId":
                    case "calculateTripleId":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: TERM,
                        });
                    case "getCounterIdFromTripleId":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: COUNTER,
                        });
                    case "isTermCreated":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: true,
                        });
                    case "getAtomCost":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: 11n,
                        });
                    case "getTripleCost":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: 22n,
                        });
                    case "getShares":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: 33n,
                        });
                    case "getBondingCurveConfig":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: {registry: ZERO, defaultCurveId: 2n},
                        });
                    case "getGeneralConfig":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: {
                                admin: ZERO,
                                protocolMultisig: ZERO,
                                feeDenominator: 10_000n,
                                trustBonding: ZERO,
                                minDeposit: 44n,
                                minShare: 1n,
                                atomDataMaxLength: 1000n,
                                feeThreshold: 0n,
                            },
                        });
                    case "previewRedeem":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: [5n, 6n],
                        });
                    case "previewAtomCreate":
                    case "previewTripleCreate":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: [7n, 8n, 9n],
                        });
                    case "previewDeposit":
                        return encodeFunctionResult({
                            abi: multiVaultDeclareAbi,
                            functionName: decoded.functionName,
                            result: [10n, 12n],
                        });
                    default:
                        throw new Error(`unexpected ${decoded.functionName}`);
                }
            },
        },
        {retryCount: 0},
    );
    return {transport, calls};
}

describe("multiVaultReads — every read decodes the contract's answer", () => {
    it("returns ids, existence, costs, configs, shares and previews from the contract", async () => {
        const {transport, calls} = rpc(13579);
        const reads = multiVaultReads({address: MULTI_VAULT, chainId: 13579, transport});

        expect(reads.address).toBe(MULTI_VAULT);
        expect(reads.chainId).toBe(13579);
        expect(await reads.atomId("0x1234")).toBe(TERM);
        expect(await reads.tripleId(TERM, TERM, TERM)).toBe(TERM);
        expect(await reads.counterTripleId(TERM)).toBe(COUNTER);
        expect(await reads.termExists(TERM)).toBe(true);
        expect(await reads.atomCost()).toBe(11n);
        expect(await reads.tripleCost()).toBe(22n);
        expect(await reads.defaultCurveId()).toBe(2n);
        expect(await reads.minDeposit()).toBe(44n);
        expect(await reads.sharesOf(ACCOUNT, TERM, 1n)).toBe(33n);
        expect(await reads.previewRedeem(TERM, 1n, 100n)).toEqual({
            assetsAfterFees: 5n,
            sharesUsed: 6n,
        });
        expect(await reads.previewAtomCreate(TERM, 100n)).toEqual({
            shares: 7n,
            assetsAfterFixedFees: 8n,
            assetsAfterFees: 9n,
        });
        expect(await reads.previewTripleCreate(TERM, 100n)).toEqual({
            shares: 7n,
            assetsAfterFixedFees: 8n,
            assetsAfterFees: 9n,
        });
        expect(await reads.previewDeposit(TERM, 1n, 100n)).toEqual({
            shares: 10n,
            assetsAfterFees: 12n,
        });

        expect(calls.find((call) => call.functionName === "getShares")?.args).toEqual([
            ACCOUNT,
            TERM,
            1n,
        ]);
        expect(calls.find((call) => call.functionName === "calculateTripleId")?.args).toEqual([
            TERM,
            TERM,
            TERM,
        ]);
        expect(calls.find((call) => call.functionName === "previewDeposit")?.args).toEqual([
            TERM,
            1n,
            100n,
        ]);
    });
});
