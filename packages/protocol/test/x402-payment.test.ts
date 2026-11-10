import {readFileSync} from "node:fs";

import {getAddress, hexToBigInt, type Hex} from "viem";
import {describe, expect, it} from "vitest";

import {
    chainIdOfNetwork,
    checkX402Payment,
    exactEndpointNamesTool,
    isExactEndpointUrl,
    parsePaymentAtomLabel,
    parsePaymentLevelLabel,
    paymentAtomLabel,
    paymentLevelLabel,
    transfersIn,
    x402NetworksFrom,
    x402Policy,
    type X402TransferReads,
} from "../src/x402-payment.js";
import {X402_DEFAULT_NETWORKS} from "../src/arp/x402-networks.js";
import {FACILITATOR, FIXTURE, PAYER, PAY_TO, recordedReads, TX, type Fixture} from "./x402-fixture.js";

const policy = x402Policy(X402_DEFAULT_NETWORKS);

describe("the payment label", () => {
    it("is one spelling for one payment", () => {
        expect(paymentAtomLabel({network: "eip155:8453", txHash: TX.toUpperCase().replace("0X", "0x") as Hex})).toBe(`eip155:8453/tx/${TX}`);
        expect(parsePaymentAtomLabel(`eip155:8453/tx/${TX}`)).toEqual({network: "eip155:8453", txHash: TX});
    });

    it("refuses what is not an EVM network and a 32-byte hash", () => {
        expect(() => paymentAtomLabel({network: "solana:mainnet", txHash: TX})).toThrow();
        expect(() => paymentAtomLabel({network: "eip155:8453", txHash: "0x1234"})).toThrow();
        expect(parsePaymentAtomLabel(`eip155:8453/tx/${TX.toUpperCase()}`)).toBeNull();
        expect(parsePaymentAtomLabel("eip155:8453 0xabc")).toBeNull();
        expect(chainIdOfNetwork("eip155:8453")).toBe(8453);
        expect(chainIdOfNetwork("eip155:08453")).toBeNull();
    });
});

describe("the payment level with the exact URL paid (task 93, ADR 0162)", () => {
    const ref = {network: "eip155:84532", txHash: TX};
    const called = "http://127.0.0.1:4021/x402-demo/no-delivery";

    it("keeps the URL as typed after one space, and reads back the label task 89 wrote", () => {
        expect(paymentLevelLabel(ref, called)).toBe(`eip155:84532/tx/${TX} ${called}`);
        expect(parsePaymentLevelLabel(`eip155:84532/tx/${TX} ${called}`)).toEqual({ref, endpoint: called});
        expect(paymentLevelLabel(ref, null)).toBe(`eip155:84532/tx/${TX}`);
        expect(parsePaymentLevelLabel(`eip155:84532/tx/${TX}`)).toEqual({ref, endpoint: null});
    });

    it("refuses what is not an exact http(s) URL, written or read", () => {
        for (const bad of ["127.0.0.1:4021/x", "ftp://a.example", "http://a.example/a b", "http://", `https://a.example/${"a".repeat(512)}`, "http://a.example/\u0000"]) {
            expect(isExactEndpointUrl(bad)).toBe(false);
            expect(() => paymentLevelLabel(ref, bad)).toThrow();
        }
        expect(parsePaymentLevelLabel(`eip155:84532/tx/${TX} ftp://a.example`)).toBeNull();
        expect(parsePaymentLevelLabel(`eip155:84532/tx/${TX}  ${called}`)).toBeNull();
        expect(parsePaymentLevelLabel(`eip155:84532/tx/${TX} ${called} more`)).toBeNull();
    });

    it("names the tool only when it normalises to the tool's URL: http, www, a trailing slash, query order", () => {
        const tool = "https://seller.example/api?a=1&b=2";
        for (const exact of ["http://www.seller.example/api/?b=2&a=1", "https://seller.example/api?a=1&b=2", "HTTP://seller.example/api?b=2&a=1"]) {
            expect(exactEndpointNamesTool(exact, tool)).toBe(true);
        }
        for (const exact of ["https://seller.example/other", "https://evil.example/api?a=1&b=2", "seller.example/api?a=1&b=2"]) {
            expect(exactEndpointNamesTool(exact, tool)).toBe(false);
        }
        expect(exactEndpointNamesTool(called, "https://127.0.0.1:4021/x402-demo/no-delivery")).toBe(true);
    });
});

