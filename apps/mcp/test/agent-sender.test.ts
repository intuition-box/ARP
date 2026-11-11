import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {encodeFunctionData, getAddress, parseAbi, parseTransaction, type Hex} from "viem";
import {generatePrivateKey, privateKeyToAccount} from "viem/accounts";

import {agentKeyPath, agentSender, type PermittedCall} from "../src/desktop/agent-key.js";

/**
 * The sponsored mode's sender over a stubbed JSON-RPC endpoint: what it signs is decoded back from
 * the raw transaction it sends, and nothing reaches a chain.
 */
const RPC = "http://rpc.test";
const REGISTRY = getAddress("0xC165A2AD2E540A4069E02834009161E2b4490d5A");
const REGISTER = encodeFunctionData({abi: parseAbi(["function register() returns (uint256)"]), functionName: "register"});
const PERMITTED: PermittedCall[] = [{to: REGISTRY, data: REGISTER}];
const HASH = `0x${"5e".repeat(32)}` as Hex;

let methods: string[];
let raw: Hex | null;
let receiptStatus: "0x1" | "0x0";

function answer(method: string, params: unknown[]): unknown {
    switch (method) {
        case "eth_chainId":
            return "0x350b";
        case "eth_getTransactionCount":
            return "0x0";
        case "eth_estimateGas":
            return "0x5208";
        case "eth_gasPrice":
        case "eth_maxPriorityFeePerGas":
            return "0x1";
        case "eth_getBlockByNumber":
            return {number: "0x10", baseFeePerGas: "0x1", hash: `0x${"22".repeat(32)}`, timestamp: "0x1", transactions: []};
        case "eth_blockNumber":
            return "0x10";
        case "eth_sendRawTransaction":
            raw = params[0] as Hex;
            return HASH;
        case "eth_getTransactionByHash":
            return null;
        case "eth_getTransactionReceipt":
            return {
                transactionHash: HASH, status: receiptStatus, from: REGISTRY, to: REGISTRY, blockHash: `0x${"11".repeat(32)}`, blockNumber: "0x10",
                transactionIndex: "0x0", cumulativeGasUsed: "0x5208", gasUsed: "0x5208", logs: [], logsBloom: `0x${"00".repeat(256)}`,
                effectiveGasPrice: "0x1", type: "0x2", contractAddress: null,
            };
        default:
            throw new Error(`unexpected ${method}`);
    }
}

beforeEach(() => {
    methods = [];
    raw = null;
    receiptStatus = "0x1";
    vi.stubGlobal("fetch", vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {id: number; method: string; params: unknown[]} | {id: number; method: string; params: unknown[]}[]; // viem's JSON-RPC request
        const one = (call: {id: number; method: string; params: unknown[]}) => {
            methods.push(call.method);
            return {jsonrpc: "2.0", id: call.id, result: answer(call.method, call.params)};
        };
        return Response.json(Array.isArray(body) ? body.map(one) : one(body));
    }));
});
afterEach(() => vi.unstubAllGlobals());

describe("the agent's sender", () => {
    const account = privateKeyToAccount(generatePrivateKey());

    it("keeps its key under ARP_HOME or the home directory, never the working directory", () => {
        const home = mkdtempSync(join(tmpdir(), "arp-home-"));
        const saved = process.env["ARP_HOME"];
        delete process.env["ARP_HOME"];
        expect(agentKeyPath(home)).toBe(join(home, ".arp", "agent-key"));
        process.env["ARP_HOME"] = join(home, "state");
        expect(agentKeyPath(home)).toBe(join(home, "state", "agent-key"));
        if (saved === undefined) delete process.env["ARP_HOME"];
        else process.env["ARP_HOME"] = saved;
    });

    it("refuses a call it may not sign before anything is sent", async () => {
        const sender = agentSender(account, RPC);
        expect(sender.address).toBe(account.address);
        await expect(sender.send({to: REGISTRY, data: REGISTER, value: 1n, chainId: 13579}, PERMITTED)).rejects.toThrow(/^refused: a call that sends value/);
        expect(methods).toEqual([]);
    });

    it("signs the permitted call at zero value on 13579, and returns its receipt", async () => {
        const sender = agentSender(account, RPC);
        const receipt = await sender.send({to: REGISTRY, data: REGISTER, value: 0n, chainId: 13579}, PERMITTED);
        expect(receipt.status).toBe("success");
        expect(methods).toContain("eth_sendRawTransaction");
        const sent = parseTransaction(raw ?? "0x");
        expect(sent).toMatchObject({to: REGISTRY.toLowerCase(), data: REGISTER, chainId: 13579});
        expect(sent.value ?? 0n).toBe(0n);
    });

    it("throws on a transaction that reverted", async () => {
        receiptStatus = "0x0";
        const sender = agentSender(account, RPC);
        await expect(sender.send({to: REGISTRY, data: REGISTER, value: 0n, chainId: 13579}, PERMITTED)).rejects.toThrow(`transaction ${HASH} reverted`);
    });
});
