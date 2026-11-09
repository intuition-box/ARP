import {getAddress, hexToBigInt, type Hex} from "viem";
import {describe, expect, it} from "vitest";

import {
    chainIdOfNetwork,
    checkX402Payment,
    parsePaymentAtomLabel,
    paymentAtomLabel,
    transfersIn,
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