describe("checkX402Payment, on a recorded Base settlement", () => {
    it("reads the payer from the transfer, not from the transaction's sender", async () => {
        const checked = await checkX402Payment({ref: {network: "eip155:8453", txHash: TX}, payers: [PAYER], policy, reads: recordedReads()});
        expect(checked).toEqual({
            status: "paid",
            transfer: {asset: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"), payer: PAYER, payTo: PAY_TO, amount: 20_000n},
            paidAt: Number(hexToBigInt(FIXTURE.block.timestamp)),
        });
    });

    it("refuses the facilitator that sent the transaction as the payer", async () => {
        const checked = await checkX402Payment({ref: {network: "eip155:8453", txHash: TX}, payers: [FACILITATOR], policy, reads: recordedReads()});
        expect(checked.status).toBe("refused");
    });

    it("refuses a network the policy does not read", async () => {
        const checked = await checkX402Payment({ref: {network: "eip155:1", txHash: TX}, payers: [PAYER], policy, reads: recordedReads()});
        expect(checked).toMatchObject({status: "refused", reason: expect.stringContaining("eip155:1")});
    });

    it("refuses an asset the policy does not accept", async () => {
        const other = x402Policy(new Map([["eip155:8453", {assets: [getAddress(`0x${"11".repeat(20)}`)]}]]));
        expect((await checkX402Payment({ref: {network: "eip155:8453", txHash: TX}, payers: [PAYER], policy: other, reads: recordedReads()})).status).toBe("refused");
    });

    it("refuses a transaction the chain does not have, and a reverted one", async () => {
        const missing = `0x${"ab".repeat(32)}` as Hex;
        expect(await checkX402Payment({ref: {network: "eip155:8453", txHash: missing}, payers: [PAYER], policy, reads: recordedReads()})).toMatchObject({
            status: "refused",
            reason: expect.stringContaining("not found"),
        });
        expect((await checkX402Payment({ref: {network: "eip155:8453", txHash: TX}, payers: [PAYER], policy, reads: recordedReads(FIXTURE, {status: "reverted"})})).status).toBe("refused");
    });

    it("says unreadable, never refused, when the chain does not answer", async () => {
        const down: X402TransferReads = {
            getTransactionReceipt: async () => {
                throw new Error("fetch failed");
            },
            getBlock: async () => ({timestamp: 0n}),
        };
        expect((await checkX402Payment({ref: {network: "eip155:8453", txHash: TX}, payers: [PAYER], policy, reads: down})).status).toBe("unreadable");
    });

    it("refuses two transfers from the payer in one transaction, and a payment to oneself", async () => {
        const transfer = FIXTURE.receipt.logs[1] as Fixture["receipt"]["logs"][number];
        const doubled: Fixture = {...FIXTURE, receipt: {...FIXTURE.receipt, logs: [...FIXTURE.receipt.logs, transfer]}};
        expect((await checkX402Payment({ref: {network: "eip155:8453", txHash: TX}, payers: [PAYER], policy, reads: recordedReads(doubled)})).status).toBe("refused");
        const self: Fixture = {
            ...FIXTURE,
            receipt: {...FIXTURE.receipt, logs: [{...transfer, topics: [transfer.topics[0] as Hex, transfer.topics[1] as Hex, transfer.topics[1] as Hex]}]},
        };
        expect(await checkX402Payment({ref: {network: "eip155:8453", txHash: TX}, payers: [PAYER], policy, reads: recordedReads(self)})).toMatchObject({
            status: "refused",
            reason: expect.stringContaining("own sender"),
        });
    });

    it("leaves out the EIP-3009 AuthorizationUsed log and ERC-721 transfers", () => {
        expect(transfersIn(FIXTURE.receipt.logs, [getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")])).toHaveLength(1);
        const nft = {...(FIXTURE.receipt.logs[1] as Fixture["receipt"]["logs"][number])};
        nft.topics = [...nft.topics, `0x${"00".repeat(31)}01` as Hex];
        expect(transfersIn([nft], [getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")])).toHaveLength(0);
    });
});

describe("x402NetworksFrom, a network added by configuration (task 91)", () => {
    const SEPOLIA_USDC = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    const SEPOLIA = JSON.parse(readFileSync(new URL("./fixtures/x402-base-sepolia-usdc-3009.json", import.meta.url), "utf8")) as Fixture; // written by task 91
    const env = {ARP_X402_NETWORKS: `eip155:84532=${SEPOLIA_USDC}`, ARP_X402_RPC_84532: "https://sepolia.base.org"};

    it("is Base alone when nothing is set", () => {
        expect([...x402NetworksFrom(X402_DEFAULT_NETWORKS, {}).keys()]).toEqual(["eip155:8453"]);
    });

    it("adds Base Sepolia and its USDC, and keeps Base", () => {
        const table = x402NetworksFrom(X402_DEFAULT_NETWORKS, env);
        expect(table.get("eip155:84532")).toEqual({assets: [SEPOLIA_USDC], rpcUrl: "https://sepolia.base.org"});
        expect(table.get("eip155:8453")).toEqual(X402_DEFAULT_NETWORKS.get("eip155:8453"));
    });

    it("adds an asset to a default network without a second RPC setting, once", () => {
        const other = getAddress(`0x${"11".repeat(20)}`);
        const table = x402NetworksFrom(X402_DEFAULT_NETWORKS, {ARP_X402_NETWORKS: `eip155:8453=${other}, eip155:8453=${other}`});
        expect(table.get("eip155:8453")?.assets).toEqual([getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"), other]);
    });

    it("refuses a malformed entry and a network with no RPC, rather than leaving it out", () => {
        expect(() => x402NetworksFrom(X402_DEFAULT_NETWORKS, {ARP_X402_NETWORKS: "base-sepolia=0x036C"})).toThrow(/eip155:<chain id>=<asset address>/);
        expect(() => x402NetworksFrom(X402_DEFAULT_NETWORKS, {ARP_X402_NETWORKS: `eip155:84532=${SEPOLIA_USDC}`})).toThrow(/ARP_X402_RPC_84532/);
    });

    it("checks a recorded Base Sepolia settlement once the network is configured, and only then", async () => {
        const ref = {network: "eip155:84532", txHash: SEPOLIA.receipt.transactionHash};
        const payer = getAddress("0x011a56928886904a79a7f4b18f5b0b352a0fc9ac");
        const reads = recordedReads(SEPOLIA);
        expect(await checkX402Payment({ref, payers: [payer], policy: x402Policy(x402NetworksFrom(X402_DEFAULT_NETWORKS, env)), reads})).toEqual({
            status: "paid",
            transfer: {asset: SEPOLIA_USDC, payer, payTo: getAddress("0xa849bbad82f9edafdf9a5550cc874276138779d9"), amount: 2_000n},
            paidAt: Number(hexToBigInt(SEPOLIA.block.timestamp)),
        });
        expect(await checkX402Payment({ref, payers: [payer], policy, reads})).toMatchObject({status: "refused", reason: expect.stringContaining("eip155:84532")});
        expect((await checkX402Payment({ref, payers: [getAddress(SEPOLIA.receipt.from)], policy: x402Policy(x402NetworksFrom(X402_DEFAULT_NETWORKS, env)), reads})).status).toBe("refused");
    });
});
