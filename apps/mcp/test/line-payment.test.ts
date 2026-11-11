import {describe, expect, it, vi} from "vitest";
import {TransactionReceiptNotFoundError, type Hex} from "viem";

import {X402_DEFAULT_NETWORKS, x402Policy, type X402TransferReads} from "@arp-protocol/core";

vi.hoisted(() => {
    process.env["ARP_NO_RECEIPTS"] = "1";
    process.env["ARP_TARGET"] = "testnet";
});

const {lineFromArgs, readLinePayment, writeLineChecked} = await import("../src/line.js");

/**
 * The checks of `arp line` that come before any key: the payment's own network, read through an
 * injected reader standing where its RPC would, and the command line's refusals.
 */
const TX = `0x${"ef".repeat(32)}` as Hex;
const PAID = {
    toolUrl: "https://api.example.com/v1/feed",
    outcome: "failed" as const,
    reason: "no-delivery" as const,
    payment: {network: "eip155:8453", txHash: TX},
};
const reading = (receipt: X402TransferReads["getTransactionReceipt"]) => ({
    policy: x402Policy(X402_DEFAULT_NETWORKS),
    readsFor: (): X402TransferReads => ({getTransactionReceipt: receipt, getBlock: async () => ({timestamp: 1n})}),
});
const config = {contentUrl: "http://c.test", sponsorUrl: "http://s.test", registry: `0x${"01".repeat(20)}` as Hex, multiVault: `0x${"02".repeat(20)}` as Hex, stateDir: "/nonexistent"};
const noKey = () => {
    throw new Error("no key in this test");
};

describe("the payment a line names", () => {
    it("is nothing to read on a line without one", async () => {
        const {payment: _none, ...unpaid} = PAID;
        expect(await readLinePayment(unpaid, reading(async () => {
            throw new Error("not read");
        }))).toBeNull();
    });

    it("says a transaction the network does not hold is not found, and any other failure is a failure to read", async () => {
        const absent = new TransactionReceiptNotFoundError({hash: TX});
        await expect(readLinePayment(PAID, reading(async () => {
            throw absent;
        }))).rejects.toThrow(`transaction ${TX} not found on eip155:8453`);
        await expect(readLinePayment(PAID, reading(async () => {
            throw new Error("rate limited\nby the RPC");
        }))).rejects.toThrow("eip155:8453 could not be read: rate limited");
        await expect(readLinePayment(PAID, reading(async () => {
            throw "down";
        }))).rejects.toThrow("eip155:8453 could not be read: down");
    });

    it("refuses a payment that reverted", async () => {
        await expect(readLinePayment(PAID, reading(async () => ({status: "reverted", blockNumber: 1n, logs: []})))).rejects.toThrow(`the payment ${TX} reverted`);
    });

    it("is refused before any key when the URL is not the one paid, or no network can be read", async () => {
        await expect(writeLineChecked({config, isCategory: async () => true, agent: noKey}, {...PAID, toolUrl: "github.com/x"})).rejects.toThrow("is not the exact http(s) URL that was paid");
        await expect(writeLineChecked({config, isCategory: async () => true, agent: noKey}, PAID)).rejects.toThrow("this build reads no payment network");
    });
});

describe("a domain on a line", () => {
    it("refuses a parent that is not a category, naming it as given", async () => {
        await expect(
            writeLineChecked({config, isCategory: async () => false, agent: noKey}, {toolUrl: "https://github.com/a/b?skill=c", outcome: "worked", domain: "decks", newDomain: {parent: "Nowhere", why: "x"}}),
        ).rejects.toThrow('--parent "Nowhere" is not a category under tool');
    });

    it("names no closest category when the resolver has none", async () => {
        await expect(
            writeLineChecked({config, isCategory: async () => false, resolve: async () => ({status: "unknown", word: "zz", suggestions: []}), agent: noKey}, {toolUrl: "https://github.com/a/b?skill=c", outcome: "worked", domain: "zz"}),
        ).rejects.toThrow('"zz" is not a category under tool. Pick one');
    });
});

describe("the command line's refusals", () => {
    const args = {toolUrl: "https://api.example.com/v1/feed", outcome: "failed", domain: undefined, reason: "no-delivery"};

    it.each([
        [{paymentTx: "0x12", network: "eip155:8453"}, "--payment-tx is a 32-byte transaction hash"],
        [{paymentTx: TX, network: "eip155:999999"}, "--network must be one of"],
        [{paymentTx: TX, network: "eip155:8453", toolUrl: "https://user:pass@api.example.com/x", payTo: `0x${"03".repeat(20)}`, asset: `0x${"04".repeat(20)}`, price: "1", termsAt: "1762716700"}, "credentials"],
        [{paymentTx: TX, network: "eip155:8453", payTo: `0x${"03".repeat(20)}`, asset: `0x${"04".repeat(20)}`, price: "1", termsAt: "1762716700", skillDir: "/tmp"}, "--skill-dir names a skill's files"],
        [{paymentTx: TX, network: "eip155:8453", payTo: `0x${"03".repeat(20)}`, asset: `0x${"04".repeat(20)}`, price: "1", termsAt: "1762716700", reason: "missing-key", needs: "OPENAI_API_KEY"}, "a paid endpoint has no SKILL.md"],
    ])("%j", (extra, message) => {
        const answer = lineFromArgs({...args, ...extra});
        expect(answer).toBeInstanceOf(Error);
        expect((answer as Error).message).toContain(message);
    });

    it("refuses a malformed network setting as the error it is", () => {
        const answer = lineFromArgs({...args, paymentTx: TX, network: "eip155:8453"}, {ARP_X402_NETWORKS: "not json"});
        expect(answer).toBeInstanceOf(Error);
    });
});
